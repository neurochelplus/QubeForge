import { GameState } from "../core/GameState";
import { Player } from "../player/Player";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { CLI } from "../ui/CLI";

/**
 * Handles keyboard input for player movement and game controls
 */
export class KeyboardHandler {
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

    // Prevent movement keys when inventory is open
    if (isInventoryOpen) {
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ArrowUp",
          "ArrowLeft",
          "ArrowDown",
          "ArrowRight",
          "Space",
        ].includes(event.code)
      ) {
        return;
      }
    }

    switch (event.code) {
      case "Slash":
        event.preventDefault();
        if (this.cli.isEnabled()) {
          this.cli.toggle(true, "/");
        }
        break;
      case "KeyT":
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
        break;
      case "ArrowUp":
      case "KeyW":
        this.player.physics.moveForward = true;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.player.physics.moveLeft = true;
        break;
      case "ArrowDown":
      case "KeyS":
        this.player.physics.moveBackward = true;
        break;
      case "ArrowRight":
      case "KeyD":
        this.player.physics.moveRight = true;
        break;
      case "ControlLeft":
      case "ControlRight":
        this.player.physics.isSprinting = !this.player.physics.isSprinting;
        break;
      case "Space":
        this.player.physics.jump();
        break;
      case "KeyE":
        if (!this.gameState.getPaused()) this.onToggleInventory(false);
        break;
      case "Escape":
        const invMenu = document.getElementById("inventory-menu")!;
        if (invMenu.style.display === "flex") {
          this.onToggleInventory(false);
        } else if (this.gameState.getGameStarted()) {
          this.onShowPauseMenu();
        }
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        this.player.physics.moveForward = false;
        this.player.physics.isSprinting = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        this.player.physics.moveLeft = false;
        break;
      case "ArrowDown":
      case "KeyS":
        this.player.physics.moveBackward = false;
        break;
      case "ArrowRight":
      case "KeyD":
        this.player.physics.moveRight = false;
        break;
    }
  }
}
