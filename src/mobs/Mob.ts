import * as THREE from "three";
import { World } from "../world/World";
import { Player } from "../player/Player";
import { MobState, type MobStateType } from "../types/Mobs";

export { MobState };
export type { MobStateType };

export class Mob {
  public mesh: THREE.Group;
  public state: MobStateType = MobState.IDLE;

  // Physics
  protected velocity = new THREE.Vector3();
  protected readonly gravity = 20.0;
  protected readonly walkSpeed: number = 2.0;
  protected isOnGround = false;

  // Dimensions (AABB)
  public readonly width = 0.5;
  public readonly height = 1.8;

  // AI
  protected stateTimer = 0;
  protected wanderAngle = 0;

  // References
  protected world: World;
  protected scene: THREE.Scene;

  // Stats
  public hp = 20;
  public maxHp = 20;
  public isDead = false;
  public isHurt = false;
  public isStunned = false;

  // Fire
  public isOnFire = false;
  private fireTimer = 0;
  private fireMesh: THREE.Mesh | null = null;

  constructor(
    world: World,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    this.world = world;
    this.scene = scene;

    this.mesh = new THREE.Group();
    (this.mesh as any).isMob = true;
    this.mesh.userData.mob = this;
    this.mesh.position.set(x, y, z);

    this.scene.add(this.mesh);
  }

