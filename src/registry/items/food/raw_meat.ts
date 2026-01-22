import type { ItemDefinition } from "../../types";

/**
 * Сырое мясо
 * Выпадает из мобов, можно съесть или приготовить в печи
 */
export const RAW_MEAT_ITEM: ItemDefinition = {
  // Идентификация
  id: "raw_meat",
  numericId: 40, // BLOCK.RAW_MEAT
  name: "Raw Meat",
  description: "Raw meat from animals, can be cooked",

  // Еда
  isFood: true,
  foodValue: 2, // Восстанавливает 2 HP
  eatTime: 1.5, // 1.5 секунды на поедание

  // Рендеринг (процедурная генерация)
  color: "#C85050", // Красноватый (TOOL_COLORS.RAW_MEAT)
  pattern: undefined, // Будет использован MEAT_PATTERN из ToolPatterns

  // Стак
  stackSize: 64,
};
