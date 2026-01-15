import * as THREE from "three";
import { TerrainGenerator } from "../generation/TerrainGenerator";
import { StructureGenerator } from "../generation/StructureGenerator";
import { ChunkPersistence } from "./ChunkPersistence";
import { ChunkGenerationQueue } from "./ChunkGenerationQueue";
import { ChunkDataManager } from "./ChunkDataManager";
import { ChunkMeshManager } from "./ChunkMeshManager";
import type { ChunkMesh } from "./ChunkMeshManager";

/**
 * Фасад для управления загрузкой, генерацией и выгрузкой чанков
 * Координирует работу очереди генерации, данных и мешей
 */
export class ChunkLoader {
  private chunkSize: number;
  private chunkHeight: number;

  private terrainGen: TerrainGenerator;
  private structureGen: StructureGenerator;
  private persistence: ChunkPersistence;

  private generationQueue: ChunkGenerationQueue;
  private dataManager: ChunkDataManager;
  private meshManager: ChunkMeshManager;
  
  // Batch block updates: накапливаем изменения и применяем раз в N кадров
  private pendingMeshRebuilds: Set<string> = new Set();
  private rebuildCounter: number = 0;
  private readonly REBUILD_INTERVAL: number = 2; // Каждые 2 кадра

  constructor(
    scene: THREE.Scene,
    chunkSize: number,
    chunkHeight: number,
    seed?: number,
    dbName?: string,
  ) {
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;

    this.terrainGen = new TerrainGenerator(seed);
    this.structureGen = new StructureGenerator(this.terrainGen);
    this.persistence = new ChunkPersistence(dbName);

    this.generationQueue = new ChunkGenerationQueue(
      this.terrainGen,
      this.structureGen,
      this.persistence,
      chunkSize,
      chunkHeight,
    );

    this.dataManager = new ChunkDataManager(
      chunkSize,
      chunkHeight,
      this.terrainGen,
    );

    this.meshManager = new ChunkMeshManager(scene, chunkSize, chunkHeight);
  }

  public async init(): Promise<void> {
    await this.persistence.init();
  }

  /**
   * Получить экземпляр DB для работы с метаданными
   */
  public getDB() {
    return this.persistence.getDB();
  }

  /**
   * Закрыть соединение с БД
   */
  public close(): void {
    this.persistence.close();
  }

  public getSeed(): number {
    return this.terrainGen.getSeed();
  }

  public setSeed(seed: number): void {
    this.terrainGen.setSeed(seed);
    this.generationQueue.setSeed(seed);
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.meshManager.getNoiseTexture();
  }

  /**
   * Добавить чанк в очередь загрузки/генерации
   */
  public async ensureChunk(cx: number, cz: number, priority: number = 0): Promise<void> {
    const key = `${cx},${cz}`;

    // Уже загружен
    if (this.meshManager.getAllMeshes().has(key)) return;

    // Уже в очереди
    if (this.generationQueue.isPending(cx, cz)) return;

    // Данные есть, но меш не построен
    if (this.dataManager.hasChunkData(key)) {
      const data = this.dataManager.getChunkData(key)!;
      this.meshManager.buildMesh(
        cx,
        cz,
        data,
        this.getBlockIndex.bind(this),
        this.getBlock.bind(this),
      );
      return;
    }

    // Добавить в очередь генерации
    this.generationQueue.enqueue(cx, cz, priority);
  }

  /**
   * Обработать очередь генерации (вызывать каждый кадр)
   */
  public processGenerationQueue(): void {
    this.generationQueue.process((cx, cz, data) => {
      const key = `${cx},${cz}`;
      this.dataManager.setChunkData(key, data, true);
      this.meshManager.buildMesh(
        cx,
        cz,
        data,
        this.getBlockIndex.bind(this),
        this.getBlock.bind(this),
      );
    });
    
    // Batch rebuild: обработать накопленные изменения
    this.rebuildCounter++;
    if (this.rebuildCounter >= this.REBUILD_INTERVAL && this.pendingMeshRebuilds.size > 0) {
      this.rebuildCounter = 0;
      this.processPendingRebuilds();
    }
  }
  
  /**
   * Обработать накопленные перестройки мешей
   */
  private processPendingRebuilds(): void {
    for (const key of this.pendingMeshRebuilds) {
      const [cxStr, czStr] = key.split(',');
      const cx = parseInt(cxStr, 10);
      const cz = parseInt(czStr, 10);
      
      const data = this.dataManager.getChunkData(key);
      if (data) {
        this.meshManager.rebuildMesh(
          cx,
          cz,
          data,
          this.getBlockIndex.bind(this),
          this.getBlock.bind(this),
        );
      }
    }
    this.pendingMeshRebuilds.clear();
  }

  /**
   * Обновить сортировку чанков для early-z optimization
   */
  public updateChunkSorting(playerPos: THREE.Vector3): void {
    this.meshManager.updateSorting(playerPos);
  }