  protected createBox(
    w: number,
    h: number,
    d: number,
    colorRGB: number[],
    yOffset: number,
    texture: THREE.Texture,
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const count = geo.attributes.position.count;
    const colors: number[] = [];
    for (let i = 0; i < count; i++) colors.push(...colorRGB);
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      vertexColors: true,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = yOffset;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  public setFire(active: boolean) {
    if (this.isOnFire === active) return;
    this.isOnFire = active;

    if (active) {
      if (!this.fireMesh) {
        const geo = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const mat = new THREE.MeshBasicMaterial({
          color: 0xff4500,
          transparent: true,
          opacity: 0.5,
        });
        this.fireMesh = new THREE.Mesh(geo, mat);
        this.fireMesh.position.y = 0.9;
        this.mesh.add(this.fireMesh);
      }
    } else {
      if (this.fireMesh) {
        this.mesh.remove(this.fireMesh);
        this.fireMesh.geometry.dispose();
        (this.fireMesh.material as THREE.Material).dispose();
        this.fireMesh = null;
      }
    }
  }

  public takeDamage(amount: number, attackerPos: THREE.Vector3 | null) {
    if (this.isDead || this.isHurt) return;

    this.hp -= amount;
    this.isHurt = true;
    if (attackerPos) {
      this.isStunned = true;
    }

    // Red Flash Effect (persistent for 0.5s)
    this.mesh.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        if (!child.userData.originalColor) {
          child.userData.originalColor = child.material.color.clone();
        }
        child.material.color.set(0xff0000);
      }
    });

    setTimeout(() => {
      this.isHurt = false;
      this.isStunned = false;
      if (!this.isDead) {
        this.mesh.traverse((child) => {
          if (
            child instanceof THREE.Mesh &&
            child.material instanceof THREE.MeshStandardMaterial &&
            child.userData.originalColor
          ) {
            child.material.color.copy(child.userData.originalColor);
          }
        });
      }
    }, 500);

    // Knockback
    if (attackerPos) {
      const knockbackDir = this.mesh.position
        .clone()
        .sub(attackerPos)
        .normalize();
      knockbackDir.y = 0.4; // Slightly upward
      knockbackDir.normalize();
      this.velocity.add(knockbackDir.multiplyScalar(8.0));
      this.isOnGround = false;
    }

    if (this.hp <= 0) {
      this.isDead = true;
      this.setFire(false); // Extinguish on death
    }
  }

  update(
    delta: number,
    player?: THREE.Vector3 | Player,
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    // Resolve playerPos
    let playerPos: THREE.Vector3 | undefined;
    if (player instanceof THREE.Vector3) {
      playerPos = player;
    } else if (player) {
      // @ts-ignore
      playerPos = player.physics.controls.object.position;
    }

    if (!this.isStunned) {
      this.updateAI(delta, playerPos, onAttack, isDay);
    }

    // Fire Damage
    if (this.isOnFire) {
      this.fireTimer += delta;
      // 2 damage per second -> 1 damage every 0.5s
      if (this.fireTimer >= 0.5) {
        this.fireTimer = 0;
        this.takeDamage(1, null); // No attacker
      }

      if (this.fireMesh) {
        this.fireMesh.scale.setScalar(1.0 + Math.random() * 0.1);
      }
    }

    this.updatePhysics(delta);
  }

  protected updateAI(
    delta: number,
    _playerPos?: THREE.Vector3,
    _onAttack?: (damage: number) => void,
    _isDay?: boolean,
  ) {
    if (this.state === MobState.IDLE) {
      // 1% chance per frame (assuming 60fps)
      if (Math.random() < 0.01) {
        this.state = MobState.WANDER;
        this.stateTimer = 2 + Math.random(); // 2-3 seconds
        this.wanderAngle = Math.random() * Math.PI * 2;
      }
    } else if (this.state === MobState.WANDER) {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.state = MobState.IDLE;
        this.velocity.x = 0;
        this.velocity.z = 0;
      } else {
        // Move in wander direction
        this.velocity.x = Math.sin(this.wanderAngle) * this.walkSpeed;
        this.velocity.z = Math.cos(this.wanderAngle) * this.walkSpeed;
        this.mesh.rotation.y = this.wanderAngle;
      }
    }
  }

  protected updatePhysics(delta: number) {
    const safeDelta = Math.min(delta, 0.05);

    // Gravity
    this.velocity.y -= this.gravity * safeDelta;

    // Friction (Air resistance/Ground friction)
    // Apply when hurt (knockback) or generally to smooth movement
    // But AI overrides velocity directly, so this mainly affects Knockback (isHurt=true)
    const friction = 5.0;
    const damping = Math.exp(-friction * safeDelta);
    this.velocity.x *= damping;
    this.velocity.z *= damping;

    // X Movement
    const dx = this.velocity.x * safeDelta;
    this.mesh.position.x += dx;
    if (this.checkCollision()) {
      this.mesh.position.x -= dx;
      this.onHorizontalCollision();
    }

    // Z Movement
    const dz = this.velocity.z * safeDelta;
    this.mesh.position.z += dz;
    if (this.checkCollision()) {
      this.mesh.position.z -= dz;
      this.onHorizontalCollision();
    }

    // Y Movement
    this.mesh.position.y += this.velocity.y * safeDelta;
    this.isOnGround = false;

    if (this.checkCollision()) {
      if (this.velocity.y < 0) {
        // Landed
        this.isOnGround = true;
        this.mesh.position.y -= this.velocity.y * safeDelta;
        // Align to surface (blocks are integers)
        this.mesh.position.y = Math.round(this.mesh.position.y);
      } else {
        // Hit head
        this.mesh.position.y -= this.velocity.y * safeDelta;
      }
      this.velocity.y = 0;
    }

    // Void floor
    if (this.mesh.position.y < -50) {
      this.mesh.position.set(8, 20, 20);
      this.velocity.set(0, 0, 0);
    }
  }

  public dispose() {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    if (this.fireMesh) {
      this.fireMesh.geometry.dispose();
      (this.fireMesh.material as THREE.Material).dispose();
    }
  }

  protected onHorizontalCollision() {
    if (this.isOnGround) {
      // Simple auto-jump
      this.velocity.y = Math.sqrt(2 * this.gravity * 1.25);
      this.isOnGround = false;
    }
  }

  protected checkCollision(): boolean {
    const halfW = this.width / 2;
    const pos = this.mesh.position;

    const minX = Math.floor(pos.x - halfW);
    const maxX = Math.floor(pos.x + halfW);
    const minY = Math.floor(pos.y);
    const maxY = Math.floor(pos.y + this.height);
    const minZ = Math.floor(pos.z - halfW);
    const maxZ = Math.floor(pos.z + halfW);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          if (this.world.hasBlock(x, y, z)) {
            // Using logic from World.ts (blocks are 0..1 relative to index)
            const blockMinX = x;
            const blockMaxX = x + 1;
            const blockMinY = y;
            const blockMaxY = y + 1;
            const blockMinZ = z;
            const blockMaxZ = z + 1;

            const myMinX = pos.x - halfW;
            const myMaxX = pos.x + halfW;
            const myMinY = pos.y; // Mob pivot is at feet
            const myMaxY = pos.y + this.height;
            const myMinZ = pos.z - halfW;
            const myMaxZ = pos.z + halfW;

            if (
              myMinX < blockMaxX &&
              myMaxX > blockMinX &&
              myMinY < blockMaxY &&
              myMaxY > blockMinY &&
              myMinZ < blockMaxZ &&
              myMaxZ > blockMinZ
            ) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }
}
