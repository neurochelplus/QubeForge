import * as THREE from "three";
import { Mob, MobState } from "./Mob";
import { World } from "../world/World";

export class WildBoar extends Mob {
  protected readonly walkSpeed: number = 1.5;
  protected readonly runSpeed: number = 4.5; // Player walk speed (~4.0-4.5 blocks/sec)
  protected readonly detectionRadius: number = 8.0;
  
  // Body Parts
  private head: THREE.Mesh;
  private body: THREE.Mesh;
  private snout: THREE.Mesh;
  private leftTusk: THREE.Mesh;
  private rightTusk: THREE.Mesh;
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;
  private leftEar: THREE.Mesh;
  private rightEar: THREE.Mesh;

  // Legs Groups
  private legFLGroup: THREE.Group; // Front Left
  private legFRGroup: THREE.Group; // Front Right
  private legBLGroup: THREE.Group; // Back Left
  private legBRGroup: THREE.Group; // Back Right

  private legFL: THREE.Mesh;
  private legFR: THREE.Mesh;
  private legBL: THREE.Mesh;
  private legBR: THREE.Mesh;

  // AI State vars
  private alertTimer = 0;
  private fleeTimer = 0;
  private eatTimer = 0;
  private isEating = false;

  constructor(
    world: World,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    super(world, scene, x, y, z);
    this.hp = 10;
    this.maxHp = 10;
    // Hitbox adjustment (wider but shorter)
    // We can't easily change readonly width/height in subclass without overrides or casting, 
    // but Mob.ts uses them for collision. 
    // Let's assume standard size for collision is acceptable or we'd need to refactor Mob.ts
    // For now, visual size is what matters most.

    const texture = world.noiseTexture;
    const furColor = [0.29, 0.21, 0.15]; // #4A3728 Brown
    const snoutColor = [0.9, 0.72, 0.71]; // #E6B8B7 Pinkish
    const tuskColor = [1, 1, 1]; // White
    const hoofColor = [0.18, 0.18, 0.18]; // Dark Grey
    const eyeColor = [0.1, 0.1, 0.1]; // Black
    const earColor = [0.29, 0.21, 0.15]; // Same as fur

    // --- Geometry Construction ---
    // Pivot is at feet (y=0)

    // 1. Legs (Height 0.4)
    // Positions relative to center. Body is ~0.9 long, 0.5 wide.
    // Leg positions: x=±0.2, z=±0.3
    
    // Front Left
    this.legFLGroup = new THREE.Group();
    this.legFLGroup.position.set(-0.2, 0.4, 0.3);
    this.mesh.add(this.legFLGroup);
    this.legFL = this.createBox(0.15, 0.4, 0.15, hoofColor, -0.2, texture);
    this.legFLGroup.add(this.legFL);

    // Front Right
    this.legFRGroup = new THREE.Group();
    this.legFRGroup.position.set(0.2, 0.4, 0.3);
    this.mesh.add(this.legFRGroup);
    this.legFR = this.createBox(0.15, 0.4, 0.15, hoofColor, -0.2, texture);
    this.legFRGroup.add(this.legFR);

    // Back Left
    this.legBLGroup = new THREE.Group();
    this.legBLGroup.position.set(-0.2, 0.4, -0.3);
    this.mesh.add(this.legBLGroup);
    this.legBL = this.createBox(0.15, 0.4, 0.15, hoofColor, -0.2, texture);
    this.legBLGroup.add(this.legBL);

    // Back Right
    this.legBRGroup = new THREE.Group();
    this.legBRGroup.position.set(0.2, 0.4, -0.3);
    this.mesh.add(this.legBRGroup);
    this.legBR = this.createBox(0.15, 0.4, 0.15, hoofColor, -0.2, texture);
    this.legBRGroup.add(this.legBR);

    // 2. Body (0.5W x 0.5H x 0.9L)
    // Center Y = 0.4 (legs) + 0.25 (half body) = 0.65
    // Z centered
    this.body = this.createBox(0.5, 0.5, 0.9, furColor, 0.65, texture);
    this.mesh.add(this.body);

    // 3. Head (0.4W x 0.4H x 0.4L)
    // Attached to front of body. Body ends at z=0.45.
    // Head center z = 0.45 + 0.2 = 0.65
    // Head Y center = 0.65 (same as body) + 0.1 (slightly higher?) -> let's keep level: 0.7
    this.head = this.createBox(0.4, 0.4, 0.4, furColor, 0.7, texture);
    this.head.position.z = 0.65;
    this.mesh.add(this.head);

    // 4. Snout (0.2W x 0.15H x 0.1L)
    // Attached to front of head (z=0.65 + 0.2 = 0.85)
    // Y center = 0.7 - 0.05 = 0.65
    this.snout = this.createBox(0.2, 0.15, 0.1, snoutColor, 0.65, texture);
    this.snout.position.z = 0.85; // relative to mesh center, not head group (head is not a group here)
    // Wait, createBox returns a mesh at 0,0,0 with geometry offset. 
    // To attach snout to head properly for animation, head should be a group or we just move mesh.
    // For simple "look at" animations, head group is better. But here we just have procedural body anims.
    // Let's attach snout and tusks to head mesh if we want head rotation? 
    // Currently Mob structure is flat hierarchy in constructor mostly.
    // Let's make Head a Group if we want to rotate it.
    // For now, simple structure:
    this.mesh.add(this.snout); // Add to main mesh for now, but position carefully.

    // 5. Tusks
    // Protruding from snout sides/bottom.
    // Snout Y=0.65. Tusks should be slightly lower/upwards.
    // createBox sets Y, but position.set overwrites it. We must specify Y manually in set().
    this.leftTusk = this.createBox(0.04, 0.12, 0.04, tuskColor, 0, texture);
    this.leftTusk.position.set(-0.1, 0.65, 0.8);
    this.mesh.add(this.leftTusk);

    this.rightTusk = this.createBox(0.04, 0.12, 0.04, tuskColor, 0, texture);
    this.rightTusk.position.set(0.1, 0.65, 0.8);
    this.mesh.add(this.rightTusk);

    // 6. Eyes
    // Head Y center=0.7. Eyes higher.
    this.leftEye = this.createBox(0.05, 0.05, 0.02, eyeColor, 0, texture);
    this.leftEye.position.set(-0.15, 0.8, 0.85); // Front of head
    this.mesh.add(this.leftEye);

    this.rightEye = this.createBox(0.05, 0.05, 0.02, eyeColor, 0, texture);
    this.rightEye.position.set(0.15, 0.8, 0.85);
    this.mesh.add(this.rightEye);

    // 7. Ears
    // Top of head Y=0.9
    this.leftEar = this.createBox(0.1, 0.1, 0.05, earColor, 0, texture);
    this.leftEar.position.set(-0.2, 0.85, 0.7);
    this.mesh.add(this.leftEar);

    this.rightEar = this.createBox(0.1, 0.1, 0.05, earColor, 0, texture);
    this.rightEar.position.set(0.2, 0.85, 0.7);
    this.mesh.add(this.rightEar);
    
    // Fix UVs
    const fixUVs = (mesh: THREE.Mesh) => {
      const uvAttr = mesh.geometry.getAttribute("uv");
      if (!uvAttr) return;
      const uvScale = 1.0 / 12.0;
      for (let i = 0; i < uvAttr.count; i++) {
        let u = uvAttr.getX(i);
        u = u * uvScale;
        uvAttr.setX(i, u);
      }
      uvAttr.needsUpdate = true;
    };

    [
        this.legFL, this.legFR, this.legBL, this.legBR,
        this.body, this.head, this.snout,
        this.leftTusk, this.rightTusk,
        this.leftEye, this.rightEye,
        this.leftEar, this.rightEar
    ].forEach(m => fixUVs(m));
  }

