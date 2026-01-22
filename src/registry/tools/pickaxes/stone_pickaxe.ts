import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

/**
 * Каменная кирка
 * Улучшенный инструмент для добычи камня и руд
 */
export const STONE_PICKAXE: ToolDefinition = {
  // Идентификация
  id: "stone_pickaxe",
  numericId: 23, // BLOCK.STONE_PICKAXE
  name: "Stone Pickaxe",
  description: "A sturdy pickaxe made of stone",

  // Тип инструмента
  toolType: ToolType.PICKAXE,
  material: ToolMaterial.STONE,

  // Характеристики
  durability: 132,
  speedMultiplier: 7.5, // В 7.5 раз быстрее (4500/7.5 = 600ms)
  damage: 3,

  // Рендеринг (процедурная генерация)
  color: "#7D7D7D", // Серый (TOOL_COLORS.STONE)
  pattern: undefined, // Будет использован PICKAXE_PATTERN из ToolPatterns

  // Стак
  stackSize: 1,
};
