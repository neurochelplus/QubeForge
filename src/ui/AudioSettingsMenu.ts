/**
 * AudioSettingsMenu - Отдельное меню настроек звука (как KeybindingsMenu)
 */

import { AudioSystem } from '../audio';
import type { VolumeCategory } from '../audio';
import { VOLUME_LABELS } from '../audio/AudioConstants';

export class AudioSettingsMenu {
  private menu: HTMLElement;
  private container: HTMLElement;
  private slidersList: HTMLElement;
  private btnReset: HTMLElement;
  private btnBack: HTMLElement;
  private sliders: Map<VolumeCategory, HTMLInputElement> = new Map();
  private audioSystem: AudioSystem;
  private previousMenu: HTMLElement | null = null;
  private onClose: (() => void) | null = null;

  constructor() {
    this.audioSystem = AudioSystem.getInstance();
    
    this.menu = document.getElementById('audio-menu')!;
    this.container = document.getElementById('audio-menu-container')!;
    this.slidersList = document.getElementById('audio-sliders-list')!;
    this.btnReset = document.getElementById('btn-reset-audio')!;
    this.btnBack = document.getElementById('btn-back-audio')!;

    this.createSliders();
    this.initListeners();
    this.setupVolumeSync();
  }

  private createSliders(): void {
    const categories: VolumeCategory[] = ['master', 'music', 'effects', 'mobs', 'player', 'ui', 'ambient'];
    
    for (const category of categories) {
      const row = document.createElement('div');
      row.className = 'audio-row';

      const label = document.createElement('span');
      label.className = 'audio-label';
      label.textContent = VOLUME_LABELS[category];

      const sliderContainer = document.createElement('div');
      sliderContainer.className = 'audio-slider-container';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = String(Math.round(this.audioSystem.getVolume(category) * 100));
      slider.className = 'audio-slider';

      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'audio-value';
      valueDisplay.textContent = `${slider.value}%`;

      slider.addEventListener('input', () => {
        const value = parseInt(slider.value) / 100;
        this.audioSystem.setVolume(category, value);
        valueDisplay.textContent = `${slider.value}%`;
      });

      this.sliders.set(category, slider);

      sliderContainer.appendChild(slider);
      sliderContainer.appendChild(valueDisplay);
      row.appendChild(label);
      row.appendChild(sliderContainer);
      this.slidersList.appendChild(row);
    }
  }

  private initListeners(): void {
    this.btnReset.addEventListener('click', () => {
      this.audioSystem.resetSettings();
      this.refresh();
    });

    this.btnBack.addEventListener('click', () => {
      this.hide();
    });
  }

  private setupVolumeSync(): void {
    this.audioSystem.onVolumeChange((category, value) => {
      const slider = this.sliders.get(category);
      if (slider) {
        slider.value = String(Math.round(value * 100));
        const valueDisplay = slider.parentElement?.querySelector('.audio-value') as HTMLElement;
        if (valueDisplay) {
          valueDisplay.textContent = `${slider.value}%`;
        }
      }
    });
  }

  public show(fromMenu: HTMLElement, onClose: () => void): void {
    this.previousMenu = fromMenu;
    this.onClose = onClose;
    this.menu.style.display = 'flex';
    this.refresh();
  }

  public hide(): void {
    this.menu.style.display = 'none';
    if (this.onClose) {
      this.onClose();
    }
  }

  private refresh(): void {
    for (const [category, slider] of this.sliders) {
      const value = Math.round(this.audioSystem.getVolume(category) * 100);
      slider.value = String(value);
      const valueDisplay = slider.parentElement?.querySelector('.audio-value') as HTMLElement;
      if (valueDisplay) {
        valueDisplay.textContent = `${value}%`;
      }
    }
  }
}
