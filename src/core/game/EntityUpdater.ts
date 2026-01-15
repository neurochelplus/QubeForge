/**
 * Обновление игровых сущностей (dropped items)
 */
import * as THREE from "three";
import type { ItemEntity } from "../../entities/ItemEntity";
import type { Inventory } from "../../inventory/Inventory";
import type { InventoryUI } from "../../inventory/InventoryUI";
import { globalEventBus } from "../../modding";

export class EntityUpdater {
  private entities: ItemEntity[];
  private inventory: Inventory;
  private inventoryUI: InventoryUI;

  constructor(
    entities: ItemEntity[],
    inventory: Inventory,
    inventoryUI: InventoryUI
  ) {
    this.entities = entities;
    this.inventory = inventory;
    this.inventoryUI = inventoryUI;
  }

  /**
   * Обновить все сущности
   */
  update(time: number, delta: number, playerPos: THREE.Vector3): void {
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];

      // Entity culling: скрыть дальние предметы
      const distSq = entity.mesh.position.distanceToSquared(playerPos);
      entity.mesh.visible = distSq < 1600; // 40^2 = 1600 блоков видимости

      // Обновлять физику только для видимых
      if (entity.mesh.visible) {
        entity.update(time / 1000, delta);
      }

      if (entity.isDead) {
        this.entities.splice(i, 1);
        continue;
      }

      // Pickup logic
      if (distSq < 6.25) { // 2.5^2 = 6.25
        this.tryPickup(entity, i);
      }
    }
  }

  private tryPickup(entity: ItemEntity, index: number): void {
    const remaining = this.inventory.addItem(entity.type, entity.count);
    const pickedUp = entity.count - remaining;
    entity.count = remaining;

    if (pickedUp > 0) {
      globalEventBus.emit('item:pickup', {
        itemId: entity.type,
        count: pickedUp,
      });
    }

    if (remaining === 0) {
      entity.dispose();
      this.entities.splice(index, 1);
    }

    this.inventoryUI.refresh();
    if (this.inventoryUI.onInventoryChange) {
      this.inventoryUI.onInventoryChange();
    }
  }
}
