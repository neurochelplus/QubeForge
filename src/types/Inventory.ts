/**
 * Типы для системы инвентаря
 */

export interface InventorySlot {
  id: number;
  count: number;
  durability?: number;
  maxDurability?: number;
}

// serialize() возвращает массив слотов напрямую
export type SerializedInventory = InventorySlot[];

