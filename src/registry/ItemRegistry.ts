import type { ItemDefinition } from "./types";
import * as AllItems from "./items/index";

/**
 * Реестр предметов
 * Централизованное хранилище всех определений предметов
 * 
 * Автоматически регистрирует все предметы из ./items/index.ts
 */
export class ItemRegistry {
  private static items = new Map<string, ItemDefinition>();
  private static itemsByNumericId = new Map<number, ItemDefinition>();
  private static initialized = false;

  /**
   * Зарегистрировать предмет
   */
  public static register(item: ItemDefinition): void {
    if (this.items.has(item.id)) {
      throw new Error(`Item with id "${item.id}" already registered`);
    }
    if (this.itemsByNumericId.has(item.numericId)) {
      throw new Error(
        `Item with numericId ${item.numericId} already registered`,
      );
    }

    this.items.set(item.id, item);
    this.itemsByNumericId.set(item.numericId, item);
  }

  /**
   * Получить предмет по строковому ID
   */
  public static get(id: string): ItemDefinition | undefined {
    return this.items.get(id);
  }

  /**
   * Получить предмет по числовому ID
   */
  public static getByNumericId(numericId: number): ItemDefinition | undefined {
    return this.itemsByNumericId.get(numericId);
  }

  /**
   * Получить все предметы
   */
  public static getAll(): ItemDefinition[] {
    return Array.from(this.items.values());
  }

  /**
   * Проверить, зарегистрирован ли предмет
   */
  public static has(id: string): boolean {
    return this.items.has(id);
  }

  /**
   * Проверить, зарегистрирован ли предмет по числовому ID
   */
  public static hasByNumericId(numericId: number): boolean {
    return this.itemsByNumericId.has(numericId);
  }

  /**
   * Получить количество зарегистрированных предметов
   */
  public static count(): number {
    return this.items.size;
  }

  /**
   * Очистить реестр (для тестов)
   */
  public static clear(): void {
    this.items.clear();
    this.itemsByNumericId.clear();
    this.initialized = false;
  }

  /**
   * Инициализировать реестр (автоматическая регистрация всех предметов)
   */
  public static init(): void {
    if (this.initialized) {
      console.warn("ItemRegistry already initialized");
      return;
    }

    console.log("Initializing ItemRegistry...");

    // Автоматически регистрируем все предметы из ./items/index.ts
    Object.values(AllItems).forEach((item) => {
      if (this.isItemDefinition(item)) {
        this.register(item);
      }
    });

    this.initialized = true;
    console.log(`ItemRegistry initialized with ${this.count()} items`);
  }

  /**
   * Проверить, является ли объект определением предмета
   */
  private static isItemDefinition(obj: unknown): obj is ItemDefinition {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "numericId" in obj &&
      "stackSize" in obj
    );
  }

  /**
   * Проверить, инициализирован ли реестр
   */
  public static isInitialized(): boolean {
    return this.initialized;
  }
}
