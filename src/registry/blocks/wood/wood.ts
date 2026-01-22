import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType } from "../../types";

/**
 * Блок дерева (ствол)
 * Основной строительный материал
 */
export const WOOD_BLOCK: BlockDefinition = {
  // Идентификация
  id: "wood",
  numericId: 5, // BLOCK.WOOD
  name: "Wood",
  description: "A block of wood from a tree trunk",

  // Тип и физика
  type: BlockType.WOOD,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 3000, // Базовое время
  requiredTool: ToolType.AXE, // Лучше всего топором

  // Дроп
  drops: [
    {
      itemId: "wood",
      count: 1,
      chance: 1.0,
    },
  ],

  // Рендеринг (процедурная генерация)
  colors: {
    top: { r: 0.4, g: 0.2, b: 0.0 }, // Коричневый
    side: { r: 0.4, g: 0.2, b: 0.0 },
  },
  transparent: false,

  // Стак
  stackSize: 64,
};
