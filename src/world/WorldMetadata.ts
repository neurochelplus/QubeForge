/**
 * Метаданные мира для системы управления мирами
 */

export interface WorldMetadata {
  id: string;
  name: string;
  seed: number;
  gameMode: 'survival' | 'creative' | 'hardcore';
  difficulty: 0 | 1 | 2 | 3;
  createdAt: number;
  lastPlayed: number;
  playtime: number;
  version: number;
  playerPosition: { x: number; y: number; z: number };
  playerHp: number;
  dayTime: number;
  cheatsEnabled: boolean;
}

/**
 * Генерирует уникальный ID мира (UUID v4)
 */
export function generateWorldId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Хеширует строку seed в число
 */
export function hashSeed(input: string): number {
  if (!input || input.trim() === '') {
    return Math.floor(Math.random() * 2147483647);
  }
  
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Валидирует название мира
 */
export function validateWorldName(name: string): { valid: boolean; error?: string } {
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Название не может быть пустым' };
  }
  
  if (trimmed.length > 32) {
    return { valid: false, error: 'Название не может быть длиннее 32 символов' };
  }
  
  const forbidden = /[<>:"/\\|?*]/;
  if (forbidden.test(trimmed)) {
    return { valid: false, error: 'Название содержит недопустимые символы' };
  }
  
  return { valid: true };
}
