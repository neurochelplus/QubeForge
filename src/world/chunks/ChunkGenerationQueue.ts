import { TerrainGenerator } from "../generation/TerrainGenerator";
import { StructureGenerator } from "../generation/StructureGenerator";
import { ChunkPersistence } from "./ChunkPersistence";

export type ChunkQueueItem = {
  cx: number;
  cz: number;
  priority: number;
};

type PendingMesh = {
  cx: number;
  cz: number;
  data: Uint8Array;
};

/**
 * Управление очередью генерации чанков
 * Разделяет генерацию данных и построение меша на разные кадры
 * для избежания длинных фризов
 */
export class ChunkGenerationQueue {
  private queue: ChunkQueueItem[] = [];
  private pendingChunks: Set<string> = new Set();
  
  // Очередь мешей, ожидающих построения (данные уже сгенерированы)
  private pendingMeshes: PendingMesh[] = [];

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
   * Обработать очередь генерации
   * Генерация данных и построение меша в одном кадре для консистентности
   */
  public process(
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): void {
    // Приоритет 1: построить меши для уже сгенерированных данных (из IndexedDB)
    if (this.pendingMeshes.length > 0) {
      const pending = this.pendingMeshes.shift()!;
      onChunkGenerated(pending.cx, pending.cz, pending.data);
      return;
    }

    // Приоритет 2: сгенерировать данные и сразу построить меш
    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      const key = `${item.cx},${item.cz}`;

      // Проверить persistence (синхронно проверяем кэш)
      if (this.persistence.hasChunk(key)) {
        // Загрузка из IndexedDB — асинхронная
        this.loadFromPersistence(item.cx, item.cz, key);
      } else {
        // Генерация — синхронная, сразу строим меш
        const data = this.generateChunk(item.cx, item.cz);
        onChunkGenerated(item.cx, item.cz, data);
      }

      this.pendingChunks.delete(key);
    }
  }

  // Флаг для предотвращения параллельных загрузок
  private loadingKeys: Set<string> = new Set();

  /**
   * Загрузить чанк из IndexedDB
   */
  private async loadFromPersistence(
    cx: number,
    cz: number,
    key: string,
  ): Promise<void> {
    // Предотвратить дублирование загрузок
    if (this.loadingKeys.has(key)) return;
    if (this.persistence.isLoading(key)) return;

    this.loadingKeys.add(key);

    try {
      const data = await this.persistence.loadChunk(key);
      if (data) {
        this.pendingMeshes.push({ cx, cz, data });
      } else {
        const generated = this.generateChunk(cx, cz);
        this.pendingMeshes.push({ cx, cz, data: generated });
      }
    } finally {
      this.loadingKeys.delete(key);
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
    this.pendingMeshes = [];
  }
}
