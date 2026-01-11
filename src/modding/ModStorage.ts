// src/modding/ModStorage.ts
// Хранение модов в IndexedDB

import type { StoredMod } from './types';

const DB_NAME = 'QubeForge_Mods';
const DB_VERSION = 1;
const STORE_NAME = 'mods';

/**
 * Хранилище модов в IndexedDB
 */
export class ModStorage {
  private db: IDBDatabase | null = null;

  /**
   * Инициализация базы данных
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('order', 'order', { unique: false });
          store.createIndex('enabled', 'enabled', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        console.error('[ModStorage] Failed to open database:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Сохранить мод
   */
  async saveMod(mod: StoredMod): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(mod);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Получить мод по ID
   */
  async getMod(id: string): Promise<StoredMod | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Получить все моды
   */
  async getAllMods(): Promise<StoredMod[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('order');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Получить включённые моды
   */
  async getEnabledMods(): Promise<StoredMod[]> {
    const all = await this.getAllMods();
    return all.filter((m) => m.enabled).sort((a, b) => a.order - b.order);
  }

  /**
   * Удалить мод
   */
  async deleteMod(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Включить/выключить мод
   */
  async setEnabled(id: string, enabled: boolean): Promise<void> {
    const mod = await this.getMod(id);
    if (mod) {
      mod.enabled = enabled;
      await this.saveMod(mod);
    }
  }

  /**
   * Изменить порядок модов
   */
  async reorderMods(orderedIds: string[]): Promise<void> {
    const mods = await this.getAllMods();
    for (let i = 0; i < orderedIds.length; i++) {
      const mod = mods.find((m) => m.id === orderedIds[i]);
      if (mod) {
        mod.order = i;
        await this.saveMod(mod);
      }
    }
  }

  /**
   * Получить следующий порядковый номер
   */
  async getNextOrder(): Promise<number> {
    const mods = await this.getAllMods();
    return mods.reduce((max, m) => Math.max(max, m.order), -1) + 1;
  }
}

// Глобальный экземпляр
export const modStorage = new ModStorage();
