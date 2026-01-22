import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

/**
 * Железный меч
 * Мощное оружие для боя
 */
export const IRON_SWORD: ToolDefinition = {
  // Идентификация
  id: "iron_sword",
  numericId: 31, // BLOCK.IRON_SWORD
  name: "Iron Sword",
  description: "A powerful sword made of iron",

  // Тип инструмента
  toolType: ToolType.SWORD,
  material: ToolMaterial.IRON,

  // Характеристики
  durability: 250, // 250 использований
  speedMultiplier: 1.5,
  damage: 6, // Максимальный урон

  // Рендеринг (процедурная генерация)
  color: "#E0E0E0", // Светло-серый (TOOL_COLORS.IRON_TOOL)
  pattern: undefined, // Будет использован SWORD_PATTERN из ToolPatterns

  // Стак
  stackSize: 1,
};
