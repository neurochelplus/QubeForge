import { GameState } from "../core/GameState";
import { Player } from "../player/Player";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { CLI } from "../ui/CLI";
import { KeybindingsManager } from "./KeybindingsManager";

/**
 * Handles keyboard input for player movement and game controls
 * Использует KeybindingsManager для настраиваемых клавиш
 */
export class KeyboardHandler {
  private keybindings: KeybindingsManager;

  constructor(
    private gameState: GameState,
    private player: Player,
    private inventory: Inventory,
    private inventoryUI: InventoryUI,
    private cli: CLI,
    private onToggleInventory: (useCraftingTable: boolean) => void,
    private onShowPauseMenu: () => void,
    private onHotbarChange: () => void,
  ) {
    this.keybindings = KeybindingsManager.getInstance();
    this.init();
  }

  private init(): void {
    document.addEventListener("keydown", (e) => this.onKeyDown(e));
    document.addEventListener("keyup", (e) => this.onKeyUp(e));
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    // Hotbar number keys (1-9 остаются хардкодом - это стандарт)
    window.addEventListener("keydown", (event) => {
      const key = parseInt(event.key);
      if (key >= 1 && key <= 9) {
        this.inventory.setSelectedSlot(key - 1);
        this.inventoryUI.refresh();
        this.onHotbarChange();
      }
    });
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.cli.isOpen) return;

    const inventoryMenu = document.getElementById("inventory-menu")!;
    const isInventoryOpen = inventoryMenu.style.display === "flex";
    const keyCode = event.code;

    // Prevent movement keys when inventory is open
    if (isInventoryOpen) {
      const isMovementKey =
        this.keybindings.isKeyForAction(keyCode, 'moveForward') ||
        this.keybindings.isKeyForAction(keyCode, 'moveBackward') ||
        this.keybindings.isKeyForAction(keyCode, 'moveLeft') ||
        this.keybindings.isKeyForAction(keyCode, 'moveRight') ||
        this.keybindings.isKeyForAction(keyCode, 'jump');

      if (isMovementKey) return;
    }

    // Command (/)
    if (this.keybindings.isKeyForAction(keyCode, 'command')) {
      event.preventDefault();
      if (this.cli.isEnabled()) {
        this.cli.toggle(true, "/");
      }
      return;
    }

    // Chat (T)
    if (this.keybindings.isKeyForAction(keyCode, 'chat')) {
      if (
        !this.gameState.getPaused() &&
        this.gameState.getGameStarted() &&
        inventoryMenu.style.display !== "flex"
      ) {
        event.preventDefault();
        if (this.cli.isEnabled()) {
          this.cli.toggle(true, "");
        }
      }
      return;
    }

    // Movement
    if (this.keybindings.isKeyForAction(keyCode, 'moveForward')) {
      this.player.physics.moveForward = true;
      return;
    }
    if (this.keybindings.isKeyForAction(keyCode, 'moveLeft')) {
      this.player.physics.moveLeft = true;
      return;
    }
    if (this.keybindings.isKeyForAction(keyCode, 'moveBackward')) {
      this.player.physics.moveBackward = true;
      return;
    }
    if (this.keybindings.isKeyForAction(keyCode, 'moveRight')) {
      this.player.physics.moveRight = true;
      return;
    }

    // Sprint (toggle)
    if (this.keybindings.isKeyForAction(keyCode, 'sprint')) {
      this.player.physics.isSprinting = !this.player.physics.isSprinting;
      return;
    }

    // Jump
    if (this.keybindings.isKeyForAction(keyCode, 'jump')) {
      this.player.physics.jump();
      return;
    }

    // Inventory
    if (this.keybindings.isKeyForAction(keyCode, 'inventory')) {
      if (!this.gameState.getPaused()) this.onToggleInventory(false);
      return;
    }

    // Pause/Escape
    if (this.keybindings.isKeyForAction(keyCode, 'pause')) {
      const invMenu = document.getElementById("inventory-menu")!;
      if (invMenu.style.display === "flex") {
        this.onToggleInventory(false);
      } else if (this.gameState.getGameStarted()) {
        this.onShowPauseMenu();
      }
      return;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    const keyCode = event.code;

    if (this.keybindings.isKeyForAction(keyCode, 'moveForward')) {
      this.player.physics.moveForward = false;
      this.player.physics.isSprinting = false;
      return;
    }
    if (this.keybindings.isKeyForAction(keyCode, 'moveLeft')) {
      this.player.physics.moveLeft = false;
      return;
    }
    if (this.keybindings.isKeyForAction(keyCode, 'moveBackward')) {
      this.player.physics.moveBackward = false;
      return;
    }
    if (this.keybindings.isKeyForAction(keyCode, 'moveRight')) {
      this.player.physics.moveRight = false;
      return;
    }
  }
}
