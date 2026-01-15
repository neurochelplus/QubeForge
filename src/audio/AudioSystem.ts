/**
 * AudioSystem - Главный singleton звуковой системы
 * Координирует SoundPlayer, AudioSettings и интеграцию с игрой
 */

import { AudioSettings } from './AudioSettings';
import type { PlayOptions } from './SoundPlayer';
import { SoundPlayer } from './SoundPlayer';
import type { 
  SoundType, 
  VolumeCategory, 
  MusicTrack,
} from './AudioConstants';
import {
  MUSIC_CONFIGS,
  VOLUME_LABELS 
} from './AudioConstants';
import { globalEventBus } from '../modding';

export class AudioSystem {
  private static instance: AudioSystem | null = null;
  
  private settings: AudioSettings;
  private player: SoundPlayer;
  private currentMusic: HTMLAudioElement | null = null;
  private currentMusicTrack: MusicTrack | null = null;
  private initialized: boolean = false;

  private constructor() {
    this.settings = AudioSettings.getInstance();
    this.player = new SoundPlayer();
  }

  static getInstance(): AudioSystem {
    if (!AudioSystem.instance) {
      AudioSystem.instance = new AudioSystem();
    }
    return AudioSystem.instance;
  }

  /**
   * Инициализация системы (вызывать после user gesture)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await this.settings.load();
    await this.player.init();
    this.setupEventListeners();
    this.initialized = true;

    console.log('[AudioSystem] Initialized');
  }

  /**
   * Подписка на игровые события
   */
  private setupEventListeners(): void {
    // Разрушение блока
    globalEventBus.on('world:blockBreak', (event) => {
      console.log('[AudioSystem] blockBreak event received');
      this.play('block_break', { volume: 0.8 });
    }, 'audio-system');

    // Размещение блока
    globalEventBus.on('world:blockPlace', (event) => {
      console.log('[AudioSystem] blockPlace event received');
      this.play('block_place', { volume: 0.7 });
    }, 'audio-system');

    // Урон игроку
    globalEventBus.on('player:damage', (event) => {
      console.log('[AudioSystem] player:damage event received');
      this.play('player_hurt');
    }, 'audio-system');

    // Смерть моба
    globalEventBus.on('mob:death', (event) => {
      console.log('[AudioSystem] mob:death event received');
      this.play('mob_death');
    }, 'audio-system');

    // Подбор предмета
    globalEventBus.on('item:pickup', (event) => {
      console.log('[AudioSystem] item:pickup event received');
      this.play('item_pickup', { volume: 0.6 });
    }, 'audio-system');
  }

  /**
   * Воспроизвести звуковой эффект
   */
  play(sound: SoundType, options?: PlayOptions): void {
    this.player.play(sound, options);
  }

  /**
   * Воспроизвести звук напрямую по пути
   */
  playDirect(path: string, category: VolumeCategory, options?: PlayOptions): void {
    this.player.playDirect(path, category, options);
  }

  /**
   * Воспроизвести музыку
   */
  playMusic(track: MusicTrack): void {
    const config = MUSIC_CONFIGS[track];
    if (!config) return;

    // Остановить текущую музыку
    this.stopMusic();

    this.currentMusic = new Audio(config.path);
    this.currentMusic.loop = true;
    this.currentMusic.volume = this.settings.getEffectiveVolume('music') * (config.volume ?? 1.0);
    this.currentMusicTrack = track;

    // Подписаться на изменения громкости
    const unsubscribe = this.settings.onChange((category) => {
      if ((category === 'master' || category === 'music') && this.currentMusic) {
        this.currentMusic.volume = this.settings.getEffectiveVolume('music') * (config.volume ?? 1.0);
      }
    });

    this.currentMusic.play().catch(() => {});

    // Очистить подписку при остановке
    this.currentMusic.addEventListener('ended', unsubscribe, { once: true });
  }

  /**
   * Остановить музыку
   */
  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.currentTime = 0;
      this.currentMusic = null;
      this.currentMusicTrack = null;
    }
  }

  /**
   * Пауза/возобновление музыки
   */
  pauseMusic(): void {
    this.currentMusic?.pause();
  }

  resumeMusic(): void {
    this.currentMusic?.play().catch(() => {});
  }

  /**
   * Получить громкость категории
   */
  getVolume(category: VolumeCategory): number {
    return this.settings.getVolume(category);
  }

  /**
   * Установить громкость категории
   */
  setVolume(category: VolumeCategory, value: number): void {
    this.settings.setVolume(category, value);
  }

  /**
   * Получить все категории с названиями
   */
  getVolumeCategories(): { category: VolumeCategory; label: string; value: number }[] {
    return (Object.keys(VOLUME_LABELS) as VolumeCategory[]).map(category => ({
      category,
      label: VOLUME_LABELS[category],
      value: this.settings.getVolume(category),
    }));
  }

  /**
   * Подписаться на изменения громкости
   */
  onVolumeChange(callback: (category: VolumeCategory, value: number) => void): () => void {
    return this.settings.onChange(callback);
  }

  /**
   * Сбросить настройки
   */
  resetSettings(): void {
    this.settings.reset();
  }

  /**
   * Остановить все звуки
   */
  stopAll(): void {
    this.player.stopAll();
    this.stopMusic();
  }
}

// Экспорт singleton для удобства
export const audioSystem = AudioSystem.getInstance();
