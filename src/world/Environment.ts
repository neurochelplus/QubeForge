import * as THREE from 'three';

export class Environment {
  private scene: THREE.Scene;
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  
  private sun: THREE.Mesh;
  private moon: THREE.Mesh;
  private clouds: THREE.InstancedMesh; 
  private cloudData: { x: number, y: number, z: number, scaleX: number, scaleZ: number }[] = [];
  
  // Reusable object for cloud matrix updates (avoid GC)
  private cloudDummy: THREE.Object3D = new THREE.Object3D();

  // Cycle Configuration
  private time: number = 0; // Current time in seconds
  private readonly dayDuration: number = 600; // 10 minutes (600 seconds)
  private readonly nightDuration: number = 600; // 10 minutes
  private get totalCycleDuration() { return this.dayDuration + this.nightDuration; }
  
  // Colors
  private readonly skyColorDay = new THREE.Color(0x87ceeb);
  private readonly skyColorSunset = new THREE.Color(0xfd5e53);
  private readonly skyColorNight = new THREE.Color(0x050510);
  
  private readonly lightColorDay = new THREE.Color(0xffffff);
  private readonly lightColorSunset = new THREE.Color(0xffaa00);
  private readonly lightColorNight = new THREE.Color(0x1a1a3a); // Moon light (bluish)

  public get isDay(): boolean {
      const progress = this.time / this.totalCycleDuration;
      const angle = (progress * Math.PI * 2) - (Math.PI / 2);
      return Math.sin(angle) > 0;
  }

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);

    // 1. Setup Lights
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.castShadow = true;
    
    // Optimize Shadows
    const shadowSize = isMobile ? 1024 : 2048; // Lower res on mobile
    this.dirLight.shadow.mapSize.width = shadowSize;
    this.dirLight.shadow.mapSize.height = shadowSize;
    this.dirLight.shadow.camera.near = 0.1;
    this.dirLight.shadow.camera.far = 200;
    this.dirLight.shadow.camera.left = -50;
    this.dirLight.shadow.camera.right = 50;
    this.dirLight.shadow.camera.top = 50;
    this.dirLight.shadow.camera.bottom = -50;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.05; // Fix shadow acne
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // 2. Setup Sun
    const sunGeo = new THREE.BoxGeometry(10, 10, 10);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffff00, fog: false });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.scene.add(this.sun);

    // 3. Setup Moon
    const moonGeo = new THREE.BoxGeometry(8, 8, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }); // White moon
    this.moon = new THREE.Mesh(moonGeo, moonMat);
    this.scene.add(this.moon);

    // 4. Setup Clouds
    this.clouds = this.generateClouds();
    this.scene.add(this.clouds);
    
    // Initial start time (start at Noon)
    this.time = this.totalCycleDuration * 0.5; 
  }

  private generateClouds(): THREE.InstancedMesh {
    const cloudCount = 50;
    const geometry = new THREE.BoxGeometry(16, 4, 16);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, 
        transparent: true, 
        opacity: 0.4, // More transparent
        fog: false
    });
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, cloudCount);
    
    // Init Data
    for (let i = 0; i < cloudCount; i++) {
        this.cloudData.push({
            x: (Math.random() - 0.5) * 400,
            y: 100 + (Math.random() * 10),
            z: (Math.random() - 0.5) * 400,
            scaleX: 1 + Math.random() * 2,
            scaleZ: 1 + Math.random() * 2
        });
    }
    
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.frustumCulled = false; 
    return instancedMesh;
  }

  public setTimeToDay() {
    this.time = this.totalCycleDuration * 0.5; // Noon
  }

  public setTimeToNight() {
    this.time = 0; // Midnight
  }

  public setShadowsEnabled(enabled: boolean) {
    this.dirLight.castShadow = enabled;
  }

  public setCloudsEnabled(enabled: boolean) {
    this.clouds.visible = enabled;
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    this.time += delta;
    if (this.time >= this.totalCycleDuration) {
        this.time %= this.totalCycleDuration;
    }

    // Calculate Cycle Progress (0.0 to 1.0)
    const progress = this.time / this.totalCycleDuration;
    
    const angle = (progress * Math.PI * 2) - (Math.PI / 2); 
    const dist = 100;
    
    // Sun Position (Rotates around Z axis, rising from X)
    const sunX = Math.cos(angle) * dist;
    const sunY = Math.sin(angle) * dist;
    
    // Position celestial bodies relative to player so they don't disappear
    this.sun.position.set(playerPos.x + sunX, playerPos.y + sunY, playerPos.z);
    this.sun.lookAt(playerPos);

    // Moon is opposite
    this.moon.position.set(playerPos.x - sunX, playerPos.y - sunY, playerPos.z);
    this.moon.lookAt(playerPos);

    // --- Lighting Logic ---
    if (sunY > -10) {
        // Sun is up or setting
        this.dirLight.position.set(playerPos.x + sunX * 0.5, playerPos.y + sunY * 0.5, playerPos.z);
        this.dirLight.target.position.copy(playerPos);
        this.dirLight.intensity = Math.max(0, Math.sin(angle)); // 1 at noon, 0 at horizon
    } else {
        // Night (Moon is up)
        this.dirLight.position.set(this.moon.position.x * 0.5, this.moon.position.y * 0.5, this.moon.position.z);
        this.dirLight.target.position.copy(playerPos);
        this.dirLight.intensity = Math.max(0, Math.sin(angle + Math.PI)) * 0.2; // Dim moon light
    }

    // --- Color Transitions ---
    let targetSky: THREE.Color;
    let targetLight: THREE.Color;
    let ambientIntensity: number;

    if (sunY > 20) {
        // Day
        targetSky = this.skyColorDay;
        targetLight = this.lightColorDay;
        ambientIntensity = 0.6;
    } else if (sunY > -20) {
        // Sunset / Sunrise transition
        targetSky = this.skyColorSunset;
        targetLight = this.lightColorSunset;
        ambientIntensity = 0.3;
    } else {
        // Night
        targetSky = this.skyColorNight;
        targetLight = this.lightColorNight;
        ambientIntensity = 0.1;
    }

    const lerpFactor = delta * 1.0; 
    
    this.scene.background = (this.scene.background as THREE.Color).lerp(targetSky, lerpFactor);
    if (this.scene.fog) {
        (this.scene.fog as THREE.Fog).color.lerp(targetSky, lerpFactor);
    }
    
    this.dirLight.color.lerp(targetLight, lerpFactor);
    this.ambientLight.intensity = THREE.MathUtils.lerp(this.ambientLight.intensity, ambientIntensity, lerpFactor);

    // --- Clouds (using cached dummy to avoid allocations) ---
    const dummy = this.cloudDummy;
    const range = 200; // Radius around player
    const cloudSpeed = 2;
    const size = range * 2;
    const cloudTime = this.time * cloudSpeed;
    const px = playerPos.x;
    const pz = playerPos.z;
    
    for (let i = 0; i < this.cloudData.length; i++) {
        const data = this.cloudData[i];
        
        const globalX = data.x + cloudTime;
        const dx = globalX - px;
        const dz = data.z - pz;
        
        const wrappedDx = ((dx % size) + size) % size - range;
        const wrappedDz = ((dz % size) + size) % size - range;
        
        dummy.position.set(px + wrappedDx, data.y, pz + wrappedDz);
        dummy.scale.set(data.scaleX, 1, data.scaleZ);
        dummy.updateMatrix();
        this.clouds.setMatrixAt(i, dummy.matrix);
    }
    
    this.clouds.instanceMatrix.needsUpdate = true;
  }
}
