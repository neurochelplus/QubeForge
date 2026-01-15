/**
 * Menus - Фасад для управления всеми меню игры
 */
import { Game } from "../core/Game";
import { modManagerUI } from "../modding";
import { FeatureToggles } from "../utils/FeatureToggles";
import { KeybindingsMenu } from "./KeybindingsMenu";
import { AudioSettingsMenu } from "./AudioSettingsMenu";
import { audioSystem } from "../audio";
import { WorldSelectionUI } from "./WorldSelectionUI";
import { 
  initMenuElements, 
  MenuMusic, 
  PauseMenuController, 
  GameLauncher,
  type MenuElements 
} from "./menus";

export class Menus {
  private game: Game;
  private elements: MenuElements;
  private menuMusic: MenuMusic;
  private pauseController: PauseMenuController;
  private gameLauncher: GameLauncher;
  
  private keybindingsMenu: KeybindingsMenu;
  private audioSettingsMenu: AudioSettingsMenu;
  private worldSelectionUI: WorldSelectionUI;

  constructor(game: Game) {
    this.game = game;
    this.elements = initMenuElements();
    this.menuMusic = new MenuMusic(this.elements.mainMenu);
    this.pauseController = new PauseMenuController(game, this.elements);
    this.gameLauncher = new GameLauncher(game, this.elements, this.menuMusic);
    
    this.keybindingsMenu = new KeybindingsMenu();
    this.audioSettingsMenu = new AudioSettingsMenu();
    this.worldSelectionUI = new WorldSelectionUI();

    // Initialize audio system
    audioSystem.init().catch(console.error);

    // Check feature toggle for mods button
    const toggles = FeatureToggles.getInstance();
    if (!toggles.isEnabled('show_mods')) {
      this.elements.btnMods.style.display = 'none';
    }

    this.initListeners(toggles.isEnabled('show_mods'));
  }

  private initListeners(showMods: boolean): void {
    // Settings checkboxes
    this.elements.cbShadows.addEventListener("change", () => {
      this.game.environment.setShadowsEnabled(this.elements.cbShadows.checked);
    });

    this.elements.cbClouds.addEventListener("change", () => {
      this.game.environment.setCloudsEnabled(this.elements.cbClouds.checked);
    });

    // Main menu buttons
    this.elements.btnSingleplayer.addEventListener("click", () => this.showWorldSelection());
    
    if (showMods) {
      this.elements.btnMods.addEventListener("click", () => modManagerUI.show());
    }

    // Pause menu buttons
    this.elements.btnResume.addEventListener("click", () => {
      this.pauseController.handleResumeClick();
    });

    this.elements.btnExit.addEventListener("click", async () => {
      const sessionTime = this.game.gameState.getTimeSinceLastSave();
      await this.game.world.saveWorld({
        position: this.game.renderer.controls.object.position,
        inventory: this.game.inventory.serialize(),
        sessionTime,
      });
      this.game.gameState.markSaveTime();
      this.showMainMenu();
    });

    // Settings buttons
    this.elements.btnSettingsMain.addEventListener("click", () => {
      this.showSettingsMenu(this.elements.mainMenu);
    });

    this.elements.btnSettingsPause.addEventListener("click", () => {
      this.showSettingsMenu(this.elements.pauseMenu);
    });

    this.elements.btnBackSettings.addEventListener("click", () => {
      this.hideSettingsMenu();
    });

    this.elements.btnKeybindings.addEventListener("click", () => {
      this.showKeybindingsMenu();
    });

    this.elements.btnAudioSettings.addEventListener("click", () => {
      this.showAudioSettingsMenu();
    });
  }

  public showMainMenu(): void {
    this.game.gameState.setPaused(true);
    this.game.gameState.setGameStarted(false);

    this.elements.mainMenu.style.display = "flex";
    this.elements.pauseMenu.style.display = "none";
    this.elements.settingsMenu.style.display = "none";
    this.elements.inventoryMenu.style.display = "none";
    this.elements.uiContainer.style.display = "none";
    this.elements.bgVideo.style.display = "block";
    this.elements.crosshair.style.display = "none";

    this.menuMusic.play();

    if (this.elements.mobileUi) {
      this.elements.mobileUi.style.display = "none";
    }

    this.game.renderer.controls.unlock();
  }

  public showPauseMenu(): void {
    this.pauseController.show();
  }

  public hidePauseMenu(): void {
    this.pauseController.hide();
  }

  public togglePauseMenu(): void {
    if (!this.game.gameState.getGameStarted()) return;

    if (this.elements.settingsMenu.style.display === "flex") {
      this.hideSettingsMenu();
      return;
    }

    this.pauseController.toggle();
  }

  private showSettingsMenu(fromMenu: HTMLElement): void {
    this.game.gameState.setPreviousMenu(fromMenu);
    fromMenu.style.display = "none";
    this.elements.settingsMenu.style.display = "flex";
  }

  private hideSettingsMenu(): void {
    this.elements.settingsMenu.style.display = "none";
    const prev = this.game.gameState.getPreviousMenu();
    if (prev) {
      prev.style.display = "flex";
    } else {
      this.showMainMenu();
    }
  }

  private showKeybindingsMenu(): void {
    this.elements.settingsMenu.style.display = "none";
    this.keybindingsMenu.show(this.elements.settingsMenu, () => {
      this.elements.settingsMenu.style.display = "flex";
    });
  }

  private showAudioSettingsMenu(): void {
    this.elements.settingsMenu.style.display = "none";
    this.audioSettingsMenu.show(this.elements.settingsMenu, () => {
      this.elements.settingsMenu.style.display = "flex";
    });
  }

<<<<<<< HEAD
    this.btnNewGame.innerText = "Загрузка...";
    this.btnContinue.innerText = "Загрузка...";

    try {
      if (!loadSave) {
        await this.game.world.deleteWorld();
        this.game.player.health.respawn();

        // Calculate spawn position on ground
        const spawnX = 8;
        const spawnZ = 20;

        // Ensure chunk is fully generated before getting topY
        const cx = Math.floor(spawnX / 32);
        const cz = Math.floor(spawnZ / 32);
        await this.game.world.waitForChunk(cx, cz);

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
=======
  public showWorldSelection(): void {
    this.elements.mainMenu.style.display = "none";
    
    this.worldSelectionUI.show(
      (worldId) => this.gameLauncher.launch(worldId),
      () => {
        this.elements.mainMenu.style.display = "flex";
>>>>>>> 3a48882 (feat: Система сохранения миров, звуковая система, рефакторинг меню)
      }
    );
  }
}
