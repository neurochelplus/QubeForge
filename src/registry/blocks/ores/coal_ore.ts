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
 * Угольная руда
 * Источник угля для топлива и крафта
 */
export const COAL_ORE_BLOCK: BlockDefinition = {
  // Идентификация
  id: "coal_ore",
  numericId: 10, // BLOCK.COAL_ORE
  name: "Coal Ore",
  description: "An ore containing coal",

  // Тип и физика
  type: BlockType.STONE,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 15000, // Долго без инструмента
  requiredTool: ToolType.PICKAXE,
  minToolMaterial: ToolMaterial.WOOD, // Минимум деревянная кирка

  // Дроп
  drops: [
    {
      itemId: "coal",
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
        primary: "#2A2A2A",   // Dark Grey/Black (coal)
        secondary: "#7D7D7D", // Stone Grey
      },
    },
  },
  transparent: false,

  // Стак
  stackSize: 64,
};
