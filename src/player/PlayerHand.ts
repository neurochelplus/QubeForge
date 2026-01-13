import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { hexToRgb } from "../constants/BlockTextures";
import { TOOL_DEFS } from "../constants/ToolTextures";
import type { ToolDefinition } from "../types/Tools";

export class PlayerHand {
  private camera: THREE.Camera;
  private handGroup: THREE.Group;
  private currentMesh: THREE.Mesh | null = null;
  private needleMesh: THREE.Mesh | null = null;
  private currentId: number = 0;

  // Animation State
  private bobTime = 0;
  private swingTime = 0;
  private isSwinging = false;
  private isMining = false; // Held down state
  private isEating = false;

  private readonly SWING_DURATION = 0.3; // Seconds
  private readonly BASE_POS = new THREE.Vector3(0.5, -0.6, -1); // Right hand position

  // Texture References
  private blockTexture: THREE.DataTexture;
  private toolTextures: Record<number, { texture: THREE.CanvasTexture; dataUrl: string }>;

  constructor(
    camera: THREE.Camera,
    blockTexture: THREE.DataTexture,
    toolTextures: Record<number, { texture: THREE.CanvasTexture; dataUrl: string }>,
  ) {
    this.camera = camera;
    this.blockTexture = blockTexture;
    this.toolTextures = toolTextures;

    this.handGroup = new THREE.Group();
    this.camera.add(this.handGroup);

    // Initial pos
    this.handGroup.position.copy(this.BASE_POS);
  }

  private getToolDef(id: number) {
    if (id === BLOCK.WOODEN_SWORD) return TOOL_DEFS.WOODEN_SWORD;
    if (id === BLOCK.STONE_SWORD) return TOOL_DEFS.STONE_SWORD;
    if (id === BLOCK.WOODEN_PICKAXE) return TOOL_DEFS.WOODEN_PICKAXE;
    if (id === BLOCK.STONE_PICKAXE) return TOOL_DEFS.STONE_PICKAXE;
    if (id === BLOCK.WOODEN_AXE) return TOOL_DEFS.WOODEN_AXE;
    if (id === BLOCK.STONE_AXE) return TOOL_DEFS.STONE_AXE;
    if (id === BLOCK.WOODEN_SHOVEL) return TOOL_DEFS.WOODEN_SHOVEL;
    if (id === BLOCK.STONE_SHOVEL) return TOOL_DEFS.STONE_SHOVEL;
    if (id === BLOCK.IRON_SWORD) return TOOL_DEFS.IRON_SWORD;
    if (id === BLOCK.IRON_PICKAXE) return TOOL_DEFS.IRON_PICKAXE;
    if (id === BLOCK.IRON_AXE) return TOOL_DEFS.IRON_AXE;
    if (id === BLOCK.IRON_SHOVEL) return TOOL_DEFS.IRON_SHOVEL;
    if (id === BLOCK.STICK) return TOOL_DEFS.STICK;
    if (id === BLOCK.BROKEN_COMPASS) return TOOL_DEFS.BROKEN_COMPASS;
    if (id === BLOCK.COAL) return TOOL_DEFS.COAL;
    if (id === BLOCK.IRON_INGOT) return TOOL_DEFS.IRON_INGOT;
    if (id === BLOCK.RAW_MEAT) return TOOL_DEFS.RAW_MEAT;
    if (id === BLOCK.COOKED_MEAT) return TOOL_DEFS.COOKED_MEAT;
    return null;
  }

  private isSword(id: number): boolean {
    return (
      id === BLOCK.WOODEN_SWORD ||
      id === BLOCK.STONE_SWORD ||
      id === BLOCK.IRON_SWORD
    );
  }

  private createToolMesh(def: ToolDefinition): THREE.Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const uvs: number[] = [];

    const pattern = def.pattern;
    const size = 16;
    const scale = 0.04;
    const pixelSize = scale;
    const depth = pixelSize;

    // Helper to push a vertex
    const pushVertex = (
      x: number,
      y: number,
      z: number,
      nx: number,
      ny: number,
      nz: number,
      r: number,
      g: number,
      b: number,
    ) => {
      positions.push(x, y, z);
      normals.push(nx, ny, nz);
      colors.push(r, g, b);
      uvs.push(0, 0); // Dummy UVs
    };

