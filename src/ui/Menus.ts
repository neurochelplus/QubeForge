import { Game } from "../core/Game";
import { worldDB } from "../utils/DB";
import { modManagerUI } from "../modding";

export class Menus {
  private game: Game;

  private mainMenu: HTMLElement;
  private pauseMenu: HTMLElement;
  private settingsMenu: HTMLElement;
  private inventoryMenu: HTMLElement;
  private uiContainer: HTMLElement;
  private mobileUi: HTMLElement | null;
  private bgVideo: HTMLVideoElement;
  private menuMusic: HTMLAudioElement;
  private crosshair: HTMLElement;

  // Buttons
  private btnNewGame: HTMLElement;
  private btnContinue: HTMLButtonElement;
  private btnMods: HTMLElement;
  private btnResume: HTMLElement;
  private btnExit: HTMLElement;
  private resumeTimeout: number | null = null;
  private btnSettingsMain: HTMLElement;
  private btnSettingsPause: HTMLElement;
  private btnBackSettings: HTMLElement;

  // Settings
  private cbShadows: HTMLInputElement;
  private cbClouds: HTMLInputElement;

  constructor(game: Game) {
    this.game = game;

    this.mainMenu = document.getElementById("main-menu")!;
    this.pauseMenu = document.getElementById("pause-menu")!;
    this.settingsMenu = document.getElementById("settings-menu")!;
    this.inventoryMenu = document.getElementById("inventory-menu")!;
    this.uiContainer = document.getElementById("ui-container")!;
    this.mobileUi = document.getElementById("mobile-ui");
    this.bgVideo = document.getElementById("bg-video") as HTMLVideoElement;
    this.crosshair = document.getElementById("crosshair")!;

    this.menuMusic = new Audio("/menu_music.mp3");
    this.menuMusic.loop = true;
    this.menuMusic.volume = 0.3;

    // Autoplay policy handling
    document.addEventListener(
      "click",
      () => {
        if (this.mainMenu.style.display === "flex" && this.menuMusic.paused) {
          this.menuMusic.play().catch(() => {});
        }
      },
      { once: true },
    );

    this.btnNewGame = document.getElementById("btn-new-game")!;
    this.btnContinue = document.getElementById(
      "btn-continue",
    )! as HTMLButtonElement;
    this.btnMods = document.getElementById("btn-mods")!;
    this.btnResume = document.getElementById("btn-resume")!;
    this.btnExit = document.getElementById("btn-exit")!;
    this.btnSettingsMain = document.getElementById("btn-settings-main")!;
    this.btnSettingsPause = document.getElementById("btn-settings-pause")!;
    this.btnBackSettings = document.getElementById("btn-back-settings")!;

    this.cbShadows = document.getElementById("cb-shadows") as HTMLInputElement;
    this.cbClouds = document.getElementById("cb-clouds") as HTMLInputElement;

    this.btnContinue.disabled = true; // Default to disabled
    this.checkSaveState();

    this.initListeners();
  }

  private async checkSaveState() {
    const hasSave = await worldDB.hasSavedData();
    this.btnContinue.disabled = !hasSave;
  }

  private initListeners() {
    this.cbShadows.addEventListener("change", () => {
      this.game.environment.setShadowsEnabled(this.cbShadows.checked);
    });

    this.cbClouds.addEventListener("change", () => {
      this.game.environment.setCloudsEnabled(this.cbClouds.checked);
    });

    this.btnNewGame.addEventListener("click", () => this.startGame(false));
    this.btnContinue.addEventListener("click", () => this.startGame(true));
    this.btnMods.addEventListener("click", () => this.showModManager());
    this.btnResume.addEventListener("click", () => {
      if (this.game.renderer.getIsMobile()) {
        this.hidePauseMenu();
      } else {
        // STRICT SEQUENCE:
        // 1. Set flag to ignore potential 'unlock' noise during transition.
        this.game.gameState.setIsResuming(true);
        // 2. Focus body to ensure lock target is valid.
        document.body.focus();
        // 3. Request lock. Visual hiding happens in main.ts 'lock' event.
        this.game.renderer.controls.lock();

        // Safety timeout: reset flag if lock fails (rare but possible)
        setTimeout(() => {
          this.game.gameState.setIsResuming(false);
        }, 1000);
      }
    });
    this.btnSettingsMain.addEventListener("click", () =>
      this.showSettingsMenu(this.mainMenu),
    );
    this.btnSettingsPause.addEventListener("click", () =>
      this.showSettingsMenu(this.pauseMenu),
    );
    this.btnBackSettings.addEventListener("click", () =>
      this.hideSettingsMenu(),
    );

    this.btnExit.addEventListener("click", async () => {
      await this.game.world.saveWorld({
        position: this.game.renderer.controls.object.position,
        inventory: this.game.inventory.serialize(),
      });
      this.showMainMenu();
    });
  }

  public showMainMenu() {
    this.checkSaveState();
    this.game.gameState.setPaused(true);
    this.game.gameState.setGameStarted(false);

    this.mainMenu.style.display = "flex";
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "none";
    this.bgVideo.style.display = "block"; // Show video
    this.crosshair.style.display = "none";

    this.menuMusic.play().catch(() => {});

    if (this.mobileUi) this.mobileUi.style.display = "none";

    this.game.renderer.controls.unlock();
  }

