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
} from "./menus/index";

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

      // Cleanup resources
      this.game.stop();

      this.showMainMenu();
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

  public showWorldSelection(): void {
    this.elements.mainMenu.style.display = "none";

    this.worldSelectionUI.show(
      (worldId) => this.gameLauncher.launch(worldId),
      () => {
        this.elements.mainMenu.style.display = "flex";
      }
    );
  }

  public toggleInventory(showTable: boolean): void {
    if (this.elements.inventoryMenu.style.display === "flex") {
      this.elements.inventoryMenu.style.display = "none";
      this.elements.uiContainer.style.display = "block";
      this.elements.crosshair.style.display = "block";
      this.game.renderer.controls.lock();
      this.game.craftingUI.setVisible(false, false);
    } else {
      this.elements.inventoryMenu.style.display = "flex";
      this.elements.uiContainer.style.display = "none";
      this.elements.crosshair.style.display = "none";
      this.game.renderer.controls.unlock();
      this.game.craftingUI.setVisible(true, showTable);
    }
    this.game.inventoryUI.refresh();
  }
}
