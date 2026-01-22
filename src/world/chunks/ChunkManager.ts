import * as THREE from "three";
import { ChunkLoader } from "./ChunkLoader";
import { ChunkVisibility } from "./ChunkVisibility";
import { logger } from "../../utils/Logger";

// Глобальный доступ к профайлеру (если есть)
declare global {
  interface Window {
    __profiler?: {
      startMeasure(label: string): void;
      endMeasure(label: string): void;
    };
  }
}

/**
 * Фасад для управления чанками
 * Координирует загрузку, выгрузку и видимость чанков
 */
export class ChunkManager {
  private chunkSize: number = 32;
  private chunkHeight: number = 128;

  private loader: ChunkLoader;
  private visibility: ChunkVisibility;

  // Throttling: обновлять чанки не каждый кадр
  private updateCounter: number = 0;
  private readonly UPDATE_INTERVAL: number = 3; // Каждые 3 кадра

  // Кэш позиции игрока для определения движения
  private lastPlayerChunkX: number = -Infinity;
  private lastPlayerChunkZ: number = -Infinity;

  // Кэшированные значения (RegExp не выполняется каждый кадр!)
  private readonly isMobile: boolean;
  private readonly chunkRadius: number;
  private readonly memoryCleanupChance: number;

  constructor(scene: THREE.Scene, seed?: number, dbName?: string) {
    this.loader = new ChunkLoader(scene, this.chunkSize, this.chunkHeight, seed, dbName);
    this.visibility = new ChunkVisibility(this.chunkSize, this.chunkHeight);

    // Кэшируем isMobile один раз при создании
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

    this.chunkRadius = 2; // Уменьшен с 3 до 2 для лучшей производительности
    this.memoryCleanupChance = this.isMobile ? 0.02 : 0.005;
  }

  public async init(): Promise<void> {
    await this.loader.init();
  }

  /**
   * Получить экземпляр DB для работы с метаданными
   */
  public getDB() {
    return this.loader.getDB();
  }

  /**
   * Закрыть соединение с БД
   */
  public close(): void {
    this.loader.close();
  }

  public getSeed(): number {
    return this.loader.getSeed();
  }

  public setSeed(seed: number): void {
    this.loader.setSeed(seed);
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.loader.getNoiseTexture();
  }

  /**
   * Обновить чанки вокруг игрока
   */
  public update(playerPos: THREE.Vector3): void {
    const profiler = window.__profiler;

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    // Throttling: полное обновление только каждые N кадров
    // или если игрок перешёл в новый чанк
    const playerMovedChunk = cx !== this.lastPlayerChunkX || cz !== this.lastPlayerChunkZ;
    this.updateCounter++;

    const shouldFullUpdate = playerMovedChunk || this.updateCounter >= this.UPDATE_INTERVAL;

    if (shouldFullUpdate) {
      this.updateCounter = 0;
      this.lastPlayerChunkX = cx;
      this.lastPlayerChunkZ = cz;
    }

    const radius = this.chunkRadius;

    const activeChunks = new Set<string>();

    // Загрузить чанки в радиусе (с приоритетом по расстоянию)
    profiler?.startMeasure('chunk-queue');
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let z = cz - radius; z <= cz + radius; z++) {
        const key = `${x},${z}`;
        activeChunks.add(key);

        if (!this.loader.getChunks().has(key)) {
          // Приоритет = расстояние от игрока (ближние первыми)
          const priority = Math.abs(x - cx) + Math.abs(z - cz);
          this.loader.ensureChunk(x, z, priority);
        }
      }
    }
    profiler?.endMeasure('chunk-queue');

    // Обработать очередь генерации (1 чанк за кадр)
    profiler?.startMeasure('chunk-generation');
    this.loader.processGenerationQueue();
    profiler?.endMeasure('chunk-generation');

    // Выгрузка и сортировка только при полном обновлении
    if (shouldFullUpdate) {
      // Выгрузить дальние чанки
      profiler?.startMeasure('chunk-unload');
      for (const [key] of this.loader.getChunks()) {
        if (!activeChunks.has(key)) {
          this.loader.unloadChunk(key);
          this.visibility.clearBounds(key);
        }
      }
      profiler?.endMeasure('chunk-unload');

      // Обновить сортировку чанков для early-z optimization
      profiler?.startMeasure('chunk-sorting');
      this.loader.updateChunkSorting(playerPos);
      profiler?.endMeasure('chunk-sorting');
    }

    // Memory cleanup (реже)
    if (Math.random() < this.memoryCleanupChance) {
      this.checkMemory(playerPos);
    }
  }

  /**
   * Обновить видимость чанков (frustum culling)
   */
  public updateVisibility(camera: THREE.Camera): void {
    this.visibility.update(camera, this.loader.getChunks());
  }

  /**
   * Очистка памяти от дальних чанков
   */
  private checkMemory(playerPos: THREE.Vector3): void {
    const chunksData = this.loader.getChunksData();
    if (chunksData.size <= 500) return;

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    const entries = Array.from(chunksData.entries());
    entries.sort((a, b) => {
      const [ax, az] = a[0].split(",").map(Number);
      const [bx, bz] = b[0].split(",").map(Number);
      const distA = (ax - cx) ** 2 + (az - cz) ** 2;
      const distB = (bx - cx) ** 2 + (bz - cz) ** 2;
      return distB - distA;
    });

    const dirtyChunks = this.loader.getDirtyChunks();

    for (let i = 0; i < 50 && i < entries.length; i++) {
      const [key] = entries[i];

      if (dirtyChunks.has(key)) {
        // Сохранение будет выполнено через saveDirtyChunks()
        continue;
      }

      chunksData.delete(key);
      this.loader.unloadChunk(key);
    }
    logger.debug("Memory cleanup performed.");
  }

  // Делегирование методов к ChunkLoader
  public getBlock(x: number, y: number, z: number): number {
    return this.loader.getBlock(x, y, z);
  }

  public setBlock(x: number, y: number, z: number, type: number): void {
    this.loader.setBlock(x, y, z, type);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return this.loader.hasBlock(x, y, z);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    return this.loader.isChunkLoaded(x, z);
  }

  public getTopY(worldX: number, worldZ: number): number {
    return this.loader.getTopY(worldX, worldZ);
  }

  public async loadChunk(cx: number, cz: number): Promise<void> {
    await this.loader.ensureChunk(cx, cz);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    await this.loader.waitForChunk(cx, cz);
  }

  public async saveDirtyChunks(): Promise<void> {
    await this.loader.saveDirtyChunks();
  }

  /**
   * Получить количество грязных чанков
   */
  public getDirtyChunksCount(): number {
    return this.loader.getDirtyChunks().size;
  }

  /**
   * Получить количество загруженных чанков
   */
  public getChunkCount(): { visible: number; total: number } {
    const chunks = this.loader.getChunks();
    let visible = 0;

    for (const [, chunk] of chunks) {
      if (chunk.mesh.visible) visible++;
    }

    return { visible, total: chunks.size };
  }

  public async clear(): Promise<void> {
    await this.loader.clear();
    this.visibility.clearAll();
  }

  /**
   * Очистить только меши и данные в памяти (без очистки БД)
   * Используется при переключении между мирами
   */
  public clearMemory(): void {
    this.loader.clearMemory();
    this.visibility.clearAll();
  }
}
