import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { World } from "../world/World";
import {
  GRAVITY,
  JUMP_IMPULSE,
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_EYE_HEIGHT,
} from "../constants/GameConstants";

export class PlayerPhysics {
  private controls: PointerLockControls;
  private world: World;
  private velocity: THREE.Vector3;

  // Movement state
  public moveForward = false;
  public moveBackward = false;
  public moveLeft = false;
  public moveRight = false;
  public isOnGround = false;

  // Player dimensions
  private readonly playerHalfWidth = PLAYER_HALF_WIDTH;
  private readonly playerHeight = PLAYER_HEIGHT;
  private readonly eyeHeight = PLAYER_EYE_HEIGHT;

  // Movement constants
  private readonly speed = 50.0; // Acceleration force
  private readonly friction = 10.0; // Friction factor

  // Invert Controls
  private invertedControls = false;
  private invertedTimer = 0;

  constructor(controls: PointerLockControls, world: World) {
    this.controls = controls;
    this.world = world;
    this.velocity = new THREE.Vector3();
  }

  public getVelocity(): THREE.Vector3 {
    return this.velocity;
  }

  public setVelocity(velocity: THREE.Vector3): void {
    this.velocity.copy(velocity);
  }

  public setInvertedControls(duration: number) {
    this.invertedControls = true;
    this.invertedTimer = duration;
  }

  public jump(): void {
    if (this.isOnGround) {
      this.velocity.y = JUMP_IMPULSE;
      this.isOnGround = false;
    }
  }

  public checkCollision(position: THREE.Vector3): boolean {
    const minX = Math.floor(position.x - this.playerHalfWidth);
    const maxX = Math.floor(position.x + this.playerHalfWidth);
    const minY = Math.floor(position.y - this.eyeHeight);
    const maxY = Math.floor(position.y - this.eyeHeight + this.playerHeight);
    const minZ = Math.floor(position.z - this.playerHalfWidth);
    const maxZ = Math.floor(position.z + this.playerHalfWidth);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.world.hasBlock(x, y, z)) {
            // Precise AABB check
            const blockMinX = x;
            const blockMaxX = x + 1;
            const blockMinY = y;
            const blockMaxY = y + 1;
            const blockMinZ = z;
            const blockMaxZ = z + 1;

            const playerMinX = position.x - this.playerHalfWidth;
            const playerMaxX = position.x + this.playerHalfWidth;
            const playerMinY = position.y - this.eyeHeight;
            const playerMaxY = position.y - this.eyeHeight + this.playerHeight;
            const playerMinZ = position.z - this.playerHalfWidth;
            const playerMaxZ = position.z + this.playerHalfWidth;

            if (
              playerMinX < blockMaxX &&
              playerMaxX > blockMinX &&
              playerMinY < blockMaxY &&
              playerMaxY > blockMinY &&
              playerMinZ < blockMaxZ &&
              playerMaxZ > blockMinZ
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  public update(delta: number): void {
    const safeDelta = Math.min(delta, 0.05);

    if (this.invertedControls) {
      this.invertedTimer -= delta;
      if (this.invertedTimer <= 0) {
        this.invertedControls = false;
      }
    }

    // Input Vector (Local)
    let inputX = Number(this.moveRight) - Number(this.moveLeft);
    let inputZ = Number(this.moveForward) - Number(this.moveBackward);

    if (this.invertedControls) {
      inputX = -inputX;
      inputZ = -inputZ;
    }

    // Get Camera Direction (World projected to flat plane)
    const forward = new THREE.Vector3();
    this.controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

    // Wish Direction (World)
    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, inputZ)
      .addScaledVector(right, inputX);

    if (moveDir.lengthSq() > 0) moveDir.normalize();

    // Acceleration & Friction
    if (
      this.moveForward ||
      this.moveBackward ||
      this.moveLeft ||
      this.moveRight
    ) {
      this.velocity.x += moveDir.x * this.speed * safeDelta;
      this.velocity.z += moveDir.z * this.speed * safeDelta;
    }

    const damping = Math.exp(-this.friction * safeDelta);
    this.velocity.x *= damping;
    this.velocity.z *= damping;
    this.velocity.y -= GRAVITY * safeDelta;

    const position = this.controls.object.position;

    // Apply & Collide X
    position.x += this.velocity.x * safeDelta;
    if (this.checkCollision(position)) {
      position.x -= this.velocity.x * safeDelta;
      this.velocity.x = 0;
    }

    // Apply & Collide Z
    position.z += this.velocity.z * safeDelta;
    if (this.checkCollision(position)) {
      position.z -= this.velocity.z * safeDelta;
      this.velocity.z = 0;
    }

    // Apply & Collide Y
    position.y += this.velocity.y * safeDelta;
    this.isOnGround = false;

    if (this.checkCollision(position)) {
      if (this.velocity.y < 0) {
        // Falling, hit ground
        this.isOnGround = true;
        position.y -= this.velocity.y * safeDelta;
        this.velocity.y = 0;
      } else {
        // Jumping, hit ceiling
        position.y -= this.velocity.y * safeDelta;
        this.velocity.y = 0;
      }
    }

    // Fallback for falling out of world
    if (position.y < -50) {
      position.set(8, 40, 20);
      this.velocity.set(0, 0, 0);
    }
  }
}
