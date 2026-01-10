import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { TerrainGenerator } from "./TerrainGenerator";
import { StructureGenerator } from "./StructureGenerator";
import { ChunkMeshBuilder } from "./ChunkMeshBuilder";
import { ChunkPersistence } from "./ChunkPersistence";

export type ChunkData = {
  mesh: THREE.Mesh;
  cx: number;
  cz: number;
};

/**
 * Управление загрузкой, генерацией и выгрузкой чанков
 */
export class ChunkLoader {
  private scene: THREE.Scene;
  private chunkSize: number;
  private chunkHeight: number;

  private chunks: Map<string, ChunkData> = new Map();
  private chunksData: Map<string, Uint8Array> = new Map();
  private dirtyChunks: Set<string> = new Set();

  private terrainGen: TerrainGenerator;
  private structureGen: StructureGenerator;
  private meshBuilder: ChunkMeshBuilder;
  private persistence: ChunkPersistence;

  constructor(
    scene: THREE.Scene,
    chunkSize: number,
    chunkHeight: number,
    seed?: number,
  ) {
    this.scene = scene;
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;

    this.terrainGen = new TerrainGenerator(seed);
    this.structureGen = new StructureGenerator(this.terrainGen);
    this.meshBuilder = new ChunkMeshBuilder();
    this.persistence = new ChunkPersistence();
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
    return this.meshBuilder.getNoiseTexture();
  }

  public getChunks(): Map<string, ChunkData> {
    return this.chunks;
  }

  public getChunksData(): Map<string, Uint8Array> {
    return this.chunksData;
  }

  public getDirtyChunks(): Set<string> {
    return this.dirtyChunks;
  }

  /**
   * Загрузить или сгенерировать чанк
   */
  public async ensureChunk(cx: number, cz: number): Promise<void> {
    const key = `${cx},${cz}`;

    if (this.chunksData.has(key)) {
      this.buildChunkMesh(cx, cz, this.chunksData.get(key)!);
      return;
    }

    if (this.persistence.hasChunk(key)) {
      if (this.persistence.isLoading(key)) return;

      const data = await this.persistence.loadChunk(key);
      if (data) {
        this.chunksData.set(key, data);
        this.buildChunkMesh(cx, cz, data);
      } else {
        this.generateChunk(cx, cz);
      }
      return;
    }

    this.generateChunk(cx, cz);
  }

  /**
   * Сгенерировать новый чанк
   */
  private generateChunk(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    const data = new Uint8Array(
      this.chunkSize * this.chunkSize * this.chunkHeight,
    );
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    // Generate terrain
    this.terrainGen.generateTerrain(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      this.getBlockIndex.bind(this),
    );

    // Generate ores
    this.structureGen.generateOres(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      this.getBlockIndex.bind(this),
    );

    // Generate trees
    this.structureGen.generateTrees(
      data,
      this.chunkSize,
      this.chunkHeight,
      this.getBlockIndex.bind(this),
    );

    this.chunksData.set(key, data);
    this.dirtyChunks.add(key);
    this.buildChunkMesh(cx, cz, data);
  }

  /**
   * Обновить сортировку чанков для early-z optimization
   */
  public updateChunkSorting(playerPos: THREE.Vector3): void {
    const playerCx = Math.floor(playerPos.x / this.chunkSize);
    const playerCz = Math.floor(playerPos.z / this.chunkSize);

    for (const [, chunk] of this.chunks) {
      const dx = chunk.cx - playerCx;
      const dz = chunk.cz - playerCz;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Ближние чанки рендерятся первыми (меньший renderOrder)
      chunk.mesh.renderOrder = Math.floor(distance);
    }
  }

  /**
   * Построить меш для чанка
   */
  private buildChunkMesh(cx: number, cz: number, data: Uint8Array): void {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return;

    const mesh = this.meshBuilder.buildMesh(
      data,
      cx,
      cz,
      this.chunkSize,
      this.chunkHeight,
      this.getBlockIndex.bind(this),
      this.getNeighborBlock.bind(this),
    );

    this.scene.add(mesh);
    this.chunks.set(key, { mesh, cx, cz });
  }

