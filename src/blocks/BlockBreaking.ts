import * as THREE from "three";
import { PerspectiveCamera } from "three";
import { Scene } from "three";
import { World } from "../world/World";
import { BLOCK } from "../constants/Blocks";
import { globalEventBus } from "../modding";

export class BlockBreaking {
  private crackMesh: THREE.Mesh;
  private crackTexture: THREE.CanvasTexture;
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private controls: PointerLockControls;
  private cursorMesh?: THREE.Mesh;
  
  // Raycast кэширование
  private chunkMeshes: THREE.Object3D[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_UPDATE_INTERVAL: number = 500; // ms

  private isBreaking: boolean = false;
  private breakStartTime: number = 0;
  private currentBreakBlock: THREE.Vector3 = new THREE.Vector3();
  private currentBreakId: number = 0;

  // Cached vectors to avoid allocation in hot path
  private readonly tempVector2 = new THREE.Vector2(0, 0);
  private readonly tempPoint = new THREE.Vector3();

  private getSelectedSlotItem: () => number;
  private onBlockBreak?: (
    x: number,
    y: number,
    z: number,
    blockId: number,
  ) => void;

  constructor(
    scene: Scene,
    camera: PerspectiveCamera,
    controls: any,
    getSelectedSlotItem: () => number,
    onBlockBreak?: (x: number, y: number, z: number, blockId: number) => void,
    cursorMesh?: THREE.Mesh,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.getSelectedSlotItem = getSelectedSlotItem;
    this.onBlockBreak = onBlockBreak;
    this.cursorMesh = cursorMesh;
    this.raycaster = new THREE.Raycaster();

    // Create crack texture
    this.crackTexture = this.createCrackTexture();

    // Create crack mesh
    const crackGeometry = new THREE.BoxGeometry(1.002, 1.002, 1.002);
    const crackMaterial = new THREE.MeshBasicMaterial({
      map: this.crackTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    this.crackMesh = new THREE.Mesh(crackGeometry, crackMaterial);
    this.crackMesh.visible = false;
    this.crackMesh.renderOrder = 999;
    scene.add(this.crackMesh);
  }

  private createCrackTexture(): THREE.CanvasTexture {
    const crackCanvas = document.createElement("canvas");
    crackCanvas.width = 640; // 10 frames * 64px
    crackCanvas.height = 64;
    const crackCtx = crackCanvas.getContext("2d")!;
    crackCtx.imageSmoothingEnabled = false;

    for (let i = 0; i < 10; i++) {
      const offsetX = i * 64;
      const centerX = 32;
      const centerY = 32;
      const progress = (i + 1) / 10;
      const maxDist = 32 * 1.2;
      const currentDist = maxDist * progress;
      const pixelSize = 4;

      for (let x = 0; x < 64; x += pixelSize) {
        for (let y = 0; y < 64; y += pixelSize) {
          const dx = x + pixelSize / 2 - centerX;
          const dy = y + pixelSize / 2 - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const noise = (Math.random() - 0.5) * 10;

          if (dist < currentDist + noise) {
            crackCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
            crackCtx.fillRect(offsetX + x, y, pixelSize, pixelSize);
          }
        }
      }
    }

    const texture = new THREE.CanvasTexture(crackCanvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.repeat.set(0.1, 1);
    return texture;
  }

  public getCrackMesh(): THREE.Mesh {
    return this.crackMesh;
  }

  public isBreakingNow(): boolean {
    return this.isBreaking;
  }

  /**
   * Обновить кэш chunk meshes для raycast
   */
  private updateChunkMeshCache(): void {
    const now = performance.now();
    if (now - this.lastCacheUpdate < this.CACHE_UPDATE_INTERVAL) return;
    
    this.lastCacheUpdate = now;
    this.chunkMeshes = this.scene.children.filter(
      (obj) =>
        obj !== this.cursorMesh &&
        obj !== this.crackMesh &&
        obj !== this.controls.object &&
        (obj as any).isMesh &&
        !(obj as any).isItem &&
        !(obj.parent as any)?.isMob
    );
  }

  public start(world: World): void {
    this.updateChunkMeshCache();
    this.raycaster.setFromCamera(this.tempVector2, this.camera);
    const hit = this.raycaster
      .intersectObjects(this.chunkMeshes)
      .find((i) => i.distance < 6);

    if (hit && hit.distance < 6) {
      this.tempPoint.copy(hit.point).addScaledVector(this.raycaster.ray.direction, 0.01);
      const x = Math.floor(this.tempPoint.x);
      const y = Math.floor(this.tempPoint.y);
      const z = Math.floor(this.tempPoint.z);

      const id = world.getBlock(x, y, z);
      if (id !== 0 && id !== BLOCK.BEDROCK) {
        this.isBreaking = true;
        this.breakStartTime = performance.now();
        this.currentBreakBlock.set(x, y, z);
        this.currentBreakId = id;
      }
    }
  }

  public stop(): void {
    this.isBreaking = false;
    this.crackMesh.visible = false;
  }

  public update(time: number, world: World): void {
    if (!this.isBreaking) {
      this.crackMesh.visible = false;
      return;
    }

    // Check if still looking at same block
    this.updateChunkMeshCache();
    this.raycaster.setFromCamera(this.tempVector2, this.camera);
    const hit = this.raycaster
      .intersectObjects(this.chunkMeshes)
      .find((i) => i.distance < 6);

    let lookingAtSame = false;
    if (hit && hit.distance < 6) {
      this.tempPoint.copy(hit.point).addScaledVector(this.raycaster.ray.direction, 0.01);
      const x = Math.floor(this.tempPoint.x);
      const y = Math.floor(this.tempPoint.y);
      const z = Math.floor(this.tempPoint.z);

      if (
        x === this.currentBreakBlock.x &&
        y === this.currentBreakBlock.y &&
        z === this.currentBreakBlock.z
      ) {
        lookingAtSame = true;
      }
    }

    if (!lookingAtSame) {
      this.stop();
      return;
    }

    // Update progress
    const toolId = this.getSelectedSlotItem();
    const duration = world.getBreakTime(this.currentBreakId, toolId);
    const elapsed = time - this.breakStartTime;
    const progress = Math.min(elapsed / duration, 1.0);

    if (progress >= 1.0) {
      // Break it!
      const x = this.currentBreakBlock.x;
      const y = this.currentBreakBlock.y;
      const z = this.currentBreakBlock.z;

      // Emit event for mods
      globalEventBus.emit('world:blockBreak', {
        x, y, z,
        blockId: this.currentBreakId,
      });

      if (this.onBlockBreak) {
        this.onBlockBreak(x, y, z, this.currentBreakId);
      }

      this.stop();
    } else {
      // Update visuals
      this.crackMesh.visible = true;
      this.crackMesh.position.set(
        this.currentBreakBlock.x + 0.5,
        this.currentBreakBlock.y + 0.5,
        this.currentBreakBlock.z + 0.5,
      );

      const frame = Math.floor(progress * 9);
      this.crackTexture.offset.x = frame * 0.1;
    }
  }
}
