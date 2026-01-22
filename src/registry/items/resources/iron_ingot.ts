import type { ItemDefinition } from "../../types";

/**
 * Железный слиток
 * Получается из плавки железной руды, используется для крафта железных инструментов
 */
export const IRON_INGOT_ITEM: ItemDefinition = {
  // Идентификация
  id: "iron_ingot",
  numericId: 13, // BLOCK.IRON_INGOT
  name: "Iron Ingot",
  description: "A refined iron ingot",

  // Рендеринг (процедурная генерация)
  color: "#C0C0C0", // Серебристый (TOOL_COLORS.IRON)
  pattern: undefined, // Будет использован INGOT_PATTERN из ToolPatterns

  // Стак
  stackSize: 64,
};
