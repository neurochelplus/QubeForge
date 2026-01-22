import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType } from "../../types";

/**
 * Блок травы
 * Природный блок с травяным покрытием
 */
export const GRASS_BLOCK: BlockDefinition = {
  // Идентификация
  id: "grass",
  numericId: 1, // BLOCK.GRASS
  name: "Grass Block",
  description: "A block of grass-covered dirt",

  // Тип и физика
  type: BlockType.EARTH,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 750, // Базовое время (мс)
  requiredTool: ToolType.SHOVEL, // Лучше всего лопатой

  // Дроп
  drops: [
    {
      itemId: "dirt", // Выпадает земля, а не трава
      count: 1,
      chance: 1.0,
    },
  ],

  // Рендеринг (процедурная генерация)
  colors: {
    top: { r: 0.33, g: 0.6, b: 0.33 }, // Зелёный
    side: { r: 0.54, g: 0.27, b: 0.07 }, // Коричневый
  },
  transparent: false,

  // Стак
  stackSize: 64,
};
