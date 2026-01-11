import { BLOCK } from "../../constants/Blocks";
import { TerrainGenerator } from "../generation/TerrainGenerator";

/**
 * Управление данными чанков (блоки, топология)
 */
export class ChunkDataManager {
  private chunksData: Map<string, Uint8Array> = new Map();
  private dirtyChunks: Set<string> = new Set();
  
  private chunkSize: number;
  private chunkHeight: number;
  private terrainGen: TerrainGenerator;

  constructor(
    chunkSize: number,
    chunkHeight: number,
    terrainGen: TerrainGenerator,
  ) {
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
    this.terrainGen = terrainGen;
  }

  /**
   * Получить данные чанка
   */
  public getChunkData(key: string): Uint8Array | undefined {
    return this.chunksData.get(key);
  }

  /**
   * Установить данные чанка
   */
  public setChunkData(key: string, data: Uint8Array, isDirty: boolean = false): void {
    this.chunksData.set(key, data);
    if (isDirty) {
      this.dirtyChunks.add(key);
    }
  }

  /**
   * Проверить наличие данных чанка
   */
  public hasChunkData(key: string): boolean {
    return this.chunksData.has(key);
  }

  /**
   * Удалить данные чанка
   */
  public deleteChunkData(key: string): void {
    this.chunksData.delete(key);
  }

  /**
   * Получить блок по мировым координатам
   */
  public getBlock(x: number, y: number, z: number): number {
    if (y < 0 || y >= this.chunkHeight) return BLOCK.AIR;

    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return BLOCK.AIR;

    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;

    const index = this.getBlockIndex(localX, y, localZ);
    return data[index];
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
   * Получить изменённые чанки
   */
  public getDirtyChunks(): Set<string> {
    return this.dirtyChunks;
  }

  /**
   * Очистить список изменённых чанков
   */
  public clearDirtyChunks(): void {
    this.dirtyChunks.clear();
  }

  /**
   * Получить все данные чанков
   */
  public getAllChunksData(): Map<string, Uint8Array> {
    return this.chunksData;
  }

  /**
   * Очистить все данные
   */
  public clear(): void {
    this.chunksData.clear();
    this.dirtyChunks.clear();
  }

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }
}
