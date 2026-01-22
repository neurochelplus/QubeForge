import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType } from "../../types";

// Паттерны текстур верстака
const CT_TOP_PATTERN = [
  "2222222222222222",
  "2111111111111112",
  "2111111111111112",
  "2112222222222112",
  "2112112112112112",
  "2112112112112112",
  "2112222222222112",
  "2112112112112112",
  "2112112112112112",
  "2112222222222112",
  "2112112112112112",
  "2112112112112112",
  "2112222222222112",
  "2111111111111112",
  "2111111111111112",
  "2222222222222222",
];

const CT_SIDE_PATTERN = [
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

const CT_BOTTOM_PATTERN = [
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
 * Верстак
 * Функциональный блок для крафта предметов
 */
export const CRAFTING_TABLE_BLOCK: BlockDefinition = {
  // Идентификация
  id: "crafting_table",
  numericId: 9, // BLOCK.CRAFTING_TABLE
  name: "Crafting Table",
  description: "A table for crafting items",

  // Тип и физика
  type: BlockType.WOOD,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 3000, // Как дерево/доски
  requiredTool: ToolType.AXE, // Топор эффективен

  // Дроп
  drops: [
    {
      itemId: "crafting_table",
      count: 1,
      chance: 1.0,
    },
  ],

  // Рендеринг (паттерны)
  textures: {
    top: {
      pattern: CT_TOP_PATTERN,
      colors: {
        primary: "#B47850",   // Light Brown
        secondary: "#50321E", // Dark Brown
      },
    },
    side: {
      pattern: CT_SIDE_PATTERN,
      colors: {
        primary: "#B47850",
        secondary: "#50321E",
      },
    },
    bottom: {
      pattern: CT_BOTTOM_PATTERN,
      colors: {
        primary: "#B47850",
        secondary: "#50321E",
      },
    },
  },
  transparent: false,

  // Функциональность
  isInteractable: true,
  onInteract: "openCraftingTable", // Имя обработчика

  // Стак
  stackSize: 64,
};
