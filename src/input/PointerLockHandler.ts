import { GameState } from "../core/GameState";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";

/**
 * Handles pointer lock/unlock events for pause menu logic
 */
export class PointerLockHandler {
  private controls: PointerLockControls;
  private gameState: GameState;
  private onToggleInventory: () => void;
  private onHidePauseMenu: () => void;
  private onShowPauseMenu: () => void;
  private isCliOpen: () => boolean;

  private lockHandler = () => this.onLock();
  private unlockHandler = () => this.onUnlock();

  constructor(
    controls: PointerLockControls,
    gameState: GameState,
    onToggleInventory: () => void,
    onHidePauseMenu: () => void,
    onShowPauseMenu: () => void,
    isCliOpen: () => boolean,
  ) {
    this.controls = controls;
    this.gameState = gameState;
    this.onToggleInventory = onToggleInventory;
    this.onHidePauseMenu = onHidePauseMenu;
    this.onShowPauseMenu = onShowPauseMenu;
    this.isCliOpen = isCliOpen;
    this.init();
  }

  private init(): void {
    this.controls.addEventListener("lock", this.lockHandler);
    this.controls.addEventListener("unlock", this.unlockHandler);
  }

  public cleanup(): void {
    this.controls.removeEventListener("lock", this.lockHandler);
    this.controls.removeEventListener("unlock", this.unlockHandler);
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
