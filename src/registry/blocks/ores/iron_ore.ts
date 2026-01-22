import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType, ToolMaterial } from "../../types";

// Паттерн текстуры руды
const ORE_PATTERN = [
  "2222222222222222",
  "2211122222111222",
  "2211122222111222",
  "2221222222212222",
  "2222222222222222",
  "2222111222222222",
  "2222111222222222",
  "2222212222222222",
  "2222222222111222",
  "2222222222111222",
  "2222222222212222",
  "2211122222222222",
  "2211122222222222",
  "2221222222222222",
  "2222222222222222",
  "2222222222222222",
];

/**
 * Железная руда
 * Источник железа, требует плавки в печи
 */
export const IRON_ORE_BLOCK: BlockDefinition = {
  // Идентификация
  id: "iron_ore",
  numericId: 11, // BLOCK.IRON_ORE
  name: "Iron Ore",
  description: "An ore containing iron",

  // Тип и физика
  type: BlockType.STONE,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 15000, // Долго без инструмента
  requiredTool: ToolType.PICKAXE,
  minToolMaterial: ToolMaterial.STONE, // Требуется каменная кирка или лучше

  // Дроп
  drops: [
    {
      itemId: "iron_ore",
      count: 1,
      chance: 1.0,
      requiresTool: ToolType.PICKAXE,
    },
  ],

  // Рендеринг (паттерн)
  textures: {
    top: {
      pattern: ORE_PATTERN,
      colors: {
        primary: "#E6C8A0",   // Beige/Light Orange (iron)
        secondary: "#7D7D7D", // Stone Grey
      },
    },
  },
  transparent: false,

  // Стак
  stackSize: 64,
};
