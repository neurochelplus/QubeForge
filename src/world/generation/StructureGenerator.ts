import { BLOCK } from "../../constants/Blocks";
import { WORLD_GENERATION } from "../../constants/WorldConstants";
import type { TerrainGenerator } from "./TerrainGenerator";

export class StructureGenerator {
  private terrainGen: TerrainGenerator;
  
  constructor(terrainGen: TerrainGenerator) {
    this.terrainGen = terrainGen;
  }

  public generateTrees(
    data: Uint8Array,
    chunkSize: number,
    chunkHeight: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
  ) {
    for (let x = 2; x < chunkSize - 2; x++) {
      for (let z = 2; z < chunkSize - 2; z++) {
        const height = this.findSurfaceHeight(data, chunkSize, chunkHeight, x, z, getBlockIndex);
        if (height > 0) {
          const index = getBlockIndex(x, height, z);
          if (data[index] === BLOCK.GRASS && Math.random() < WORLD_GENERATION.TREE_CHANCE) {
            this.placeTree(data, chunkSize, chunkHeight, x, height + 1, z, getBlockIndex);
          }
        }
      }
    }
  }

  private findSurfaceHeight(
    data: Uint8Array,
    _chunkSize: number,
    chunkHeight: number,
    x: number,
    z: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
  ): number {
    for (let y = chunkHeight - 1; y >= 0; y--) {
      if (data[getBlockIndex(x, y, z)] !== BLOCK.AIR) {
        return y;
      }
    }
    return -1;
  }

  private placeTree(
    data: Uint8Array,
    chunkSize: number,
    chunkHeight: number,
    startX: number,
    startY: number,
    startZ: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
  ) {
    const trunkHeight = Math.floor(Math.random() * (WORLD_GENERATION.TREE_MAX_HEIGHT - WORLD_GENERATION.TREE_MIN_HEIGHT + 1)) + WORLD_GENERATION.TREE_MIN_HEIGHT;

    // Trunk
    for (let y = 0; y < trunkHeight; y++) {
      const currentY = startY + y;
      if (currentY < chunkHeight) {
        const index = getBlockIndex(startX, currentY, startZ);
        data[index] = BLOCK.WOOD;
      }
    }

    // Leaves
    const leavesStart = startY + trunkHeight - 2;
    const leavesEnd = startY + trunkHeight + 1;

    for (let y = leavesStart; y <= leavesEnd; y++) {
      const dy = y - (startY + trunkHeight - 1);
      let radius = 2;
      if (dy === 2) radius = 1;
      else if (dy === -1) radius = 2;

      for (let x = startX - radius; x <= startX + radius; x++) {
        for (let z = startZ - radius; z <= startZ + radius; z++) {
          const dx = x - startX;
          const dz = z - startZ;
          if (Math.abs(dx) === radius && Math.abs(dz) === radius) {
            if (Math.random() < 0.4) continue;
          }

          if (
            x >= 0 &&
            x < chunkSize &&
            y >= 0 &&
            y < chunkHeight &&
            z >= 0 &&
            z < chunkSize
          ) {
            const index = getBlockIndex(x, y, z);
            if (data[index] !== BLOCK.WOOD) {
              data[index] = BLOCK.LEAVES;
            }
          }
        }
      }
    }
  }

  public generateOres(
    data: Uint8Array,
    chunkSize: number,
    chunkHeight: number,
    startX: number,
    startZ: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
  ) {
    this.generateVein(
      data,
      chunkSize,
      chunkHeight,
      startX,
      startZ,
      BLOCK.COAL_ORE,
      WORLD_GENERATION.COAL_VEIN_SIZE,
      WORLD_GENERATION.COAL_ATTEMPTS,
      getBlockIndex,
    );
    this.generateVein(
      data,
      chunkSize,
      chunkHeight,
      startX,
      startZ,
      BLOCK.IRON_ORE,
      WORLD_GENERATION.IRON_VEIN_SIZE,
      WORLD_GENERATION.IRON_ATTEMPTS,
      getBlockIndex,
    );
  }

  private generateVein(
    data: Uint8Array,
    chunkSize: number,
    chunkHeight: number,
    startX: number,
    startZ: number,
    blockType: number,
    targetLen: number,
    attempts: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
  ) {
    for (let i = 0; i < attempts; i++) {
      let vx = Math.floor(Math.random() * chunkSize);
      let vz = Math.floor(Math.random() * chunkSize);

      const worldX = startX + vx;
      const worldZ = startZ + vz;
      const surfaceHeight = this.terrainGen.getTerrainHeight(worldX, worldZ);
      const maxStoneY = Math.max(2, surfaceHeight - 3);

      let vy = Math.floor(Math.random() * (maxStoneY - 1)) + 1;

      let index = getBlockIndex(vx, vy, vz);
      if (data[index] === BLOCK.STONE) {
        data[index] = blockType;

        let currentLen = 1;
        let fails = 0;
        while (currentLen < targetLen && fails < 10) {
          const dir = Math.floor(Math.random() * 6);
          let nx = vx,
            ny = vy,
            nz = vz;

          if (dir === 0) nx++;
          else if (dir === 1) nx--;
          else if (dir === 2) ny++;
          else if (dir === 3) ny--;
          else if (dir === 4) nz++;
          else if (dir === 5) nz--;

          if (
            nx >= 0 &&
            nx < chunkSize &&
            ny > 0 &&
            ny < chunkHeight &&
            nz >= 0 &&
            nz < chunkSize
          ) {
            index = getBlockIndex(nx, ny, nz);
            if (data[index] === BLOCK.STONE) {
              data[index] = blockType;
              vx = nx;
              vy = ny;
              nz = vz;
              currentLen++;
            } else if (data[index] === blockType) {
              vx = nx;
              vy = ny;
              vz = nz;
            } else {
              fails++;
            }
          } else {
            fails++;
          }
        }
      }
    }
  }
}
