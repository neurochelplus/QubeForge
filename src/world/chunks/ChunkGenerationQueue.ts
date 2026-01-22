import { TerrainGenerator } from "../generation/TerrainGenerator";
import { StructureGenerator } from "../generation/StructureGenerator";
import { ChunkPersistence } from "./ChunkPersistence";
import { ChunkWorkerPool } from "../workers/ChunkWorkerPool";
import { createBlockIndexGetter } from "../../utils/ChunkUtils";

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
 * Использует Web Workers для асинхронной генерации без блокировки главного потока
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
  
  // Web Workers для параллельной генерации
  private workerPool: ChunkWorkerPool;
  private useWorkers: boolean;

  constructor(
    terrainGen: TerrainGenerator,
    structureGen: StructureGenerator,
    persistence: ChunkPersistence,
    chunkSize: number,
    chunkHeight: number,
    useWorkers: boolean = true,
  ) {
    this.terrainGen = terrainGen;
    this.structureGen = structureGen;
    this.persistence = persistence;
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
    this.useWorkers = useWorkers;
    
    // Инициализировать пул воркеров
    if (this.useWorkers) {
      this.workerPool = new ChunkWorkerPool(
        terrainGen.getSeed(),
        chunkSize,
        chunkHeight,
      );
    }
  }

  /**
   * Добавить чанк в очередь генерации
   */
  public enqueue(cx: number, cz: number, priority: number): void {
    const key = `${cx},${cz}`;
    
    if (this.pendingChunks.has(key)) return;

    this.pendingChunks.add(key);
    
    // Вставить в правильную позицию (бинарный поиск для оптимизации)
    // Вместо сортировки всего массива каждый раз
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, { cx, cz, priority });
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
   * Использует Web Workers для асинхронной генерации
   */
  public process(
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): void {
    // Приоритет 1: построить меши для уже сгенерированных данных
    if (this.pendingMeshes.length > 0) {
      const pending = this.pendingMeshes.shift()!;
      onChunkGenerated(pending.cx, pending.cz, pending.data);
      return;
    }

    // Приоритет 2: обработать очередь генерации
    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      const key = `${item.cx},${item.cz}`;

      // Проверить persistence (синхронно проверяем кэш)
      if (this.persistence.hasChunk(key)) {
        // Загрузка из IndexedDB — асинхронная
        this.loadFromPersistence(item.cx, item.cz, key);
        // НЕ удаляем из pending здесь — удалится после загрузки
      } else {
        // Генерация через Web Workers (асинхронная) или синхронная
        if (this.useWorkers && this.workerPool) {
          this.generateChunkAsync(item.cx, item.cz, item.priority);
          // НЕ удаляем из pending здесь — удалится после генерации
        } else {
          // Fallback: синхронная генерация (для совместимости)
          const data = this.generateChunkSync(item.cx, item.cz);
          onChunkGenerated(item.cx, item.cz, data);
          this.pendingChunks.delete(key); // Удаляем только для синхронной генерации
        }
      }
    }
  }

  /**
   * Асинхронная генерация через Web Workers
   */
  private async generateChunkAsync(cx: number, cz: number, priority: number): Promise<void> {
    const key = `${cx},${cz}`;
    try {
      const data = await this.workerPool.generateChunk(cx, cz, priority);
      this.pendingMeshes.push({ cx, cz, data });
    } catch (error) {
      console.error(`[Worker] Failed to generate chunk (${cx}, ${cz}):`, error);
      // Fallback: синхронная генерация
      const data = this.generateChunkSync(cx, cz);
      this.pendingMeshes.push({ cx, cz, data });
    } finally {
      // Удаляем из pending только после завершения генерации
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
        // Если не найдено в persistence, генерируем
        if (this.useWorkers && this.workerPool) {
          const generated = await this.workerPool.generateChunk(cx, cz, 0);
          this.pendingMeshes.push({ cx, cz, data: generated });
        } else {
          const generated = this.generateChunkSync(cx, cz);
          this.pendingMeshes.push({ cx, cz, data: generated });
        }
      }
    } catch (error) {
      console.error(`Failed to load chunk (${cx}, ${cz}):`, error);
      // Fallback: синхронная генерация
      const generated = this.generateChunkSync(cx, cz);
      this.pendingMeshes.push({ cx, cz, data: generated });
    } finally {
      this.loadingKeys.delete(key);
      // Удаляем из pending только после завершения загрузки
      this.pendingChunks.delete(key);
    }
  }

  /**
   * Синхронная генерация чанка (fallback или для waitForChunk)
   */
  private generateChunkSync(cx: number, cz: number): Uint8Array {
    const data = new Uint8Array(this.chunkSize * this.chunkSize * this.chunkHeight);
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    const blockIndexGetter = createBlockIndexGetter(this.chunkSize, this.chunkHeight);

    // Generate terrain
    this.terrainGen.generateTerrain(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      blockIndexGetter,
    );

    // Generate ores
    this.structureGen.generateOres(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      blockIndexGetter,
    );

    // Generate trees
    this.structureGen.generateTrees(
      data,
      this.chunkSize,
      this.chunkHeight,
      blockIndexGetter,
    );

    return data;
  }

  /**
   * Обновить seed для воркеров
   */
  public setSeed(seed: number): void {
    if (this.useWorkers && this.workerPool) {
      this.workerPool.setSeed(seed);
    }
  }

  /**
   * Очистить очередь и завершить воркеры
   */
  public clear(): void {
    this.queue = [];
    this.pendingChunks.clear();
    this.pendingMeshes = [];
    
    // Завершить воркеры
    if (this.useWorkers && this.workerPool) {
      this.workerPool.terminate();
    }
  }
  
  /**
   * Получить статистику воркеров (для отладки)
   */
  public getWorkerStats(): { queueSize: number; busyWorkers: number } | null {
    if (!this.useWorkers || !this.workerPool) return null;
    
    return {
      queueSize: this.workerPool.getQueueSize(),
      busyWorkers: this.workerPool.getBusyCount(),
    };
  }
}
