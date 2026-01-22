import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType } from "../../types";

/**
 * Блок земли
 * Природный блок, находится под травой
 */
export const DIRT_BLOCK: BlockDefinition = {
  // Идентификация
  id: "dirt",
  numericId: 2, // BLOCK.DIRT
  name: "Dirt",
  description: "A block of dirt",

  // Тип и физика
  type: BlockType.EARTH,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 750, // Базовое время (мс)
  requiredTool: ToolType.SHOVEL, // Лучше всего лопатой

  // Дроп
  drops: [
    {
      itemId: "dirt",
      count: 1,
      chance: 1.0,
    },
  ],

  // Рендеринг (процедурная генерация)
  colors: {
    top: { r: 0.54, g: 0.27, b: 0.07 }, // Коричневый
    side: { r: 0.54, g: 0.27, b: 0.07 },
  },
  transparent: false,

  // Стак
  stackSize: 64,
};
