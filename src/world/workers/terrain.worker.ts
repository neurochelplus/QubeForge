/**
 * Web Worker для генерации terrain
 * Выполняет тяжёлые вычисления в отдельном потоке
 */

import { createNoise2D } from "simplex-noise";
import { getBlockIndex } from "../../utils/ChunkUtils";
import { WORLD_GENERATION } from "../../constants/WorldConstants";

// Константы блоков (копия из Blocks.ts для изоляции воркера)
const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  BEDROCK: 4,
  WOOD: 5,
  LEAVES: 6,
  PLANKS: 7,
  CRAFTING_TABLE: 9,
  COAL_ORE: 10,
  IRON_ORE: 11,
  FURNACE: 14,
} as const;

// Параметры генерации из централизованных констант
const TERRAIN_SCALE = WORLD_GENERATION.TERRAIN_SCALE;
const TERRAIN_HEIGHT = WORLD_GENERATION.TERRAIN_HEIGHT;
const BASE_HEIGHT = WORLD_GENERATION.BASE_HEIGHT;
const TREE_CHANCE = WORLD_GENERATION.TREE_CHANCE;
const TREE_MIN_HEIGHT = WORLD_GENERATION.TREE_MIN_HEIGHT;
const TREE_MAX_HEIGHT = WORLD_GENERATION.TREE_MAX_HEIGHT;
const COAL_VEIN_SIZE = WORLD_GENERATION.COAL_VEIN_SIZE;
const COAL_ATTEMPTS = WORLD_GENERATION.COAL_ATTEMPTS;
const IRON_VEIN_SIZE = WORLD_GENERATION.IRON_VEIN_SIZE;
const IRON_ATTEMPTS = WORLD_GENERATION.IRON_ATTEMPTS;

// Кэш noise функции для текущего seed
let currentSeed: number = 0;
let noise2D: (x: number, y: number) => number;

function createNoiseGenerator(seed: number) {
  let a = seed;
  const random = () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return createNoise2D(random);
}

function getTerrainHeight(worldX: number, worldZ: number): number {
  const noiseValue = noise2D(worldX / TERRAIN_SCALE, worldZ / TERRAIN_SCALE);
  let height = Math.floor(noiseValue * TERRAIN_HEIGHT) + BASE_HEIGHT;
  if (height < 1) height = 1;
  return height;
}

function generateTerrain(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startZ: number,
) {
  for (let x = 0; x < chunkSize; x++) {
    for (let z = 0; z < chunkSize; z++) {
      const worldX = startX + x;
      const worldZ = startZ + z;

      let height = getTerrainHeight(worldX, worldZ);
      if (height >= chunkHeight) height = chunkHeight - 1;

      for (let y = 0; y <= height; y++) {
        let type = BLOCK.STONE;
        if (y === 0) type = BLOCK.BEDROCK;
        else if (y === height) type = BLOCK.GRASS;
        else if (y >= height - 3) type = BLOCK.DIRT;

        const index = getBlockIndex(x, y, z, chunkSize, chunkHeight);
        data[index] = type;
      }
    }
  }
}


function generateOres(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startZ: number,
) {
  // Coal ore
  generateVein(data, chunkSize, chunkHeight, startX, startZ, BLOCK.COAL_ORE, COAL_VEIN_SIZE, COAL_ATTEMPTS);
  // Iron ore
  generateVein(data, chunkSize, chunkHeight, startX, startZ, BLOCK.IRON_ORE, IRON_VEIN_SIZE, IRON_ATTEMPTS);
}

