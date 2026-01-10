import { CraftingSystem } from "./CraftingSystem";
import { DragDrop } from "../inventory/DragDrop";

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
    slot: { id: number; count: number },
    button: number,
  ): { id: number; count: number } | null {
    if (slot.id === 0) return null;

    let draggedItem: { id: number; count: number } | null = null;

    if (button === 2) {
      const half = Math.ceil(slot.count / 2);
      draggedItem = { id: slot.id, count: half };
      slot.count -= half;
      if (slot.count === 0) slot.id = 0;
    } else {
      draggedItem = { ...slot };
      slot.id = 0;
      slot.count = 0;
    }

    this.craftingSystem.checkRecipes();
    return draggedItem;
  }

  private handlePlace(
    slot: { id: number; count: number },
    draggedItem: { id: number; count: number },
    button: number,
  ): { id: number; count: number } | null {
    if (slot.id === 0) {
      if (button === 2) {
        slot.id = draggedItem.id;
        slot.count = 1;
        draggedItem.count--;
        if (draggedItem.count === 0) draggedItem = null;
      } else {
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        draggedItem = null;
      }
      this.craftingSystem.checkRecipes();
    } else if (slot.id === draggedItem.id) {
      if (button === 2) {
        slot.count++;
        draggedItem.count--;
        if (draggedItem.count === 0) draggedItem = null;
      } else {
        slot.count += draggedItem.count;
        draggedItem = null;
      }
      this.craftingSystem.checkRecipes();
    } else {
      const temp = { ...slot };
      slot.id = draggedItem.id;
      slot.count = draggedItem.count;
      draggedItem = temp;
      this.craftingSystem.checkRecipes();
    }

    return draggedItem;
  }
}
