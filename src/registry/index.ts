/**
 * Система реестров для блоков, предметов и инструментов
 * 
 * Этот модуль предоставляет централизованное управление всеми игровыми объектами.
 * Каждый блок, предмет или инструмент регистрируется в соответствующем реестре
 * и может быть получен по строковому или числовому ID.
 */

// Экспорт типов
export * from "./types";

// Экспорт реестров
export { BlockRegistry } from "./BlockRegistry";
export { ItemRegistry } from "./ItemRegistry";
export { ToolRegistry } from "./ToolRegistry";

// Экспорт утилит
export { BreakTimeCalculator } from "./BreakTimeCalculator";

// Импорт реестров для инициализации
import { BlockRegistry } from "./BlockRegistry";
import { ItemRegistry } from "./ItemRegistry";
import { ToolRegistry } from "./ToolRegistry";

/**
 * Инициализировать все реестры
 * Должно быть вызвано при запуске игры, до использования любых блоков/предметов
 */
export function initRegistries(): void {
  console.log("Initializing all registries...");
  
  BlockRegistry.init();
  ItemRegistry.init();
  ToolRegistry.init();
  
  console.log("All registries initialized successfully");
}

/**
 * Очистить все реестры (для тестов)
 */
export function clearRegistries(): void {
  BlockRegistry.clear();
  ItemRegistry.clear();
  ToolRegistry.clear();
}
