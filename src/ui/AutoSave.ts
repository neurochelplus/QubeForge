import { GameState } from "../core/GameState";
import { World } from "../world/World";
import { Inventory } from "../inventory/Inventory";
import { FurnaceManager } from "../crafting/FurnaceManager";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { AUTO_SAVE_INTERVAL } from "../constants/GameConstants";

/**
 * Handles automatic world saving every 30 seconds
 */
export class AutoSave {
  private intervalId: number | null = null;
  private readonly SAVE_INTERVAL = AUTO_SAVE_INTERVAL;

  constructor(
    private gameState: GameState,
    private world: World,
    private controls: PointerLockControls,
    private inventory: Inventory,
  ) {}

  /**
   * Start auto-save timer
   */
  start(): void {
    this.intervalId = window.setInterval(() => {
      if (this.gameState.getGameStarted() && !this.gameState.getPaused()) {
        this.world.saveWorld({
          position: this.controls.object.position,
          inventory: this.inventory.serialize(),
        });
        FurnaceManager.getInstance().save();
      }
    }, this.SAVE_INTERVAL);
  }

  /**
   * Stop auto-save timer
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