    // Helper to add face (2 triangles, 6 vertices)
    const addFace = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      nx: number,
      ny: number,
      nz: number,
      r: number,
      g: number,
      b: number,
    ) => {
      const x0 = x;
      const x1 = x + w;
      const y0 = y;
      const y1 = y + h;
      const z0 = z;
      const z1 = z + d;

      // Define 4 corners relative to normal
      let p0, p1, p2, p3;

      if (nx === 1) {
        // Right
        p0 = [x1, y0, z1];
        p1 = [x1, y0, z0];
        p2 = [x1, y1, z1];
        p3 = [x1, y1, z0];
      } else if (nx === -1) {
        // Left
        p0 = [x0, y0, z0];
        p1 = [x0, y0, z1];
        p2 = [x0, y1, z0];
        p3 = [x0, y1, z1];
      } else if (ny === 1) {
        // Top
        p0 = [x0, y1, z1];
        p1 = [x1, y1, z1];
        p2 = [x0, y1, z0];
        p3 = [x1, y1, z0];
      } else if (ny === -1) {
        // Bottom
        p0 = [x0, y0, z0];
        p1 = [x1, y0, z0];
        p2 = [x0, y0, z1];
        p3 = [x1, y0, z1];
      } else if (nz === 1) {
        // Front
        p0 = [x0, y0, z1];
        p1 = [x1, y0, z1];
        p2 = [x0, y1, z1];
        p3 = [x1, y1, z1];
      } else {
        // Back
        p0 = [x1, y0, z0];
        p1 = [x0, y0, z0];
        p2 = [x1, y1, z0];
        p3 = [x0, y1, z0];
      }

      // Triangle 1: 0, 1, 2
      pushVertex(p0[0], p0[1], p0[2], nx, ny, nz, r, g, b);
      pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
      pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b);

      // Triangle 2: 2, 1, 3
      pushVertex(p2[0], p2[1], p2[2], nx, ny, nz, r, g, b);
      pushVertex(p1[0], p1[1], p1[2], nx, ny, nz, r, g, b);
      pushVertex(p3[0], p3[1], p3[2], nx, ny, nz, r, g, b);
    };

    // Colors
    const rgbHandle = { r: 92 / 255, g: 64 / 255, b: 51 / 255 }; // #5C4033

    const matColorHex = def.color || "#7d7d7d";
    const rgbMatRes = hexToRgb(matColorHex);
    const rgbMat = {
      r: rgbMatRes.r / 255,
      g: rgbMatRes.g / 255,
      b: rgbMatRes.b / 255,
    };

    // Center offset
    const offsetX = -(size * pixelSize) / 2;
    const offsetY = -(size * pixelSize) / 2;

    for (let y = 0; y < size; y++) {
      const row = pattern[y];
      for (let x = 0; x < size; x++) {
        const char = row[x];
        if (char === "0") continue;

        const px = offsetX + x * pixelSize;
        const py = offsetY + (size - 1 - y) * pixelSize;
        const pz = -depth / 2;

        let r = 1,
          g = 1,
          b = 1;
        if (char === "1") {
          r = rgbHandle.r;
          g = rgbHandle.g;
          b = rgbHandle.b;
        } else if (char === "2") {
          r = rgbMat.r;
          g = rgbMat.g;
          b = rgbMat.b;
        }

        // Culling Logic
        // Draw face ONLY if neighbor is empty ('0' or out of bounds)

        // Right (x+1)
        if (x + 1 >= size || pattern[y][x + 1] === "0") {
          addFace(px, py, pz, pixelSize, pixelSize, depth, 1, 0, 0, r, g, b);
        }
        // Left (x-1)
        if (x - 1 < 0 || pattern[y][x - 1] === "0") {
          addFace(px, py, pz, pixelSize, pixelSize, depth, -1, 0, 0, r, g, b);
        }
        // Top (y-1 in pattern) -> World Y+
        if (y - 1 < 0 || pattern[y - 1][x] === "0") {
          addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 1, 0, r, g, b);
        }
        // Bottom (y+1 in pattern) -> World Y-
        if (y + 1 >= size || pattern[y + 1][x] === "0") {
          addFace(px, py, pz, pixelSize, pixelSize, depth, 0, -1, 0, r, g, b);
        }

        // Front and Back always visible for 1-layer tools
        addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 0, 1, r, g, b); // Front
        addFace(px, py, pz, pixelSize, pixelSize, depth, 0, 0, -1, r, g, b); // Back
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.5,
      metalness: 0.1,
      flatShading: true,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.y = Math.PI / 2;

    // Add Thin Wireframe Outline
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 }),
    );
    mesh.add(line);

    return mesh;
  }

  public updateItem(id: number) {
    if (this.currentId === id) return;
    this.currentId = id;

    // Cleanup old
    if (this.currentMesh) {
      this.handGroup.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        (this.currentMesh.material as THREE.Material).dispose();
      }
      this.currentMesh = null;
    }

    if (this.needleMesh) {
      // needleMesh is child of currentMesh usually, but let's be safe
      this.needleMesh.geometry.dispose();
      (this.needleMesh.material as THREE.Material).dispose();
      this.needleMesh = null;
    }

    if (id === 0) return; // Air

    const toolDef = this.getToolDef(id);

    // Check if Tool
    if (toolDef) {
      this.currentMesh = this.createToolMesh(toolDef);
      // Tool Orientation
      this.currentMesh.rotation.y = Math.PI / 2; // Point OUTWARD
      this.currentMesh.rotation.x = 0;

      // Axe Rotation Logic removed (standardized)

      this.currentMesh.scale.set(1.5, 1.5, 1.5);
      this.currentMesh.position.set(0, 0.2, 0);

      // Add Spinning Needle for Broken Compass
      if (id === BLOCK.BROKEN_COMPASS) {
        const needleGeo = new THREE.BoxGeometry(0.1, 0.4, 0.05); // Thin red needle
        const needleMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.needleMesh = new THREE.Mesh(needleGeo, needleMat);

        // Position slightly in front of the tool face
        // Tool pattern is centered. Tool mesh local Z+ is "Front".
        // Depth is 0.04 (pixelSize). Half depth is 0.02.
        // Place needle at z = -0.1 to be visible outside (facing player)
        this.needleMesh.position.set(0, 0, -0.1);
        this.currentMesh.add(this.needleMesh);
      }
    } else {
      // Block
      const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);

      // UV Logic
      // Atlas: 12 Columns
      const uvStep = 1.0 / 12.0;
      const uvInset = 0.001;

      const getRange = (idx: number) => {
        return {
          min: idx * uvStep + uvInset,
          max: (idx + 1) * uvStep - uvInset,
        };
      };

      const uvAttr = geo.attributes.uv;

      // Faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back
      for (let face = 0; face < 6; face++) {
        let texIdx = 0; // Default Noise
        // 0: Noise, 1: Leaves, 2: Planks, 3: CT Top, 4: CT Side, 5: CT Bottom
        // 6: Coal Ore, 7: Iron Ore, 8: Furnace Front, 9: Furnace Side, 10: Furnace Top

        if (id === BLOCK.LEAVES) texIdx = 1;
        else if (id === BLOCK.PLANKS) texIdx = 2;
        else if (id === BLOCK.CRAFTING_TABLE) {
          if (face === 2)
            texIdx = 3; // Top
          else if (face === 3)
            texIdx = 5; // Bottom
          else texIdx = 4; // Side
        } else if (id === BLOCK.COAL_ORE) {
          texIdx = 6;
        } else if (id === BLOCK.IRON_ORE) {
          texIdx = 7;
        } else if (id === BLOCK.FURNACE) {
          if (face === 2)
            texIdx = 10; // Top
          else if (face === 3)
            texIdx = 5; // Bottom (Reuse CT bottom or Side) -> Let's reuse Side (9) or just make it dark. Side is fine.
          else if (face === 0)
            texIdx = 8; // Right (When held, orientation matters. BoxGeometry default: +x is Right. +z is Front.)
          // Wait, BoxGeometry faces: 0:Right(+x), 1:Left(-x), 2:Top(+y), 3:Bottom(-y), 4:Front(+z), 5:Back(-z).
          // If we rotate mesh by PI/4 (45 deg), Front face is towards camera?
          // Let's just map Front (4) to Furnace Front.
          else if (face === 4) texIdx = 8;
          else texIdx = 9; // Side
        }

        const { min, max } = getRange(texIdx);
        const offset = face * 4;
        for (let i = 0; i < 4; i++) {
          const u = uvAttr.getX(offset + i);
          uvAttr.setX(offset + i, min + u * (max - min));
        }
      }
      uvAttr.needsUpdate = true;

      // Colors
      let r = 1,
        g = 1,
        b = 1;
      if (id === BLOCK.STONE) {
        r = 0.5;
        g = 0.5;
        b = 0.5;
      } else if (id === BLOCK.BEDROCK) {
        r = 0.05;
        g = 0.05;
        b = 0.05;
      } else if (id === BLOCK.DIRT) {
        r = 0.54;
        g = 0.27;
        b = 0.07;
      } else if (id === BLOCK.GRASS) {
        r = 0.33;
        g = 0.6;
        b = 0.33;
      } else if (id === BLOCK.WOOD) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } else if (id === BLOCK.LEAVES) {
        r = 0.13;
        g = 0.55;
        b = 0.13;
      } else if (id === BLOCK.PLANKS) {
        r = 0.76;
        g = 0.6;
        b = 0.42;
      } else if (id === BLOCK.STICK) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } else if (
        id === BLOCK.COAL_ORE ||
        id === BLOCK.IRON_ORE ||
        id === BLOCK.FURNACE
      ) {
        r = 1.0;
        g = 1.0;
        b = 1.0; // Texture has colors
      }
      // Crafting Table uses white (texture colors)

      const colors: number[] = [];
      const grassTop = { r: 0.33, g: 0.6, b: 0.33 };
      const grassSide = { r: 0.54, g: 0.27, b: 0.07 };

      for (let i = 0; i < 24; i++) {
        const faceIndex = Math.floor(i / 4); // 0..5
        // BoxGeometry Faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back

        if (id === BLOCK.GRASS) {
          if (faceIndex === 2) {
            // Top
            colors.push(grassTop.r, grassTop.g, grassTop.b);
          } else {
            // Sides/Bottom
            colors.push(grassSide.r, grassSide.g, grassSide.b);
          }
        } else {
          // Other blocks use uniform color
          colors.push(r, g, b);
        }
      }
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

      const mat = new THREE.MeshStandardMaterial({
        map: this.blockTexture,
        vertexColors: true,
        roughness: 0.8,
        alphaTest: 0.5,
        transparent: true,
      });

      this.currentMesh = new THREE.Mesh(geo, mat);
      // Block Orientation
      this.currentMesh.rotation.y = Math.PI / 4;
      this.currentMesh.position.set(0, 0, 0); // Centered
    }

    this.handGroup.add(this.currentMesh);
  }

  public punch() {
    this.isMining = true;
    if (!this.isSwinging) {
      this.isSwinging = true;
      this.swingTime = 0;
    }
  }

  public stopPunch() {
    this.isMining = false;
  }

  public setEating(eating: boolean) {
      this.isEating = eating;
  }

  public update(delta: number, isMoving: boolean) {
    // Spin Needle
    if (this.needleMesh) {
      this.needleMesh.rotation.z += delta * 20 + Math.random() * 5;
    }

    // Bobbing
    if (isMoving) {
      this.bobTime += delta * 10;
      this.handGroup.position.x =
        this.BASE_POS.x + Math.sin(this.bobTime) * 0.05;
      this.handGroup.position.y =
        this.BASE_POS.y + Math.abs(Math.cos(this.bobTime)) * 0.05;
    } else if (this.isEating) {
        // Eating Bobbing
        this.bobTime += delta * 15;
        // Move hand up and down slightly, and tilt
        this.handGroup.position.x = this.BASE_POS.x + Math.sin(this.bobTime) * 0.02;
        this.handGroup.position.y = this.BASE_POS.y + Math.abs(Math.cos(this.bobTime)) * 0.05 + 0.1; // Higher
        this.handGroup.position.z = this.BASE_POS.z + 0.2; // Closer
        
        this.handGroup.rotation.x = -0.2 + Math.sin(this.bobTime * 2) * 0.1;
        this.handGroup.rotation.y = -0.2;
        this.handGroup.rotation.z = 0.2;
    } else {
      // Return to rest
      this.handGroup.position.x +=
        (this.BASE_POS.x - this.handGroup.position.x) * 10 * delta;
      this.handGroup.position.y +=
        (this.BASE_POS.y - this.handGroup.position.y) * 10 * delta;
      
      // Reset rotation if not swinging
      if (!this.isSwinging) {
          this.handGroup.rotation.x += (0 - this.handGroup.rotation.x) * 10 * delta;
          this.handGroup.rotation.y += (0 - this.handGroup.rotation.y) * 10 * delta;
          this.handGroup.rotation.z += (0 - this.handGroup.rotation.z) * 10 * delta;
          this.handGroup.position.z += (this.BASE_POS.z - this.handGroup.position.z) * 10 * delta;
      }
    }

    // Swing Animation
    if (this.isSwinging && !this.isEating) {
      this.swingTime += delta;
      const progress = Math.min(this.swingTime / this.SWING_DURATION, 1.0);

      // Swing Logic: Rotate down and in
      // Sine wave 0 -> 1 -> 0
      const swing = Math.sin(progress * Math.PI);

      this.handGroup.rotation.x = -swing * 0.5;
      this.handGroup.rotation.z = swing * 0.5; // Tilt inward
      this.handGroup.position.z = this.BASE_POS.z - swing * 0.5; // Push forward

      if (progress >= 1.0) {
        if (this.isMining && !this.isSword(this.currentId)) {
          // Loop if mining and not sword
          this.swingTime = 0;
        } else {
          this.isSwinging = false;
          // Reset handled in else block above
        }
      }
    }
  }
}
