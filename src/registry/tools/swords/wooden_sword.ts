import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

/**
 * Деревянный меч
 * Базовое оружие для боя
 */
export const WOODEN_SWORD: ToolDefinition = {
  // Идентификация
  id: "wooden_sword",
  numericId: 20, // BLOCK.WOODEN_SWORD
  name: "Wooden Sword",
  description: "A basic sword made of wood",

  // Тип инструмента
  toolType: ToolType.SWORD,
  material: ToolMaterial.WOOD,

  // Характеристики
  durability: 60, // 60 использований
  speedMultiplier: 1.5, // Немного быстрее, чем рукой
  damage: 4, // Урон при ударе

  // Рендеринг (процедурная генерация)
  color: "#B47850", // Светло-коричневый (TOOL_COLORS.WOOD)
  pattern: undefined, // Будет использован SWORD_PATTERN из ToolPatterns

  // Стак
  stackSize: 1, // Инструменты не стакаются
};
