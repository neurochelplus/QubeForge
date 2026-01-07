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
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;
  private mouth: THREE.Mesh;

  // Glitch Effect
  private glitchTimer = 0;

  // AI State
  private preferredSide = 1; // 1 (Right) or -1 (Left)
  private sideTimer = 0;

  constructor(
    world: World,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
  ) {
    super(world, scene, x, y, z);

    // --- Texture Generation ---

    // 1. Water TNT Texture
    // 16x16 Texture: Blue base, Lighter Blue center band, some vertical stripes for "TNT sticks" look?
    // TNT block usually has Top/Bottom different from Side.
    // For simplicity, we apply "Side" texture to all sides or just Box sides.
    const tntSize = 16;
    const tntData = new Uint8Array(4 * tntSize * tntSize);
    for (let i = 0; i < tntSize * tntSize; i++) {
        const row = Math.floor(i / tntSize);
        // Base: Dark Blue (0, 0, 139)
        let r = 0, g = 0, b = 139;

        // Band: Middle rows (6-9) -> Lighter Blue (30, 144, 255)
        if (row >= 6 && row <= 9) {
            r = 30; g = 144; b = 255;

            // Text/Logo simulation: White pixels in center
            const col = i % tntSize;
            if (row >= 7 && row <= 8 && col >= 4 && col <= 11) {
                // Dashed line or "TNT"
                if (col % 3 !== 0) {
                     r = 255; g = 255; b = 255;
                }
            }
        } else {
             // Vertical stripes for sticks (every 4th pixel darker?)
             const col = i % tntSize;
             if (col % 4 === 0) {
                 b = 100; // Slightly darker
             }
        }

        tntData[i * 4] = r;
        tntData[i * 4 + 1] = g;
        tntData[i * 4 + 2] = b;
        tntData[i * 4 + 3] = 255;
    }
    const tntTexture = new THREE.DataTexture(tntData, tntSize, tntSize);
    tntTexture.magFilter = THREE.NearestFilter;
    tntTexture.minFilter = THREE.NearestFilter;
    tntTexture.needsUpdate = true;


    // 2. Head Texture (Backwards Steve)
    // Front face (of the mob) should look like BACK of Steve's head (Hair).
    // Back face (of the mob) should look like FACE of Steve (Skin + Eyes).
    // Sides: Hair + Skin.
    // Top: Hair.
    // Bottom: Skin.

    // We can use 6 separate materials for the box.
    // Colors:
    const cHair = [0.27, 0.17, 0.12]; // Brown
    const cSkin = [0.73, 0.52, 0.40]; // Peach

    // Simple solid color textures for efficiency, or small data textures.
    // Let's create materials directly.

    // Front of Mob (Z+) -> Displays Back of Head (Hair)
    const matHeadBack = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cHair) });

    // Back of Mob (Z-) -> Displays Face (Skin) - This is hidden mostly but valid.
    const matHeadFace = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cSkin) });

    // Top
    const matHeadTop = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cHair) });

    // Bottom
    const matHeadBot = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cSkin) });

    // Sides (Hair on top, skin below? Steve has hair on sides)
    const matHeadSide = new THREE.MeshStandardMaterial({ color: new THREE.Color(...cHair) });

    // Order: Right, Left, Top, Bottom, Front(Z+), Back(Z-)
    // Mob's Front is Z+. We want that to be Hair (Back of Steve).
    // Mob's Back is Z-. We want that to be Face (Front of Steve).
    // So:
    // Front (Z+): Hair
    // Back (Z-): Skin (where the actual face would be on a normal steve, but this mob is reversed)
    // Wait. "Steve head... turned face inside (back of head forward)".
    // So the Mob's Forward direction (Z+) presents the Back of Steve's Head.
    // The Mob's Backward direction (Z-) presents Steve's Face.
    // The "Face" of the mob (eyes) are "instead of eyes - broken pixel texture".
    // AND "Instead of eyes... 2 eyes, not 1... add mouth with same texture".
    // These glitch features should be on the VISIBLE side?
    // "Head of Steve... turned face inside". This implies we see the back of the head.
    // AND "Instead of eyes - broken pixel texture". This usually implies the glitch eyes are ON the back of the head (the visible side).
    // So on the Z+ face (Hair), we put the glitch eyes.

    const headMaterials = [
        matHeadSide, // Right
        matHeadSide, // Left
        matHeadTop,  // Top
        matHeadBot,  // Bottom
        matHeadBack, // Front (Z+) -> Hair (Visible side)
        matHeadFace  // Back (Z-) -> Face (Hidden side)
    ];


    // --- Body Construction ---

    // 1. Bottom Block: "TNT with Water Texture" -> Blue Box
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const bodyMat = new THREE.MeshStandardMaterial({ map: tntTexture });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = 0.5;
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.mesh.add(this.body);

    // 2. Top Block: "Steve Head Backwards"
    const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    this.head = new THREE.Mesh(headGeo, headMaterials);
    this.head.position.y = 1.5;
    this.head.castShadow = true;
    this.head.receiveShadow = true;
    this.mesh.add(this.head);


    // 3. Glitch Features (Eyes + Mouth)
    // Texture: Purple/Black Checkerboard
    // 2x2 Texture
    const gWidth = 2;
    const gHeight = 2;
    const gSize = gWidth * gHeight;
    const gData = new Uint8Array(4 * gSize);
    // 0: Purple
    gData[0]=255; gData[1]=0; gData[2]=255; gData[3]=255;
    // 1: Black
    gData[4]=0; gData[5]=0; gData[6]=0; gData[7]=255;
    // 2: Black
    gData[8]=0; gData[9]=0; gData[10]=0; gData[11]=255;
    // 3: Purple
    gData[12]=255; gData[13]=0; gData[14]=255; gData[15]=255;

    const glitchTexture = new THREE.DataTexture(gData, gWidth, gHeight);
    glitchTexture.magFilter = THREE.NearestFilter;
    glitchTexture.minFilter = THREE.NearestFilter;
    glitchTexture.needsUpdate = true;

    const glitchMat = new THREE.MeshBasicMaterial({ map: glitchTexture });

    // Left Eye
    const eyeGeo = new THREE.PlaneGeometry(0.2, 0.2);
    this.leftEye = new THREE.Mesh(eyeGeo, glitchMat);
    // On Z+ Face (0.4 + epsilon).
    // Head center is 1.5. Width 0.8. Z+ face is at z=0.4 relative to head center.
    // Positions relative to head center (0,0,0)
    this.leftEye.position.set(-0.2, 0.1, 0.41);
    this.head.add(this.leftEye);

    // Right Eye
    this.rightEye = new THREE.Mesh(eyeGeo, glitchMat);
    this.rightEye.position.set(0.2, 0.1, 0.41);
    this.head.add(this.rightEye);

    // Mouth
    const mouthGeo = new THREE.PlaneGeometry(0.6, 0.15);
    this.mouth = new THREE.Mesh(mouthGeo, glitchMat);
    this.mouth.position.set(0, -0.2, 0.41);
    this.head.add(this.mouth);
  }

  // Override takeDamage to apply Inverted Controls
  public takeDamage(amount: number, attackerPos: THREE.Vector3 | null) {
    super.takeDamage(amount, attackerPos);

    // Only apply effect if there is a specific attacker (Player)
    if (attackerPos) {
      this.wasHitRecently = true;

      // Teleport randomly in radius 10
      const angle = Math.random() * Math.PI * 2;
      const dist = 3 + Math.random() * 7; // 3 to 10 blocks
      const tx = attackerPos.x + Math.sin(angle) * dist;
      const tz = attackerPos.z + Math.cos(angle) * dist;

      const worldX = Math.floor(tx);
      const worldZ = Math.floor(tz);
      const ty = this.world.getTopY(worldX, worldZ);

      if (ty > 0) {
          this.mesh.position.set(tx, ty + 1, tz);
          this.velocity.set(0, 0, 0);
      }
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
        playerPos = playerInstance.physics.controls.object.position;
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
        // Rotation Lock: Only Head rotates to match player
        const playerRotY = playerInstance.physics.controls.object.rotation.y;
        this.head.rotation.y = playerRotY;
        // Body stays fixed (or random), we don't rotate this.mesh.rotation.y here
    }

    // --- Glitch Effect on Eyes/Mouth ---
    this.glitchTimer += delta;
    if (this.glitchTimer > 1.0) {
        // Apply jitter
        const jitter = 0.05;
        this.leftEye.position.set(
            -0.2 + (Math.random() - 0.5) * jitter,
            0.1 + (Math.random() - 0.5) * jitter,
            0.41
        );
        this.rightEye.position.set(
            0.2 + (Math.random() - 0.5) * jitter,
            0.1 + (Math.random() - 0.5) * jitter,
            0.41
        );
        this.mouth.position.set(
            0 + (Math.random() - 0.5) * jitter,
            -0.2 + (Math.random() - 0.5) * jitter,
            0.41
        );

        // Scale distortion
        this.leftEye.scale.setScalar(0.8 + Math.random() * 0.4);
        this.rightEye.scale.setScalar(0.8 + Math.random() * 0.4);
        this.mouth.scale.set(1.0 + (Math.random()-0.5)*0.5, 1.0 + (Math.random()-0.5)*0.5, 1);

        if (this.glitchTimer > 1.1) {
            // Reset
            this.leftEye.position.set(-0.2, 0.1, 0.41);
            this.rightEye.position.set(0.2, 0.1, 0.41);
            this.mouth.position.set(0, -0.2, 0.41);

            this.leftEye.scale.set(1,1,1);
            this.rightEye.scale.set(1,1,1);
            this.mouth.scale.set(1,1,1);

            this.glitchTimer = 0;
        }
    }
  }

  protected updateAI(
    delta: number,
    playerPos?: THREE.Vector3,
    onAttack?: (damage: number) => void,
    isDay?: boolean,
  ) {
    if (!playerPos) return;

    // Update Side Timer
    this.sideTimer += delta;
    if (this.sideTimer > 8.0) {
        this.preferredSide *= -1; // Switch side
        this.sideTimer = 0;
    }

    // Movement: "Short jerks"
    this.moveTimer += delta;
    if (this.moveTimer >= this.moveInterval) {
        this.moveTimer = 0;
        this.moveInterval = 0.5 + Math.random() * 1.5;

        // Calculate Target Position: Periphery of Player
        // We need player's rotation. We don't have it passed directly as a value,
        // but we can infer approximate direction from previous interactions or assume
        // we can't perfectly know rotation just from 'playerPos' (Vector3).
        // However, in update() we access 'playerInstance.physics.controls.object.rotation.y'.
        // We can store that rotation in the class during update().

        // Use stored rotation or fallback to "towards player" if unknown
        const playerRotY = this.head.rotation.y; // We set this in update()

        // Periphery Angle: Player Rotation + Offset
        // Player looks down -Z at rotY=0?
        // Let's assume standard Three.js controls logic
        // Angle to Periphery: +/- 45 degrees (PI/4)
        const targetAngle = playerRotY + (this.preferredSide * Math.PI / 4);

        // Distance: Keep about 15 blocks away
        const targetDist = 15;

        // Calculate Ideal Position relative to Player
        // Camera looks towards -Z rotated by Y.
        // Direction Vector: (-sin(rot), 0, -cos(rot)) usually for Forward
        const dirX = -Math.sin(targetAngle);
        const dirZ = -Math.cos(targetAngle);

        const idealX = playerPos.x + dirX * targetDist;
        const idealZ = playerPos.z + dirZ * targetDist;

        // Move towards ideal position
        const dx = idealX - this.mesh.position.x;
        const dz = idealZ - this.mesh.position.z;
        const distToIdeal = Math.sqrt(dx*dx + dz*dz);
        const jumpDist = 1.0 + Math.random() * 1.5;

        // Only move if we are far from ideal spot
        if (distToIdeal > 2.0) {
             const moveAngle = Math.atan2(dx, dz);

             const targetX = this.mesh.position.x + Math.sin(moveAngle) * jumpDist;
             const targetZ = this.mesh.position.z + Math.cos(moveAngle) * jumpDist;

             const worldX = Math.floor(targetX);
             const worldZ = Math.floor(targetZ);
             const targetY = this.world.getTopY(worldX, worldZ);

             // Allow climbing up 5 blocks, but dropping down up to 15 blocks
             // This solves the issue of getting stuck on trees
             if (targetY > 0 && (targetY - this.mesh.position.y < 5) && (this.mesh.position.y - targetY < 15)) {
                 this.mesh.position.set(targetX, targetY + 1, targetZ);
                 this.velocity.set(0, 0, 0);
             } else {
                 this.velocity.y = 2.0;
             }
        }
    }
  }
}
