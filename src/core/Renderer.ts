import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

export class Renderer {
  public scene: THREE.Scene;
  public uiScene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public uiCamera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: PointerLockControls;
  private isMobile: boolean;

  constructor() {
    this.isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    if (this.isMobile) {
      document.body.classList.add("is-mobile");
    }

    // Main Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    // Уменьшен fog для лучшей производительности (скрывает дальние чанки раньше)
    this.scene.fog = new THREE.Fog(0x87ceeb, 10, 45);

    // UI Scene (for Hand)
    this.uiScene = new THREE.Scene();

    // Main Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.rotation.order = "YXZ";
    this.camera.position.set(8, 20, 20);
    this.camera.lookAt(8, 8, 8);

    // UI Camera
    this.uiCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.uiScene.add(this.uiCamera);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.isMobile });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2),
    );
    this.renderer.shadowMap.enabled = !this.isMobile;
    this.renderer.autoClear = false; // Manual clearing for overlay
    document.body.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new PointerLockControls(this.camera, document.body);
    this.scene.add(this.controls.object);

    // Window resize handler
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.uiCamera.aspect = window.innerWidth / window.innerHeight;
      this.uiCamera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  public getIsMobile(): boolean {
    return this.isMobile;
  }

  public render(): void {
    this.renderer.clear(); // Clear color & depth
    this.renderer.render(this.scene, this.camera);
    this.renderer.clearDepth(); // Clear depth for UI overlay
    this.renderer.render(this.uiScene, this.uiCamera);
  }

  public renderOnlyMain(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
