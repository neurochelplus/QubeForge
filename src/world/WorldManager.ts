/**
 * Менеджер миров - управляет списком миров и их метаданными
 * Singleton паттерн
 */

import { DB } from "../utils/DB";
import type { WorldMetadata } from "./WorldMetadata";
import { 
  generateWorldId, 
  hashSeed, 
  validateWorldName 
} from "./WorldMetadata";

const WORLDS_INDEX_DB = "qubeforge-worlds-index";
const WORLDS_STORE = "worlds";
const CURRENT_VERSION = 1;

export class WorldManager {
  private static instance: WorldManager;
  private db: DB | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): WorldManager {
    if (!WorldManager.instance) {
      WorldManager.instance = new WorldManager();
    }
    return WorldManager.instance;
  }

  /**
   * Инициализация БД индекса миров
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.db = new DB(WORLDS_INDEX_DB, WORLDS_STORE);
    
    // Кастомная инициализация для worlds store
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(WORLDS_INDEX_DB, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        (this.db as any).db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(WORLDS_STORE)) {
          const store = db.createObjectStore(WORLDS_STORE, { keyPath: "id" });
          store.createIndex("lastPlayed", "lastPlayed", { unique: false });
          store.createIndex("name", "name", { unique: false });
        }
      };
    });

    this.initialized = true;
  }

  /**
   * Получить список всех миров (сортировка по lastPlayed)
   */
  async listWorlds(): Promise<WorldMetadata[]> {
    if (!this.db) throw new Error("WorldManager not initialized");
    
    const all = await this.db.getAll(WORLDS_STORE);
    const worlds = all.map(item => item.value as WorldMetadata);
    
    // Сортировка по lastPlayed (новые первые)
    return worlds.sort((a, b) => b.lastPlayed - a.lastPlayed);
  }

  /**
   * Получить метаданные мира по ID
   */
  async getWorld(id: string): Promise<WorldMetadata | null> {
    if (!this.db) throw new Error("WorldManager not initialized");
    
    const world = await this.db.get(id, WORLDS_STORE);
    return world || null;
  }

  /**
   * Создать новый мир
   */
  async createWorld(
    name: string,
    seedInput?: string,
    gameMode: 'survival' | 'creative' | 'hardcore' = 'survival',
    difficulty: 0 | 1 | 2 | 3 = 2
  ): Promise<WorldMetadata> {
    if (!this.db) throw new Error("WorldManager not initialized");

    const validation = validateWorldName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const id = generateWorldId();
    const seed = hashSeed(seedInput || '');
    const now = Date.now();

    const metadata: WorldMetadata = {
      id,
      name: name.trim(),
      seed,
      gameMode,
      difficulty,
      createdAt: now,
      lastPlayed: now,
      playtime: 0,
      version: CURRENT_VERSION,
      playerPosition: { x: 8.5, y: 100, z: 20.5 },
      playerHp: 20,
      dayTime: 0,
      cheatsEnabled: gameMode === 'creative',
    };

    await this.db.set(id, metadata, WORLDS_STORE);
    return metadata;
  }

  /**
   * Обновить метаданные мира
   */
  async updateWorld(id: string, data: Partial<WorldMetadata>): Promise<void> {
    if (!this.db) throw new Error("WorldManager not initialized");

    const existing = await this.getWorld(id);
    if (!existing) {
      throw new Error(`World ${id} not found`);
    }

    // Валидация имени если меняется
    if (data.name !== undefined) {
      const validation = validateWorldName(data.name);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      data.name = data.name.trim();
    }

    const updated = { ...existing, ...data };
    await this.db.set(id, updated, WORLDS_STORE);
  }

  /**
   * Удалить мир и его БД
   */
  async deleteWorld(id: string): Promise<void> {
    if (!this.db) throw new Error("WorldManager not initialized");

    // Удаляем БД мира
    const worldDbName = this.getWorldDBName(id);
    try {
      await DB.deleteDatabase(worldDbName);
    } catch (e) {
      console.warn(`Failed to delete world database ${worldDbName}:`, e);
    }

    // Удаляем метаданные
    await this.db.delete(id, WORLDS_STORE);
  }

  /**
   * Получить имя БД для мира
   */
  getWorldDBName(id: string): string {
    return `qubeforge-world-${id}`;
  }

  /**
   * Проверить есть ли миры
   */
  async hasWorlds(): Promise<boolean> {
    const worlds = await this.listWorlds();
    return worlds.length > 0;
  }
}