  public showPauseMenu() {
    this.game.gameState.setPaused(true);
    this.pauseMenu.style.display = "flex";
    this.mainMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.game.renderer.controls.unlock();
    this.crosshair.style.display = "none";

    // PC-specific Cooldown to match browser Pointer Lock security delay (~1.3s)
    if (!this.game.renderer.getIsMobile()) {
      // Очистить предыдущий таймаут если есть
      if (this.resumeTimeout !== null) {
        clearTimeout(this.resumeTimeout);
      }

      this.btnResume.style.pointerEvents = "none";
      this.btnResume.style.opacity = "0.5";
      this.btnResume.innerText = "Ждите...";

      this.resumeTimeout = window.setTimeout(() => {
        // Only restore if we are still in the menu
        if (this.pauseMenu.style.display === "flex") {
          this.btnResume.style.pointerEvents = "auto";
          this.btnResume.style.opacity = "1";
          this.btnResume.innerText = "Продолжить";
        }
        this.resumeTimeout = null;
      }, 1300);
    }
  }

  public hidePauseMenu() {
    this.game.gameState.setPaused(false);
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.crosshair.style.display = "block";

    // Очистить таймаут и восстановить кнопку
    if (this.resumeTimeout !== null) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }

    if (!this.game.renderer.getIsMobile()) {
      this.btnResume.style.pointerEvents = "auto";
      this.btnResume.style.opacity = "1";
      this.btnResume.innerText = "Продолжить";
    }

    this.game.resetTime();
  }

  public togglePauseMenu() {
    if (!this.game.gameState.getGameStarted()) return;

    if (this.settingsMenu.style.display === "flex") {
      this.hideSettingsMenu();
      return;
    }

    if (this.game.gameState.getPaused()) {
      this.hidePauseMenu();
    } else {
      this.showPauseMenu();
    }
  }

  private showSettingsMenu(fromMenu: HTMLElement) {
    this.game.gameState.setPreviousMenu(fromMenu);
    fromMenu.style.display = "none";
    this.settingsMenu.style.display = "flex";
  }

  private hideSettingsMenu() {
    this.settingsMenu.style.display = "none";
    const prev = this.game.gameState.getPreviousMenu();
    if (prev) {
      prev.style.display = "flex";
    } else {
      this.showMainMenu();
    }
  }

  private showModManager() {
    modManagerUI.show();
  }

  private async startGame(loadSave: boolean) {
    if (!this.game.renderer.getIsMobile()) {
      this.game.renderer.controls.lock();
    }

    this.btnNewGame.innerText = "Загрузка...";
    this.btnContinue.innerText = "Загрузка...";

    try {
      if (!loadSave) {
        await this.game.world.deleteWorld();
        this.game.player.health.respawn();

        // Calculate spawn position on ground
        const spawnX = 8;
        const spawnZ = 20;

        // Ensure chunk is generated so we know about trees
        const cx = Math.floor(spawnX / 32);
        const cz = Math.floor(spawnZ / 32);
        await this.game.world.loadChunk(cx, cz);

        const topY = this.game.world.getTopY(spawnX, spawnZ);

        // +3 to stand on top and avoid head stuck in leaves
        // +0.5 to center on the block and avoid clipping neighbors
        this.game.renderer.controls.object.position.set(
          spawnX + 0.5,
          topY + 3,
          spawnZ + 0.5,
        );

        this.game.inventory.clear();
        this.game.inventoryUI.refresh();
      } else {
        const data = await this.game.world.loadWorld();
        if (data.playerPosition) {
          // Add small offset to Y to prevent getting stuck in blocks
          const safePos = data.playerPosition.clone();
          safePos.y += 0.1;
          this.game.renderer.controls.object.position.copy(safePos);
          this.game.player.physics.setVelocity({ x: 0, y: 0, z: 0 } as any); // Reset velocity
        }
        if (data.inventory) {
          this.game.inventory.deserialize(data.inventory);
          this.game.inventoryUI.refresh();
        }
      }

      this.game.gameState.setGameStarted(true);
      this.game.gameState.setPaused(false);
      this.game.resetTime();

      this.mainMenu.style.display = "none";
      this.pauseMenu.style.display = "none";
      this.settingsMenu.style.display = "none";
      this.uiContainer.style.display = "flex";
      this.bgVideo.style.display = "none"; // Hide video
      this.menuMusic.pause();
      this.menuMusic.currentTime = 0;
      this.crosshair.style.display = "block";

      if (this.mobileUi && this.game.renderer.getIsMobile()) {
        this.mobileUi.style.display = "block";
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {
      console.error("Failed to start game:", e);
      alert("Error starting game: " + e);
      if (!this.game.renderer.getIsMobile())
        this.game.renderer.controls.unlock();
    } finally {
      this.btnNewGame.innerText = "Новая Игра";
      this.btnContinue.innerText = "Продолжить";
    }
  }
}
