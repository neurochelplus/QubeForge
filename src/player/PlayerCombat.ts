import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import { ATTACK_RANGE, ATTACK_COOLDOWN } from "../constants/GameConstants";
import { BLOCK } from "../constants/Blocks";

export class PlayerCombat {
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: THREE.Scene;
  private controls: PointerLockControls;
  private lastAttackTime: number = 0;
  private getSelectedSlotItem: () => number;
  private onToolUse?: (amount: number) => void;
  private cursorMesh?: THREE.Mesh;
  private crackMesh?: THREE.Mesh;

  constructor(
    camera: PerspectiveCamera,
    scene: THREE.Scene,
    controls: PointerLockControls,
    getSelectedSlotItem: () => number,
    onToolUse?: (amount: number) => void,
    cursorMesh?: THREE.Mesh,
    crackMesh?: THREE.Mesh,
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.getSelectedSlotItem = getSelectedSlotItem;
    this.onToolUse = onToolUse;
    this.raycaster = new THREE.Raycaster();
    this.cursorMesh = cursorMesh;
    this.crackMesh = crackMesh;
  }

  private calculateDamage(toolId: number): number {
    if (toolId === BLOCK.WOODEN_SWORD) return 4;
    if (toolId === BLOCK.STONE_SWORD) return 5;
    if (toolId === BLOCK.IRON_SWORD) return 6;

    if (toolId === BLOCK.WOODEN_AXE) return 3;
    if (toolId === BLOCK.STONE_AXE) return 4;
    if (toolId === BLOCK.IRON_AXE) return 5;

    if (toolId === BLOCK.WOODEN_PICKAXE) return 2;
    if (toolId === BLOCK.STONE_PICKAXE) return 3;
    if (toolId === BLOCK.IRON_PICKAXE) return 4;

    if (toolId === BLOCK.WOODEN_SHOVEL) return 1.5;
    if (toolId === BLOCK.STONE_SHOVEL) return 2.5;
    if (toolId === BLOCK.IRON_SHOVEL) return 3.5;

    return 1; // Punch
  }

  public performAttack(): boolean {
    const now = Date.now();
    if (now - this.lastAttackTime < ATTACK_COOLDOWN) return false;
    this.lastAttackTime = now;

    const toolId = this.getSelectedSlotItem();
    const damage = this.calculateDamage(toolId);

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true,
    );

    for (const hit of intersects) {
      if (hit.distance > ATTACK_RANGE) break;

      // Check if it's a mob or part of a mob
      let obj: THREE.Object3D | null = hit.object;
      let isMob = false;
      while (obj) {
        if (obj.userData && obj.userData.mob) {
          isMob = true;
          break;
        }
        obj = obj.parent;
      }

      if (isMob && obj) {
        obj.userData.mob.takeDamage(damage, this.controls.object.position);
        
        // Reduce durability on hit (2 for weapons/tools used as weapons)
        if (this.onToolUse) {
            this.onToolUse(2);
        }

        return true; // Hit mob
      }

      // If we hit something else (like a block) that isn't ignored
      if (
        hit.object !== this.cursorMesh &&
        hit.object !== this.crackMesh &&
        hit.object !== this.controls.object &&
        (hit.object as any).isMesh &&
        !(hit.object as any).isItem
      ) {
        // We hit a wall/block before any mob
        return false;
      }
    }

    return false;
  }
}
