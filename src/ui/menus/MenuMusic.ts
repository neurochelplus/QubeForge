/**
 * Управление музыкой меню
 */
import { audioSystem } from "../../audio";

export class MenuMusic {
  private audio: HTMLAudioElement;
  private mainMenu: HTMLElement;

  constructor(mainMenu: HTMLElement) {
    this.mainMenu = mainMenu;
    this.audio = new Audio("/menu_music.mp3");
    this.audio.loop = true;
    this.updateVolume();

    // Sync volume with audio settings
    audioSystem.onVolumeChange((category) => {
      if (category === 'master' || category === 'music') {
        this.updateVolume();
      }
    });

    // Autoplay policy handling
    document.addEventListener(
      "click",
      () => {
        if (this.mainMenu.style.display === "flex" && this.audio.paused) {
          this.audio.play().catch(() => {});
        }
      },
      { once: true },
    );
  }

  private updateVolume(): void {
    this.audio.volume = audioSystem.getVolume('master') * audioSystem.getVolume('music') * 0.3;
  }

  play(): void {
    this.audio.play().catch(() => {});
  }

  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
  }
}
