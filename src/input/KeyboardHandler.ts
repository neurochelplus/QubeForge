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
  private gameState: GameState;
  private player: Player;
  private inventory: Inventory;
  private inventoryUI: InventoryUI;
  private cli: CLI;
  private onToggleInventory: (useCraftingTable: boolean) => void;
  private onShowPauseMenu: () => void;
  private onHotbarChange: () => void;

  private keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
  private keyUpHandler = (e: KeyboardEvent) => this.onKeyUp(e);
  private contextMenuHandler = (e: Event) => e.preventDefault();
  private hotbarKeyHandler = (event: KeyboardEvent) => {
    const key = parseInt(event.key);
    if (key >= 1 && key <= 9) {
      this.inventory.setSelectedSlot(key - 1);
      this.inventoryUI.refresh();
      this.onHotbarChange();
    }
  };

  constructor(
    gameState: GameState,
    player: Player,
    inventory: Inventory,
    inventoryUI: InventoryUI,
    cli: CLI,
    onToggleInventory: (useCraftingTable: boolean) => void,
    onShowPauseMenu: () => void,
    onHotbarChange: () => void,
  ) {
    this.keybindings = KeybindingsManager.getInstance();
    this.gameState = gameState;
    this.player = player;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.cli = cli;
    this.onToggleInventory = onToggleInventory;
    this.onShowPauseMenu = onShowPauseMenu;
    this.onHotbarChange = onHotbarChange;
    this.init();
  }

  private init(): void {
    document.addEventListener("keydown", this.keyDownHandler);
    document.addEventListener("keyup", this.keyUpHandler);
    document.addEventListener("contextmenu", this.contextMenuHandler);
    window.addEventListener("keydown", this.hotbarKeyHandler);
  }

  public cleanup(): void {
    document.removeEventListener("keydown", this.keyDownHandler);
    document.removeEventListener("keyup", this.keyUpHandler);
    document.removeEventListener("contextmenu", this.contextMenuHandler);
    window.removeEventListener("keydown", this.hotbarKeyHandler);
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
