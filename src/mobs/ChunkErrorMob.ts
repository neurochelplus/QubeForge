import * as THREE from "three";
import { Mob, MobState } from "./Mob";
import { World } from "../world/World";
import { Player } from "../player/Player";

export class ChunkErrorMob extends Mob {
  protected readonly walkSpeed: number = 0; // Moves by teleportation
  private moveTimer = 0;
  private moveInterval = 1.0; // Seconds between jumps

  // Body Parts
  private head: THREE.Mesh;
  private body: THREE.Mesh;

  constructor(
    world: World,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    super(world, scene, x, y, z);

    // Texture generation for "Broken Pixel" Eyes (Purple/Black Checkerboard)
    // 2x2 texture
    const width = 2;
    const height = 2;
    const size = width * height;
    const data = new Uint8Array(4 * size);

    // 0: Purple (255, 0, 255)
    data[0] = 255; data[1] = 0; data[2] = 255; data[3] = 255;
    // 1: Black
    data[4] = 0; data[5] = 0; data[6] = 0; data[7] = 255;
    // 2: Black
    data[8] = 0; data[9] = 0; data[10] = 0; data[11] = 255;
    // 3: Purple
    data[12] = 255; data[13] = 0; data[14] = 255; data[15] = 255;

    const faceTexture = new THREE.DataTexture(data, width, height);
    faceTexture.magFilter = THREE.NearestFilter;
    faceTexture.minFilter = THREE.NearestFilter;
    faceTexture.needsUpdate = true;

    // Default noise texture for other parts
    const noiseTexture = world.noiseTexture;

    // --- Body Construction ---

    // 1. Bottom Block: "TNT with Water Texture" -> Blue Box
    // Height 1 block. Center at y=0.5
    this.body = this.createBox(
      0.9, 0.9, 0.9,
      [0.2, 0.4, 0.8], // Blueish water color
      0.5,
      noiseTexture
    );
    this.mesh.add(this.body);

    // 2. Top Block: "Steve Head Backwards"
    // Height 1 block (visual). Center at y=1.5
    // Actually Steve head is usually smaller (8x8x8 pixels -> 0.5x0.5x0.5 blocks)
    // But description says "Vertical pillar height 2 blocks".
    // So top block is ~1 block high.
    // "Head of Steve"
    this.head = this.createBox(
      0.8, 0.8, 0.8,
      [0.7, 0.5, 0.4], // Skin color
      1.5,
      noiseTexture
    );
    this.mesh.add(this.head);

    // 3. Face with "Broken Pixel" Eyes
    // "Turned facing inside the model (back of head forward)"
    // "Instead of eyes - broken pixel texture"
    // So on the "Front" of the mob (which is the back of the head), we put the texture.
    const faceGeo = new THREE.PlaneGeometry(0.6, 0.3);
    const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture });
    const faceMesh = new THREE.Mesh(faceGeo, faceMat);

    // Position on the Z+ face of the head (Local Front)
    // Center of head is 1.5. Width/Depth is 0.8 (extends to 0.4).
    faceMesh.position.set(0, 1.6, 0.41);
    this.mesh.add(faceMesh);
  }

  // Override takeDamage to apply Inverted Controls
  public takeDamage(amount: number, attackerPos: THREE.Vector3 | null) {
    super.takeDamage(amount, attackerPos);

    // Only apply effect if there is a specific attacker (Player)
    if (attackerPos) {
      this.wasHitRecently = true;
    }
  }

  private wasHitRecently = false;

  // Override update to get player access
  public update(
    delta: number,
    player?: Player | THREE.Vector3, // Modified signature to accept Player
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    // Check if player parameter is actually a Player instance
    let playerInstance: Player | undefined;
    let playerPos: THREE.Vector3 | undefined;

    if (player && (player as any).physics) {
        playerInstance = player as Player;
        playerPos = playerInstance.physics['controls'].object.position;
    } else if (player instanceof THREE.Vector3) {
        playerPos = player;
    }

    if (this.wasHitRecently && playerInstance) {
        // Apply Inverted Controls
        // "Invert for 10 seconds"
        playerInstance.physics.setInvertedControls(10);
        this.wasHitRecently = false;

        // "Sound: Eating apple backwards" (Placeholder: We don't have sound engine setup for custom sounds yet)
    }

    super.update(delta, playerPos, onAttack, isDay);

    // Additional logic if we have player instance
    if (playerInstance) {
        // Rotation Lock: Always look same direction as player
        // Player rotation is in controls.object.rotation.y (Camera rotation)
        // But PointerLockControls object rotation is the camera rotation.
        const playerRotY = playerInstance.physics['controls'].object.rotation.y;
        this.mesh.rotation.y = playerRotY;
    }
  }

  protected updateAI(
    delta: number,
    playerPos?: THREE.Vector3,
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    if (!playerPos) return;

    // Movement: "Short jerks, like 999ms ping"
    // Teleport towards player every X seconds
    this.moveTimer += delta;
    if (this.moveTimer >= this.moveInterval) {
        this.moveTimer = 0;

        // Randomize interval slightly
        this.moveInterval = 0.5 + Math.random() * 1.5;

        // Vector to player
        const dx = playerPos.x - this.mesh.position.x;
        const dz = playerPos.z - this.mesh.position.z;
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist > 3 && dist < 40) {
             // Teleport 1-2 blocks closer, but maybe strafing?
             // "Strives to stay in peripheral vision".
             // Simple approach: Move closer.
             const angle = Math.atan2(dx, dz);
             const jumpDist = 1.0 + Math.random() * 1.0;

             // Move
             this.mesh.position.x += Math.sin(angle) * jumpDist;
             this.mesh.position.z += Math.cos(angle) * jumpDist;

             // Update Y (Snap to ground)
             // Simple physics will handle falling, but for teleport we might end up in a wall.
             // We rely on updatePhysics to push out of walls or handle gravity next frame.
             this.velocity.y = 2.0; // Small hop
        }
    }

    // Always Neutral unless interacting?
    // "Status: Neutral".
    // It doesn't really attack unless triggered?
    // Logic says "If player approaches close and hits him...".
    // So it doesn't attack normally.
  }
}
