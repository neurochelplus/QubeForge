// src/modding/Registry.ts
// Регистрация блоков, предметов, мобов и рецептов

import type { BlockConfig, ItemConfig, MobConfig, RecipeConfig } from './types';
import { BLOCK } from '../constants/Blocks';

type RegistryEntry<T> = T & { numericId: number };

/**
 * Универсальный регистр для сущностей
 */
class Registry<T extends { name: string }> {
  private entries: Map<string, RegistryEntry<T>> = new Map();
  private idToKey: Map<number, string> = new Map();
  private nextId: number;
  private readonly registryName: string;

  constructor(name: string, startId: number) {
    this.registryName = name;
    this.nextId = startId;
  }

  /**
   * Зарегистрировать новую сущность
   */
  register(fullId: string, config: T): number {
    if (this.entries.has(fullId)) {
      console.warn(`[Registry:${this.registryName}] ID "${fullId}" already registered, skipping`);
      return this.entries.get(fullId)!.numericId;
    }

    const numericId = this.nextId++;
    const entry: RegistryEntry<T> = { ...config, numericId };

    this.entries.set(fullId, entry);
    this.idToKey.set(numericId, fullId);

    console.log(`[Registry:${this.registryName}] Registered "${fullId}" with ID ${numericId}`);
    return numericId;
  }

  /**
   * Зарегистрировать ванильную сущность с фиксированным ID
   */
  registerVanilla(vanillaId: number, fullId: string, config: T): void {
    const entry: RegistryEntry<T> = { ...config, numericId: vanillaId };
    this.entries.set(fullId, entry);
    this.idToKey.set(vanillaId, fullId);
  }

  /**
   * Получить сущность по строковому ID
   */
  get(fullId: string): RegistryEntry<T> | undefined {
    return this.entries.get(fullId);
  }

  /**
   * Получить сущность по числовому ID
   */
  getById(numericId: number): RegistryEntry<T> | undefined {
    const key = this.idToKey.get(numericId);
    return key ? this.entries.get(key) : undefined;
  }

  /**
   * Получить строковый ID по числовому
   */
  getKeyById(numericId: number): string | undefined {
    return this.idToKey.get(numericId);
  }

  /**
   * Проверить наличие по строковому ID
   */
  has(fullId: string): boolean {
    return this.entries.has(fullId);
  }

  /**
   * Проверить наличие по числовому ID
   */
  hasId(numericId: number): boolean {
    return this.idToKey.has(numericId);
  }

  /**
   * Получить все записи
   */
  getAll(): Map<string, RegistryEntry<T>> {
    return new Map(this.entries);
  }

  /**
   * Получить количество записей
   */
  size(): number {
    return this.entries.size;
  }
}

// ============================================
// ГЛОБАЛЬНЫЕ РЕГИСТРЫ
// ============================================

// Ванильные блоки: 0-99, Моды: 1000+
export const BlockRegistry = new Registry<BlockConfig>('blocks', 1000);

// Ванильные предметы: 0-99, Моды: 1000+
export const ItemRegistry = new Registry<ItemConfig>('items', 1000);

// Ванильные мобы: 0-99, Моды: 100+
export const MobRegistry = new Registry<MobConfig>('mobs', 100);

// Рецепты: моды начинаются с 1000
export const RecipeRegistry = new Registry<RecipeConfig>('recipes', 1000);

/**
 * Инициализация ванильных блоков
 */
