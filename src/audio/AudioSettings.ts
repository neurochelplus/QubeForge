/**
 * AudioSettings - Singleton для управления настройками громкости
 * Сохраняет/загружает из IndexedDB
 */

import type { VolumeCategory } from './AudioConstants';
import { DEFAULT_VOLUMES } from './AudioConstants';

const STORAGE_KEY = 'audio_settings';

export class AudioSettings {
  private static instance: AudioSettings | null = null;
  private volumes: Map<VolumeCategory, number>;
  private listeners: Set<(category: VolumeCategory, value: number) => void>;

  private constructor() {
    this.volumes = new Map();
    this.listeners = new Set();
    this.initDefaults();
  }

  static getInstance(): AudioSettings {
    if (!AudioSettings.instance) {
      AudioSettings.instance = new AudioSettings();
    }
    return AudioSettings.instance;
  }

  private initDefaults(): void {
    for (const [category, value] of Object.entries(DEFAULT_VOLUMES)) {
      this.volumes.set(category as VolumeCategory, value);
    }
  }

  /**
   * Загрузить настройки из localStorage
   */
  async load(): Promise<void> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as Record<string, number>;
        for (const [category, value] of Object.entries(data)) {
          if (category in DEFAULT_VOLUMES) {
            this.volumes.set(category as VolumeCategory, value);
          }
        }
      }
    } catch (e) {
      console.warn('[AudioSettings] Failed to load settings:', e);
    }
  }

  /**
   * Сохранить настройки в localStorage
   */
  save(): void {
    try {
      const data: Record<string, number> = {};
      for (const [category, value] of this.volumes) {
        data[category] = value;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[AudioSettings] Failed to save settings:', e);
    }
  }

  /**
   * Получить громкость категории
   */
  getVolume(category: VolumeCategory): number {
    return this.volumes.get(category) ?? DEFAULT_VOLUMES[category];
  }

  /**
   * Установить громкость категории
   */
  setVolume(category: VolumeCategory, value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.volumes.set(category, clamped);
    this.save();
    this.notifyListeners(category, clamped);
  }

  /**
   * Получить эффективную громкость (с учётом master)
   */
  getEffectiveVolume(category: VolumeCategory): number {
    if (category === 'master') {
      return this.getVolume('master');
    }
    return this.getVolume('master') * this.getVolume(category);
  }

  /**
   * Подписаться на изменения громкости
   */
  onChange(callback: (category: VolumeCategory, value: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(category: VolumeCategory, value: number): void {
    for (const listener of this.listeners) {
      try {
        listener(category, value);
      } catch (e) {
        console.error('[AudioSettings] Listener error:', e);
      }
    }
  }

  /**
   * Сбросить к значениям по умолчанию
   */
  reset(): void {
    this.initDefaults();
    this.save();
    for (const [category, value] of this.volumes) {
      this.notifyListeners(category, value);
    }
  }
}
