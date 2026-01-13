import { worldDB } from "../../utils/DB";
import { logger } from "../../utils/Logger";

export class ChunkPersistence {
  private knownChunkKeys: Set<string> = new Set();
  private loadingChunks: Set<string> = new Set();

  public async init(): Promise<void> {
    await worldDB.init();
    const keys = await worldDB.keys("chunks");
    keys.forEach((k) => this.knownChunkKeys.add(k as string));
    logger.debug(`Loaded world index. ${this.knownChunkKeys.size} chunks in DB.`);
  }

  public async loadChunk(key: string): Promise<Uint8Array | null> {
    if (!this.knownChunkKeys.has(key)) {
      return null;
    }

    if (this.loadingChunks.has(key)) {
      // Already loading, wait for it
      return new Promise((resolve) => {
        const check = () => {
          if (!this.loadingChunks.has(key)) {
            worldDB.get(key, "chunks").then(resolve);
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    }

    this.loadingChunks.add(key);
    try {
      const data = await worldDB.get(key, "chunks");
      return data as Uint8Array | null;
    } finally {
      this.loadingChunks.delete(key);
    }
  }

  public async saveChunk(key: string, data: Uint8Array): Promise<void> {
    await worldDB.set(key, data, "chunks");
    this.knownChunkKeys.add(key);
  }

  public async saveBatch(chunks: Map<string, Uint8Array>): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [key, data] of chunks) {
      promises.push(this.saveChunk(key, data));
    }
    await Promise.all(promises);
  }

  public async clear(): Promise<void> {
    await worldDB.clear();
    this.knownChunkKeys.clear();
    this.loadingChunks.clear();
  }

  public hasChunk(key: string): boolean {
    return this.knownChunkKeys.has(key);
  }

  public isLoading(key: string): boolean {
    return this.loadingChunks.has(key);
  }
}
