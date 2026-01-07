import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Scene } from "three";
import { World, BLOCK } from "../world/World";
import { Mob } from "../mobs/Mob";
import {
  PLAYER_HALF_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_EYE_HEIGHT,
} from "../constants/GameConstants";

export class BlockInteraction {
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private controls: any;
  private cursorMesh?: THREE.Mesh;
  private crackMesh?: THREE.Mesh;
  private readonly MAX_DISTANCE = 6;

  private getSelectedSlotItem: () => { id: number; count: number };
  private getMobs?: () => Mob[];
  private onPlaceBlock?: (
    x: number,
    y: number,
    z: number,
    blockId: number,
  ) => boolean;
  private onOpenCraftingTable?: () => void;
  private onConsumeItem?: () => void;

  constructor(
    camera: PerspectiveCamera,
    scene: Scene,
    controls: any,
    getSelectedSlotItem: () => { id: number; count: number },
    onPlaceBlock?: (
      x: number,
      y: number,
      z: number,
      blockId: number,
    ) => boolean,
    onOpenCraftingTable?: () => void,
    cursorMesh?: THREE.Mesh,
    crackMesh?: THREE.Mesh,
    getMobs?: () => Mob[],
    onConsumeItem?: () => void
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.getSelectedSlotItem = getSelectedSlotItem;
    this.onPlaceBlock = onPlaceBlock;
    this.onOpenCraftingTable = onOpenCraftingTable;
    this.cursorMesh = cursorMesh;
    this.crackMesh = crackMesh;
    this.getMobs = getMobs;
    this.onConsumeItem = onConsumeItem;
    this.raycaster = new THREE.Raycaster();
  }

  public interact(world: World): void {
    // 1. Check Item Usage (Broken Compass)
    const slot = this.getSelectedSlotItem();
    if (slot.id === BLOCK.BROKEN_COMPASS) {
        // Random Teleport Logic
        const playerPos = this.controls.object.position;
        const angle = Math.random() * Math.PI * 2;
        const dist = 5 + Math.random() * 25; // 5 to 30 blocks away

        const targetX = playerPos.x + Math.sin(angle) * dist;
        const targetZ = playerPos.z + Math.cos(angle) * dist;

        const tx = Math.floor(targetX);
        const tz = Math.floor(targetZ);

        // Find valid ground
        let topY = world.getTopY(tx, tz);

        // If valid height found (and not void)
        if (topY > 0) {
             const targetY = topY + 1.0; // Stand on top of the block

             // Check if target is not too high/low compared to current?
             // Not strictly required by prompt, but good practice.
             // Prompt says "random place in radius 30".

             playerPos.set(tx + 0.5, targetY, tz + 0.5);

             // Reset velocity to prevent fall damage or momentum
             if ((this.controls as any).velocity) (this.controls as any).velocity.set(0,0,0);

             // Consume Item
             if (this.onConsumeItem) this.onConsumeItem();

             return; // Stop interaction
        }
        // If no valid ground found (void), do nothing (waste use? or prevent use?)
        // Let's prevent use if invalid target.
    }

    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    const hit = intersects.find(
      (i) =>
        i.object !== this.cursorMesh &&
        i.object !== this.crackMesh &&
        i.object !== this.controls.object &&
        (i.object as any).isMesh &&
        !(i.object as any).isItem &&
        !(i.object.parent as any)?.isMob,
    );

    if (hit && hit.distance < this.MAX_DISTANCE) {
      const p = hit.point
        .clone()
        .add(this.raycaster.ray.direction.clone().multiplyScalar(0.01));
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      const z = Math.floor(p.z);

      const targetId = world.getBlock(x, y, z);
      if (targetId === BLOCK.CRAFTING_TABLE) {
        if (this.onOpenCraftingTable) {
          this.onOpenCraftingTable();
        }
        return;
      }

      // Place Block
      const slot = this.getSelectedSlotItem();
      if (slot.id !== 0 && slot.count > 0) {
        // Prevent placing non-blocks (e.g. Stick, Tools)
        if (slot.id === BLOCK.STICK || slot.id >= 20) return;

        if (hit.face) {
          const placePos = hit.point
            .clone()
            .add(hit.face.normal.clone().multiplyScalar(0.01));
          const px = Math.floor(placePos.x);
          const py = Math.floor(placePos.y);
          const pz = Math.floor(placePos.z);

          // Check collision with player
          const playerPos = this.controls.object.position;
          const playerMinX = playerPos.x - PLAYER_HALF_WIDTH;
          const playerMaxX = playerPos.x + PLAYER_HALF_WIDTH;
          const playerMinY = playerPos.y - PLAYER_EYE_HEIGHT;
          const playerMaxY = playerPos.y - PLAYER_EYE_HEIGHT + PLAYER_HEIGHT;
          const playerMinZ = playerPos.z - PLAYER_HALF_WIDTH;
          const playerMaxZ = playerPos.z + PLAYER_HALF_WIDTH;

          const blockMinX = px;
          const blockMaxX = px + 1;
          const blockMinY = py;
          const blockMaxY = py + 1;
          const blockMinZ = pz;
          const blockMaxZ = pz + 1;

          if (
            playerMinX < blockMaxX &&
            playerMaxX > blockMinX &&
            playerMinY < blockMaxY &&
            playerMaxY > blockMinY &&
            playerMinZ < blockMaxZ &&
            playerMaxZ > blockMinZ
          ) {
            // Cannot place block inside player
            return;
          }

          // Check collision with mobs
          if (this.getMobs) {
            const mobs = this.getMobs();
            let mobCollision = false;
            for (const mob of mobs) {
              const mobPos = mob.mesh.position;
              const mobMinX = mobPos.x - mob.width / 2;
              const mobMaxX = mobPos.x + mob.width / 2;
              const mobMinY = mobPos.y;
              const mobMaxY = mobPos.y + mob.height;
              const mobMinZ = mobPos.z - mob.width / 2;
              const mobMaxZ = mobPos.z + mob.width / 2;

              if (
                mobMinX < blockMaxX &&
                mobMaxX > blockMinX &&
                mobMinY < blockMaxY &&
                mobMaxY > blockMinY &&
                mobMinZ < blockMaxZ &&
                mobMaxZ > blockMinZ
              ) {
                mobCollision = true;
                break;
              }
            }
            if (mobCollision) return;
          }

          if (this.onPlaceBlock) {
            const placed = this.onPlaceBlock(px, py, pz, slot.id);
            if (placed) {
              // Block was placed, inventory will be updated by caller
            }
          }
        }
      }
    }
  }
}
