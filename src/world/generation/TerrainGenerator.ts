import { createNoise2D } from "simplex-noise";
import { BLOCK } from "../../constants/Blocks";
import { WORLD_GENERATION } from "../../constants/WorldConstants";
import { BiomeGenerator } from "./BiomeGenerator";

export class TerrainGenerator {
  private noise2D: (x: number, y: number) => number;
  private seed: number;
  private biomeGen: BiomeGenerator;

  private readonly TERRAIN_SCALE = WORLD_GENERATION.TERRAIN_SCALE;
  private readonly TERRAIN_HEIGHT = WORLD_GENERATION.TERRAIN_HEIGHT;
  private readonly BASE_HEIGHT = WORLD_GENERATION.BASE_HEIGHT;

  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2147483647);
    this.noise2D = this.createNoiseGenerator();
    this.biomeGen = new BiomeGenerator(this.seed);
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
    this.biomeGen.setSeed(seed);
  }

  public getTerrainHeight(worldX: number, worldZ: number): number {
    // Получить конфигурацию биома для этих координат
    const biomeConfig = this.biomeGen.getBiomeConfig(worldX, worldZ);
    
    // Использовать параметры биома для генерации высоты
    const noiseValue = this.noise2D(
      worldX / biomeConfig.terrainScale,
      worldZ / biomeConfig.terrainScale,
    );
    let height = Math.floor(noiseValue * biomeConfig.terrainHeight) + biomeConfig.baseHeight;
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
    // ОПТИМИЗАЦИЯ: Получить конфигурацию биома один раз для всего чанка
    // Пока всегда PLAINS, поэтому можно кэшировать
    const biomeConfig = this.biomeGen.getBiomeConfig(startX, startZ);

    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        const worldX = startX + x;
        const worldZ = startZ + z;

        // ОПТИМИЗАЦИЯ: Вычислить высоту напрямую, без повторного вызова getBiomeConfig
        const noiseValue = this.noise2D(
          worldX / biomeConfig.terrainScale,
          worldZ / biomeConfig.terrainScale,
        );
        let height = Math.floor(noiseValue * biomeConfig.terrainHeight) + biomeConfig.baseHeight;
        if (height < 1) height = 1;
        if (height >= chunkHeight) height = chunkHeight - 1;

        for (let y = 0; y <= height; y++) {
          let type = BLOCK.STONE;
          if (y === 0) {
            type = BLOCK.BEDROCK;
          } else if (y === height) {
            type = biomeConfig.surfaceBlock;
          } else if (y >= height - biomeConfig.subsurfaceDepth) {
            type = biomeConfig.subsurfaceBlock;
          }

          const index = getBlockIndex(x, y, z);
          data[index] = type;
        }
      }
    }
  }

  /**
   * Получить генератор биомов (для использования в других генераторах)
   */
  public getBiomeGenerator(): BiomeGenerator {
    return this.biomeGen;
  }
}
