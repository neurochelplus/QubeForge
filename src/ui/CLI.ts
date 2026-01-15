import { Game } from "../core/Game";
import { BLOCK_NAMES, ITEM_MAP } from "../constants/BlockNames";
import { FeatureToggles } from "../utils/FeatureToggles";
import { logger } from "../utils/Logger";

export class CLI {
  private game: Game;
  private container: HTMLElement;
  private input: HTMLInputElement;
  public isOpen: boolean = false;
  private enabled: boolean;

  constructor(game: Game) {
    this.game = game;

    const toggles = FeatureToggles.getInstance();
    this.enabled = toggles.isEnabled('show_cli');

    this.container = document.createElement("div");
    this.container.id = "cli-container";

    this.input = document.createElement("input");
    this.input.id = "cli-input";
    this.input.type = "text";
    this.input.autocomplete = "off";

    this.container.appendChild(this.input);
    document.body.appendChild(this.container);

    if (!this.enabled) {
      this.container.style.display = "none";
      return;
    }

    this.initListeners();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private initListeners() {
    this.input.addEventListener("keydown", (e) => {
      e.stopPropagation(); // Stop game controls from triggering
      if (e.key === "Enter") {
        const cmd = this.input.value.trim();
        if (cmd) this.handleCommand(cmd);
        this.toggle(false);
      } else if (e.key === "Escape") {
        this.toggle(false);
      }
    });
  }

  public toggle(open: boolean, initialChar: string = "") {
    if (!this.enabled) {
      return;
    }

    if (open) {
      if (!this.game.gameState.getGameStarted()) return; // Don't open in menus
      this.isOpen = true;
      this.container.style.display = "flex";
      this.input.value = initialChar;
      this.input.focus();
      this.game.renderer.controls.unlock();

      // Clear move flags to stop walking when typing
      this.game.playerPhysics.moveForward = false;
      this.game.playerPhysics.moveBackward = false;
      this.game.playerPhysics.moveLeft = false;
      this.game.playerPhysics.moveRight = false;
    } else {
      this.isOpen = false;
      this.container.style.display = "none";
      this.input.value = "";
      this.input.blur();

      // Lock controls if inventory is not open and game is not paused
      // We need to check if inventory is open. Game class has inventoryUI but it doesn't expose isOpen directly efficiently?
      // Actually main.ts handled this logic.
      // We can use a callback or check a state.
      // Let's assume for now we try to lock, but we need to respect other states.
      // Better: let main.ts or Game handle the locking logic based on state?
      // Or we check Game state here.

      const isInventoryOpen = this.game.inventoryMenu?.style.display === "flex"; // Hacky? InventoryUI should expose this.
      // Let's stick to what we know. InventoryUI is in Game.
      // We'll check standard conditions.

      if (!this.game.gameState.getPaused() && !isInventoryOpen) {
        this.game.renderer.controls.lock();
      }
    }
  }

  private handleCommand(cmd: string) {
    if (!cmd.startsWith("/")) return;

    const parts = cmd.slice(1).split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === "give") {
      if (args.length < 1) {
        logger.info("Usage: /give <item> [amount]");
        // We need HotbarLabel access. It's not in Game yet?
        // Wait, HotbarLabel is in main.ts but not in Game class explicitly?
        // Let's check Game.ts. It's NOT in Game.ts.
        // I should add HotbarLabel to Game.ts first or pass it here.
        // For now I'll use console.log and basic alert or maybe add it to Game later.
        // Actually, main.ts creates HotbarLabel.
        return;
      }

      const itemName = args[0].toLowerCase();
      let amount = parseInt(args[1]) || 1;
      if (amount < 1) amount = 1;
      if (amount > 64) amount = 64;

      // Find block ID by name
      let targetId = 0;

      if (ITEM_MAP[itemName]) {
        targetId = ITEM_MAP[itemName];
      } else {
        const numericId = parseInt(itemName);
        if (!isNaN(numericId) && BLOCK_NAMES[numericId]) {
          targetId = numericId;
        }
      }

      if (targetId !== 0) {
        const remaining = this.game.inventory.addItem(targetId, amount);
        this.game.inventoryUI.refresh();

        if (remaining > 0) {
          if (remaining === amount) {
            logger.error("Error: Inventory full. Could not add items.");
          } else {
            logger.warn(`Warning: Inventory almost full. Added ${amount - remaining} of ${amount} items.`);
          }
        } else {
          logger.info(`Gave ${amount} ${itemName}`);
        }
      } else {
        // this.game.hotbarLabel.show(...)
        logger.error(`Unknown item: ${itemName}`);
      }
    }
  }
}
