// src/modding/ModAPI.ts
// Публичный API для модов

import type {
  ModAPIInterface,
  EventPriority,
  GameEventInterface,
  BlockConfig,
  ItemConfig,
  MobConfig,
  RecipeConfig,
} from './types';
import { EventBus } from './EventBus';
import { BlockRegistry, ItemRegistry, MobRegistry, RecipeRegistry } from './Registry';
import { ModAssetManager } from './AssetManager';
import { ConfigAPI } from './ConfigAPI';
import { UIAPI } from './UIAPI';
import { WorldAPI } from './WorldAPI';
import { PlayerAPI } from './PlayerAPI';

/**
 * Публичный API для модов
 */
export class ModAPI implements ModAPIInterface {
  public readonly modId: string;
  public readonly version: string;
  public readonly apiVersion: string;

  private eventBus: EventBus;
  private permissions: Set<string>;
  private unsubscribers: (() => void)[] = [];

  // Публичные API
  public readonly assets: ModAssetManager;
  public readonly config: ConfigAPI;
  public readonly ui: UIAPI;

  // Приватные API (инъекция зависимостей)
  private worldAPI: WorldAPI;
  private playerAPI: PlayerAPI;

  constructor(
    modId: string,
    version: string,
    apiVersion: string,
    permissions: string[],
    eventBus: EventBus
  ) {
    this.modId = modId;
    this.version = version;
    this.apiVersion = apiVersion;
    this.permissions = new Set(permissions);
    this.eventBus = eventBus;

    this.assets = new ModAssetManager(modId);
    this.config = new ConfigAPI(modId);
    this.ui = new UIAPI(modId);
    this.worldAPI = new WorldAPI(modId, this.permissions);
    this.playerAPI = new PlayerAPI(modId, this.permissions);
  }

  // ============================================
  // РЕГИСТРАЦИЯ
  // ============================================

  /**
   * Зарегистрировать новый блок
   */
  registerBlock(id: string, config: BlockConfig): number {
    this.checkPermission('world.modify');
    return BlockRegistry.register(`${this.modId}:${id}`, config);
  }

  /**
   * Зарегистрировать новый предмет
   */
  registerItem(id: string, config: ItemConfig): number {
    this.checkPermission('world.modify');
    return ItemRegistry.register(`${this.modId}:${id}`, config);
  }

  /**
   * Зарегистрировать нового моба
   */
  registerMob(id: string, config: MobConfig): number {
    this.checkPermission('mobs.register');
    return MobRegistry.register(`${this.modId}:${id}`, config);
  }

  /**
   * Зарегистрировать новый рецепт
   */
  registerRecipe(id: string, config: RecipeConfig): number {
    this.checkPermission('crafting.modify');
    return RecipeRegistry.register(`${this.modId}:${id}`, config);
  }

  // ============================================
  // СОБЫТИЯ
  // ============================================

  /**
   * Подписаться на событие
   */
  on(
    event: string,
    handler: (event: GameEventInterface) => void,
    priority: EventPriority = 'NORMAL'
  ): () => void {
    const unsubscribe = this.eventBus.on(event, handler, this.modId, priority);
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Одноразовая подписка на событие
   */
  once(
    event: string,
    handler: (event: GameEventInterface) => void,
    priority: EventPriority = 'NORMAL'
  ): () => void {
    const unsubscribe = this.eventBus.once(event, handler, this.modId, priority);
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }

  // ============================================
  // ДОСТУП К ИГРОВЫМ СИСТЕМАМ
  // ============================================

  /**
   * Получить API мира
   */
  getWorld(): WorldAPI {
    return this.worldAPI;
  }

  /**
   * Получить API игрока
   */
  getPlayer(): PlayerAPI {
    return this.playerAPI;
  }

  // ============================================
  // УТИЛИТЫ
  // ============================================

  /**
   * Логирование
   */
  log(message: string, ...args: unknown[]): void {
    console.log(`[${this.modId}] ${message}`, ...args);
  }

  /**
   * Предупреждение
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.modId}] ${message}`, ...args);
  }

  /**
   * Ошибка
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.modId}] ${message}`, ...args);
  }

  /**
   * Преобразовать строковый ID в числовой
   */
  resolveId(stringId: string): number | undefined {
    if (!isNaN(Number(stringId))) return Number(stringId);

    const block = BlockRegistry.get(stringId);
    if (block) return block.numericId;

    const item = ItemRegistry.get(stringId);
    if (item) return item.numericId;

    return undefined;
  }

  // ============================================
  // ВНУТРЕННИЕ МЕТОДЫ
  // ============================================

  /**
   * Проверка разрешения
   */
  private checkPermission(permission: string): void {
    if (!this.permissions.has(permission)) {
      throw new Error(`[${this.modId}] Permission denied: ${permission}`);
    }
  }

  /**
   * Очистка при выгрузке мода
   */
  _cleanup(): void {
    // Отписаться от всех событий
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];

    // Очистить UI элементы
    this.ui._cleanup();

    // Очистить ассеты
    this.assets.dispose();

    this.log('Mod unloaded');
  }

  /**
   * Инъекция зависимостей (вызывается ModLoader)
   */
  _injectDependencies(world: unknown, environment: unknown, player: unknown, inventory: unknown): void {
    this.worldAPI._setWorld(world as import('../world/World').World);
    this.worldAPI._setEnvironment(environment as import('../world/Environment').Environment);
    this.playerAPI._setPlayer(player as import('../player/Player').Player);
    this.playerAPI._setInventory(inventory as import('../inventory/Inventory').Inventory);
  }
}