export function initVanillaRegistry(): void {
  // Блоки
  BlockRegistry.registerVanilla(BLOCK.AIR, 'minecraft:air', {
    name: 'Air',
    texture: '',
    hardness: 0,
    isSolid: false,
    isTransparent: true,
  });

  BlockRegistry.registerVanilla(BLOCK.GRASS, 'minecraft:grass', {
    name: 'Grass',
    texture: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' },
    hardness: 0.6,
    tool: 'shovel',
    drops: [{ id: BLOCK.DIRT, count: 1 }],
  });

  BlockRegistry.registerVanilla(BLOCK.DIRT, 'minecraft:dirt', {
    name: 'Dirt',
    texture: 'dirt',
    hardness: 0.5,
    tool: 'shovel',
  });

  BlockRegistry.registerVanilla(BLOCK.STONE, 'minecraft:stone', {
    name: 'Stone',
    texture: 'stone',
    hardness: 1.5,
    tool: 'pickaxe',
    toolLevel: 0,
  });

  BlockRegistry.registerVanilla(BLOCK.BEDROCK, 'minecraft:bedrock', {
    name: 'Bedrock',
    texture: 'bedrock',
    hardness: -1, // Неразрушимый
  });

  BlockRegistry.registerVanilla(BLOCK.WOOD, 'minecraft:wood', {
    name: 'Wood',
    texture: 'wood',
    hardness: 2,
    tool: 'axe',
  });

  BlockRegistry.registerVanilla(BLOCK.LEAVES, 'minecraft:leaves', {
    name: 'Leaves',
    texture: 'leaves',
    hardness: 0.2,
    isTransparent: true,
  });

  BlockRegistry.registerVanilla(BLOCK.PLANKS, 'minecraft:planks', {
    name: 'Planks',
    texture: 'planks',
    hardness: 2,
    tool: 'axe',
  });

  BlockRegistry.registerVanilla(BLOCK.CRAFTING_TABLE, 'minecraft:crafting_table', {
    name: 'Crafting Table',
    texture: { top: 'crafting_table_top', side: 'crafting_table_side', bottom: 'planks' },
    hardness: 2.5,
    tool: 'axe',
  });

  BlockRegistry.registerVanilla(BLOCK.COAL_ORE, 'minecraft:coal_ore', {
    name: 'Coal Ore',
    texture: 'coal_ore',
    hardness: 3,
    tool: 'pickaxe',
    toolLevel: 0,
    drops: [{ id: BLOCK.COAL, count: 1 }],
  });

  BlockRegistry.registerVanilla(BLOCK.IRON_ORE, 'minecraft:iron_ore', {
    name: 'Iron Ore',
    texture: 'iron_ore',
    hardness: 3,
    tool: 'pickaxe',
    toolLevel: 1,
  });

  BlockRegistry.registerVanilla(BLOCK.FURNACE, 'minecraft:furnace', {
    name: 'Furnace',
    texture: { top: 'furnace_top', side: 'furnace_side', bottom: 'furnace_top' },
    hardness: 3.5,
    tool: 'pickaxe',
  });

  // Предметы (не блоки)
  ItemRegistry.registerVanilla(BLOCK.STICK, 'minecraft:stick', {
    name: 'Stick',
    texture: 'stick',
    stackSize: 64,
  });

  ItemRegistry.registerVanilla(BLOCK.COAL, 'minecraft:coal', {
    name: 'Coal',
    texture: 'coal',
    stackSize: 64,
  });

  ItemRegistry.registerVanilla(BLOCK.IRON_INGOT, 'minecraft:iron_ingot', {
    name: 'Iron Ingot',
    texture: 'iron_ingot',
    stackSize: 64,
  });

  // Инструменты
  ItemRegistry.registerVanilla(BLOCK.WOODEN_PICKAXE, 'minecraft:wooden_pickaxe', {
    name: 'Wooden Pickaxe',
    texture: 'wooden_pickaxe',
    stackSize: 1,
    durability: 60,
    toolType: 'pickaxe',
    toolLevel: 1,
  });

  ItemRegistry.registerVanilla(BLOCK.STONE_PICKAXE, 'minecraft:stone_pickaxe', {
    name: 'Stone Pickaxe',
    texture: 'stone_pickaxe',
    stackSize: 1,
    durability: 132,
    toolType: 'pickaxe',
    toolLevel: 2,
  });

  ItemRegistry.registerVanilla(BLOCK.IRON_PICKAXE, 'minecraft:iron_pickaxe', {
    name: 'Iron Pickaxe',
    texture: 'iron_pickaxe',
    stackSize: 1,
    durability: 251,
    toolType: 'pickaxe',
    toolLevel: 3,
  });

  // Еда
  ItemRegistry.registerVanilla(BLOCK.RAW_MEAT, 'minecraft:raw_meat', {
    name: 'Raw Meat',
    texture: 'raw_meat',
    stackSize: 64,
    foodValue: 2,
  });

  ItemRegistry.registerVanilla(BLOCK.COOKED_MEAT, 'minecraft:cooked_meat', {
    name: 'Cooked Meat',
    texture: 'cooked_meat',
    stackSize: 64,
    foodValue: 6,
  });

  console.log('[Registry] Vanilla registry initialized');
}
