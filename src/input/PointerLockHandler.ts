import { GameState } from "../core/GameState";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

/**
 * Handles pointer lock/unlock events for pause menu logic
 */
export class PointerLockHandler {
  constructor(
    private controls: PointerLockControls,
    private gameState: GameState,
    private onToggleInventory: () => void,
    private onHidePauseMenu: () => void,
    private onShowPauseMenu: () => void,
    private isCliOpen: () => boolean,
  ) {
    this.init();
  }

  private init(): void {
    this.controls.addEventListener("lock", () => this.onLock());
    this.controls.addEventListener("unlock", () => this.onUnlock());
  }

  private onLock(): void {
    // If we were resuming (flag set by Resume button), finalize the resume
    if (this.gameState.getIsResuming()) {
      this.onHidePauseMenu();
      this.gameState.setIsResuming(false);
    }
    // Or if we just somehow got locked while paused (edge case), ensure we unpause
    else if (this.gameState.getPaused() && this.gameState.getGameStarted()) {
      this.onHidePauseMenu();
    }

    const inventoryMenu = document.getElementById("inventory-menu")!;
    if (inventoryMenu.style.display === "flex") {
      this.onToggleInventory();
    }
  }

  private onUnlock(): void {
    const inventoryMenu = document.getElementById("inventory-menu")!;

    // If we are in the middle of a resume attempt, IGNORE the unlock event
    if (this.gameState.getIsResuming()) return;

    if (
      inventoryMenu.style.display !== "flex" &&
      !this.gameState.getPaused() &&
      this.gameState.getGameStarted() &&
      !this.isCliOpen()
    ) {
      this.onShowPauseMenu();
    }
  }
}
