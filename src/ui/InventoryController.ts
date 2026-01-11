import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { Player } from "../player/Player";
import { World } from "../world/World";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { DragDrop } from "../inventory/DragDrop";
import { CraftingSystem } from "../crafting/CraftingSystem";
import { CraftingUI } from "../crafting/CraftingUI";
import { FurnaceUI } from "../crafting/FurnaceUI";
import { FurnaceManager } from "../crafting/FurnaceManager";

/**
 * Controls inventory menu opening/closing and related UI state
 */
export class InventoryController {
  constructor(
    private controls: PointerLockControls,
    private player: Player,
    private world: World,
    private inventory: Inventory,
    private inventoryUI: InventoryUI,
    private dragDrop: DragDrop,
    private craftingSystem: CraftingSystem,
    private craftingUI: CraftingUI,
    private furnaceUI: FurnaceUI,
    private isMobile: boolean,
  ) {}

  /**
   * Toggle inventory menu
   * @param param - false for normal inventory, true for crafting table, "furnace" for furnace
   * @param furnacePos - Position of furnace if opening furnace UI
   */
  toggle(
    param: boolean | "furnace" = false,
    furnacePos?: { x: number; y: number; z: number },
  ): void {
    const inventoryMenu = document.getElementById("inventory-menu")!;
    const crosshair = document.getElementById("crosshair")!;
    const isInventoryOpen = inventoryMenu.style.display === "flex";

    this.dragDrop.setInventoryOpen(!isInventoryOpen);

    if (!isInventoryOpen) {
      // Open inventory
      const useCraftingTable = param === true;
      const useFurnace = param === "furnace";

      this.controls.unlock();

      // Stop Movement
      this.player.physics.moveForward = false;
      this.player.physics.moveBackward = false;
      this.player.physics.moveLeft = false;
      this.player.physics.moveRight = false;
      this.player.physics.isSprinting = false;

      inventoryMenu.style.display = "flex";
      crosshair.style.display = "none";

      if (useFurnace && furnacePos) {
        this.furnaceUI.open(furnacePos.x, furnacePos.y, furnacePos.z);
        this.craftingUI.setVisible(false, false);
      } else {
        this.furnaceUI.close();
        this.craftingUI.setVisible(true, useCraftingTable);
      }

      if (this.isMobile) {
        const mobUi = document.getElementById("mobile-ui");
        if (mobUi) mobUi.style.display = "none";
      }

      this.inventoryUI.refresh();

      // Create close button if not exists
      if (!document.getElementById("btn-close-inv")) {
        const closeBtn = document.createElement("div");
        closeBtn.id = "btn-close-inv";
        closeBtn.innerText = "X";
        closeBtn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          this.toggle();
        });
        closeBtn.addEventListener("click", () => this.toggle());
        inventoryMenu.appendChild(closeBtn);
      }
    } else {
      // Close inventory
      this.world.saveWorld({
        position: this.controls.object.position,
        inventory: this.inventory.serialize(),
      });
      FurnaceManager.getInstance().save();

      // Return items from crafting grid
      this.craftingSystem.consumeIngredients();
      for (let i = 0; i < 9; i++) {
        if (this.craftingSystem.craftingSlots[i].id !== 0) {
          this.inventory.addItem(
            this.craftingSystem.craftingSlots[i].id,
            this.craftingSystem.craftingSlots[i].count,
          );
          this.craftingSystem.craftingSlots[i].id = 0;
          this.craftingSystem.craftingSlots[i].count = 0;
        }
      }
      this.craftingSystem.craftingResult.id = 0;
      this.craftingSystem.craftingResult.count = 0;
      this.craftingUI.setVisible(false, false);
      this.furnaceUI.close();

      if (this.isMobile) {
        const mobUi = document.getElementById("mobile-ui");
        if (mobUi) mobUi.style.display = "block";
        document.getElementById("joystick-zone")!.style.display = "block";
        document.getElementById("mobile-actions")!.style.display = "flex";
      }

      this.controls.lock();
      inventoryMenu.style.display = "none";
      crosshair.style.display = "block";

      // Return dragged item to inventory
      const dragged = this.dragDrop.getDraggedItem();
      if (dragged) {
        this.inventory.addItem(dragged.id, dragged.count);
        this.dragDrop.setDraggedItem(null);
      }
    }
  }
}
