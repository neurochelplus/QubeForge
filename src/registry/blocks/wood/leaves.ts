import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics } from "../../types";

/**
 * Паттерн текстуры листвы
 * 1 = зелёный цвет листьев
 * 0 = прозрачность (дырки между листьями)
 */
const LEAVES_PATTERN = [
  "1101101011011010",
  "0110110101101101",
  "1011011010110110",
  "1101101011011010",
  "0110110101101101",
  "1011011010110110",
  "1101101011011010",
  "0110110101101101",
  "1011011010110110",
  "1101101011011010",
  "0110110101101101",
  "1011011010110110",
  "1101101011011010",
  "0110110101101101",
  "1011011010110110",
  "1101101011011010",
];

/**
 * Блок листвы
 * Декоративный блок, часть деревьев
 */
export const LEAVES_BLOCK: BlockDefinition = {
  // Идентификация
  id: "leaves",
  numericId: 6, // BLOCK.LEAVES
  name: "Leaves",
  description: "Leafy foliage from trees",

  // Тип и физика
  type: BlockType.PLANT,
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: 500, // Быстро ломается

  // Дроп
  drops: [
    {
      itemId: "leaves",
      count: 1,
      chance: 0.2, // 20% шанс выпадения
    },
  ],

  // Рендеринг (текстура с прозрачностью)
  textures: {
    top: {
      pattern: LEAVES_PATTERN,
      colors: {
        primary: "#228B22", // Зелёный цвет листьев (Forest Green)
        secondary: "#228B22", // Не используется, но требуется
      },
    },
  },
  transparent: true, // Прозрачный блок

  // Стак
  stackSize: 64,
};
