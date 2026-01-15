/**
 * Контроллер меню паузы
 */
import type { Game } from "../../core/Game";
import type { MenuElements } from "./MenuElements";

export class PauseMenuController {
  private game: Game;
  private elements: MenuElements;
  private resumeTimeout: number | null = null;

  constructor(game: Game, elements: MenuElements) {
    this.game = game;
    this.elements = elements;
  }

  show(): void {
    this.game.gameState.setPaused(true);
    this.elements.pauseMenu.style.display = "flex";
    this.elements.mainMenu.style.display = "none";
    this.elements.settingsMenu.style.display = "none";
    this.game.renderer.controls.unlock();
    this.elements.crosshair.style.display = "none";

    // PC-specific Cooldown to match browser Pointer Lock security delay (~1.3s)
    if (!this.game.renderer.getIsMobile()) {
      this.startResumeCooldown();
    }
  }

  hide(): void {
    this.game.gameState.setPaused(false);
    this.elements.pauseMenu.style.display = "none";
    this.elements.settingsMenu.style.display = "none";
    this.elements.crosshair.style.display = "block";

    this.clearResumeCooldown();
    this.game.resetTime();
  }

  toggle(): void {
    if (!this.game.gameState.getGameStarted()) return;

    if (this.elements.settingsMenu.style.display === "flex") {
      return; // Settings menu handles its own back
    }

    if (this.game.gameState.getPaused()) {
      this.hide();
    } else {
      this.show();
    }
  }

  private startResumeCooldown(): void {
    if (this.resumeTimeout !== null) {
      clearTimeout(this.resumeTimeout);
    }

    this.elements.btnResume.style.pointerEvents = "none";
    this.elements.btnResume.style.opacity = "0.5";
    this.elements.btnResume.innerText = "Ждите...";

    this.resumeTimeout = window.setTimeout(() => {
      if (this.elements.pauseMenu.style.display === "flex") {
        this.elements.btnResume.style.pointerEvents = "auto";
        this.elements.btnResume.style.opacity = "1";
        this.elements.btnResume.innerText = "Продолжить";
      }
      this.resumeTimeout = null;
    }, 1300);
  }

  private clearResumeCooldown(): void {
    if (this.resumeTimeout !== null) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }

    if (!this.game.renderer.getIsMobile()) {
      this.elements.btnResume.style.pointerEvents = "auto";
      this.elements.btnResume.style.opacity = "1";
      this.elements.btnResume.innerText = "Продолжить";
    }
  }

  handleResumeClick(): void {
    if (this.game.renderer.getIsMobile()) {
      this.hide();
    } else {
      this.game.gameState.setIsResuming(true);
      document.body.focus();
      this.game.renderer.controls.lock();

      setTimeout(() => {
        this.game.gameState.setIsResuming(false);
      }, 1000);
    }
  }
}
