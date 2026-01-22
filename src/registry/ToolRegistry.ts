import type { ToolDefinition } from "./types";
import * as AllTools from "./tools/index";

/**
 * Реестр инструментов
 * Централизованное хранилище всех определений инструментов
 * 
 * Автоматически регистрирует все инструменты из ./tools/index.ts
 */
export class ToolRegistry {
  private static tools = new Map<string, ToolDefinition>();
  private static toolsByNumericId = new Map<number, ToolDefinition>();
  private static initialized = false;

  /**
   * Зарегистрировать инструмент
   */
  public static register(tool: ToolDefinition): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool with id "${tool.id}" already registered`);
    }
    if (this.toolsByNumericId.has(tool.numericId)) {
      throw new Error(
        `Tool with numericId ${tool.numericId} already registered`,
      );
    }

    this.tools.set(tool.id, tool);
    this.toolsByNumericId.set(tool.numericId, tool);
  }

  /**
   * Получить инструмент по строковому ID
   */
  public static get(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  /**
   * Получить инструмент по числовому ID
   */
  public static getByNumericId(numericId: number): ToolDefinition | undefined {
    return this.toolsByNumericId.get(numericId);
  }

  /**
   * Получить все инструменты
   */
  public static getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Проверить, зарегистрирован ли инструмент
   */
  public static has(id: string): boolean {
    return this.tools.has(id);
  }

  /**
   * Проверить, зарегистрирован ли инструмент по числовому ID
   */
  public static hasByNumericId(numericId: number): boolean {
    return this.toolsByNumericId.has(numericId);
  }

  /**
   * Получить количество зарегистрированных инструментов
   */
  public static count(): number {
    return this.tools.size;
  }

  /**
   * Очистить реестр (для тестов)
   */
  public static clear(): void {
    this.tools.clear();
    this.toolsByNumericId.clear();
    this.initialized = false;
  }

  /**
   * Инициализировать реестр (автоматическая регистрация всех инструментов)
   */
  public static init(): void {
    if (this.initialized) {
      console.warn("ToolRegistry already initialized");
      return;
    }

    console.log("Initializing ToolRegistry...");

    // Автоматически регистрируем все инструменты из ./tools/index.ts
    Object.values(AllTools).forEach((tool) => {
      if (this.isToolDefinition(tool)) {
        this.register(tool);
      }
    });

    this.initialized = true;
    console.log(`ToolRegistry initialized with ${this.count()} tools`);
  }

  /**
   * Проверить, является ли объект определением инструмента
   */
  private static isToolDefinition(obj: unknown): obj is ToolDefinition {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "numericId" in obj &&
      "toolType" in obj &&
      "material" in obj
    );
  }

  /**
   * Проверить, инициализирован ли реестр
   */
  public static isInitialized(): boolean {
    return this.initialized;
  }
}
