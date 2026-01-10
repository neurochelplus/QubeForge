import * as THREE from "three";
import { worldDB } from "../utils/DB";
import { BLOCK } from "../constants/Blocks";
import { ChunkManager } from "./ChunkManager";

export class World {
  private chunkManager: ChunkManager;

  constructor(scene: THREE.Scene) {
    this.chunkManager = new ChunkManager(scene);
  }

  public get noiseTexture(): THREE.DataTexture {
    return this.chunkManager.getNoiseTexture();
  }

  // Persistence
  public async loadWorld(): Promise<{
    playerPosition?: THREE.Vector3;
    inventory?: any;
  }> {
    await this.chunkManager.init();

    const meta = await worldDB.get("player", "meta");

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
  }) {
    console.log("Saving world...");

    await worldDB.set(
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
    console.log("World saved.");
  }

  public async deleteWorld() {
    console.log("Deleting world...");
    await worldDB.init();
    await this.chunkManager.clear();
    console.log("World deleted.");
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
