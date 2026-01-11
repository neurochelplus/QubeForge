import * as THREE from "three";
import { ITEM_ENTITY } from "../constants/GameConstants";

export class ItemLifecycle {
  private creationTime: number;
  public isDead: boolean = false;

  constructor(private mesh: THREE.Mesh) {
    this.creationTime = performance.now();
  }

  public update(): boolean {
    const age = performance.now() - this.creationTime;

    if (age > ITEM_ENTITY.MAX_AGE) {
      this.isDead = true;
      return false;
    }

    this.updateVisibility(age);
    return true;
  }

  private updateVisibility(age: number) {
    if (age > ITEM_ENTITY.MAX_AGE - ITEM_ENTITY.BLINK_START) {
      // Blink effect before despawn
      this.mesh.visible = Math.floor(age / ITEM_ENTITY.BLINK_INTERVAL) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }
  }

  public getAge(): number {
    return performance.now() - this.creationTime;
  }
}
