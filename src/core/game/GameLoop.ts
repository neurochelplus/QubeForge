/**
 * Игровой цикл - update и render
 */
import type { Game } from "../Game";
import { FurnaceManager } from "../../crafting/FurnaceManager";
import { EntityUpdater } from "./EntityUpdater";

export class GameLoop {
  private game: Game;
  private entityUpdater: EntityUpdater;
  private prevTime: number = performance.now();
  private animationId: number | null = null;

  constructor(game: Game) {
    this.game = game;
    this.entityUpdater = new EntityUpdater(
      game.entities,
      game.inventory,
      game.inventoryUI
    );
  }

  start(): void {
    if (this.animationId !== null) return;
    this.prevTime = performance.now();
    this.animate();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resetTime(): void {
    this.prevTime = performance.now();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    if (this.game.gameState.getPaused()) {
      this.game.renderer.renderOnlyMain();
      return;
    }

    this.update();
    this.render();
  };

  private update(): void {
    const time = performance.now();
    const delta = (time - this.prevTime) / 1000;
    const profiler = this.game.profiler;

    profiler?.startMeasure('total-frame');

    // World & Environment
    profiler?.startMeasure('world-update');
    this.game.world.update(this.game.renderer.controls.object.position);
    this.game.world.updateChunkVisibility(this.game.renderer.camera);
    profiler?.endMeasure('world-update');

    profiler?.startMeasure('environment-update');
    this.game.environment.update(delta, this.game.renderer.controls.object.position);
    profiler?.endMeasure('environment-update');

    // Furnaces
    FurnaceManager.getInstance().tick(delta);
    if (this.game.furnaceUI.isVisible()) {
      this.game.furnaceUI.updateVisuals();
    }

    // Player
    profiler?.startMeasure('player-update');
    this.game.player.update(delta);
    profiler?.endMeasure('player-update');

    // Block Breaking
    profiler?.startMeasure('block-breaking');
    this.game.blockBreaking.update(time, this.game.world);
    profiler?.endMeasure('block-breaking');

    // Attack / Mining
    if (this.game.isAttackPressed && this.game.gameState.getGameStarted()) {
      if (!this.game.blockBreaking.isBreakingNow()) {
        this.game.blockBreaking.start(this.game.world);
      }
      this.game.player.combat.performAttack();
    }

    // Interaction / Eating
    if (this.game.gameState.getGameStarted()) {
      this.game.blockInteraction.update(delta, this.game.isUsePressed);
      this.game.player.hand.setEating(this.game.blockInteraction.getIsEating());
    }

    // Entities
    profiler?.startMeasure('entities-update');
    this.entityUpdater.update(
      time,
      delta,
      this.game.renderer.controls.object.position
    );
    profiler?.endMeasure('entities-update');

    // Mobs
    profiler?.startMeasure('mobs-update');
    this.game.mobManager.update(
      delta,
      this.game.player,
      this.game.environment,
      (amt) => this.game.player.health.takeDamage(amt),
    );
    profiler?.endMeasure('mobs-update');

    // Cursor
    if (this.game.gameState.getGameStarted()) {
      this.game.blockCursor.update(this.game.world);
    }

    profiler?.endMeasure('total-frame');
    this.prevTime = time;
  }

  private render(): void {
    const profiler = this.game.profiler;

    profiler?.startMeasure('render');
    this.game.renderer.render();
    profiler?.endMeasure('render');

    // Dev tools
    if (this.game.devTools && this.game.gameState.getGameStarted()) {
      profiler?.startMeasure('devtools-update');
      const chunkStats = this.game.world.getChunkCount();
      this.game.devTools.update(
        this.game.renderer.renderer,
        chunkStats.visible,
        chunkStats.total,
      );
      profiler?.endMeasure('devtools-update');
    }

    profiler?.updateFrame();
  }
}
