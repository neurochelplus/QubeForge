import * as THREE from "three";
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
import { MobileControls } from "../mobile/MobileControls";
import { CLI } from "../ui/CLI";
import { Menus } from "../ui/Menus";

/**
 * Главный класс игры, координирующий все системы
 */
export class Game {
  public renderer: Renderer;
  public gameState: GameState;
  public world: World;
  public environment: Environment;
  public entities: ItemEntity[];
  public mobManager: MobManager;
  public player: Player;
  public blockCursor: BlockCursor;
  public blockBreaking: BlockBreaking;
  public blockInteraction: BlockInteraction;
  public inventory: Inventory;
  public inventoryUI: InventoryUI;
  public craftingSystem: CraftingSystem;
  public craftingUI: CraftingUI;
  public mobileControls: MobileControls | null = null;
  public cli: CLI;
  public menus: Menus;

  public isAttackPressed: boolean = false;

  private prevTime: number = performance.now();
  private animationId: number | null = null;

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

    // UI Systems
    this.cli = new CLI(this);
    this.menus = new Menus(this);

    // Initialize Mobile Controls if needed
    if (this.renderer.getIsMobile()) {
      this.mobileControls = new MobileControls(this);
    }
  }

  /**
   * Запуск игрового цикла
   */
  public start(): void {
    if (this.animationId !== null) {
      return; // Already started
    }

    // Show Main Menu initially
    this.menus.showMainMenu();

    this.prevTime = performance.now();
    this.animate();
  }

  /**
   * Остановка игрового цикла
   */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public resetTime(): void {
    this.prevTime = performance.now();
  }

  /**
   * Основной игровой цикл
   */
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.gameState.getPaused()) {
      this.renderer.renderOnlyMain();
      return;
    }

    this.update();
    this.render();
  };

  /**
   * Обновление игрового состояния
   */
  private update(): void {
    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;

    // World & Environment
    this.world.update(this.renderer.controls.object.position);
    this.environment.update(delta, this.renderer.controls.object.position);

    // Player Update (Physics & Hand)
    this.player.update(delta);

    // Block Breaking
    this.blockBreaking.update(time, this.world);

    // Attack / Mining
    if (this.isAttackPressed && this.gameState.getGameStarted()) {
      if (!this.blockBreaking.isBreakingNow())
        this.blockBreaking.start(this.world);
      this.player.combat.performAttack();
    }

    // Entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      entity.update(time / 1000, delta);

      if (entity.isDead) {
        this.entities.splice(i, 1);
        continue;
      }

      if (
        entity.mesh.position.distanceTo(
          this.renderer.controls.object.position,
        ) < 2.5
      ) {
        // Pickup logic
        const added = this.inventory.addItem(entity.type, 1);
        if (added === 0) {
          entity.dispose();
          this.entities.splice(i, 1);
          this.inventoryUI.refresh();
          if (this.inventoryUI.onInventoryChange)
            this.inventoryUI.onInventoryChange();
        }
      }
    }

    // Mobs
    this.mobManager.update(
      delta,
      this.player, // Pass full player object
      this.environment,
      (amt) => this.player.health.takeDamage(amt),
    );

    // Cursor
    if (this.gameState.getGameStarted()) {
      this.blockCursor.update(this.world);
    }

    this.prevTime = time;
  }

  private render(): void {
    this.renderer.render();
  }
}
