/**
 * Запуск игры с выбранным миром
 */
import type { Game } from "../../core/Game";
import type { MenuElements } from "./MenuElements";
import type { MenuMusic } from "./MenuMusic";

export class GameLauncher {
  private game: Game;
  private elements: MenuElements;
  private menuMusic: MenuMusic;

  constructor(game: Game, elements: MenuElements, menuMusic: MenuMusic) {
    this.game = game;
    this.elements = elements;
    this.menuMusic = menuMusic;
  }

  async launch(worldId: string): Promise<void> {
    if (!this.game.renderer.getIsMobile()) {
      this.game.renderer.controls.lock();
    }

    this.elements.btnSingleplayer.innerText = "Загрузка...";

    try {
      const { WorldManager } = await import("../../world/WorldManager");
      const worldManager = WorldManager.getInstance();
      const dbName = worldManager.getWorldDBName(worldId);

      await this.game.world.reinitialize(this.game.renderer.scene, worldId, dbName);

      const worldMeta = await worldManager.getWorld(worldId);
      const isNewWorld = worldMeta && worldMeta.playtime === 0;

      if (isNewWorld) {
        await this.setupNewWorld(worldMeta);
      } else {
        await this.loadExistingWorld();
      }

      this.showGameUI();
    } catch (e) {
      console.error("Failed to start game:", e);
      alert("Error starting game: " + e);
      if (!this.game.renderer.getIsMobile()) {
        this.game.renderer.controls.unlock();
      }
    } finally {
      this.elements.btnSingleplayer.innerText = "Одиночная игра";
    }
  }

  private async setupNewWorld(worldMeta: { seed?: number } | null): Promise<void> {
    await this.game.world.deleteWorld();
    this.game.player.health.respawn();

    // Настраиваем FurnaceManager для нового мира
    const { FurnaceManager } = await import("../../crafting/FurnaceManager");
    const furnaceManager = FurnaceManager.getInstance();
    furnaceManager.clear(); // Очищаем печи от предыдущего мира
    furnaceManager.setDB(this.game.world.getDB());

    if (worldMeta?.seed) {
      this.game.world.setSeed(worldMeta.seed);
    }

    const spawnX = 8;
    const spawnZ = 20;

    const cx = Math.floor(spawnX / 32);
    const cz = Math.floor(spawnZ / 32);
    await this.game.world.loadChunk(cx, cz);

    const topY = this.game.world.getTopY(spawnX, spawnZ);

    this.game.renderer.controls.object.position.set(
      spawnX + 0.5,
      topY + 3,
      spawnZ + 0.5,
    );

    this.game.inventory.clear();
    this.game.inventoryUI.refresh();

    // Сохраняем начальное состояние чтобы мир не считался "новым" при следующем входе
    await this.game.world.saveWorld({
      position: this.game.renderer.controls.object.position,
      inventory: this.game.inventory.serialize(),
      sessionTime: 1, // Минимальное время чтобы playtime > 0
    });
  }

  private async loadExistingWorld(): Promise<void> {
    const data = await this.game.world.loadWorld();

    if (data.playerPosition) {
      const safePos = data.playerPosition.clone();
      safePos.y += 0.1;
      this.game.renderer.controls.object.position.copy(safePos);
      this.game.player.physics.setVelocity({ x: 0, y: 0, z: 0 } as any);
    }

    if (data.inventory) {
      this.game.inventory.deserialize(data.inventory);
      this.game.inventoryUI.refresh();
    }

    // Загружаем печи с БД текущего мира
    const { FurnaceManager } = await import("../../crafting/FurnaceManager");
    const furnaceManager = FurnaceManager.getInstance();
    furnaceManager.setDB(this.game.world.getDB());
    await furnaceManager.load();
  }

  private showGameUI(): void {
    this.game.gameState.setGameStarted(true);
    this.game.gameState.setPaused(false);
    this.game.resetTime();
    this.game.startGameLoop();

    this.elements.mainMenu.style.display = "none";
    this.elements.pauseMenu.style.display = "none";
    this.elements.settingsMenu.style.display = "none";
    this.elements.uiContainer.style.display = "flex";
    this.elements.bgVideo.style.display = "none";
    this.menuMusic.stop();
    this.elements.crosshair.style.display = "block";

    if (this.elements.mobileUi && this.game.renderer.getIsMobile()) {
      this.elements.mobileUi.style.display = "block";
      document.documentElement.requestFullscreen().catch(() => { });
    }
  }
}
