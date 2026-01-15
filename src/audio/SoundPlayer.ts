/**
 * SoundPlayer - Web Audio API воспроизведение звуков
 */

import { AudioSettings } from './AudioSettings';
import type { 
  SoundType, 
  VolumeCategory,
  SoundConfig 
} from './AudioConstants';
import {
  SOUND_CATEGORIES, 
  SOUND_CONFIGS,
} from './AudioConstants';

export interface PlayOptions {
  volume?: number;      // Дополнительный множитель громкости
  pitch?: number;       // Pitch (playbackRate)
  loop?: boolean;       // Зациклить
  position?: { x: number; y: number; z: number }; // 3D позиция (для будущего)
}

interface ActiveSound {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  category: VolumeCategory;
}

export class SoundPlayer {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Map<VolumeCategory, GainNode> = new Map();
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private activeSounds: Set<ActiveSound> = new Set();
  private settings: AudioSettings;

  constructor() {
    this.settings = AudioSettings.getInstance();
  }

  /**
   * Инициализация Web Audio API (вызывать после user gesture)
   */
  async init(): Promise<void> {
    if (this.context) return;

    try {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.masterGain.gain.value = this.settings.getVolume('master');

      // Создать gain nodes для каждой категории
      const categories: VolumeCategory[] = ['music', 'effects', 'mobs', 'player', 'ui', 'ambient'];
      for (const category of categories) {
        const gain = this.context.createGain();
        gain.connect(this.masterGain);
        gain.gain.value = this.settings.getVolume(category);
        this.categoryGains.set(category, gain);
      }

      // Подписаться на изменения громкости
      this.settings.onChange((category, value) => {
        if (category === 'master' && this.masterGain) {
          this.masterGain.gain.value = value;
        } else {
          const gain = this.categoryGains.get(category);
          if (gain) gain.gain.value = value;
        }
      });

    } catch (e) {
      console.error('[SoundPlayer] Failed to init AudioContext:', e);
    }
  }

  /**
   * Возобновить AudioContext (после user gesture)
   */
  async resume(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Загрузить звуковой файл
   */
  private async loadBuffer(path: string): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(path)) {
      return this.bufferCache.get(path)!;
    }

    if (!this.context) {
      console.warn(`[SoundPlayer] No AudioContext for: ${path}`);
      return null;
    }

    try {
      console.log(`[SoundPlayer] Loading: ${path}`);
      const response = await fetch(path);
      if (!response.ok) {
        console.warn(`[SoundPlayer] Failed to fetch: ${path} (${response.status})`);
        return null;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.bufferCache.set(path, audioBuffer);
      console.log(`[SoundPlayer] Loaded: ${path}`);
      return audioBuffer;
    } catch (e) {
      console.warn(`[SoundPlayer] Failed to load: ${path}`, e);
      return null;
    }
  }

  /**
   * Воспроизвести звук по типу
   */
  async play(soundType: SoundType, options: PlayOptions = {}): Promise<void> {
    const config = SOUND_CONFIGS[soundType];
    if (!config) {
      return;
    }

    await this.playFromConfig(soundType, config, options);
  }

  /**
   * Воспроизвести звук напрямую по пути
   */
  async playDirect(
    path: string, 
    category: VolumeCategory, 
    options: PlayOptions = {}
  ): Promise<void> {
    if (!this.context || !this.masterGain) {
      await this.init();
    }
    if (!this.context) return;

    await this.resume();

    const buffer = await this.loadBuffer(path);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = options.loop ?? false;
    source.playbackRate.value = options.pitch ?? 1.0;

    const gainNode = this.context.createGain();
    const volume = options.volume ?? 1.0;
    gainNode.gain.value = volume;

    // Подключить к категории или напрямую к master
    const categoryGain = this.categoryGains.get(category);

    if (categoryGain) {
      gainNode.connect(categoryGain);
    } else {
      gainNode.connect(this.masterGain!);
    }

    source.connect(gainNode);

    const activeSound: ActiveSound = { source, gainNode, category };
    this.activeSounds.add(activeSound);

    source.onended = () => {
      this.activeSounds.delete(activeSound);
    };

    source.start();
  }

  private async playFromConfig(
    soundType: SoundType,
    config: SoundConfig,
    options: PlayOptions
  ): Promise<void> {
    // Выбрать вариант если есть
    // Формат файлов: stone1.ogg, stone2.ogg (без подчёркивания)
    // variants=0 означает один файл без номера (death.ogg)
    let path = config.path;
    if (config.variants && config.variants > 0) {
      const variant = Math.floor(Math.random() * config.variants) + 1;
      path = `${config.path}${variant}.ogg`;
    } else {
      path = `${config.path}.ogg`;
    }

    // Рассчитать pitch
    let pitch = options.pitch ?? 1.0;
    if (config.pitchMin !== undefined && config.pitchMax !== undefined) {
      const range = config.pitchMax - config.pitchMin;
      pitch = config.pitchMin + Math.random() * range;
    }

    // Рассчитать громкость
    const volume = (options.volume ?? 1.0) * (config.volume ?? 1.0);

    const category = SOUND_CATEGORIES[soundType];
    await this.playDirect(path, category, { ...options, pitch, volume });
  }

  /**
   * Остановить все звуки категории
   */
  stopCategory(category: VolumeCategory): void {
    for (const sound of this.activeSounds) {
      if (sound.category === category) {
        try {
          sound.source.stop();
        } catch {}
      }
    }
  }

  /**
   * Остановить все звуки
   */
  stopAll(): void {
    for (const sound of this.activeSounds) {
      try {
        sound.source.stop();
      } catch {}
    }
    this.activeSounds.clear();
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    this.bufferCache.clear();
  }
}