  /**
   * Перестроить меш чанка
   */
  public rebuildChunkMesh(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    const chunk = this.chunks.get(key);
    if (chunk) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
      this.chunks.delete(key);
    }

    const data = this.chunksData.get(key);
    if (data) {
      this.buildChunkMesh(cx, cz, data);
    }
  }

  /**
   * Выгрузить чанк
   */
  public unloadChunk(key: string): void {
    const chunk = this.chunks.get(key);
    if (chunk) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
      this.chunks.delete(key);
    }
  }

  /**
   * Получить блок по мировым координатам
   */
  public getBlock(x: number, y: number, z: number): number {
    return this.getNeighborBlock(x, y, z);
  }

  /**
   * Установить блок по мировым координатам
   */
  public setBlock(x: number, y: number, z: number, type: number): void {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return;

    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;

    if (y < 0 || y >= this.chunkHeight) return;

    const index = this.getBlockIndex(localX, y, localZ);
    data[index] = type;
    this.dirtyChunks.add(key);

    // Rebuild meshes
    this.rebuildChunkMesh(cx, cz);

    // Rebuild neighbors if on border
    if (localX === 0) this.rebuildChunkMesh(cx - 1, cz);
    if (localX === this.chunkSize - 1) this.rebuildChunkMesh(cx + 1, cz);
    if (localZ === 0) this.rebuildChunkMesh(cx, cz - 1);
    if (localZ === this.chunkSize - 1) this.rebuildChunkMesh(cx, cz + 1);
  }

  /**
   * Проверить наличие блока
   */
  public hasBlock(x: number, y: number, z: number): boolean {
    return this.getBlock(x, y, z) !== BLOCK.AIR;
  }

  /**
   * Получить верхнюю Y координату
   */
  public getTopY(worldX: number, worldZ: number): number {
    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;
    const data = this.chunksData.get(key);

    if (!data) return this.terrainGen.getTerrainHeight(worldX, worldZ);

    const localX = worldX - cx * this.chunkSize;
    const localZ = worldZ - cz * this.chunkSize;

    for (let y = this.chunkHeight - 1; y >= 0; y--) {
      const index = this.getBlockIndex(localX, y, localZ);
      if (data[index] !== BLOCK.AIR) {
        return y;
      }
    }
    return 0;
  }

  /**
   * Проверить загружен ли чанк
   */
  public isChunkLoaded(x: number, z: number): boolean {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;
    return this.chunksData.has(key);
  }

  /**
   * Дождаться загрузки чанка
   */
  public async waitForChunk(cx: number, cz: number): Promise<void> {
    const key = `${cx},${cz}`;
    if (this.chunksData.has(key)) return;

    return new Promise((resolve) => {
      const check = () => {
        if (this.chunksData.has(key)) {
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
    const toSave = new Map<string, Uint8Array>();
    for (const key of this.dirtyChunks) {
      const data = this.chunksData.get(key);
      if (data) {
        toSave.set(key, data);
      }
    }

    await this.persistence.saveBatch(toSave);
    this.dirtyChunks.clear();
  }

  /**
   * Очистить все чанки
   */
  public async clear(): Promise<void> {
    await this.persistence.clear();

    this.chunksData.clear();
    this.dirtyChunks.clear();

    for (const [, chunk] of this.chunks) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
    }
    this.chunks.clear();

    this.terrainGen.setSeed(Math.floor(Math.random() * 2147483647));
  }

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }

  private getNeighborBlock(
    worldX: number,
    worldY: number,
    worldZ: number,
  ): number {
    if (worldY < 0 || worldY >= this.chunkHeight) return BLOCK.AIR;

    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return BLOCK.AIR;

    const localX = worldX - cx * this.chunkSize;
    const localZ = worldZ - cz * this.chunkSize;

    const index = this.getBlockIndex(localX, worldY, localZ);
    return data[index];
  }
}
