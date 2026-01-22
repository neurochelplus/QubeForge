import { CraftingSystem } from "./CraftingSystem";
import { DragDrop } from "../inventory/DragDrop";
import type { InventorySlot } from "../inventory/Inventory";

export class CraftingSlotHandler {
  private craftingSystem: CraftingSystem;
  private dragDrop: DragDrop;
  private onUpdate: () => void;

  constructor(
    craftingSystem: CraftingSystem,
    dragDrop: DragDrop,
    onUpdate: () => void,
  ) {
    this.craftingSystem = craftingSystem;
    this.dragDrop = dragDrop;
    this.onUpdate = onUpdate;
  }

  public handleCraftSlotClick(index: number, button: number = 0) {
    const slot = this.craftingSystem.craftingSlots[index];
    let draggedItem = this.dragDrop.getDraggedItem();

    if (!draggedItem) {
      draggedItem = this.handlePickup(slot, button);
    } else {
      draggedItem = this.handlePlace(slot, draggedItem, button);
    }

    this.dragDrop.setDraggedItem(draggedItem);
    this.onUpdate();
  }

  public handleResultClick() {
    const result = this.craftingSystem.craftingResult;
    if (result.id === 0) return;

    let draggedItem = this.dragDrop.getDraggedItem();

    if (!draggedItem) {
      draggedItem = { ...result };
      this.craftingSystem.consumeIngredients();
      this.dragDrop.setDraggedItem(draggedItem);
    } else if (draggedItem.id === result.id) {
      draggedItem.count += result.count;
      this.craftingSystem.consumeIngredients();
      this.dragDrop.setDraggedItem(draggedItem);
    }

    this.onUpdate();
  }

  private handlePickup(
    slot: InventorySlot,
    button: number,
  ): InventorySlot | null {
    if (slot.id === 0) return null;

    let draggedItem: InventorySlot | null = null;

    if (button === 2) {
      const half = Math.ceil(slot.count / 2);
      draggedItem = {
        id: slot.id,
        count: half,
        durability: slot.durability,
        maxDurability: slot.maxDurability
      };
      slot.count -= half;
      if (slot.count === 0) slot.id = 0;
    } else {
      draggedItem = { ...slot };
      slot.id = 0;
      slot.count = 0;
      delete slot.durability;
      delete slot.maxDurability;
    }

    this.craftingSystem.checkRecipes();
    return draggedItem;
  }

  private handlePlace(
    slot: InventorySlot,
    draggedItem: InventorySlot,
    button: number,
  ): InventorySlot | null {
    let result: InventorySlot | null = draggedItem;

    if (slot.id === 0) {
      if (button === 2) {
        slot.id = draggedItem.id;
        slot.count = 1;
        slot.durability = draggedItem.durability;
        slot.maxDurability = draggedItem.maxDurability;
        draggedItem.count--;
        if (draggedItem.count === 0) result = null;
      } else {
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        slot.durability = draggedItem.durability;
        slot.maxDurability = draggedItem.maxDurability;
        result = null;
      }
    } else if (slot.id === draggedItem.id) {
      if (button === 2) {
        slot.count++;
        draggedItem.count--;
        if (draggedItem.count === 0) result = null;
      } else {
        slot.count += draggedItem.count;
        result = null;
      }
    } else {
      const temp = { ...slot };
      slot.id = draggedItem.id;
      slot.count = draggedItem.count;
      slot.durability = draggedItem.durability;
      slot.maxDurability = draggedItem.maxDurability;
      result = temp;
    }

    this.craftingSystem.checkRecipes();
    return result;
  }
}
