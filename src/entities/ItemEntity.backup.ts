import * as THREE from "three";
import { World } from "../world/World";

export class ItemEntity {
  public mesh: THREE.Mesh;
  public type: number;
  public count: number;
  public isDead = false;

  private scene: THREE.Scene;
  private world: World;
  private timeOffset: number;
  private creationTime: number;
  private readonly maxAge = 180000; // 3 minutes

  private velocityY: number = 0;
  private isOnGround: boolean = false;
  private groundY: number = 0; // To store the base Y for floating

  constructor(
    world: World,
    scene: THREE.Scene,
    x: number,
    y: number,
    z: number,
    type: number,
    blockTexture: THREE.DataTexture,
    itemTexture: THREE.CanvasTexture | null = null,
    count: number = 1,
  ) {
    this.type = type;
    this.count = count;
    this.scene = scene;
    this.world = world;
    this.timeOffset = Math.random() * 100;
    this.creationTime = performance.now();

    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;

    if (itemTexture) {
      // Flat Item (Tool/Stick)
      geometry = new THREE.PlaneGeometry(0.5, 0.5);
      // Plane needs to be visible from both sides
      material = new THREE.MeshStandardMaterial({
        map: itemTexture,
        transparent: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        roughness: 0.8,
      });
    } else {
      // Block Item
      geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);

      // Generate colors
      const colors: number[] = [];
      const count = geometry.attributes.position.count;

      // Color Logic
      let r = 1,
        g = 1,
        b = 1;
      if (type === 1) {
        r = 0.33;
        g = 0.6;
        b = 0.33;
      } // Grass (Green)
      else if (type === 2) {
        r = 0.54;
        g = 0.27;
        b = 0.07;
      } // Dirt
      else if (type === 3) {
        r = 0.5;
        g = 0.5;
        b = 0.5;
      } // Stone
      else if (type === 4) {
        r = 0.13;
        g = 0.13;
        b = 0.13;
      } // Bedrock
      else if (type === 5) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } // Wood
      else if (type === 6) {
        r = 0.13;
        g = 0.55;
        b = 0.13;
      } // Leaves
      else if (type === 7) {
        r = 0.76;
        g = 0.6;
        b = 0.42;
      } // Planks
      else if (type === 8) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } // Stick (Dark Brown)
      else if (type === 10 || type === 11 || type === 14) {
        r = 1.0;
        g = 1.0;
        b = 1.0; // Ores and Furnace use texture colors
      }

      const grassTop = { r: 0.33, g: 0.6, b: 0.33 };
      const grassSide = { r: 0.54, g: 0.27, b: 0.07 };

      for (let i = 0; i < count; i++) {
        const faceIndex = Math.floor(i / 4); // Assuming BoxGeometry with 4 verts per face

        if (type === 1) {
          // Grass
          if (faceIndex === 2) {
            // Top
            colors.push(grassTop.r, grassTop.g, grassTop.b);
          } else {
            colors.push(grassSide.r, grassSide.g, grassSide.b);
          }
        } else {
          colors.push(r, g, b);
        }
      }

      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );

      // UV Fix
      const uvAttr = geometry.getAttribute("uv");
      if (uvAttr) {
        const uvStep = 1.0 / 12.0; // Updated to 12 slots
        const uvInset = 0.001; // Avoid bleeding

        // Helper to get ranges
        // 0: Noise (Default)
        // 1: Leaves
        // 2: Planks
        // 3: CT Top
        // 4: CT Side
        // 5: CT Bottom
        // 6: Coal Ore
        // 7: Iron Ore
        // 8: Furnace Front
        // 9: Furnace Side
        // 10: Furnace Top

        const getRange = (idx: number) => {
          return {
            min: idx * uvStep + uvInset,
            max: (idx + 1) * uvStep - uvInset,
          };
        };

        for (let face = 0; face < 6; face++) {
          // Determine texture index for this face
          // BoxGeometry Faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back

          let texIdx = 0; // Default Noise/Stone/Dirt

          if (type === 6)
            texIdx = 1; // Leaves
          else if (type === 7)
            texIdx = 2; // Planks
          else if (type === 9) {
            // Crafting Table
            if (face === 2)
              texIdx = 3; // Top
            else if (face === 3)
              texIdx = 5; // Bottom
            else texIdx = 4; // Side
          } else if (type === 10) {
            texIdx = 6; // Coal Ore
          } else if (type === 11) {
            texIdx = 7; // Iron Ore
          } else if (type === 14) {
            // Furnace
            if (face === 2)
              texIdx = 10; // Top
            else if (face === 3)
              texIdx = 9; // Bottom (use side)
            else if (face === 4)
              texIdx = 8; // Front
            else texIdx = 9; // Side
          }

          const { min, max } = getRange(texIdx);

          // Update 4 vertices for this face
          const offset = face * 4;
          for (let i = 0; i < 4; i++) {
            const u = uvAttr.getX(offset + i);
            // Remap 0..1 to min..max
            uvAttr.setX(offset + i, min + u * (max - min));
          }
        }
        uvAttr.needsUpdate = true;
      }

      material = new THREE.MeshStandardMaterial({
        map: blockTexture,
        vertexColors: true,
        roughness: 0.8,
        alphaTest: 0.5,
        transparent: true,
      });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    (this.mesh as any).isItem = true;
    this.mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    this.scene.add(this.mesh);
  }

  update(time: number, delta: number) {
    const age = performance.now() - this.creationTime;

    if (age > this.maxAge) {
      this.isDead = true;
      this.dispose();
      return;
    }

    if (age > this.maxAge - 10000) {
      // Blink every 0.25 seconds
      this.mesh.visible = Math.floor(age / 250) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    this.mesh.rotation.y = time * 2 + this.timeOffset;

    if (!this.isOnGround) {
      this.velocityY -= 20.0 * delta;
      this.mesh.position.y += this.velocityY * delta;

      // Collision Check
      const x = Math.floor(this.mesh.position.x);
      const z = Math.floor(this.mesh.position.z);

      // Check block directly underneath center?
      // Mesh is 0.3 high. Center is at y. Bottom is y - 0.15.
      const feetY = this.mesh.position.y - 0.15;
      const blockY = Math.floor(feetY);

      if (this.world.getBlock(x, blockY, z) !== 0) {
        // Landed
        this.isOnGround = true;
        this.velocityY = 0;
        this.groundY = blockY + 1 + 0.15;
        this.mesh.position.y = this.groundY;
      }
    } else {
      // Floating animation
      this.mesh.position.y =
        this.groundY + Math.sin(time * 3 + this.timeOffset) * 0.05;

      // Check if ground removed
      const x = Math.floor(this.mesh.position.x);
      const blockY = Math.floor(this.groundY - 1 - 0.15); // Block below groundY
      const z = Math.floor(this.mesh.position.z);

      if (this.world.getBlock(x, blockY, z) === 0) {
        this.isOnGround = false;
        this.velocityY = 0;
      }
    }
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
