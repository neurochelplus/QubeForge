/**
 * Управление прочностью инструментов
 */
import { BLOCK } from "../../constants/Blocks";
import { TOOL_DURABILITY } from "../../constants/GameConstants";
import type { Inventory } from "../../inventory/Inventory";
import type { InventoryUI } from "../../inventory/InventoryUI";

export class ToolDurability {
  private inventory: Inventory;
  private inventoryUI: InventoryUI;

  constructor(inventory: Inventory, inventoryUI: InventoryUI) {
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
  }

  /**
   * Использовать инструмент (уменьшить прочность)
   */
  handleUse(amount: number): void {
    const slotIndex = this.inventory.getSelectedSlot();
    const slot = this.inventory.getSlot(slotIndex);

    // Только инструменты (ID 20-39)
    if (slot.id < 20 || slot.id >= 40) return;

    // Инициализировать прочность если отсутствует
    if (slot.durability === undefined) {
      slot.maxDurability = this.getMaxDurability(slot.id);
      slot.durability = slot.maxDurability;
    }

    slot.durability -= amount;

    if (slot.durability <= 0) {
      // Инструмент сломался
      this.inventory.setSlot(slotIndex, { id: 0, count: 0 });
    } else {
      this.inventory.setSlot(slotIndex, slot);
    }

    this.inventoryUI.refresh();
    if (this.inventoryUI.onInventoryChange) {
      this.inventoryUI.onInventoryChange();
    }
  }

  private getMaxDurability(toolId: number): number {
    // Stone tools
    if (
      toolId === BLOCK.STONE_SWORD ||
      toolId === BLOCK.STONE_PICKAXE ||
      toolId === BLOCK.STONE_AXE ||
      toolId === BLOCK.STONE_SHOVEL
    ) {
      return TOOL_DURABILITY.STONE;
    }

    // Iron tools
    if (
      toolId === BLOCK.IRON_SWORD ||
      toolId === BLOCK.IRON_PICKAXE ||
      toolId === BLOCK.IRON_AXE ||
      toolId === BLOCK.IRON_SHOVEL
    ) {
      return TOOL_DURABILITY.IRON;
    }

    // Wood tools (default)
    return TOOL_DURABILITY.WOOD;
  }
}
