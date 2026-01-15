import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { ChunkManager } from "./chunks/ChunkManager";

export class World {
  private chunkManager: ChunkManager;
  private worldId: string | null = null;

  constructor(scene: THREE.Scene, worldId?: string, dbName?: string) {
    this.worldId = worldId || null;
    this.chunkManager = new ChunkManager(scene, undefined, dbName);
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
    this.chunkManager = new ChunkManager(scene, undefined, dbName);
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
   * Установить seed мира
   */
  public setSeed(seed: number): void {
    this.chunkManager.setSeed(seed);
  }

  // Persistence
  public async loadWorld(): Promise<{
    playerPosition?: THREE.Vector3;
    inventory?: any;
  }> {
    await this.chunkManager.init();

    const db = this.chunkManager.getDB();
    const meta = await db.get("player", "meta");

    if (meta?.seed !== undefined) {
      this.chunkManager.setSeed(meta.seed);
      console.log(`Loaded seed: ${meta.seed}`);
    } else {
      console.log(`No seed found, using current: ${this.chunkManager.getSeed()}`);
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
    inventory: any;
    sessionTime?: number; // Время сессии в секундах
  }) {
    console.log("Saving world...");

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
    
    console.log("World saved.");
  }

  public async deleteWorld() {
    console.log("Deleting world...");
    await this.chunkManager.init();
    await this.chunkManager.clear();
    console.log("World deleted.");
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
    let time = 1000;

    switch (blockType) {
      case BLOCK.GRASS:
      case BLOCK.DIRT:
        if (toolId === BLOCK.IRON_SHOVEL) time = 100;
        else if (toolId === BLOCK.STONE_SHOVEL) time = 200;
        else if (toolId === BLOCK.WOODEN_SHOVEL) time = 400;
        else time = 750;
        break;

      case BLOCK.STONE:
      case BLOCK.FURNACE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 400;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 600;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 1150;
        else time = 7500;
        break;

      case BLOCK.IRON_ORE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 800;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 1150;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 7500;
        else time = 15000;
        break;

      case BLOCK.COAL_ORE:
        if (toolId === BLOCK.IRON_PICKAXE) time = 800;
        else if (toolId === BLOCK.STONE_PICKAXE) time = 1150;
        else if (toolId === BLOCK.WOODEN_PICKAXE) time = 2250;
        else time = 15000;
        break;

      case BLOCK.LEAVES:
        time = 500;
        break;

      case BLOCK.WOOD:
      case BLOCK.PLANKS:
        let multiplier = 1;
        if (
          toolId === BLOCK.WOODEN_AXE ||
          toolId === BLOCK.STONE_AXE ||
          toolId === BLOCK.IRON_AXE
        ) {
          if (toolId === BLOCK.IRON_AXE) multiplier = 8;
          else if (toolId === BLOCK.STONE_AXE) multiplier = 4;
          else multiplier = 2;
        }
        time = 3000 / multiplier;
        break;

      case BLOCK.BEDROCK:
        return Infinity;

      default:
        time = 1000;
        break;
    }

    return time;
  }
}
