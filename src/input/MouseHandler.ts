import { GameState } from "../core/GameState";
import { Player } from "../player/Player";
import { BlockBreaking } from "../blocks/BlockBreaking";
import { BlockInteraction } from "../blocks/BlockInteraction";
import { World } from "../world/World";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

/**
 * Handles mouse input for attacking, placing blocks, and hotbar scrolling
 */
export class MouseHandler {
  public isAttackPressed = false;
  public isUsePressed = false;

  constructor(
    private gameState: GameState,
    private player: Player,
    private blockBreaking: BlockBreaking,
    private blockInteraction: BlockInteraction,
    private world: World,
    private inventory: Inventory,
    private inventoryUI: InventoryUI,
    private controls: PointerLockControls,
    private isMobile: boolean,
    private onHotbarChange: () => void,
  ) {
    this.init();
  }

  private init(): void {
    document.addEventListener("mousedown", (e) => this.onMouseDown(e));
    document.addEventListener("mouseup", () => this.onMouseUp());

    // Hotbar scroll
    window.addEventListener("wheel", (event) => {
      let selected = this.inventory.getSelectedSlot();
      if (event.deltaY > 0) selected = (selected + 1) % 9;
      else selected = (selected - 1 + 9) % 9;
      this.inventory.setSelectedSlot(selected);
      this.inventoryUI.refresh();
      this.onHotbarChange();
    });
  }

  private onMouseDown(event: MouseEvent): void {
    if (this.gameState.getPaused() || !this.gameState.getGameStarted()) return;

    const invMenu = document.getElementById("inventory-menu")!;
    if (invMenu.style.display === "flex") return;

    // Click-to-lock fallback
    if (!this.controls.isLocked && !this.isMobile) {
      this.controls.lock();
      return;
    }

    if (event.button === 0) {
      // Left click - Attack
      this.isAttackPressed = true;
      this.player.hand.punch();
      this.player.combat.performAttack();
      this.blockBreaking.start(this.world);
    } else if (event.button === 2) {
      // Right click - Interact
      this.isUsePressed = true;
      this.blockInteraction.interact(this.world);
    }
  }

  private onMouseUp(): void {
    this.isAttackPressed = false;
    this.isUsePressed = false;
    this.player.hand.stopPunch();
    this.blockBreaking.stop();
  }
}
