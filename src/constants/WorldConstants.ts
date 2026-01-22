/**
 * Константы для генерации мира
 * Централизованное место для настройки параметров генерации
 */

export const WORLD_GENERATION = {
  // Terrain generation
  TERRAIN_SCALE: 50,
  TERRAIN_HEIGHT: 8,
  BASE_HEIGHT: 20,

  // Chunk settings
  CHUNK_SIZE: 32,
  CHUNK_HEIGHT: 128,
  CHUNK_RADIUS: 3, // Оптимальное значение (49 чанков)

  // Chunk updates
  UPDATE_INTERVAL: 3, // Обновлять чанки каждые 3 кадра
  MEMORY_CLEANUP_CHANCE_MOBILE: 0.02,
  MEMORY_CLEANUP_CHANCE_DESKTOP: 0.005,

  // Structure generation
  TREE_CHANCE: 0.01,
  TREE_MIN_HEIGHT: 4,
  TREE_MAX_HEIGHT: 5,

  // Ore generation
  COAL_VEIN_SIZE: 8,
  COAL_ATTEMPTS: 80,
  IRON_VEIN_SIZE: 6,
  IRON_ATTEMPTS: 50,

  // Web Workers
  USE_WEB_WORKERS: false, // Отключено: асинхронность создаёт задержки, синхронная генерация работает лучше
  WORKER_POOL_SIZE: Math.min(navigator.hardwareConcurrency || 4, 4), // Максимум 4 воркера
} as const;
