import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

/**
 * Железная кирка
 * Мощный инструмент для добычи любых руд
 */
export const IRON_PICKAXE: ToolDefinition = {
  // Идентификация
  id: "iron_pickaxe",
  numericId: 32, // BLOCK.IRON_PICKAXE
  name: "Iron Pickaxe",
  description: "A powerful pickaxe made of iron",

  // Тип инструмента
  toolType: ToolType.PICKAXE,
  material: ToolMaterial.IRON,

  // Характеристики
  durability: 250,
  speedMultiplier: 11.0, // В 11 раз быстрее (4500/11 ≈ 410ms)
  damage: 4,

  // Рендеринг (процедурная генерация)
  color: "#E0E0E0", // Светло-серый (TOOL_COLORS.IRON_TOOL)
  pattern: undefined, // Будет использован PICKAXE_PATTERN из ToolPatterns

  // Стак
  stackSize: 1,
};
