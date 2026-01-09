// Физические константы игры

export const GRAVITY = 20.0;
export const JUMP_HEIGHT = 1.25;
export const JUMP_IMPULSE = Math.sqrt(2 * GRAVITY * JUMP_HEIGHT);

// Размеры игрока
export const PLAYER_HALF_WIDTH = 0.3;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE_HEIGHT = 1.6;

// Комбат константы
export const ATTACK_RANGE = 2.5;
export const PUNCH_DAMAGE = 1;
export const ATTACK_COOLDOWN = 500;

// Durability
export const TOOL_DURABILITY = {
  WOOD: 60,
  STONE: 132,
  IRON: 250,
};

