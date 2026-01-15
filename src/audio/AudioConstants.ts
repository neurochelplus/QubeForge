/**
 * Константы звуковой системы
 */

// Категории громкости
export type VolumeCategory = 
  | 'master'
  | 'music'
  | 'effects'
  | 'mobs'
  | 'player'
  | 'ui'
  | 'ambient';

// Громкость по умолчанию для каждой категории
export const DEFAULT_VOLUMES: Record<VolumeCategory, number> = {
  master: 1.0,
  music: 0.5,
  effects: 0.8,
  mobs: 0.7,
  player: 0.8,
  ui: 0.6,
  ambient: 0.4,
};

// Названия категорий для UI
export const VOLUME_LABELS: Record<VolumeCategory, string> = {
  master: 'Общая громкость',
  music: 'Музыка',
  effects: 'Эффекты',
  mobs: 'Мобы',
  player: 'Игрок',
  ui: 'Интерфейс',
  ambient: 'Окружение',
};

// Типы звуков
export type SoundType = 
  // Блоки
  | 'block_break'
  | 'block_place'
  | 'block_step'
  // Игрок
  | 'player_hurt'
  | 'player_death'
  | 'player_jump'
  | 'player_land'
  | 'player_attack'
  // Мобы
  | 'mob_hurt'
  | 'mob_death'
  | 'mob_ambient'
  | 'mob_attack'
  // UI
  | 'ui_click'
  | 'ui_open'
  | 'ui_close'
  | 'item_pickup'
  // Окружение
  | 'ambient_wind'
  | 'ambient_cave';

// Маппинг звуков на категории
export const SOUND_CATEGORIES: Record<SoundType, VolumeCategory> = {
  block_break: 'effects',
  block_place: 'effects',
  block_step: 'player',
  player_hurt: 'player',
  player_death: 'player',
  player_jump: 'player',
  player_land: 'player',
  player_attack: 'player',
  mob_hurt: 'mobs',
  mob_death: 'mobs',
  mob_ambient: 'mobs',
  mob_attack: 'mobs',
  ui_click: 'ui',
  ui_open: 'ui',
  ui_close: 'ui',
  item_pickup: 'ui',
  ambient_wind: 'ambient',
  ambient_cave: 'ambient',
};

// Конфигурация звуков (путь, вариации, pitch range)
export interface SoundConfig {
  path: string;
  variants?: number;      // Количество вариаций (file_1.ogg, file_2.ogg, ...)
  pitchMin?: number;      // Минимальный pitch (default: 1.0)
  pitchMax?: number;      // Максимальный pitch (default: 1.0)
  volume?: number;        // Базовая громкость (default: 1.0)
}

// Пути к звуковым файлам
// Формат: path - базовый путь без номера, variants - количество вариаций (file1.ogg, file2.ogg, ...)
export const SOUND_CONFIGS: Partial<Record<SoundType, SoundConfig>> = {
  // Блоки - копание/ломание (stone1.ogg - stone4.ogg)
  block_break: { path: '/sounds/dig/stone', variants: 4, pitchMin: 0.8, pitchMax: 1.2 },
  block_place: { path: '/sounds/dig/stone', variants: 4, pitchMin: 0.9, pitchMax: 1.1, volume: 0.7 },
  block_step: { path: '/sounds/step/grass', variants: 6, pitchMin: 0.9, pitchMax: 1.1, volume: 0.5 },
  
  // Игрок (hit1.ogg - hit3.ogg)
  player_hurt: { path: '/sounds/damage/hit', variants: 3, pitchMin: 0.9, pitchMax: 1.1 },
  player_death: { path: '/sounds/damage/hit', variants: 3, volume: 1.2 },
  player_land: { path: '/sounds/damage/fallsmall', variants: 0, volume: 0.6 }, // один файл без номера
  player_attack: { path: '/sounds/random/bow', variants: 0, pitchMin: 1.2, pitchMax: 1.5, volume: 0.4 },
  
  // Мобы (hurt1.ogg - hurt2.ogg, say1.ogg - say3.ogg)
  mob_hurt: { path: '/sounds/mob/zombie/hurt', variants: 2, pitchMin: 0.8, pitchMax: 1.2 },
  mob_death: { path: '/sounds/mob/zombie/death', variants: 0 }, // один файл без номера
  mob_ambient: { path: '/sounds/mob/zombie/say', variants: 3, volume: 0.5 },
  
  // UI
  ui_click: { path: '/sounds/random/click', variants: 0, volume: 0.5 },
  item_pickup: { path: '/sounds/random/pop', variants: 0, pitchMin: 1.0, pitchMax: 1.4, volume: 0.4 },
};

// Музыкальные треки
export type MusicTrack = 
  | 'menu'
  | 'game_day'
  | 'game_night'
  | 'combat';

export const MUSIC_CONFIGS: Partial<Record<MusicTrack, { path: string; volume?: number }>> = {
  menu: { path: '/menu_music.mp3', volume: 0.3 },
  // game_day: { path: '/sounds/music/day.ogg' },
};
