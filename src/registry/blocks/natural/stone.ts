import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType, ToolMaterial } from "../../types";

/**
 * Блок камня
 * Природный блок, основной материал для строительства
 */
export const STONE_BLOCK: BlockDefinition = {
  // Идентификация
  id: "stone",
  numericId: 3, // BLOCK.STONE
  name: "Stone",
  description: "A solid block of stone",

  // Тип и физика
  type: BlockType.STONE,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 4500, // Базовое время (долго без инструмента)
  requiredTool: ToolType.PICKAXE, // Требуется кирка
  minToolMaterial: ToolMaterial.WOOD, // Минимум деревянная кирка

  // Дроп
  drops: [
    {
      itemId: "stone",
      count: 1,
      chance: 1.0,
      requiresTool: ToolType.PICKAXE, // Дропается только с киркой
    },
  ],

  // Рендеринг (процедурная генерация)
  colors: {
    top: { r: 0.5, g: 0.5, b: 0.5 }, // Серый
    side: { r: 0.5, g: 0.5, b: 0.5 },
  },
  transparent: false,

  // Стак
  stackSize: 64,
};
