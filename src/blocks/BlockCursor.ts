import * as THREE from 'three';
import { PerspectiveCamera } from 'three';
import { Scene } from 'three';

export class BlockCursor {
  private mesh: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private camera: PerspectiveCamera;
  private scene: Scene;
  private controls: PointerLockControls; // PointerLockControls
  private readonly MAX_DISTANCE = 6;

  constructor(
    scene: Scene,
    camera: PerspectiveCamera,
    controls: PointerLockControls
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.raycaster = new THREE.Raycaster();

    // Create cursor mesh
    const cursorGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const cursorMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    this.mesh = new THREE.Mesh(cursorGeometry, cursorMaterial);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public update(world: any): void {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    
    const hit = intersects.find(i => 
      i.object !== this.mesh && 
      i.object !== this.controls.object && 
      (i.object as any).isMesh && 
      !(i.object as any).isItem && 
      !(i.object.parent as any)?.isMob
    );

    if (hit && hit.distance < this.MAX_DISTANCE) {
      const p = hit.point.clone().add(this.raycaster.ray.direction.clone().multiplyScalar(0.01));
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      const z = Math.floor(p.z);

      const id = world.getBlock(x, y, z);

      if (id !== 0) {
        this.mesh.visible = true;
        this.mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      } else {
        this.mesh.visible = false;
      }
    } else {
      this.mesh.visible = false;
    }
  }
}

