import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { WORLD_GENERATION } from "../constants/WorldConstants";
import { ChunkManager } from "./chunks/ChunkManager";
import { logger } from "../utils/Logger";
import { BreakTimeCalculator } from "../registry/BreakTimeCalculator";
import type { SerializedInventory } from "../types/Inventory";

export class World {
  private chunkManager: ChunkManager;
  private worldId: string | null = null;

  constructor(scene: THREE.Scene, worldId?: string, dbName?: string) {
    this.worldId = worldId || null;
    this.chunkManager = new ChunkManager(
      scene,
      undefined,
      dbName,
      WORLD_GENERATION.USE_WEB_WORKERS
    );
  }

  /**
   * Получить ID текущего мира
   */
  public getWorldId(): string | null {
    return this.worldId;
  }

  /**
   * Установить ID мира (для переключения между мирами)
   */
  public setWorldId(worldId: string): void {
    this.worldId = worldId;
  }

  /**
   * Переинициализировать мир с новым worldId
   * Закрывает старое соединение и создаёт новый ChunkManager
   */
  public async reinitialize(scene: THREE.Scene, worldId: string, dbName: string): Promise<void> {
    // Сохраняем грязные чанки перед закрытием (только если есть что сохранять)
    try {
      const dirtyCount = this.chunkManager.getDirtyChunksCount();
      if (dirtyCount > 0) {
        await this.chunkManager.saveDirtyChunks();
      }
    } catch (e) {
      console.warn("Failed to save dirty chunks before reinitialize:", e);
    }

    // Очищаем только меши из памяти (НЕ удаляем данные из БД!)
    this.chunkManager.clearMemory();

    // Закрываем старое соединение с БД
    this.close();

    this.worldId = worldId;

    // Создаём новый ChunkManager
    this.chunkManager = new ChunkManager(
      scene,
      undefined,
      dbName,
      WORLD_GENERATION.USE_WEB_WORKERS
    );
  }

  public get noiseTexture(): THREE.DataTexture {
    return this.chunkManager.getNoiseTexture();
  }

  /**
   * Получить текущий seed мира
   */
  public getSeed(): number {
    return this.chunkManager.getSeed();
  }

  /**
   * Получить экземпляр БД для работы с данными мира
   */
  public getDB() {
    return this.chunkManager.getDB();
  }

  /**
   * Установить seed мира
   */
  public setSeed(seed: number): void {
    this.chunkManager.setSeed(seed);
  }

  // Persistence
  public async loadWorld(): Promise<{
    playerPosition?: THREE.Vector3;
    inventory?: SerializedInventory;
  }> {
    await this.chunkManager.init();

    const db = this.chunkManager.getDB();
    const meta = await db.get("player", "meta");

    if (meta?.seed !== undefined) {
      this.chunkManager.setSeed(meta.seed);
      logger.debug(`Loaded seed: ${meta.seed}`);
    } else {
      logger.debug(`No seed found, using current: ${this.chunkManager.getSeed()}`);
    }

    return meta
      ? {
        playerPosition: new THREE.Vector3(
          meta.position.x,
          meta.position.y,
          meta.position.z,
        ),
        inventory: meta.inventory,
      }
      : {};
  }

  public async saveWorld(playerData: {
    position: THREE.Vector3;
    inventory: SerializedInventory;
    sessionTime?: number; // Время сессии в секундах
  }) {
    logger.info("Saving world...");

    const db = this.chunkManager.getDB();
    await db.set(
      "player",
      {
        position: {
          x: playerData.position.x,
          y: playerData.position.y,
          z: playerData.position.z,
        },
        inventory: playerData.inventory,
        seed: this.chunkManager.getSeed(),
      },
      "meta",
    );

    await this.chunkManager.saveDirtyChunks();
    await this.chunkManager.saveDirtyChunks();

    // Обновляем метаданные мира (lastPlayed, playtime, позиция)
    if (this.worldId) {
      try {
        const { WorldManager } = await import("./WorldManager");
        const worldManager = WorldManager.getInstance();
        const worldMeta = await worldManager.getWorld(this.worldId);

        const updateData: any = {
          lastPlayed: Date.now(),
          playerPosition: {
            x: playerData.position.x,
            y: playerData.position.y,
            z: playerData.position.z,
          },
        };

        // Обновляем playtime если передано время сессии
        if (playerData.sessionTime !== undefined && worldMeta) {
          updateData.playtime = (worldMeta.playtime || 0) + playerData.sessionTime;
        }

        await worldManager.updateWorld(this.worldId, updateData);
      } catch (e) {
        console.warn("Failed to update world metadata:", e);
      }
    }

    logger.info("World saved");
  }

  public async deleteWorld() {
    logger.info("Deleting world...");
    await this.chunkManager.init();
    await this.chunkManager.clear();
    logger.info("World deleted");
  }

  /**
   * Закрыть соединение с БД мира
   */
  public close(): void {
    this.chunkManager.close();
  }

  // Chunk operations
  public update(playerPos: THREE.Vector3) {
    this.chunkManager.update(playerPos);
  }

  public updateChunkVisibility(camera: THREE.Camera) {
    this.chunkManager.updateVisibility(camera);
  }

  public async loadChunk(cx: number, cz: number) {
    await this.chunkManager.loadChunk(cx, cz);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    await this.chunkManager.waitForChunk(cx, cz);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    return this.chunkManager.isChunkLoaded(x, z);
  }

  // Block operations
  public getBlock(x: number, y: number, z: number): number {
    return this.chunkManager.getBlock(x, y, z);
  }

  public setBlock(x: number, y: number, z: number, type: number) {
    this.chunkManager.setBlock(x, y, z, type);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return this.chunkManager.hasBlock(x, y, z);
  }

  public getTopY(worldX: number, worldZ: number): number {
    return this.chunkManager.getTopY(worldX, worldZ);
  }

  public getChunkCount(): { visible: number; total: number } {
    return this.chunkManager.getChunkCount();
  }

  // Block breaking times
  public getBreakTime(blockType: number, toolId: number = 0): number {
    // Использовать новый калькулятор из реестра
    return BreakTimeCalculator.getBreakTime(blockType, toolId);
  }
}
