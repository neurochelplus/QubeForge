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

  constructor(
    scene: THREE.Scene,
    chunkSize: number,
    chunkHeight: number,
    seed?: number,
  ) {
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;

    this.terrainGen = new TerrainGenerator(seed);
    this.structureGen = new StructureGenerator(this.terrainGen);
    this.persistence = new ChunkPersistence();

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

  public getSeed(): number {
    return this.terrainGen.getSeed();
  }

  public setSeed(seed: number): void {
    this.terrainGen.setSeed(seed);
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
   */
  public setBlock(x: number, y: number, z: number, type: number): void {
    this.dataManager.setBlock(x, y, z, type);

    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);

    // Rebuild meshes
    this.rebuildChunkMesh(cx, cz);

    // Rebuild neighbors if on border
    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;

    if (localX === 0) this.rebuildChunkMesh(cx - 1, cz);
    if (localX === this.chunkSize - 1) this.rebuildChunkMesh(cx + 1, cz);
    if (localZ === 0) this.rebuildChunkMesh(cx, cz - 1);
    if (localZ === this.chunkSize - 1) this.rebuildChunkMesh(cx, cz + 1);
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
   * Дождаться загрузки чанка
   */
  public async waitForChunk(cx: number, cz: number): Promise<void> {
    const key = `${cx},${cz}`;
    if (this.dataManager.hasChunkData(key)) return;

    return new Promise((resolve) => {
      const check = () => {
        if (this.dataManager.hasChunkData(key)) {
          resolve();
        } else {
          this.ensureChunk(cx, cz);
          setTimeout(check, 100);
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
   * Очистить все чанки
   */
  public async clear(): Promise<void> {
    await this.persistence.clear();

    this.dataManager.clear();
    this.meshManager.clear();
    this.generationQueue.clear();

    this.terrainGen.setSeed(Math.floor(Math.random() * 2147483647));
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
