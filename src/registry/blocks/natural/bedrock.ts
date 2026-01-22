import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics } from "../../types";

/**
 * Блок коренной породы
 * Неразрушимый блок на дне мира
 */
export const BEDROCK_BLOCK: BlockDefinition = {
  // Идентификация
  id: "bedrock",
  numericId: 4, // BLOCK.BEDROCK
  name: "Bedrock",
  description: "An indestructible block",

  // Тип и физика
  type: BlockType.NONE, // Нельзя добыть
  physics: BlockPhysics.SOLID,

  // Характеристики ломания
  breakTime: Infinity, // Неразрушимый

  // Дроп
  drops: [], // Ничего не выпадает

  // Рендеринг (процедурная генерация)
  colors: {
    top: { r: 0.05, g: 0.05, b: 0.05 }, // Почти чёрный
    side: { r: 0.05, g: 0.05, b: 0.05 },
  },
  transparent: false,

  // Стак
  stackSize: 64,
};
