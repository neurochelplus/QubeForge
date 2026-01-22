import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

/**
 * Каменный меч
 * Улучшенное оружие для боя
 */
export const STONE_SWORD: ToolDefinition = {
  // Идентификация
  id: "stone_sword",
  numericId: 21, // BLOCK.STONE_SWORD
  name: "Stone Sword",
  description: "A sturdy sword made of stone",

  // Тип инструмента
  toolType: ToolType.SWORD,
  material: ToolMaterial.STONE,

  // Характеристики
  durability: 132, // 132 использования
  speedMultiplier: 1.5,
  damage: 5, // Больше урона, чем деревянный

  // Рендеринг (процедурная генерация)
  color: "#7D7D7D", // Серый (TOOL_COLORS.STONE)
  pattern: undefined, // Будет использован SWORD_PATTERN из ToolPatterns

  // Стак
  stackSize: 1,
};
