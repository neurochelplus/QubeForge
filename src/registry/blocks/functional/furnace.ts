import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType, ToolMaterial } from "../../types";

// Паттерны текстур печи
const FURNACE_FRONT_PATTERN = [
  "2222222222222222",
  "2222222222222222",
  "2211111111111122",
  "2212222222222122",
  "2212222222222122",
  "2212222222222122",
  "2211111111111122",
  "2222222222222222",
  "2222222222222222",
  "2211111111111122",
  "2212222222222122",
  "2212111111112122",
  "2212111111112122",
  "2212222222222122",
  "2211111111111122",
  "2222222222222222",
];

const FURNACE_SIDE_PATTERN = [
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
  "2222222222222222",
];

const FURNACE_TOP_PATTERN = [
  "2222222222222222",
  "2111111111111112",
  "2122222222222212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2121111111111212",
  "2122222222222212",
  "2111111111111112",
  "2222222222222222",
];

/**
 * Печь
 * Функциональный блок для плавки руды и приготовления еды
 */
export const FURNACE_BLOCK: BlockDefinition = {
  // Идентификация
  id: "furnace",
  numericId: 14, // BLOCK.FURNACE
  name: "Furnace",
  description: "A furnace for smelting ores and cooking food",

  // Тип и физика
  type: BlockType.STONE,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 4500, // Как камень
  requiredTool: ToolType.PICKAXE,
  minToolMaterial: ToolMaterial.WOOD,

  // Дроп
  drops: [
    {
      itemId: "furnace",
      count: 1,
      chance: 1.0,
      requiresTool: ToolType.PICKAXE,
    },
  ],

  // Рендеринг (паттерны)
  textures: {
    front: {
      pattern: FURNACE_FRONT_PATTERN,
      colors: {
        primary: "#404040",   // Dark Grey
        secondary: "#7D7D7D", // Stone Grey
      },
    },
    side: {
      pattern: FURNACE_SIDE_PATTERN,
      colors: {
        primary: "#404040",
        secondary: "#7D7D7D",
      },
    },
    top: {
      pattern: FURNACE_TOP_PATTERN,
      colors: {
        primary: "#404040",
        secondary: "#7D7D7D",
      },
    },
  },
  transparent: false,

  // Функциональность
  isInteractable: true,
  onInteract: "openFurnace", // Имя обработчика

  // Стак
  stackSize: 64,
};
