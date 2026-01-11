// src/modding/types.ts
// TypeScript типы для Modding API

// ============================================
// МАНИФЕСТ МОДА
// ============================================

export interface ModManifest {
  id: string;
  name: string;
  version: string;
  apiVersion: string;
  author?: string;
  description?: string;
  minGameVersion?: string;
  dependencies?: string[];
  permissions: ModPermission[];
}

export type ModPermission =
  | 'world.read'
  | 'world.modify'
  | 'player.read'
  | 'player.modify'
  | 'mobs.read'
  | 'mobs.spawn'
  | 'mobs.register'
  | 'crafting.read'
  | 'crafting.modify'
  | 'ui.hud'
  | 'ui.menu'
  | 'storage';

// ============================================
// ОПРЕДЕЛЕНИЕ МОДА
// ============================================

export interface ModDefinition {
  init: (api: ModAPIInterface) => void;
  onEnable?: () => void;
  onDisable?: () => void;
}

export interface LoadedMod {
  manifest: ModManifest;
  definition: ModDefinition;
  api: ModAPIInterface;
  enabled: boolean;
}

export interface StoredMod {
  id: string;
  manifest: ModManifest;
  code: string;
  enabled: boolean;
  order: number;
  installedAt: number;
}

// ============================================
// СОБЫТИЯ
// ============================================

export type EventPriority = 'LOWEST' | 'LOW' | 'NORMAL' | 'HIGH' | 'HIGHEST' | 'MONITOR';

export interface EventListener {
  handler: (event: GameEventInterface) => void;
  priority: EventPriority;
  modId: string;
  once: boolean;
}

export interface GameEventInterface<T = unknown> {
  readonly type: string;
  readonly data: T;
  readonly timestamp: number;
  cancel(): void;
  isCancelled(): boolean;
}

// ============================================
// РЕГИСТРАЦИЯ СУЩНОСТЕЙ
// ============================================

export interface BlockConfig {
  name: string;
  texture: string | { top: string; side: string; bottom: string };
  hardness: number;
  tool?: 'pickaxe' | 'axe' | 'shovel' | 'sword' | 'none';
  toolLevel?: number;
  drops?: { id: number | string; count: number; chance?: number }[];
  isTransparent?: boolean;
  isSolid?: boolean;
  lightLevel?: number;
}

export interface ItemConfig {
  name: string;
  texture: string;
  stackSize: number;
  durability?: number;
  damage?: number;
  toolType?: 'pickaxe' | 'axe' | 'shovel' | 'sword';
  toolLevel?: number;
  foodValue?: number;
}

export interface MobConfig {
  name: string;
  health: number;
  damage: number;
  speed: number;
  width: number;
  height: number;
  hostile: boolean;
  drops: { id: number | string; count: number; chance?: number }[];
  spawnConditions?: {
    biome?: string[];
    minY?: number;
    maxY?: number;
    lightLevel?: { min: number; max: number };
    onBlocks?: number[];
  };
  ai?: 'passive' | 'neutral' | 'hostile' | 'custom';
  texture?: string;
}

export interface RecipeConfig {
  type: 'shaped' | 'shapeless' | 'smelting';
  pattern?: string[];
  keys?: Record<string, number | string>;
  ingredients?: { id: number | string; count: number }[];
  input?: number | string;
  cookTime?: number;
  result: { id: number | string; count: number };
}

// ============================================
// API ИНТЕРФЕЙСЫ
// ============================================

export interface ModAPIInterface {
  readonly modId: string;
  readonly version: string;
  readonly apiVersion: string;

  // Регистрация
  registerBlock(id: string, config: BlockConfig): number;
  registerItem(id: string, config: ItemConfig): number;
  registerMob(id: string, config: MobConfig): number;
  registerRecipe(id: string, config: RecipeConfig): number;

  // События
  on(event: string, handler: (event: GameEventInterface) => void, priority?: EventPriority): () => void;
  once(event: string, handler: (event: GameEventInterface) => void, priority?: EventPriority): () => void;

  // Доступ к игре
  getWorld(): WorldAPIInterface;
  getPlayer(): PlayerAPIInterface;

  // Утилиты
  readonly assets: AssetManagerInterface;
  readonly config: ConfigAPIInterface;
  readonly ui: UIAPIInterface;

  log(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  resolveId(stringId: string): number | undefined;
}

export interface WorldAPIInterface {
  getBlock(x: number, y: number, z: number): number;
  hasBlock(x: number, y: number, z: number): boolean;
  getTopY(x: number, z: number): number;
  setBlock(x: number, y: number, z: number, blockId: number): boolean;
  isDay(): boolean;
  getTimeOfDay(): number;
}

export interface PlayerAPIInterface {
  getPosition(): { x: number; y: number; z: number };
  getHealth(): number;
  getMaxHealth(): number;
  heal(amount: number): void;
  damage(amount: number): void;
  getSelectedSlot(): number;
  getSelectedItem(): { id: number; count: number };
  hasItem(itemId: number | string, count?: number): boolean;
  addItem(itemId: number, count: number): number;
  removeItem(itemId: number, count: number): boolean;
}

export interface AssetManagerInterface {
  loadTexture(source: string, options?: TextureOptions): Promise<unknown>;
  createTextureFromCanvas(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): unknown;
  createTextureFromPattern(pattern: string[], colorMap: Record<string, string>, pixelSize?: number): unknown;
  dispose(): void;
}

export interface TextureOptions {
  magFilter?: number;
  minFilter?: number;
  wrapS?: number;
  wrapT?: number;
}

export interface ConfigAPIInterface {
  get<T>(key: string, defaultValue: T): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  getAll(): Record<string, unknown>;
  clear(): void;
}

export interface UIAPIInterface {
  addHUDElement(id: string, options: HUDElementOptions): string;
  updateHUDElement(id: string, content: { html?: string; text?: string }): void;
  removeHUDElement(id: string): void;
  showNotification(message: string, duration?: number): void;
}

export interface HUDElementOptions {
  html?: string;
  text?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: Partial<CSSStyleDeclaration>;
}

// ============================================
// ГЛОБАЛЬНЫЙ API
// ============================================

declare global {
  interface Window {
    QubeForge: {
      registerMod: (id: string, manifest: Omit<ModManifest, 'id'>, definition: ModDefinition) => void;
      API_VERSION: string;
      GAME_VERSION: string;
    };
  }
}
