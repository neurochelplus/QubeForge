import { Game } from "../core/Game";

export class Menus {
  private game: Game;

  private mainMenu: HTMLElement;
  private pauseMenu: HTMLElement;
  private settingsMenu: HTMLElement;
  private inventoryMenu: HTMLElement;
  private uiContainer: HTMLElement;
  private mobileUi: HTMLElement | null;

  // Buttons
  private btnNewGame: HTMLElement;
  private btnContinue: HTMLElement;
  private btnResume: HTMLElement;
  private btnExit: HTMLElement;
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

    this.btnNewGame = document.getElementById("btn-new-game")!;
    this.btnContinue = document.getElementById("btn-continue")!;
    this.btnResume = document.getElementById("btn-resume")!;
    this.btnExit = document.getElementById("btn-exit")!;
    this.btnSettingsMain = document.getElementById("btn-settings-main")!;
    this.btnSettingsPause = document.getElementById("btn-settings-pause")!;
    this.btnBackSettings = document.getElementById("btn-back-settings")!;

    this.cbShadows = document.getElementById("cb-shadows") as HTMLInputElement;
    this.cbClouds = document.getElementById("cb-clouds") as HTMLInputElement;

    this.initListeners();
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
    this.game.gameState.setPaused(true);
    this.game.gameState.setGameStarted(false);

    this.mainMenu.style.display = "flex";
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.inventoryMenu.style.display = "none";
    this.uiContainer.style.display = "none";

    if (this.mobileUi) this.mobileUi.style.display = "none";

    this.game.renderer.controls.unlock();
  }

  public showPauseMenu() {
    this.game.gameState.setPaused(true);
    this.pauseMenu.style.display = "flex";
    this.mainMenu.style.display = "none";
    this.settingsMenu.style.display = "none";
    this.game.renderer.controls.unlock();
  }

  public hidePauseMenu() {
    this.game.gameState.setPaused(false);
    this.pauseMenu.style.display = "none";
    this.settingsMenu.style.display = "none";

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

  private async startGame(loadSave: boolean) {
    if (!this.game.renderer.getIsMobile()) {
      this.game.renderer.controls.lock();
    }

    this.btnNewGame.innerText = "Loading...";
    this.btnContinue.innerText = "Loading...";

    try {
      if (!loadSave) {
        await this.game.world.deleteWorld();
        this.game.player.health.respawn();
        this.game.renderer.controls.object.position.set(8, 40, 20);
        this.game.inventory.clear();
        this.game.inventoryUI.refresh();
      } else {
        const data = await this.game.world.loadWorld();
        if (data.playerPosition) {
          this.game.renderer.controls.object.position.copy(data.playerPosition);
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
      this.btnNewGame.innerText = "New Game";
      this.btnContinue.innerText = "Continue";
    }
  }
}
