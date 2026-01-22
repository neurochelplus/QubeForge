import type { ItemDefinition } from "../../types";

/**
 * Сломанный компас
 * Специальный предмет для случайной телепортации
 */
export const BROKEN_COMPASS_ITEM: ItemDefinition = {
  // Идентификация
  id: "broken_compass",
  numericId: 30, // BLOCK.BROKEN_COMPASS
  name: "Broken Compass",
  description: "A broken compass that teleports you randomly",

  // Специальный эффект
  onUse: "randomTeleport", // Имя обработчика для телепортации

  // Рендеринг (процедурная генерация)
  color: "#C0C0C0", // Серебристый (TOOL_COLORS.SILVER)
  pattern: undefined, // Будет использован COMPASS_PATTERN из ToolPatterns

  // Стак
  stackSize: 1, // Не стакается (одноразовый предмет)
};
