/**
 * Game - Главный класс игры, координирующий все системы
 */
import { Renderer } from "./Renderer";
import { GameState } from "./GameState";
import { World } from "../world/World";
import { Environment } from "../world/Environment";
import { ItemEntity } from "../entities/ItemEntity";
import { MobManager } from "../mobs/MobManager";
import { Player } from "../player/Player";
import { BlockCursor } from "../blocks/BlockCursor";
import { BlockBreaking } from "../blocks/BlockBreaking";
import { BlockInteraction } from "../blocks/BlockInteraction";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { CraftingSystem } from "../crafting/CraftingSystem";
import { CraftingUI } from "../crafting/CraftingUI";
import { FurnaceUI } from "../crafting/FurnaceUI";
import { MobileControls } from "../mobile/MobileControls";
import { CLI } from "../ui/CLI";
import { Menus } from "../ui/Menus";

import { createDevTools, DevTools } from "../utils/DevTools";
import { createProfiler, PerformanceProfiler } from "../utils/PerformanceProfiler";
import { modLoader } from "../modding";
import type { AutoSave } from "../ui/AutoSave";
import type { KeyboardHandler } from "../input/KeyboardHandler";
import type { MouseHandler } from "../input/MouseHandler";
import type { PointerLockHandler } from "../input/PointerLockHandler";

import { logger } from "../utils/Logger";
import { GameLoop, ToolDurability } from "./game/index";

export class Game {
  [x: string]: any;

  // Core systems
  public renderer: Renderer;
  public gameState: GameState;
  public world: World;
  public environment: Environment;

  // Entities
  public entities: ItemEntity[];
  public mobManager: MobManager;
  public player: Player;

  // Blocks
  public blockCursor: BlockCursor;
  public blockBreaking: BlockBreaking;
  public blockInteraction: BlockInteraction;

  // Inventory & Crafting
  public inventory: Inventory;
  public inventoryUI: InventoryUI;
  public craftingSystem: CraftingSystem;
  public craftingUI: CraftingUI;
  public furnaceUI: FurnaceUI;

  // UI
  public mobileControls: MobileControls | null = null;
  public cli: CLI;
  public menus: Menus;

  // Dev
  public devTools: DevTools | null = null;
  public profiler: PerformanceProfiler | null = null;

  // Input state
  public isAttackPressed: boolean = false;
  public isUsePressed: boolean = false;
  public autoSave?: AutoSave;
  public inputHandlers?: {
    keyboard: KeyboardHandler;
    mouse: MouseHandler;
    pointerLock: PointerLockHandler;
  };

  // Internal
  private gameLoop: GameLoop;
  private toolDurability: ToolDurability;

  constructor(
    renderer: Renderer,
    gameState: GameState,
    world: World,
    environment: Environment,
    entities: ItemEntity[],
    mobManager: MobManager,
    player: Player,
    blockCursor: BlockCursor,
    blockBreaking: BlockBreaking,
    blockInteraction: BlockInteraction,
    inventory: Inventory,
    inventoryUI: InventoryUI,
    craftingSystem: CraftingSystem,
    craftingUI: CraftingUI,
    furnaceUI: FurnaceUI,
  ) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.world = world;
    this.environment = environment;
    this.entities = entities;
    this.mobManager = mobManager;
    this.player = player;
    this.blockCursor = blockCursor;
    this.blockBreaking = blockBreaking;
    this.blockInteraction = blockInteraction;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
    this.craftingSystem = craftingSystem;
    this.craftingUI = craftingUI;
    this.furnaceUI = furnaceUI;

    // Initialize subsystems
    this.toolDurability = new ToolDurability(inventory, inventoryUI);
    this.gameLoop = new GameLoop(this);

    // UI Systems
    this.cli = new CLI(this);
    this.menus = new Menus(this);

    // Mobile Controls
    if (this.renderer.getIsMobile()) {
      this.mobileControls = new MobileControls(this);
    }

    // Dev Tools
    this.devTools = createDevTools();
    this.profiler = createProfiler();



    // Mods
    this.initMods();
  }

  private async initMods(): Promise<void> {
    try {
      modLoader.setGame(this);
      await modLoader.loadAllMods();
    } catch (error) {
      logger.error('[Game] Failed to initialize mods:', error);
    }
  }

  /**
   * Обработка использования инструмента
   */
  public handleToolUse = (amount: number): void => {
    this.toolDurability.handleUse(amount);
  };

  public start(): void {
    this.menus.showMainMenu();
    this.gameLoop.start();
  }

  public stop(): void {
    this.gameLoop.stop();

    // Cleanup input handlers
    if (this.inputHandlers) {
      this.inputHandlers.keyboard.cleanup();
      this.inputHandlers.mouse.cleanup();
      this.inputHandlers.pointerLock.cleanup();
    }

    // Stop auto-save
    if (this.autoSave) {
      this.autoSave.stop();
    }
  }

  public resetTime(): void {
    this.gameLoop.resetTime();
  }
}
