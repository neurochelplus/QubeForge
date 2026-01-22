# План улучшения генерации мира

**Дата:** 22 января 2026  
**Основано на:** WORLD_GENERATION_ANALYSIS.md

---

## 🎯 Быстрые победы (Quick Wins)

### 1. Централизация констант генерации

**Время:** 30 минут  
**Сложность:** Низкая  
**Эффект:** Упрощение настройки

**Что сделать:**

Создать `src/constants/WorldConstants.ts`:

```typescript
export const WORLD_GENERATION = {
  // Terrain
  TERRAIN_SCALE: 50,
  TERRAIN_HEIGHT: 8,
  BASE_HEIGHT: 20,
  
  // Chunks
  CHUNK_RADIUS: 2,
  CHUNK_SIZE: 32,
  CHUNK_HEIGHT: 128,
  
  // Structures
  TREE_CHANCE: 0.01,
  TREE_MIN_HEIGHT: 4,
  TREE_MAX_HEIGHT: 5,
  
  // Ores
  COAL_VEIN_SIZE: 8,
  COAL_ATTEMPTS: 80,
  IRON_VEIN_SIZE: 6,
  IRON_ATTEMPTS: 50,
} as const;
```

**Изменить файлы:**
- `TerrainGenerator.ts` — использовать константы
- `StructureGenerator.ts` — использовать константы
- `ChunkManager.ts` — использовать CHUNK_RADIUS

---

### 2. Утилита для getBlockIndex

**Время:** 15 минут  
**Сложность:** Низкая  
**Эффект:** Устранение дублирования

**Что сделать:**

Создать `src/utils/ChunkUtils.ts`:

```typescript
export class ChunkUtils {
  /**
   * Получить индекс блока в массиве чанка
   */
  static getBlockIndex(
    x: number,
    y: number,
    z: number,
    chunkSize: number,
    chunkHeight: number,
  ): number {
    return x + y * chunkSize + z * chunkSize * chunkHeight;
  }
  
  /**
   * Получить мировые координаты из координат чанка
   */
  static chunkToWorld(
    cx: number,
    cz: number,
    chunkSize: number,
  ): { x: number; z: number } {
    return {
      x: cx * chunkSize,
      z: cz * chunkSize,
    };
  }
  
  /**
   * Получить координаты чанка из мировых координат
   */
  static worldToChunk(
    x: number,
    z: number,
    chunkSize: number,
  ): { cx: number; cz: number } {
    return {
      cx: Math.floor(x / chunkSize),
      cz: Math.floor(z / chunkSize),
    };
  }
}
```

**Заменить в файлах:**
- `ChunkLoader.ts`
- `ChunkDataManager.ts`
- `ChunkGenerationQueue.ts`
- `TerrainGenerator.ts`
- `StructureGenerator.ts`

---

## 🚀 Критические улучшения

### 3. Интеграция Web Workers

**Время:** 4-6 часов  
**Сложность:** Средняя  
**Эффект:** Устранение фризов, плавный FPS

**Проблема:**
Генерация чанков блокирует главный поток → фризы при загрузке нескольких чанков.

**Решение:**

#### Шаг 1: Рефакторинг terrain.worker.ts

```typescript
// src/world/workers/terrain.worker.ts
import { createNoise2D } from "simplex-noise";
import { BLOCK } from "../../constants/Blocks";
import { WORLD_GENERATION } from "../../constants/WorldConstants";

interface GenerateMessage {
  type: "generate";
  cx: number;
  cz: number;
  seed: number;
  chunkSize: number;
  chunkHeight: number;
}

interface GenerateResponse {
  type: "generated";
  cx: number;
  cz: number;
  data: Uint8Array;
}

self.onmessage = (e: MessageEvent<GenerateMessage>) => {
  if (e.data.type === "generate") {
    const { cx, cz, seed, chunkSize, chunkHeight } = e.data;
    
    // Генерация в воркере
    const data = generateChunk(cx, cz, seed, chunkSize, chunkHeight);
    
    // Отправка результата
    const response: GenerateResponse = {
      type: "generated",
      cx,
      cz,
      data,
    };
    
    self.postMessage(response, [data.buffer]); // Transferable
  }
};

function generateChunk(
  cx: number,
  cz: number,
  seed: number,
  chunkSize: number,
  chunkHeight: number,
): Uint8Array {
  const data = new Uint8Array(chunkSize * chunkSize * chunkHeight);
  
  // Terrain generation
  const noise2D = createSeededNoise(seed);
  generateTerrain(data, cx, cz, noise2D, chunkSize, chunkHeight);
  
  // Ores
  generateOres(data, cx, cz, seed, chunkSize, chunkHeight);
  
  // Trees
  generateTrees(data, seed, chunkSize, chunkHeight);
  
  return data;
}

// ... остальные функции генерации
```