function generateVein(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startZ: number,
  blockType: number,
  targetLen: number,
  attempts: number,
) {
  for (let i = 0; i < attempts; i++) {
    let vx = Math.floor(Math.random() * chunkSize);
    let vz = Math.floor(Math.random() * chunkSize);

    const worldX = startX + vx;
    const worldZ = startZ + vz;
    const surfaceHeight = getTerrainHeight(worldX, worldZ);
    const maxStoneY = Math.max(2, surfaceHeight - 3);

    let vy = Math.floor(Math.random() * (maxStoneY - 1)) + 1;

    let index = getBlockIndex(vx, vy, vz, chunkSize, chunkHeight);
    if (data[index] === BLOCK.STONE) {
      data[index] = blockType;

      let currentLen = 1;
      let fails = 0;
      while (currentLen < targetLen && fails < 10) {
        const dir = Math.floor(Math.random() * 6);
        let nx = vx, ny = vy, nz = vz;

        if (dir === 0) nx++;
        else if (dir === 1) nx--;
        else if (dir === 2) ny++;
        else if (dir === 3) ny--;
        else if (dir === 4) nz++;
        else if (dir === 5) nz--;

        if (nx >= 0 && nx < chunkSize && ny > 0 && ny < chunkHeight && nz >= 0 && nz < chunkSize) {
          index = getBlockIndex(nx, ny, nz, chunkSize, chunkHeight);
          if (data[index] === BLOCK.STONE) {
            data[index] = blockType;
            vx = nx;
            vy = ny;
            vz = nz;
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

function findSurfaceHeight(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  x: number,
  z: number,
): number {
  for (let y = chunkHeight - 1; y >= 0; y--) {
    if (data[getBlockIndex(x, y, z, chunkSize, chunkHeight)] !== BLOCK.AIR) {
      return y;
    }
  }
  return -1;
}

function generateTrees(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
) {
  for (let x = 2; x < chunkSize - 2; x++) {
    for (let z = 2; z < chunkSize - 2; z++) {
      const height = findSurfaceHeight(data, chunkSize, chunkHeight, x, z);
      if (height > 0) {
        const index = getBlockIndex(x, height, z, chunkSize, chunkHeight);
        if (data[index] === BLOCK.GRASS && Math.random() < TREE_CHANCE) {
          placeTree(data, chunkSize, chunkHeight, x, height + 1, z);
        }
      }
    }
  }
}

function placeTree(
  data: Uint8Array,
  chunkSize: number,
  chunkHeight: number,
  startX: number,
  startY: number,
  startZ: number,
) {
  const trunkHeight = Math.floor(Math.random() * (TREE_MAX_HEIGHT - TREE_MIN_HEIGHT + 1)) + TREE_MIN_HEIGHT;

  // Trunk
  for (let y = 0; y < trunkHeight; y++) {
    const currentY = startY + y;
    if (currentY < chunkHeight) {
      const index = getBlockIndex(startX, currentY, startZ, chunkSize, chunkHeight);
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

        if (x >= 0 && x < chunkSize && y >= 0 && y < chunkHeight && z >= 0 && z < chunkSize) {
          const index = getBlockIndex(x, y, z, chunkSize, chunkHeight);
          if (data[index] !== BLOCK.WOOD) {
            data[index] = BLOCK.LEAVES;
          }
        }
      }
    }
  }
}


// Типы сообщений
interface GenerateMessage {
  type: 'generate';
  id: number;
  cx: number;
  cz: number;
  seed: number;
  chunkSize: number;
  chunkHeight: number;
}

interface ResultMessage {
  type: 'result';
  id: number;
  cx: number;
  cz: number;
  data: Uint8Array;
}

// Обработчик сообщений
self.onmessage = (e: MessageEvent<GenerateMessage>) => {
  const { type, id, cx, cz, seed, chunkSize, chunkHeight } = e.data;
  
  if (type === 'generate') {
    // Обновить seed если изменился
    if (seed !== currentSeed) {
      currentSeed = seed;
      noise2D = createNoiseGenerator(seed);
    }
    
    // Генерация данных чанка
    const data = new Uint8Array(chunkSize * chunkSize * chunkHeight);
    const startX = cx * chunkSize;
    const startZ = cz * chunkSize;
    
    // Terrain
    generateTerrain(data, chunkSize, chunkHeight, startX, startZ);
    
    // Ores
    generateOres(data, chunkSize, chunkHeight, startX, startZ);
    
    // Trees
    generateTrees(data, chunkSize, chunkHeight);
    
    // Отправить результат (transferable для zero-copy)
    const result: ResultMessage = {
      type: 'result',
      id,
      cx,
      cz,
      data,
    };
    
    self.postMessage(result, [data.buffer]);
  }
};

// Сообщить что воркер готов
self.postMessage({ type: 'ready' });
