import * as THREE from "three";
import { Mob, MobState } from "./Mob";
import { World } from "../world/World";

export class Zombie extends Mob {
  protected readonly walkSpeed: number = 1.75;
  private lastAttackTime = 0;
  private targetShelter: THREE.Vector3 | null = null;

  // Body Parts
  private head: THREE.Mesh;
  private body: THREE.Mesh;

  // Pivots for animation
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private leftLegGroup: THREE.Group;
  private rightLegGroup: THREE.Group;

  private leftArm: THREE.Mesh;
  private rightArm: THREE.Mesh;
  private leftLeg: THREE.Mesh;
  private rightLeg: THREE.Mesh;

  // Cached vectors to avoid allocation in hot path
  private static readonly UP = new THREE.Vector3(0, 1, 0);
  private readonly tempForward = new THREE.Vector3();
  private readonly tempTarget = new THREE.Vector3();
  private readonly tempDir = new THREE.Vector3();
  private readonly tempPushDir = new THREE.Vector3();
  private readonly tempEyePos = new THREE.Vector3();
  private readonly tempToPlayer = new THREE.Vector3();
  private readonly tempShelter = new THREE.Vector3(); // Для findNearbyShelter

  // Cached raycaster for line-of-sight checks
  private readonly raycaster = new THREE.Raycaster();

  constructor(
    world: World,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    super(world, scene, x, y, z);

    const texture = world.noiseTexture;
    const skinColor = [0.2, 0.6, 0.2]; // Green
    const shirtColor = [0.2, 0.2, 0.8]; // Blue
    const pantsColor = [0.2, 0.2, 0.6]; // Dark Blue

    // 1. Legs (Height 0.7)
    // Pivot at y=0.7 (Hip)
    this.leftLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.1, 0.7, 0);
    this.mesh.add(this.leftLegGroup);

    // Mesh centered at -0.35 relative to pivot
    this.leftLeg = this.createBox(0.2, 0.7, 0.2, pantsColor, -0.35, texture);
    this.leftLegGroup.add(this.leftLeg);

    this.rightLegGroup = new THREE.Group();
    this.rightLegGroup.position.set(0.1, 0.7, 0);
    this.mesh.add(this.rightLegGroup);

    this.rightLeg = this.createBox(0.2, 0.7, 0.2, pantsColor, -0.35, texture);
    this.rightLegGroup.add(this.rightLeg);

    // 2. Body (Height 0.6, Base 0.7)
    // Body center is at 0.7 + 0.3 = 1.0
    this.body = this.createBox(0.5, 0.6, 0.25, shirtColor, 1.0, texture);
    this.mesh.add(this.body);

    // 3. Head (Height 0.5, Base 1.3)
    // Center at 1.3 + 0.25 = 1.55
    this.head = this.createBox(0.4, 0.5, 0.4, skinColor, 1.55, texture);
    this.mesh.add(this.head);

