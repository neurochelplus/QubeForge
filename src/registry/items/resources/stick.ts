import type { ItemDefinition } from "../../types";

/**
 * Палка
 * Базовый ресурс для крафта инструментов
 */
export const STICK_ITEM: ItemDefinition = {
  // Идентификация
  id: "stick",
  numericId: 8, // BLOCK.STICK
  name: "Stick",
  description: "A wooden stick for crafting tools",

  // Топливо
  isFuel: true,
  burnTime: 5, // 5 секунд горения

  // Рендеринг (процедурная генерация)
  color: "#50321E", // Тёмно-коричневый (TOOL_COLORS.HANDLE)
  pattern: undefined, // Будет использован STICK_PATTERN из ToolPatterns

  // Стак
  stackSize: 64,
};
