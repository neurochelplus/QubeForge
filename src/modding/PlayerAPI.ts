// src/modding/PlayerAPI.ts
// Безопасный доступ к игроку для модов

import type { PlayerAPIInterface } from './types';
import type { Player } from '../player/Player';
import type { Inventory } from '../inventory/Inventory';
import { BlockRegistry, ItemRegistry } from './Registry';

/**
 * API для доступа к игроку
 */
export class PlayerAPI implements PlayerAPIInterface {
  private modId: string;
  private permissions: Set<string>;
  private player: Player | null = null;
  private inventory: Inventory | null = null;

  constructor(modId: string, permissions: Set<string>) {
    this.modId = modId;
    this.permissions = permissions;
  }

  /**
   * Инъекция зависимости Player
   */
  _setPlayer(player: Player): void {
    this.player = player;
  }

  /**
   * Инъекция зависимости Inventory
   */
  _setInventory(inventory: Inventory): void {
    this.inventory = inventory;
  }

  /**
   * Получить позицию игрока
   */
  getPosition(): { x: number; y: number; z: number } {
    this.checkPermission('player.read');
    const pos = this.player?.physics.controls.object.position;
    return pos ? { x: pos.x, y: pos.y, z: pos.z } : { x: 0, y: 0, z: 0 };
  }

  /**
   * Получить текущее здоровье
   */
  getHealth(): number {
    this.checkPermission('player.read');
    return this.player?.health.getHp?.() ?? 0;
  }

  /**
   * Получить максимальное здоровье
   */
  getMaxHealth(): number {
    this.checkPermission('player.read');
    return this.player?.health.getMaxHp?.() ?? 20;
  }

  /**
   * Восстановить здоровье
   */
  heal(amount: number): void {
    this.checkPermission('player.modify');
    const currentHp = this.player?.health.getHp?.() ?? 0;
    const maxHp = this.player?.health.getMaxHp?.() ?? 20;
    this.player?.health.setHp?.(Math.min(currentHp + amount, maxHp));
  }

  /**
   * Нанести урон
   */
  damage(amount: number): void {
    this.checkPermission('player.modify');
    this.player?.health.takeDamage?.(amount);
  }

  /**
   * Получить выбранный слот хотбара
   */
  getSelectedSlot(): number {
    this.checkPermission('player.read');
    return this.inventory?.getSelectedSlot() ?? 0;
  }

  /**
   * Получить предмет в выбранном слоте
   */
  getSelectedItem(): { id: number; count: number } {
    this.checkPermission('player.read');
    const slot = this.inventory?.getSelectedSlotItem();
    return slot ? { id: slot.id, count: slot.count } : { id: 0, count: 0 };
  }

  /**
   * Проверить наличие предмета в инвентаре
   */
  hasItem(itemId: number | string, count: number = 1): boolean {
    this.checkPermission('player.read');
    if (!this.inventory) return false;

    const numericId = this.resolveItemId(itemId);
    if (numericId === -1) return false;

    let total = 0;
    for (const slot of this.inventory.getSlots()) {
      if (slot.id === numericId) {
        total += slot.count;
      }
    }
    return total >= count;
  }

  /**
   * Добавить предмет в инвентарь
   */
  addItem(itemId: number, count: number): number {
    this.checkPermission('player.modify');
    return this.inventory?.addItem(itemId, count) ?? count;
  }

  /**
   * Удалить предмет из инвентаря
   */
  removeItem(itemId: number, count: number): boolean {
    this.checkPermission('player.modify');
    return this.inventory?.removeItem(itemId, count) ?? false;
  }

  /**
   * Преобразовать строковый ID в числовой
   */
  private resolveItemId(itemId: number | string): number {
    if (typeof itemId === 'number') return itemId;

    const block = BlockRegistry.get(itemId);
    if (block) return block.numericId;

    const item = ItemRegistry.get(itemId);
    if (item) return item.numericId;

    return -1;
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
