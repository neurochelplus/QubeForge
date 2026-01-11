// src/modding/ConfigAPI.ts
// API для хранения конфигурации модов

import type { ConfigAPIInterface } from './types';

/**
 * API для хранения настроек мода в localStorage
 */
export class ConfigAPI implements ConfigAPIInterface {
  private modId: string;
  private config: Map<string, unknown> = new Map();
  private readonly storageKey: string;

  constructor(modId: string) {
    this.modId = modId;
    this.storageKey = `qubeforge_mod_config_${modId}`;
    this.load();
  }

  /**
   * Получить значение по ключу
   */
  get<T>(key: string, defaultValue: T): T {
    if (!this.config.has(key)) {
      return defaultValue;
    }
    return this.config.get(key) as T;
  }

  /**
   * Установить значение
   */
  set<T>(key: string, value: T): void {
    this.config.set(key, value);
    this.save();
  }

  /**
   * Проверить наличие ключа
   */
  has(key: string): boolean {
    return this.config.has(key);
  }

  /**
   * Удалить ключ
   */
  delete(key: string): boolean {
    const result = this.config.delete(key);
    if (result) this.save();
    return result;
  }

  /**
   * Получить все настройки
   */
  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.config);
  }

  /**
   * Очистить все настройки
   */
  clear(): void {
    this.config.clear();
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Загрузить из localStorage
   */
  private load(): void {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.config = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn(`[${this.modId}] Failed to load config:`, error);
    }
  }

  /**
   * Сохранить в localStorage
   */
  private save(): void {
    try {
      const data = JSON.stringify(Object.fromEntries(this.config));
      localStorage.setItem(this.storageKey, data);
    } catch (error) {
      console.warn(`[${this.modId}] Failed to save config:`, error);
    }
  }
}
