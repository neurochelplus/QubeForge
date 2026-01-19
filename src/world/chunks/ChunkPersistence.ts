import { DB, worldDB } from "../../utils/DB";
import { logger } from "../../utils/Logger";

export class ChunkPersistence {
  private knownChunkKeys: Set<string> = new Set();
  private loadingChunks: Set<string> = new Set();
  private db: DB;

  constructor(dbName?: string) {
    // Если передано имя БД, создаём новый экземпляр, иначе используем глобальный
    this.db = dbName ? new DB(dbName, "chunks") : worldDB;
  }

  public async init(): Promise<void> {
    await this.db.init();
    const keys = await this.db.keys("chunks");
    keys.forEach((k) => this.knownChunkKeys.add(k as string));
    logger.debug(`Loaded world index. ${this.knownChunkKeys.size} chunks in DB.`);
  }

  /**
   * Закрыть соединение с БД
   */
  public close(): void {
    this.db.close();
  }

  /**
   * Получить экземпляр DB
   */
  public getDB(): DB {
    return this.db;
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
            this.db.get(key, "chunks").then(resolve);
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
    }

    this.loadingChunks.add(key);
    try {
      const data = await this.db.get(key, "chunks");
      return data as Uint8Array | null;
    } finally {
      this.loadingChunks.delete(key);
    }
  }

  public async saveChunk(key: string, data: Uint8Array): Promise<void> {
    await this.db.set(key, data, "chunks");
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
    await this.db.clear();
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
