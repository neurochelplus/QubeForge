import { createNoise2D } from "simplex-noise";
import { BLOCK } from "../../constants/Blocks";

export class TerrainGenerator {
  private noise2D: (x: number, y: number) => number;
  private seed: number;

  private readonly TERRAIN_SCALE = 50;
  private readonly TERRAIN_HEIGHT = 8;
  private readonly BASE_HEIGHT = 20;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2147483647);
    this.noise2D = this.createNoiseGenerator();
  }

  private createNoiseGenerator() {
    let a = this.seed;
    const random = () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return createNoise2D(random);
  }

  public getSeed(): number {
    return this.seed;
  }

  public setSeed(seed: number) {
    this.seed = seed;
    this.noise2D = this.createNoiseGenerator();
  }

  public getTerrainHeight(worldX: number, worldZ: number): number {
    const noiseValue = this.noise2D(
      worldX / this.TERRAIN_SCALE,
      worldZ / this.TERRAIN_SCALE,
    );
    let height = Math.floor(noiseValue * this.TERRAIN_HEIGHT) + this.BASE_HEIGHT;
    if (height < 1) height = 1;
    return height;
  }

  public generateTerrain(
    data: Uint8Array,
    chunkSize: number,
    chunkHeight: number,
    startX: number,
    startZ: number,
    getBlockIndex: (x: number, y: number, z: number) => number,
  ) {
    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        const worldX = startX + x;
        const worldZ = startZ + z;

        let height = this.getTerrainHeight(worldX, worldZ);
        if (height >= chunkHeight) height = chunkHeight - 1;

        for (let y = 0; y <= height; y++) {
          let type = BLOCK.STONE;
          if (y === 0) type = BLOCK.BEDROCK;
          else if (y === height) type = BLOCK.GRASS;
          else if (y >= height - 3) type = BLOCK.DIRT;

          const index = getBlockIndex(x, y, z);
          data[index] = type;
        }
      }
    }
  }
}
