import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

/**
 * Деревянная кирка
 * Базовый инструмент для добычи камня
 */
export const WOODEN_PICKAXE: ToolDefinition = {
  // Идентификация
  id: "wooden_pickaxe",
  numericId: 22, // BLOCK.WOODEN_PICKAXE
  name: "Wooden Pickaxe",
  description: "A basic pickaxe made of wood",

  // Тип инструмента
  toolType: ToolType.PICKAXE,
  material: ToolMaterial.WOOD,

  // Характеристики
  durability: 60,
  speedMultiplier: 4.0, // В 4 раза быстрее (4500/4 = 1125ms)
  damage: 2,

  // Рендеринг (процедурная генерация)
  color: "#B47850", // Светло-коричневый (TOOL_COLORS.WOOD)
  pattern: undefined, // Будет использован PICKAXE_PATTERN из ToolPatterns

  // Стак
  stackSize: 1,
};
