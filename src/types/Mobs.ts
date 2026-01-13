/**
 * Типы для мобов и AI
 */

export const MobState = {
  IDLE: 0,
  WANDER: 1,
  CHASE: 2,
  ATTACK: 3,
  SEEK_SHELTER: 4,
  ALERT: 5,
  FLEE: 6,
} as const;

export type MobStateType = (typeof MobState)[keyof typeof MobState];

export interface MobStats {
  hp: number;
  maxHp: number;
  walkSpeed: number;
  chaseSpeed: number;
  attackDamage: number;
  attackRange: number;
  detectionRange: number;
}

export interface MobDimensions {
  width: number;
  height: number;
}
