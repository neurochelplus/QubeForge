import type { ItemDefinition } from "../../types";

/**
 * Уголь
 * Топливо для печи, выпадает из угольной руды
 */
export const COAL_ITEM: ItemDefinition = {
  // Идентификация
  id: "coal",
  numericId: 12, // BLOCK.COAL
  name: "Coal",
  description: "A lump of coal, useful as fuel",

  // Топливо
  isFuel: true,
  burnTime: 80, // 80 секунд горения (самое эффективное топливо)

  // Рендеринг (процедурная генерация)
  color: "#2A2A2A", // Тёмно-серый/чёрный (TOOL_COLORS.COAL)
  pattern: undefined, // Будет использован COAL_PATTERN из ToolPatterns

  // Стак
  stackSize: 64,
};
