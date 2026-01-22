import { BLOCK } from "./Blocks";

/**
 * Типы биомов
 */
export const BIOME = {
  PLAINS: 0,
  // Будущие биомы (пока не реализованы):
  // DESERT: 1,
  // FOREST: 2,
  // MOUNTAINS: 3,
  // SNOW: 4,
} as const;

export type BIOME = typeof BIOME[keyof typeof BIOME];

/**
 * Конфигурация биома
 */
export interface BiomeConfig {
  name: string;
  surfaceBlock: number;      // Блок поверхности (трава, песок, снег)
  subsurfaceBlock: number;   // Блок под поверхностью (земля, песок, камень)
  subsurfaceDepth: number;   // Глубина слоя subsurface блоков
  treeChance: number;        // Шанс генерации дерева (0.0 - 1.0)
  terrainScale: number;      // Масштаб шума для ландшафта
  terrainHeight: number;     // Высота вариации ландшафта
  baseHeight: number;        // Базовая высота ландшафта
}

/**
 * Конфигурации биомов
 */
export const BIOME_CONFIGS: Record<BIOME, BiomeConfig> = {
  [BIOME.PLAINS]: {
    name: "Plains",
    surfaceBlock: BLOCK.GRASS,
    subsurfaceBlock: BLOCK.DIRT,
    subsurfaceDepth: 3,
    treeChance: 0.01,
    terrainScale: 50,
    terrainHeight: 8,
    baseHeight: 20,
  },
  
  // Будущие биомы (закомментированы):
  /*
  [BIOME.DESERT]: {
    name: "Desert",
    surfaceBlock: BLOCK.SAND,
    subsurfaceBlock: BLOCK.SAND,
    subsurfaceDepth: 5,
    treeChance: 0.002, // Кактусы (редко)
    terrainScale: 40,
    terrainHeight: 6,
    baseHeight: 18,
  },
  
  [BIOME.FOREST]: {
    name: "Forest",
    surfaceBlock: BLOCK.GRASS,
    subsurfaceBlock: BLOCK.DIRT,
    subsurfaceDepth: 3,
    treeChance: 0.03, // Много деревьев
    terrainScale: 45,
    terrainHeight: 10,
    baseHeight: 22,
  },
  
  [BIOME.MOUNTAINS]: {
    name: "Mountains",
    surfaceBlock: BLOCK.STONE,
    subsurfaceBlock: BLOCK.STONE,
    subsurfaceDepth: 1,
    treeChance: 0.005, // Мало деревьев
    terrainScale: 30,
    terrainHeight: 30,
    baseHeight: 40,
  },
  
  [BIOME.SNOW]: {
    name: "Snow",
    surfaceBlock: BLOCK.SNOW,
    subsurfaceBlock: BLOCK.DIRT,
    subsurfaceDepth: 3,
    treeChance: 0.008, // Ели
    terrainScale: 50,
    terrainHeight: 12,
    baseHeight: 25,
  },
  */
};

/**
 * Получить конфигурацию биома
 */
export function getBiomeConfig(biome: BIOME): BiomeConfig {
  return BIOME_CONFIGS[biome];
}

/**
 * Получить название биома
 */
export function getBiomeName(biome: BIOME): string {
  return BIOME_CONFIGS[biome].name;
}
