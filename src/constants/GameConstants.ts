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

// Item Entity Constants
export const ITEM_ENTITY = {
  SIZE_BLOCK: 0.3,
  SIZE_FLAT: 0.5,
  COLLISION_OFFSET: 0.15, // Half of SIZE_BLOCK
  MAX_AGE: 180000, // 3 minutes
  BLINK_START: 10000, // Start blinking 10 seconds before death
  BLINK_INTERVAL: 250, // Blink every 250ms
  FLOAT_AMPLITUDE: 0.05,
  FLOAT_SPEED: 3,
  ROTATION_SPEED: 2,
};

