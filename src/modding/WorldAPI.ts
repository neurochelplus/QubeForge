// src/modding/WorldAPI.ts
// Безопасный доступ к миру для модов

import type { WorldAPIInterface } from './types';
import type { World } from '../world/World';
import type { Environment } from '../world/Environment';

/**
 * API для доступа к миру
 */
export class WorldAPI implements WorldAPIInterface {
  private modId: string;
  private permissions: Set<string>;
  private world: World | null = null;
  private environment: Environment | null = null;

  constructor(modId: string, permissions: Set<string>) {
    this.modId = modId;
    this.permissions = permissions;
  }

  /**
   * Инъекция зависимости World
   */
  _setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Инъекция зависимости Environment
   */
  _setEnvironment(environment: Environment): void {
    this.environment = environment;
  }

  /**
   * Получить ID блока по координатам
   */
  getBlock(x: number, y: number, z: number): number {
    this.checkPermission('world.read');
    return this.world?.getBlock(x, y, z) ?? 0;
  }

  /**
   * Проверить наличие блока
   */
  hasBlock(x: number, y: number, z: number): boolean {
    this.checkPermission('world.read');
    return this.world?.hasBlock(x, y, z) ?? false;
  }

  /**
   * Получить высоту поверхности
   */
  getTopY(x: number, z: number): number {
    this.checkPermission('world.read');
    return this.world?.getTopY(x, z) ?? 0;
  }

  /**
   * Установить блок
   */
  setBlock(x: number, y: number, z: number, blockId: number): boolean {
    this.checkPermission('world.modify');
    if (!this.world) return false;

    // Защита от установки в bedrock слой
    if (y <= 0) return false;

    this.world.setBlock(x, y, z, blockId);
    return true;
  }

  /**
   * Проверить, день ли сейчас
   */
  isDay(): boolean {
    this.checkPermission('world.read');
    return this.environment?.isDay ?? true;
  }

  /**
   * Получить время суток (0-1)
   */
  getTimeOfDay(): number {
    this.checkPermission('world.read');
    // Environment не имеет публичного метода getTimeOfDay, используем isDay
    return this.environment?.isDay ? 0.25 : 0.75;
  }

  /**
   * Проверка разрешения
   */
  private checkPermission(permission: string): void {
    if (!this.permissions.has(permission)) {
      throw new Error(`[${this.modId}] Permission denied: ${permission}`);
    }
  }
}