#### Шаг 2: Рефакторинг ChunkWorkerPool.ts

```typescript
// src/world/workers/ChunkWorkerPool.ts
export class ChunkWorkerPool {
  private workers: Worker[] = [];
  private queue: GenerateTask[] = [];
  private activeWorkers: Set<number> = new Set();
  
  constructor(poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(
        new URL("./terrain.worker.ts", import.meta.url),
        { type: "module" }
      );
      
      worker.onmessage = (e) => this.handleWorkerMessage(i, e);
      this.workers.push(worker);
    }
  }
  
  public generate(
    cx: number,
    cz: number,
    seed: number,
    priority: number,
    callback: (data: Uint8Array) => void,
  ): void {
    this.queue.push({ cx, cz, seed, priority, callback });
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processQueue();
  }
  
  private processQueue(): void {
    if (this.queue.length === 0) return;
    
    // Найти свободный воркер
    const freeWorkerIndex = this.workers.findIndex(
      (_, i) => !this.activeWorkers.has(i)
    );
    
    if (freeWorkerIndex === -1) return; // Все заняты
    
    const task = this.queue.shift()!;
    this.activeWorkers.add(freeWorkerIndex);
    
    // Отправить задачу воркеру
    this.workers[freeWorkerIndex].postMessage({
      type: "generate",
      cx: task.cx,
      cz: task.cz,
      seed: task.seed,
      chunkSize: WORLD_GENERATION.CHUNK_SIZE,
      chunkHeight: WORLD_GENERATION.CHUNK_HEIGHT,
    });
  }
  
  private handleWorkerMessage(workerIndex: number, e: MessageEvent): void {
    const { cx, cz, data } = e.data;
    
    // Найти callback
    const task = this.queue.find(t => t.cx === cx && t.cz === cz);
    if (task) {
      task.callback(data);
    }
    
    // Освободить воркер
    this.activeWorkers.delete(workerIndex);
    this.processQueue();
  }
  
  public dispose(): void {
    this.workers.forEach(w => w.terminate());
    this.workers = [];
    this.queue = [];
  }
}
```

#### Шаг 3: Интеграция в ChunkGenerationQueue

```typescript
// src/world/chunks/ChunkGenerationQueue.ts
export class ChunkGenerationQueue {
  private workerPool: ChunkWorkerPool;
  
  constructor(...) {
    // ...
    this.workerPool = new ChunkWorkerPool();
  }
  
  public process(
    onChunkGenerated: (cx: number, cz: number, data: Uint8Array) => void,
  ): void {
    if (this.queue.length > 0) {
      const item = this.queue.shift()!;
      const key = `${item.cx},${item.cz}`;
      
      // Проверить persistence
      if (this.persistence.hasChunk(key)) {
        this.loadFromPersistence(item.cx, item.cz, key);
      } else {
        // Генерация в воркере (асинхронно)
        this.workerPool.generate(
          item.cx,
          item.cz,
          this.terrainGen.getSeed(),
          item.priority,
          (data) => {
            onChunkGenerated(item.cx, item.cz, data);
          }
        );
      }
      
      this.pendingChunks.delete(key);
    }
  }
  
  public clear(): void {
    // ...
    this.workerPool.dispose();
  }
}
```

**Результат:**
- ✅ Генерация не блокирует главный поток
- ✅ Плавный FPS даже при загрузке 10+ чанков
- ✅ Лучший UX

