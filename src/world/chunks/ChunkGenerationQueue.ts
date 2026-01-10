import { TerrainGenerator } from "../generation/TerrainGenerator";
import { StructureGenerator } from "../generation/StructureGenerator";
import { ChunkPersistence } from "./ChunkPersistence";

export type ChunkQueueItem = {
  cx: number;
  cz: number;
  priority: number;
};

/**
 * Управление очередью генерации чанков
 * Генерирует максимум 1 чанк за кадр для избежания фризов
 */
export class ChunkGenerationQueue {
  private queue: ChunkQueueItem[] = [];
  private pendingChunks: Set<string> = new Set();
  private maxChunksPerFrame: number = 1;

  private terrainGen: TerrainGenerator;
  private structureGen: StructureGenerator;
  private persistence: ChunkPersistence;
  private chunkSize: number;
  private chunkHeight: number;

  constructor(
    terrainGen: TerrainGenerator,
    structureGen: StructureGenerator,
    persistence: ChunkPersistence,
    chunkSize: number,
    chunkHeight: number,
  ) {
    this.terrainGen = terrainGen;
    this.structureGen = structureGen;
    this.persistence = persistence;
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
  }

  /**
   * Добавить чанк в очередь генерации
   */
  public enqueue(cx: number, cz: number, priority: number): void {
    const key = `${cx},${cz}`;
    
    if (this.pendingChunks.has(key)) return;

    this.pendingChunks.add(key);
    this.queue.push({ cx, cz, priority });
    
    // Сортировать по приоритету (ближние чанки первыми)
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Проверить, находится ли чанк в очереди
   */
  public isPending(cx: number, cz: number): boolean {
    const key = `${cx},${cz}`;
    return this.pendingChunks.has(key);
  }

  /**
   * Обработать очередь (генерировать максимум 1 чанк за кадр)
   */
  public process(
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): void {
    let processed = 0;

    while (this.queue.length > 0 && processed < this.maxChunksPerFrame) {
      const item = this.queue.shift()!;
      const key = `${item.cx},${item.cz}`;

      // Проверить persistence
      if (this.persistence.hasChunk(key)) {
        this.loadFromPersistence(item.cx, item.cz, key, onChunkGenerated);
      } else {
        const data = this.generateChunk(item.cx, item.cz);
        onChunkGenerated(item.cx, item.cz, data);
      }

      this.pendingChunks.delete(key);
      processed++;
    }
  }

  /**
   * Загрузить чанк из IndexedDB
   */
  private async loadFromPersistence(
    cx: number,
    cz: number,
    key: string,
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): Promise<void> {
    if (this.persistence.isLoading(key)) return;

    const data = await this.persistence.loadChunk(key);
    if (data) {
      onChunkGenerated(cx, cz, data);
    } else {
      const generated = this.generateChunk(cx, cz);
      onChunkGenerated(cx, cz, generated);
    }
  }

  /**
   * Сгенерировать новый чанк
   */
  private generateChunk(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(this.chunkSize * this.chunkSize * this.chunkHeight);
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    const getBlockIndex = (x: number, y: number, z: number): number => {
      return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
    };

    // Generate terrain
    this.terrainGen.generateTerrain(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      getBlockIndex,
    );

    // Generate ores
    this.structureGen.generateOres(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      getBlockIndex,
    );

    // Generate trees
    this.structureGen.generateTrees(
      data,
      this.chunkSize,
      this.chunkHeight,
      getBlockIndex,
    );

    return data;
  }

  /**
   * Очистить очередь
   */
  public clear(): void {
    this.queue = [];
    this.pendingChunks.clear();
  }
}
