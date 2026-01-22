import type { ItemDefinition } from "../../types";

/**
 * Жареное мясо
 * Получается из приготовления сырого мяса в печи
 */
export const COOKED_MEAT_ITEM: ItemDefinition = {
  // Идентификация
  id: "cooked_meat",
  numericId: 41, // BLOCK.COOKED_MEAT
  name: "Cooked Meat",
  description: "Cooked meat, restores more health",

  // Еда
  isFood: true,
  foodValue: 5, // Восстанавливает 5 HP (больше, чем сырое)
  eatTime: 1.5, // 1.5 секунды на поедание

  // Рендеринг (процедурная генерация)
  color: "#8B4513", // Коричневый (TOOL_COLORS.COOKED_MEAT)
  pattern: undefined, // Будет использован MEAT_PATTERN из ToolPatterns

  // Стак
  stackSize: 64,
};