  /**
   * Выгрузить чанк
   */
  public unloadChunk(key: string): void {
    this.meshManager.unloadMesh(key);
  }

  /**
   * Перестроить меш чанка
   */
  public rebuildChunkMesh(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    const data = this.dataManager.getChunkData(key);
    this.meshManager.rebuildMesh(
      cx,
      cz,
      data,
      this.getBlockIndex.bind(this),
      this.getBlock.bind(this),
    );
  }

  /**
   * Получить блок по мировым координатам
   */
  public getBlock(x: number, y: number, z: number): number {
    return this.dataManager.getBlock(x, y, z);
  }

  /**
   * Установить блок по мировым координатам
   * Использует batch updates для уменьшения перестроек мешей
   */
  public setBlock(x: number, y: number, z: number, type: number): void {
    this.dataManager.setBlock(x, y, z, type);

    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);

    // Добавить в очередь перестройки (batch)
    this.pendingMeshRebuilds.add(`${cx},${cz}`);

    // Добавить соседние чанки если блок на границе
    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;

    if (localX === 0) this.pendingMeshRebuilds.add(`${cx - 1},${cz}`);
    if (localX === this.chunkSize - 1) this.pendingMeshRebuilds.add(`${cx + 1},${cz}`);
    if (localZ === 0) this.pendingMeshRebuilds.add(`${cx},${cz - 1}`);
    if (localZ === this.chunkSize - 1) this.pendingMeshRebuilds.add(`${cx},${cz + 1}`);
  }

  /**
   * Проверить наличие блока
   */
  public hasBlock(x: number, y: number, z: number): boolean {
    return this.dataManager.hasBlock(x, y, z);
  }

  /**
   * Получить верхнюю Y координату
   */
  public getTopY(worldX: number, worldZ: number): number {
    return this.dataManager.getTopY(worldX, worldZ);
  }

  /**
   * Проверить загружен ли чанк
   */
  public isChunkLoaded(x: number, z: number): boolean {
    return this.dataManager.isChunkLoaded(x, z);
  }

  /**
   * Дождаться загрузки чанка (с синхронной генерацией если нужно)
   */
  public async waitForChunk(cx: number, cz: number): Promise<void> {
    const key = `${cx},${cz}`;
    if (this.dataManager.hasChunkData(key)) return;

    // Попробовать загрузить из persistence
    const savedData = await this.persistence.loadChunk(key);
    if (savedData) {
      this.dataManager.setChunkData(key, savedData, false);
      this.meshManager.buildMesh(
        cx,
        cz,
        savedData,
        this.getBlockIndex.bind(this),
        this.getBlock.bind(this),
      );
      return;
    }

    // Синхронная генерация (для спавна игрока)
    this.generationQueue.enqueue(cx, cz, 0);
    
    // Принудительно обработать очередь
    return new Promise((resolve) => {
      const check = () => {
        this.generationQueue.process((genCx, genCz, data) => {
          const genKey = `${genCx},${genCz}`;
          this.dataManager.setChunkData(genKey, data, true);
          this.meshManager.buildMesh(
            genCx,
            genCz,
            data,
            this.getBlockIndex.bind(this),
            this.getBlock.bind(this),
          );
        });
        
        if (this.dataManager.hasChunkData(key)) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }

  /**
   * Сохранить изменённые чанки
   */
  public async saveDirtyChunks(): Promise<void> {
    const dirtyChunks = this.dataManager.getDirtyChunks();
    const toSave = new Map<string, Uint8Array>();
    
    for (const key of dirtyChunks) {
      const data = this.dataManager.getChunkData(key);
      if (data) {
        toSave.set(key, data);
      }
    }

    await this.persistence.saveBatch(toSave);
    this.dataManager.clearDirtyChunks();
  }

  /**
   * Очистить все чанки (включая БД)
   */
  public async clear(): Promise<void> {
    await this.persistence.clear();

    this.dataManager.clear();
    this.meshManager.clear();
    this.generationQueue.clear();

    this.terrainGen.setSeed(Math.floor(Math.random() * 2147483647));
  }

  /**
   * Очистить только меши и данные в памяти (без очистки БД)
   * Используется при переключении между мирами
   */
  public clearMemory(): void {
    this.dataManager.clear();
    this.meshManager.clear();
    this.generationQueue.clear();
  }

  /**
   * Получить все меши чанков
   */
  public getChunks(): Map<string, ChunkMesh> {
    return this.meshManager.getAllMeshes();
  }

  /**
   * Получить все данные чанков
   */
  public getChunksData(): Map<string, Uint8Array> {
    return this.dataManager.getAllChunksData();
  }

  /**
   * Получить изменённые чанки
   */
  public getDirtyChunks(): Set<string> {
    return this.dataManager.getDirtyChunks();
  }

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }
}
