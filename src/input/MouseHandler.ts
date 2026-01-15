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

  private gameState: GameState;
  private player: Player;
  private blockBreaking: BlockBreaking;
  private blockInteraction: BlockInteraction;
  private world: World;
  private inventory: Inventory;
  private inventoryUI: InventoryUI;
  private controls: PointerLockControls;
  private isMobile: boolean;
  private onHotbarChange: () => void;

  private mouseDownHandler = (e: MouseEvent) => this.onMouseDown(e);
  private mouseUpHandler = () => this.onMouseUp();
  private wheelHandler = (event: WheelEvent) => {
    let selected = this.inventory.getSelectedSlot();
    if (event.deltaY > 0) selected = (selected + 1) % 9;
    else selected = (selected - 1 + 9) % 9;
    this.inventory.setSelectedSlot(selected);
    this.inventoryUI.refresh();
    this.onHotbarChange();
  };

  constructor(
    gameState: GameState,
    player: Player,
    blockBreaking: BlockBreaking,
    blockInteraction: BlockInteraction,
    world: World,
    inventory: Inventory,
    inventoryUI: InventoryUI,
    controls: PointerLockControls,
    isMobile: boolean,
    onHotbarChange: () => void,
  ) {
    this.gameState = gameState;
    this.player = player;
    this.blockBreaking = blockBreaking;
    this.blockInteraction = blockInteraction;
    this.world = world;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.controls = controls;
    this.isMobile = isMobile;
    this.onHotbarChange = onHotbarChange;
    this.init();
  }

  private init(): void {
    document.addEventListener("mousedown", this.mouseDownHandler);
    document.addEventListener("mouseup", this.mouseUpHandler);
    window.addEventListener("wheel", this.wheelHandler);
  }

  public cleanup(): void {
    document.removeEventListener("mousedown", this.mouseDownHandler);
    document.removeEventListener("mouseup", this.mouseUpHandler);
    window.removeEventListener("wheel", this.wheelHandler);
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