    // 4. Arms (Height 0.7)
    // Pivot at Shoulder (y=1.3, x=±0.35)
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.35, 1.3, 0);
    this.mesh.add(this.leftArmGroup);

    // Mesh centered at -0.35 relative to pivot
    this.leftArm = this.createBox(0.2, 0.7, 0.2, skinColor, -0.35, texture);
    this.leftArmGroup.add(this.leftArm);

    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.35, 1.3, 0);
    this.mesh.add(this.rightArmGroup);

    this.rightArm = this.createBox(0.2, 0.7, 0.2, skinColor, -0.35, texture);
    this.rightArmGroup.add(this.rightArm);

    // Fix UVs to only use the "Noise" part of atlas (0 - 1/12)
    const fixUVs = (mesh: THREE.Mesh) => {
      const uvAttr = mesh.geometry.getAttribute("uv");
      if (!uvAttr) return;

      const uvScale = 1.0 / 12.0; // 12 slots in atlas now

      for (let i = 0; i < uvAttr.count; i++) {
        let u = uvAttr.getX(i);
        // Map 0..1 to 0..0.0833 (Slot 0)
        u = u * uvScale;
        uvAttr.setX(i, u);
      }
      uvAttr.needsUpdate = true;
    };

    fixUVs(this.leftLeg);
    fixUVs(this.rightLeg);
    fixUVs(this.body);
    fixUVs(this.head);
    fixUVs(this.leftArm);
    fixUVs(this.rightArm);

    // Initial Pose
    this.leftArmGroup.rotation.x = -Math.PI / 2;
    this.rightArmGroup.rotation.x = -Math.PI / 2;
  }

  protected updateAI(
    delta: number,
    playerPos?: THREE.Vector3,
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    const time = performance.now() / 1000;

    // --- Burning Logic ---
    if (isDay && !this.isDead) {
      // Check if under cover
      const x = Math.floor(this.mesh.position.x);
      const z = Math.floor(this.mesh.position.z);
      const y = Math.floor(this.mesh.position.y + 1.8); // Check from head up

      let covered = false;
      // Check 10 blocks up
      for (let i = 0; i < 10; i++) {
        if (this.world.hasBlock(x, y + i, z)) {
          covered = true;
          break;
        }
      }

      this.setFire(!covered);
    } else {
      this.setFire(false);
    }

    // --- Animation ---
    const isMoving = this.velocity.lengthSq() > 0.1;

    if (isMoving) {
      const speed = 10;
      const angle = time * speed;

      this.leftLegGroup.rotation.x = Math.sin(angle) * 0.5;
      this.rightLegGroup.rotation.x = -Math.sin(angle) * 0.5;

      // Arms (Zombie pose + swing)
      // Swing opposite to legs
      this.leftArmGroup.rotation.x =
        -Math.PI / 2 + Math.sin(angle + Math.PI) * 0.2;
      this.rightArmGroup.rotation.x = -Math.PI / 2 + Math.sin(angle) * 0.2;
    } else {
      // Idle
      this.leftLegGroup.rotation.x = 0;
      this.rightLegGroup.rotation.x = 0;

      // Breathing
      this.leftArmGroup.rotation.x = -Math.PI / 2 + Math.sin(time * 2) * 0.05;
      this.rightArmGroup.rotation.x =
        -Math.PI / 2 + Math.sin(time * 2 + 1) * 0.05;
    }

    if (!playerPos) {
      super.updateAI(delta, playerPos, onAttack, isDay);
      return;
    }

    const dist = this.mesh.position.distanceTo(playerPos);

    // --- Shelter Logic ---
    // If burning, day, far from player, and not already seeking or chasing close
    if (
      isDay &&
      this.isOnFire &&
      dist > 12 &&
      this.state !== MobState.SEEK_SHELTER &&
      this.state !== MobState.ATTACK
    ) {
      const shelter = this.findNearbyShelter();
      if (shelter) {
        this.state = MobState.SEEK_SHELTER;
        this.targetShelter = shelter;
      }
    }

    // Stop seeking if night or player is close
    if (this.state === MobState.SEEK_SHELTER) {
      if (!isDay || dist < 10) {
        this.state = MobState.IDLE;
        this.targetShelter = null;
      }
    }

    // State Handling
    if (this.state === MobState.SEEK_SHELTER && this.targetShelter) {
      // Move to shelter
      const dx = this.targetShelter.x - this.mesh.position.x;
      const dz = this.targetShelter.z - this.mesh.position.z;
      const dToShelter = Math.sqrt(dx * dx + dz * dz);

      if (dToShelter > 0.5) {
        const angle = Math.atan2(dx, dz);
        this.mesh.rotation.y = angle;
        this.velocity.x = Math.sin(angle) * this.walkSpeed;
        this.velocity.z = Math.cos(angle) * this.walkSpeed;
      } else {
        // Reached shelter
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    } else if (this.state !== MobState.CHASE && dist < 15) {
      this.state = MobState.CHASE;
    } else if (this.state === MobState.CHASE && dist > 20) {
      this.state = MobState.IDLE;
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    if (this.state === MobState.CHASE) {
      const dx = playerPos.x - this.mesh.position.x;
      const dz = playerPos.z - this.mesh.position.z;
      let angle = Math.atan2(dx, dz);

      // --- Obstacle Avoidance ---
      const p = this.mesh.position;
      this.tempForward.set(Math.sin(angle), 0, Math.cos(angle)).normalize();
      const checkDist = 1.0;

      // Helper to check if direction is blocked
      const isBlocked = (
        origin: THREE.Vector3,
        dir: THREE.Vector3,
        d: number,
      ) => {
        this.tempTarget.copy(origin).addScaledVector(dir, d);
        const tx = Math.floor(this.tempTarget.x);
        const tz = Math.floor(this.tempTarget.z);
        const ty = Math.floor(this.tempTarget.y);
        return this.world.hasBlock(tx, ty + 1, tz);
      };

      if (isBlocked(p, this.tempForward, checkDist)) {
        // Main path blocked, try diagonals
        this.tempDir.copy(this.tempForward).applyAxisAngle(Zombie.UP, Math.PI / 4);
        const leftBlocked = isBlocked(p, this.tempDir, checkDist);

        this.tempDir.copy(this.tempForward).applyAxisAngle(Zombie.UP, -Math.PI / 4);
        const rightBlocked = isBlocked(p, this.tempDir, checkDist);

        if (!leftBlocked && !rightBlocked) {
          angle += Math.PI / 4;
        } else if (!leftBlocked) {
          angle += Math.PI / 4;
        } else if (!rightBlocked) {
          angle -= Math.PI / 4;
        } else {
          // Both diagonals blocked, try 90 degrees
          this.tempDir.copy(this.tempForward).applyAxisAngle(Zombie.UP, Math.PI / 2);
          if (!isBlocked(p, this.tempDir, checkDist)) {
            angle += Math.PI / 2;
          } else {
            angle -= Math.PI / 2;
          }
        }
      }

      this.mesh.rotation.y = angle;

      if (dist > 2.0) {
        this.velocity.x = Math.sin(angle) * this.walkSpeed;
        this.velocity.z = Math.cos(angle) * this.walkSpeed;
      } else {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }

      if (dist < 1.5) {
        this.tempPushDir.copy(this.mesh.position).sub(playerPos).normalize();
        const pushSpeed = 5.0;
        this.velocity.x += this.tempPushDir.x * pushSpeed;
        this.velocity.z += this.tempPushDir.z * pushSpeed;
      }

      if (dist < 2.2) {
        // Line of Sight Check
        this.tempEyePos.copy(this.mesh.position);
        this.tempEyePos.y += 1.6;

        this.tempToPlayer.copy(playerPos).sub(this.tempEyePos);
        const distance = this.tempToPlayer.length();
        this.tempToPlayer.normalize();

        const raycaster = this.raycaster;
        raycaster.set(this.tempEyePos, this.tempToPlayer);
        raycaster.near = 0;
        raycaster.far = distance;
        // Only check for blocks (which are in scene.children as meshes but not mobs/items)
        const intersects = raycaster.intersectObjects(this.scene.children);

        let blocked = false;
        for (const hit of intersects) {
          // Ignore mobs, items, and self
          if (hit.object === this.mesh || hit.object.parent === this.mesh)
            continue;
          if (hit.object.userData.mob || hit.object.parent?.userData.mob)
            continue;
          if ((hit.object as any).isItem) continue;
          if ((hit.object as any).isCursor) continue; // Assuming cursor might be there

          // If we hit a block, we are blocked
          blocked = true;
          break;
        }

        if (!blocked) {
          const now = performance.now();
          if (now - this.lastAttackTime > 1500) {
            this.state = MobState.ATTACK;
            if (onAttack) onAttack(2);

            this.leftArmGroup.rotation.x -= 0.6;
            this.rightArmGroup.rotation.x -= 0.6;

            this.lastAttackTime = now;
          }
        }
      }
    } else if (this.state !== MobState.SEEK_SHELTER) {
      super.updateAI(delta, playerPos, onAttack, isDay);
    }
  }

  private findNearbyShelter(): THREE.Vector3 | null {
    const range = 10;
    const startX = Math.floor(this.mesh.position.x);
    const startY = Math.floor(this.mesh.position.y);
    const startZ = Math.floor(this.mesh.position.z);

    let bestSpot: THREE.Vector3 | null = null;
    let minDist = Infinity;

    for (let x = -range; x <= range; x++) {
      for (let z = -range; z <= range; z++) {
        const cx = startX + x;
        const cz = startZ + z;

        // 1. Must be walkable (ground at y or y-1)
        // We assume flat-ish terrain for simplicity or check current Y level
        // Check if ground exists at Y-1
        if (!this.world.hasBlock(cx, startY - 1, cz)) continue;

        // 2. Must be empty space for body (Y and Y+1)
        if (
          this.world.hasBlock(cx, startY, cz) ||
          this.world.hasBlock(cx, startY + 1, cz)
        )
          continue;

        // 3. Must have roof within reasonable height (Y+2 to Y+10)
        let hasRoof = false;
        for (let k = 2; k <= 10; k++) {
          if (this.world.hasBlock(cx, startY + k, cz)) {
            hasRoof = true;
            break;
          }
        }

        if (hasRoof) {
          const dist = x * x + z * z;
          if (dist < minDist) {
            minDist = dist;
            // Используем кэшированный вектор и клонируем только результат
            this.tempShelter.set(cx + 0.5, startY, cz + 0.5);
            bestSpot = this.tempShelter.clone();
          }
        }
      }
    }
    return bestSpot;
  }

  protected onHorizontalCollision() {
    if (this.isOnGround) {
      this.tempDir.set(0, 0, 1).applyAxisAngle(Zombie.UP, this.mesh.rotation.y);
      const checkDist = 0.8;
      this.tempTarget.copy(this.mesh.position).addScaledVector(this.tempDir, checkDist);

      const x = Math.floor(this.tempTarget.x);
      const z = Math.floor(this.tempTarget.z);
      const y = Math.floor(this.mesh.position.y);

      if (
        !this.world.hasBlock(x, y + 1, z) &&
        !this.world.hasBlock(x, y + 2, z)
      ) {
        this.velocity.y = Math.sqrt(2 * 20.0 * 1.25);
        this.isOnGround = false;
      }
    }
  }
}