---

## 🌍 Улучшение контента

### 4. Система биомов

**Время:** 8-12 часов  
**Сложность:** Средняя  
**Эффект:** Разнообразие ландшафта

**Что сделать:**

#### Шаг 1: Определить биомы

```typescript
// src/constants/Biomes.ts
export enum BIOME {
  PLAINS = 0,
  DESERT = 1,
  FOREST = 2,
  MOUNTAINS = 3,
  SNOW = 4,
}

export const BIOME_CONFIG = {
  [BIOME.PLAINS]: {
    name: "Plains",
    surfaceBlock: BLOCK.GRASS,
    subsurfaceBlock: BLOCK.DIRT,
    treeChance: 0.005,
    terrainScale: 50,
    terrainHeight: 8,
    baseHeight: 20,
  },
  [BIOME.DESERT]: {
    name: "Desert",
    surfaceBlock: BLOCK.SAND,
    subsurfaceBlock: BLOCK.SAND,
    treeChance: 0, // Кактусы вместо деревьев
    terrainScale: 40,
    terrainHeight: 6,
    baseHeight: 18,
  },
  [BIOME.FOREST]: {
    name: "Forest",
    surfaceBlock: BLOCK.GRASS,
    subsurfaceBlock: BLOCK.DIRT,
    treeChance: 0.03, // Больше деревьев
    terrainScale: 45,
    terrainHeight: 10,
    baseHeight: 22,
  },
  [BIOME.MOUNTAINS]: {
    name: "Mountains",
    surfaceBlock: BLOCK.STONE,
    subsurfaceBlock: BLOCK.STONE,
    treeChance: 0.001,
    terrainScale: 30,
    terrainHeight: 30, // Высокие горы
    baseHeight: 40,
  },
  [BIOME.SNOW]: {
    name: "Snow",
    surfaceBlock: BLOCK.SNOW,
    subsurfaceBlock: BLOCK.DIRT,
    treeChance: 0.01,
    terrainScale: 50,
    terrainHeight: 8,
    baseHeight: 20,
  },
} as const;
```

#### Шаг 2: Генератор биомов

```typescript
// src/world/generation/BiomeGenerator.ts
import { createNoise2D } from "simplex-noise";
import { BIOME, BIOME_CONFIG } from "../../constants/Biomes";

export class BiomeGenerator {
  private temperatureNoise: (x: number, y: number) => number;
  private humidityNoise: (x: number, y: number) => number;
  
  constructor(seed: number) {
    this.temperatureNoise = createNoise2D(this.createRandom(seed));
    this.humidityNoise = createNoise2D(this.createRandom(seed + 1000));
  }
  
  /**
   * Получить биом для координат
   */
  public getBiome(worldX: number, worldZ: number): BIOME {
    const scale = 200; // Большой масштаб для плавных переходов
    
    const temp = this.temperatureNoise(worldX / scale, worldZ / scale);
    const humidity = this.humidityNoise(worldX / scale, worldZ / scale);
    
    // Карта биомов на основе температуры и влажности
    if (temp < -0.3) return BIOME.SNOW;
    if (temp > 0.5 && humidity < -0.2) return BIOME.DESERT;
    if (temp > 0.2 && humidity > 0.3) return BIOME.FOREST;
    if (temp > 0.3) return BIOME.MOUNTAINS;
    
    return BIOME.PLAINS;
  }
  
  /**
   * Получить конфигурацию биома
   */
  public getBiomeConfig(biome: BIOME) {
    return BIOME_CONFIG[biome];
  }
  
  private createRandom(seed: number) {
    let a = seed;
    return () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
```

#### Шаг 3: Интеграция в TerrainGenerator