  // Override takeDamage to trigger Flee
  public takeDamage(amount: number, attackerPos: THREE.Vector3 | null) {
      super.takeDamage(amount, attackerPos);
      if (!this.isDead) {
          this.state = MobState.FLEE;
          this.fleeTimer = 4.0; // Run for 4 seconds
          this.isEating = false;
      }
  }

  protected updateAI(
    delta: number,
    playerPos?: THREE.Vector3,
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    const time = performance.now() / 1000;
    
    // --- Behavior Logic ---
    
    const distToPlayer = playerPos ? this.mesh.position.distanceTo(playerPos) : Infinity;

    // State Transitions
    switch (this.state) {
        case MobState.IDLE:
            // Randomly eat
            if (!this.isEating && Math.random() < 0.005) {
                this.isEating = true;
                this.eatTimer = 2.0;
            }
            
            if (this.isEating) {
                this.eatTimer -= delta;
                if (this.eatTimer <= 0) this.isEating = false;
                // Stop moving while eating
                this.velocity.x = 0;
                this.velocity.z = 0;
            } else {
                // Normal wander logic from base class
                super.updateAI(delta, playerPos, onAttack, isDay);
            }

            // Transition to Alert
            if (distToPlayer < this.detectionRadius) {
                this.state = MobState.ALERT;
                this.alertTimer = 1.5; // Alert duration
                this.isEating = false;
                this.velocity.x = 0;
                this.velocity.z = 0;
                
                // Face player
                if (playerPos) {
                    const dx = playerPos.x - this.mesh.position.x;
                    const dz = playerPos.z - this.mesh.position.z;
                    this.mesh.rotation.y = Math.atan2(dx, dz);
                }
            }
            break;

        case MobState.WANDER:
             // Check Alert
             if (distToPlayer < this.detectionRadius) {
                this.state = MobState.ALERT;
                this.alertTimer = 1.5;
                this.velocity.x = 0;
                this.velocity.z = 0;
                if (playerPos) {
                    const dx = playerPos.x - this.mesh.position.x;
                    const dz = playerPos.z - this.mesh.position.z;
                    this.mesh.rotation.y = Math.atan2(dx, dz);
                }
             } else {
                 super.updateAI(delta, playerPos, onAttack, isDay);
             }
             break;

        case MobState.ALERT:
            this.alertTimer -= delta;
            // Face player continuously? No, just initial stare or tracking.
            if (playerPos) {
                 const dx = playerPos.x - this.mesh.position.x;
                 const dz = playerPos.z - this.mesh.position.z;
                 // Smooth turn to player
                 const targetAngle = Math.atan2(dx, dz);
                 let angleDiff = targetAngle - this.mesh.rotation.y;
                 // Normalize angle
                 while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                 while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                 this.mesh.rotation.y += angleDiff * delta * 5;
            }

            // Removed distance-based fleeing. Only flee on damage.
            if (this.alertTimer <= 0) {
                // False alarm or player stayed away
                this.state = MobState.IDLE;
            }
            break;

        case MobState.FLEE:
            this.fleeTimer -= delta;
            
            if (playerPos) {
                // Run away from player
                const dx = this.mesh.position.x - playerPos.x; // Vector FROM player
                const dz = this.mesh.position.z - playerPos.z;
                const angle = Math.atan2(dx, dz);
                
                // Run straight away (no jitter)
                this.mesh.rotation.y = angle;
                this.velocity.x = Math.sin(this.mesh.rotation.y) * this.runSpeed;
                this.velocity.z = Math.cos(this.mesh.rotation.y) * this.runSpeed;
            }

            if (this.fleeTimer <= 0 || distToPlayer > 20) {
                this.state = MobState.IDLE;
                this.velocity.x = 0;
                this.velocity.z = 0;
            }
            break;
    }

    // --- Animation ---
    const isMoving = this.velocity.lengthSq() > 0.1;
    
    // Reset rotations
    this.head.rotation.x = 0;
    this.snout.rotation.x = 0;
    
    // Sync head parts (since they are not in a group, we manually animate them if head rotates)
    // For now, only head bobbing in Eat animation uses direct rotation.
    // If we want robust head rotation, we should have used a Group.
    // Let's reset their relative positions/rotations just in case.
    
    // Helper to sync part to head if head rotates
    // Since head rotation is simple X rotation around center (0, 0.7, 0.65)...
    // Actually, createBox makes mesh centered at 0,0,0 and offset by Y.
    // this.head.position.z = 0.65. Y is handled by geometry offset? No, createBox sets mesh.position.y.
    // So head mesh position is (0, 0.7, 0.65).
    // Rotation is around (0, 0.7, 0.65).
    
    // For simple visual consistency, let's just make the "Eat" animation move everything together
    // or keep it subtle.
    
    const baseHeadY = 0.7;
    const baseHeadZ = 0.65;
    
    // Reset parts to base positions
    this.snout.position.set(0, 0.65, 0.85);
    this.leftTusk.position.set(-0.1, 0.65, 0.8);
    this.rightTusk.position.set(0.1, 0.65, 0.8);
    this.leftEye.position.set(-0.15, 0.8, 0.85);
    this.rightEye.position.set(0.15, 0.8, 0.85);
    this.leftEar.position.set(-0.2, 0.85, 0.7);
    this.rightEar.position.set(0.2, 0.85, 0.7);

    // Apply Head Rotation/Offset
    if (this.isEating) {
        // Bob head down
        const bob = Math.sin(time * 15) * 0.1;
        const headAngle = 0.3 + bob;
        
        this.head.rotation.x = headAngle;
        
        // We need to rotate attached parts around head pivot (0, 0.7, 0.65)
        // Simple approximation: lower them and move back slightly
        const cos = Math.cos(headAngle);
        const sin = Math.sin(headAngle);
        
        const rotatePoint = (p: THREE.Vector3) => {
            // Relative to head center
            let ry = p.y - baseHeadY;
            let rz = p.z - baseHeadZ;
            
            // Rotate around X
            let ny = ry * cos - rz * sin;
            let nz = ry * sin + rz * cos;
            
            p.y = baseHeadY + ny;
            p.z = baseHeadZ + nz;
        };

        rotatePoint(this.snout.position);
        rotatePoint(this.leftTusk.position);
        rotatePoint(this.rightTusk.position);
        rotatePoint(this.leftEye.position);
        rotatePoint(this.rightEye.position);
        rotatePoint(this.leftEar.position);
        rotatePoint(this.rightEar.position);
    } else {
        this.head.rotation.x = 0;
    }

    if (this.state === MobState.FLEE) {
        // Run Animation
        const speed = 15;
        const angle = time * speed;
        
        this.legFLGroup.rotation.x = Math.sin(angle) * 0.8;
        this.legFRGroup.rotation.x = Math.cos(angle) * 0.8;
        this.legBLGroup.rotation.x = Math.cos(angle) * 0.8;
        this.legBRGroup.rotation.x = Math.sin(angle) * 0.8;
        
        // Body tilt
        this.body.rotation.x = -0.1; // Head up/Body up front
    } else if (isMoving) {
        // Walk Animation
        const speed = 8;
        const angle = time * speed;

        this.legFLGroup.rotation.x = Math.sin(angle) * 0.4;
        this.legFRGroup.rotation.x = Math.cos(angle) * 0.4;
        this.legBLGroup.rotation.x = Math.cos(angle) * 0.4;
        this.legBRGroup.rotation.x = Math.sin(angle) * 0.4;

        this.body.rotation.x = 0;
    } else {
        // Idle
        this.legFLGroup.rotation.x = 0;
        this.legFRGroup.rotation.x = 0;
        this.legBLGroup.rotation.x = 0;
        this.legBRGroup.rotation.x = 0;
        this.body.rotation.x = 0;

        if (this.isEating) {
            // Eating animation
            // Head down
            // Since head is mesh not group, we rotate it around its center. 
            // Its center is at 0,0,0 relative to parent... wait.
            // In constructor: this.head.position.z = 0.65;
            // If we rotate x, it rotates around its center.
            // Ideally we want pivot at neck.
            // Visual hack: rotate body slightly down? Or just head bob.
            this.head.rotation.x = 0.3 + Math.sin(time * 15) * 0.1;
            this.snout.position.y = 0.65 + Math.sin(time * 15) * 0.05; // Bob snout
        }
    }
    
    // Sync attached parts to head rotation if needed
    // (Simulating hierarchy since we didn't group them perfectly)
    // Actually, let's just keep it simple.
  }
}