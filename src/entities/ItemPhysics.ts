import * as THREE from "three";
import { World } from "../world/World";
import { GRAVITY, ITEM_ENTITY } from "../constants/GameConstants";

export class ItemPhysics {
  private velocityY: number = 0;
  private isOnGround: boolean = false;
  private groundY: number = 0;

  constructor(
    private world: World,
    private mesh: THREE.Mesh,
  ) {}

  public update(time: number, delta: number) {
    if (!this.isOnGround) {
      this.applyGravity(delta);
      this.checkGroundCollision();
    } else {
      this.applyFloatingAnimation(time);
      this.checkGroundRemoved();
    }
  }

  private applyGravity(delta: number) {
    this.velocityY -= GRAVITY * delta;
    this.mesh.position.y += this.velocityY * delta;
  }

  private checkGroundCollision() {
    const x = Math.floor(this.mesh.position.x);
    const z = Math.floor(this.mesh.position.z);

    const feetY = this.mesh.position.y - ITEM_ENTITY.COLLISION_OFFSET;
    const blockY = Math.floor(feetY);

    if (this.world.getBlock(x, blockY, z) !== 0) {
      this.isOnGround = true;
      this.velocityY = 0;
      this.groundY = blockY + 1 + ITEM_ENTITY.COLLISION_OFFSET;
      this.mesh.position.y = this.groundY;
    }
  }

  private applyFloatingAnimation(time: number) {
    const offset = Math.sin(time * ITEM_ENTITY.FLOAT_SPEED) * ITEM_ENTITY.FLOAT_AMPLITUDE;
    this.mesh.position.y = this.groundY + offset;
  }

  private checkGroundRemoved() {
    const x = Math.floor(this.mesh.position.x);
    const z = Math.floor(this.mesh.position.z);
    const blockY = Math.floor(this.groundY - 1 - ITEM_ENTITY.COLLISION_OFFSET);

    if (this.world.getBlock(x, blockY, z) === 0) {
      this.isOnGround = false;
      this.velocityY = 0;
    }
  }

  public getIsOnGround(): boolean {
    return this.isOnGround;
  }
}
