import type { BlockDefinition } from "./types";
import * as AllBlocks from "./blocks/index";

/**
 * Реестр блоков
 * Централизованное хранилище всех определений блоков
 * 
 * Автоматически регистрирует все блоки из ./blocks/index.ts
 */
export class BlockRegistry {
  private static blocks = new Map<string, BlockDefinition>();
  private static blocksByNumericId = new Map<number, BlockDefinition>();
  private static initialized = false;

  /**
   * Зарегистрировать блок
   */
  public static register(block: BlockDefinition): void {
    if (this.blocks.has(block.id)) {
      throw new Error(`Block with id "${block.id}" already registered`);
    }
    if (this.blocksByNumericId.has(block.numericId)) {
      throw new Error(
        `Block with numericId ${block.numericId} already registered`,
      );
    }

    this.blocks.set(block.id, block);
    this.blocksByNumericId.set(block.numericId, block);
  }

  /**
   * Получить блок по строковому ID
   */
  public static get(id: string): BlockDefinition | undefined {
    return this.blocks.get(id);
  }

  /**
   * Получить блок по числовому ID
   */
  public static getByNumericId(numericId: number): BlockDefinition | undefined {
    return this.blocksByNumericId.get(numericId);
  }

  /**
   * Получить все блоки
   */
  public static getAll(): BlockDefinition[] {
    return Array.from(this.blocks.values());
  }

  /**
   * Проверить, зарегистрирован ли блок
   */
  public static has(id: string): boolean {
    return this.blocks.has(id);
  }

  /**
   * Проверить, зарегистрирован ли блок по числовому ID
   */
  public static hasByNumericId(numericId: number): boolean {
    return this.blocksByNumericId.has(numericId);
  }

  /**
   * Получить количество зарегистрированных блоков
   */
  public static count(): number {
    return this.blocks.size;
  }

  /**
   * Очистить реестр (для тестов)
   */
  public static clear(): void {
    this.blocks.clear();
    this.blocksByNumericId.clear();
    this.initialized = false;
  }

  /**
   * Инициализировать реестр (автоматическая регистрация всех блоков)
   */
  public static init(): void {
    if (this.initialized) {
      console.warn("BlockRegistry already initialized");
      return;
    }

    console.log("Initializing BlockRegistry...");

    // Автоматически регистрируем все блоки из ./blocks/index.ts
    Object.values(AllBlocks).forEach((block) => {
      if (this.isBlockDefinition(block)) {
        this.register(block);
      }
    });

    this.initialized = true;
    console.log(`BlockRegistry initialized with ${this.count()} blocks`);
  }

  /**
   * Проверить, является ли объект определением блока
   */
  private static isBlockDefinition(obj: unknown): obj is BlockDefinition {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "numericId" in obj &&
      "type" in obj
    );
  }

  /**
   * Проверить, инициализирован ли реестр
   */
  public static isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Проверить, можно ли установить объект с данным ID как блок
   * @param numericId - числовой ID объекта
   * @returns true если это блок и его можно установить
   */
  public static canPlaceAsBlock(numericId: number): boolean {
    const block = this.getByNumericId(numericId);
    if (!block) return false;
    
    // По умолчанию все блоки можно устанавливать
    return block.isPlaceable !== false;
  }
}
