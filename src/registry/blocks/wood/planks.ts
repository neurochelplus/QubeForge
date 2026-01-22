import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType } from "../../types";

// Паттерн текстуры досок
const PLANKS_PATTERN = [
  "1111111111111111",
  "1111111111111111",
  "1111111111111111",
  "2222222222222222",
  "1111111111111111",
  "1111111111111111",
  "1111111111111111",
  "2222222222222222",
  "1111111111111111",
  "1111111111111111",
  "1111111111111111",
  "2222222222222222",
  "1111111111111111",
  "1111111111111111",
  "1111111111111111",
  "2222222222222222",
];

/**
 * Блок досок
 * Обработанное дерево для строительства
 */
export const PLANKS_BLOCK: BlockDefinition = {
  // Идентификация
  id: "planks",
  numericId: 7, // BLOCK.PLANKS
  name: "Planks",
  description: "Wooden planks for building",

  // Тип и физика
  type: BlockType.WOOD,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 3000, // Базовое время
  requiredTool: ToolType.AXE, // Лучше всего топором

  // Дроп
  drops: [
    {
      itemId: "planks",
      count: 1,
      chance: 1.0,
    },
  ],

  // Рендеринг (паттерн)
  textures: {
    top: {
      pattern: PLANKS_PATTERN,
      colors: {
        primary: "#C89664",   // Light wood
        secondary: "#8B6F47", // Dark wood grain
      },
    },
  },
  transparent: false,

  // Стак
  stackSize: 64,
};