```typescript
// src/world/generation/TerrainGenerator.ts
export class TerrainGenerator {
  private biomeGen: BiomeGenerator;
  
  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2147483647);
    this.noise2D = this.createNoiseGenerator();
    this.biomeGen = new BiomeGenerator(this.seed);
  }
  
  public generateTerrain(...) {
    for (let x = 0; x < chunkSize; x++) {
      for (let z = 0; z < chunkSize; z++) {
        const worldX = startX + x;
        const worldZ = startZ + z;
        
        // Определить биом
        const biome = this.biomeGen.getBiome(worldX, worldZ);
        const config = this.biomeGen.getBiomeConfig(biome);
        
        // Высота на основе биома
        let height = this.getTerrainHeight(
          worldX,
          worldZ,
          config.terrainScale,
          config.terrainHeight,
          config.baseHeight,
        );
        
        // Блоки на основе биома
        for (let y = 0; y <= height; y++) {
          let type = BLOCK.STONE;
          if (y === 0) type = BLOCK.BEDROCK;
          else if (y === height) type = config.surfaceBlock;
          else if (y >= height - 3) type = config.subsurfaceBlock;
          
          const index = getBlockIndex(x, y, z);
          data[index] = type;
        }
      }
    }
  }
}
```

**Результат:**
- ✅ 5 разных биомов
- ✅ Разнообразие ландшафта
- ✅ Интереснее исследовать мир

---

## ⚡ Оптимизация рендеринга

### 5. Greedy Meshing

**Время:** 12-16 часов  
**Сложность:** Высокая  
**Эффект:** 5-10x меньше треугольников

**Что сделать:**

Рефакторинг `ChunkMeshBuilder.ts` с алгоритмом Greedy Meshing:

```typescript
// Псевдокод алгоритма
function greedyMesh(data: Uint8Array) {
  // Для каждой оси (X, Y, Z)
  for (const axis of [0, 1, 2]) {
    // Для каждого слоя вдоль оси
    for (let d = 0; d < chunkSize; d++) {
      // Создать маску граней
      const mask = createFaceMask(data, axis, d);
      
      // Объединить соседние грани в прямоугольники
      for (let j = 0; j < chunkSize; j++) {
        for (let i = 0; i < chunkSize; ) {
          if (mask[i][j]) {
            // Найти ширину прямоугольника
            let width = 1;
            while (i + width < chunkSize && mask[i + width][j]) {
              width++;
            }
            
            // Найти высоту прямоугольника
            let height = 1;
            while (j + height < chunkSize) {
              let canExtend = true;
              for (let k = 0; k < width; k++) {
                if (!mask[i + k][j + height]) {
                  canExtend = false;
                  break;
                }
              }
              if (!canExtend) break;
              height++;
            }
            
            // Добавить прямоугольник (вместо отдельных граней)
            addQuad(i, j, width, height, axis, d);
            
            // Очистить маску
            for (let h = 0; h < height; h++) {
              for (let w = 0; w < width; w++) {
                mask[i + w][j + h] = false;
              }
            }
            
            i += width;
          } else {
            i++;
          }
        }
      }
    }
  }
}
```

**Результат:**
- ✅ 5-10x меньше треугольников
- ✅ Выше FPS
- ✅ Меньше нагрузка на GPU

---

## 📊 Приоритизация

| Улучшение | Время | Сложность | Эффект | Приоритет |
|-----------|-------|-----------|--------|-----------|
| Централизация констант | 30 мин | Низкая | Средний | 🟢 Высокий |
| Утилита ChunkUtils | 15 мин | Низкая | Низкий | 🟢 Высокий |
| Web Workers | 4-6 ч | Средняя | Высокий | 🔴 Критический |
| Система биомов | 8-12 ч | Средняя | Высокий | 🟡 Средний |
| Greedy Meshing | 12-16 ч | Высокая | Высокий | 🟡 Средний |

---

## 🎯 Рекомендуемый порядок

### Неделя 1: Быстрые победы + Web Workers
1. День 1: Централизация констант (30 мин)
2. День 1: Утилита ChunkUtils (15 мин)
3. День 2-3: Интеграция Web Workers (4-6 ч)

### Неделя 2: Контент
4. День 4-6: Система биомов (8-12 ч)

### Неделя 3: Оптимизация
5. День 7-9: Greedy Meshing (12-16 ч)

---

## 🔗 Связанные документы

- `WORLD_GENERATION_ANALYSIS.md` — детальный анализ
- `REFACTORING World.md` — история рефакторинга
