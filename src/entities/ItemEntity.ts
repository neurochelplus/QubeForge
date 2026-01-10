import * as THREE from "three";
import { World } from "../world/World";
import { ItemPhysics } from "./ItemPhysics";
import { ItemLifecycle } from "./ItemLifecycle";
import { ItemRenderer } from "./ItemRenderer";
import { ITEM_ENTITY } from "../constants/GameConstants";

export class ItemEntity {
  public mesh: THREE.Mesh;
  public type: number;
  public count: number;
  public isDead = false;

  private scene: THREE.Scene;
  private physics: ItemPhysics;
  private lifecycle: ItemLifecycle;
  private timeOffset: number;

  constructor(
    world: World,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    type: number,
    blockTexture: THREE.DataTexture,
    itemTexture: THREE.CanvasTexture | null = null,
    count: number = 1,
  ) {
    this.type = type;
    this.count = count;
    this.scene = scene;
    this.timeOffset = Math.random() * 100;

    // Create mesh
    this.mesh = ItemRenderer.createMesh(type, blockTexture, itemTexture);
    (this.mesh as any).isItem = true;
    this.mesh.position.set(x + 0.5, y + 0.5, z + 0.5);

    // Initialize modules
    this.physics = new ItemPhysics(world, this.mesh);
    this.lifecycle = new ItemLifecycle(this.mesh);

    this.scene.add(this.mesh);
  }

  public update(time: number, delta: number) {
    // Check lifecycle
    if (!this.lifecycle.update()) {
      this.isDead = true;
      this.dispose();
      return;
    }

    // Update physics
    this.physics.update(time + this.timeOffset, delta);

    // Rotation animation
    this.mesh.rotation.y = time * ITEM_ENTITY.ROTATION_SPEED + this.timeOffset;
  }

  public dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
