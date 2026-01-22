import { createNoise2D } from "simplex-noise";
import { BIOME, getBiomeConfig, type BiomeConfig } from "../../constants/Biomes";

/**
 * Генератор биомов
 * Определяет биом для каждой координаты на основе температуры и влажности
 */
export class BiomeGenerator {
  private temperatureNoise: (x: number, y: number) => number;
  private humidityNoise: (x: number, y: number) => number;
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
    this.temperatureNoise = this.createNoiseGenerator(seed);
    this.humidityNoise = this.createNoiseGenerator(seed + 1000); // Разный seed для влажности
  }

  private createNoiseGenerator(seed: number) {
    let a = seed;
    const random = () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return createNoise2D(random);
  }

  /**
   * Получить биом для координат
   * Пока возвращает только PLAINS, но инфраструктура готова для будущих биомов
   */
  public getBiome(worldX: number, worldZ: number): BIOME {
    // Пока возвращаем только Plains
    // В будущем здесь будет логика определения биома на основе температуры и влажности
    return BIOME.PLAINS;

    /*
    // Будущая реализация (закомментирована):
    
    const temperature = this.getTemperature(worldX, worldZ);
    const humidity = this.getHumidity(worldX, worldZ);

    // Определение биома на основе температуры и влажности
    // Температура: -1.0 (холодно) до 1.0 (жарко)
    // Влажность: -1.0 (сухо) до 1.0 (влажно)

    if (temperature > 0.6) {
      // Жарко
      if (humidity < -0.3) {
        return BIOME.DESERT; // Жарко и сухо
      }
      return BIOME.PLAINS; // Жарко и влажно
    } else if (temperature < -0.4) {
      // Холодно
      return BIOME.SNOW; // Холодно
    } else if (humidity > 0.4) {
      // Умеренно и влажно
      return BIOME.FOREST;
    } else if (temperature > 0.2) {
      // Умеренно тепло
      return BIOME.MOUNTAINS;
    }

    return BIOME.PLAINS; // По умолчанию
    */
  }

  /**
   * Получить конфигурацию биома для координат
   */
  public getBiomeConfig(worldX: number, worldZ: number): BiomeConfig {
    const biome = this.getBiome(worldX, worldZ);
    return getBiomeConfig(biome);
  }

  /**
   * Получить температуру для координат
   * Возвращает значение от -1.0 (холодно) до 1.0 (жарко)
   */
  private getTemperature(worldX: number, worldZ: number): number {
    const scale = 200; // Большой масштаб для плавных переходов
    return this.temperatureNoise(worldX / scale, worldZ / scale);
  }

  /**
   * Получить влажность для координат
   * Возвращает значение от -1.0 (сухо) до 1.0 (влажно)
   */
  private getHumidity(worldX: number, worldZ: number): number {
    const scale = 180; // Немного другой масштаб для разнообразия
    return this.humidityNoise(worldX / scale, worldZ / scale);
  }

  /**
   * Обновить seed
   */
  public setSeed(seed: number): void {
    this.seed = seed;
    this.temperatureNoise = this.createNoiseGenerator(seed);
    this.humidityNoise = this.createNoiseGenerator(seed + 1000);
  }

  /**
   * Получить seed
   */
  public getSeed(): number {
    return this.seed;
  }
}
