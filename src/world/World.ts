import * as THREE from "three";
import { createNoise2D } from "simplex-noise";
import { worldDB } from "../utils/DB";
import { BLOCK_DEFS, hexToRgb } from "../constants/BlockTextures";

// Block IDs
export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  BEDROCK: 4,
  WOOD: 5,
  LEAVES: 6,
  PLANKS: 7,
  STICK: 8,
  CRAFTING_TABLE: 9,
  WOODEN_SWORD: 20,
  STONE_SWORD: 21,
  WOODEN_PICKAXE: 22,
  STONE_PICKAXE: 23,
  WOODEN_AXE: 24,
  STONE_AXE: 25,
  WOODEN_SHOVEL: 26,
  STONE_SHOVEL: 27,
  BROKEN_COMPASS: 30,
};

type Chunk = {
  mesh: THREE.Mesh;
  // Visual mesh only, data is stored in chunksData
};

export class World {
  private scene: THREE.Scene;
  private chunkSize: number = 32;
  private chunkHeight: number = 128;

  // Visuals
  private chunks: Map<string, Chunk> = new Map();

  // Data Store
  private chunksData: Map<string, Uint8Array> = new Map();
  private dirtyChunks: Set<string> = new Set();
  private knownChunkKeys: Set<string> = new Set(); // Keys that exist in DB
  private loadingChunks: Set<string> = new Set(); // Keys currently being fetched from DB

  private seed: number;
  private noise2D: (x: number, y: number) => number;
  public noiseTexture: THREE.DataTexture;

  // Terrain Settings
  private TERRAIN_SCALE = 50;
  private TERRAIN_HEIGHT = 8;
  private OFFSET = 4;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.seed = Math.floor(Math.random() * 2147483647);
    this.noise2D = this.createNoiseGenerator();
    this.noiseTexture = this.createNoiseTexture();
  }

  private createNoiseGenerator() {
    // Mulberry32 PRNG
    let a = this.seed;
    const random = () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return createNoise2D(random);
  }

  // --- Persistence Methods ---

  public async loadWorld(): Promise<{
    playerPosition?: THREE.Vector3;
    inventory?: any;
  }> {
    await worldDB.init();

    // Load meta
    const meta = await worldDB.get("player", "meta");

    // Load all chunk keys so we know what to fetch vs generate
    const keys = await worldDB.keys("chunks");
    keys.forEach((k) => this.knownChunkKeys.add(k as string));

    if (meta && meta.seed !== undefined) {
      this.seed = meta.seed;
      console.log(`Loaded seed: ${this.seed}`);
      this.noise2D = this.createNoiseGenerator();
    } else {
      console.log(`No seed found, using current: ${this.seed}`);
    }

    console.log(
      `Loaded world index. ${this.knownChunkKeys.size} chunks in DB.`,
    );

    return meta
      ? {
          playerPosition: new THREE.Vector3(
            meta.position.x,
            meta.position.y,
            meta.position.z,
          ),
          inventory: meta.inventory,
        }
      : {};
  }

  public async saveWorld(playerData: {
    position: THREE.Vector3;
    inventory: any;
  }) {
    console.log("Saving world...");

    // Save Meta
    await worldDB.set(
      "player",
      {
        position: {
          x: playerData.position.x,
          y: playerData.position.y,
          z: playerData.position.z,
        },
        inventory: playerData.inventory,
        seed: this.seed,
      },
      "meta",
    );

    // Save Dirty Chunks
    const promises: Promise<void>[] = [];
    for (const key of this.dirtyChunks) {
      const data = this.chunksData.get(key);
      if (data) {
        promises.push(worldDB.set(key, data, "chunks"));
        this.knownChunkKeys.add(key);
      }
    }

    await Promise.all(promises);
    this.dirtyChunks.clear();
    console.log("World saved.");
  }

  public async deleteWorld() {
    console.log("Deleting world...");
    await worldDB.init();
    await worldDB.clear();

    this.chunksData.clear();
    this.dirtyChunks.clear();
    this.knownChunkKeys.clear();
    this.loadingChunks.clear();

    // Remove all meshes
    for (const [key, chunk] of this.chunks) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
    }
    this.chunks.clear();

    // Reset seed
    this.seed = Math.floor(Math.random() * 2147483647);
    this.noise2D = this.createNoiseGenerator();

    console.log("World deleted.");
  }

  private checkMemory(playerPos: THREE.Vector3) {
    if (this.chunksData.size <= 500) return;

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    // Find furthest chunks
    const entries = Array.from(this.chunksData.entries());
    entries.sort((a, b) => {
      const [ak] = a;
      const [bk] = b;
      const [ax, az] = ak.split(",").map(Number);
      const [bx, bz] = bk.split(",").map(Number);

      const distA = (ax - cx) ** 2 + (az - cz) ** 2;
      const distB = (bx - cx) ** 2 + (bz - cz) ** 2;

      return distB - distA; // Descending distance
    });

    // Remove 50 furthest chunks
    for (let i = 0; i < 50; i++) {
      if (i >= entries.length) break;
      const [key, data] = entries[i];

      // Ensure saved if dirty
      if (this.dirtyChunks.has(key)) {
        worldDB.set(key, data, "chunks").then(() => {
          this.knownChunkKeys.add(key);
        });
        this.dirtyChunks.delete(key);
      }

      this.chunksData.delete(key);

      // Also remove mesh if exists
      const chunk = this.chunks.get(key);
      if (chunk) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        (chunk.mesh.material as THREE.Material).dispose();
        this.chunks.delete(key);
      }
    }
    console.log("Memory cleanup performed.");
  }

  // --- Core Logic ---

  private createNoiseTexture(): THREE.DataTexture {
    const width = 96; // 16 * 6 (Noise, Leaves, Planks, CT_Top, CT_Side, CT_Bottom)
    const height = 16;
    const data = new Uint8Array(width * height * 4); // RGBA

    for (let i = 0; i < width * height; i++) {
      const stride = i * 4;
      const x = i % width;
      const y = Math.floor(i / width);

      const v = Math.floor(Math.random() * (255 - 150) + 150); // 150-255
      data[stride] = v; // R
      data[stride + 1] = v; // G
      data[stride + 2] = v; // B
      data[stride + 3] = 255; // Default Alpha

      // Alpha/Texture logic
      if (x >= 16 && x < 32) {
        // Leaves (Middle 16)
        if (Math.random() < 0.4) {
          data[stride + 3] = 0;
        }
      } else if (x >= 32 && x < 48) {
        // Planks (Right 16)
        const woodGrain = 230 + Math.random() * 20;
        data[stride] = woodGrain;
        data[stride + 1] = woodGrain;
        data[stride + 2] = woodGrain;

        if (y % 4 === 0) {
          data[stride] = 100;
          data[stride + 1] = 100;
          data[stride + 2] = 100;
        }
      } else if (x >= 48) {
        // Crafting Table Slots (48-64: Top, 64-80: Side, 80-96: Bottom)
        const localX = x % 16;

        let def = null;

        if (x >= 48 && x < 64) def = BLOCK_DEFS.CRAFTING_TABLE_TOP;
        else if (x >= 64 && x < 80) def = BLOCK_DEFS.CRAFTING_TABLE_SIDE;
        else {
          // Bottom - Looks like Planks but darker
          const woodGrain = 150 + Math.random() * 20;
          data[stride] = woodGrain;
          data[stride + 1] = woodGrain;
          data[stride + 2] = woodGrain;
          if (y % 4 === 0) {
            data[stride] = 80;
            data[stride + 1] = 80;
            data[stride + 2] = 80;
          }
          continue;
        }

        // Apply pattern from Def
        if (def && def.pattern && def.colors) {
          const char = def.pattern[y][localX];

          // 1: Primary, 2: Secondary
          let colorHex = def.colors.primary;
          if (char === "2") colorHex = def.colors.secondary;

          const rgb = hexToRgb(colorHex);

          data[stride] = rgb.r;
          data[stride + 1] = rgb.g;
          data[stride + 2] = rgb.b;
        }
      }
    }

    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat,
    );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    return texture;
  }

  public update(playerPos: THREE.Vector3) {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const radius = isMobile ? 2 : 3; // 5x5 vs 7x7

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    const activeChunks = new Set<string>();

    // Generate grid
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let z = cz - radius; z <= cz + radius; z++) {
        const key = `${x},${z}`;
        activeChunks.add(key);

        if (!this.chunks.has(key)) {
          this.ensureChunk(x, z, key);
        }
      }
    }

    // Unload far visuals
    for (const [key, chunk] of this.chunks) {
      if (!activeChunks.has(key)) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        (chunk.mesh.material as THREE.Material).dispose();
        this.chunks.delete(key);
      }
    }

    // Memory cleanup occasionally (more aggressive on mobile)
    if (Math.random() < (isMobile ? 0.05 : 0.01)) {
      this.checkMemory(playerPos);
    }
  }

  public async loadChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    await this.ensureChunk(cx, cz, key);
  }

  public getTopY(worldX: number, worldZ: number): number {
    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;
    const data = this.chunksData.get(key);

    if (!data) return this.getTerrainHeight(worldX, worldZ);

    const localX = worldX - cx * this.chunkSize;
    const localZ = worldZ - cz * this.chunkSize;

    // Scan down from top
    for (let y = this.chunkHeight - 1; y >= 0; y--) {
      const index = this.getBlockIndex(localX, y, localZ);
      if (data[index] !== BLOCK.AIR) {
        return y;
      }
    }
    return 0; // Fallback
  }

  private async ensureChunk(cx: number, cz: number, key: string) {
    // 1. Check RAM
    if (this.chunksData.has(key)) {
      this.buildChunkMesh(cx, cz, this.chunksData.get(key)!);
      return;
    }

    // 2. Check DB
    if (this.knownChunkKeys.has(key)) {
      if (this.loadingChunks.has(key)) return; // Already loading
      this.loadingChunks.add(key);

      worldDB
        .get(key, "chunks")
        .then((data: Uint8Array) => {
          if (data) {
            this.chunksData.set(key, data);
            this.buildChunkMesh(cx, cz, data);
          } else {
            // Fallback if key existed but data missing?
            this.generateChunk(cx, cz);
          }
        })
        .finally(() => {
          this.loadingChunks.delete(key);
        });
      return;
    }

    // 3. Generate New
    this.generateChunk(cx, cz);
  }

  public isChunkLoaded(x: number, z: number): boolean {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;
    return this.chunksData.has(key);
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return false;

    // Convert to local chunk coordinates
    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;
    const localY = y;

    if (localY < 0 || localY >= this.chunkHeight) return false;

    const index = this.getBlockIndex(localX, localY, localZ);
    return data[index] !== BLOCK.AIR;
  }

  public getBreakTime(blockType: number, toolId: number = 0): number {
    let baseTime = 1000;

    // Base times
    switch (blockType) {
      case BLOCK.LEAVES:
        baseTime = 500;
        break; // Faster leaves
      case BLOCK.DIRT:
      case BLOCK.GRASS:
        baseTime = 1000;
        break; // Shovel territory (not imp yet)
      case BLOCK.WOOD:
      case BLOCK.PLANKS:
        baseTime = 3000;
        break;
      case BLOCK.STONE:
        baseTime = 5000;
        break;
      case BLOCK.BEDROCK:
        return Infinity;
      default:
        baseTime = 1000;
        break;
    }

    // Tool Multipliers
    let multiplier = 1;

    // AXES (Wood, Planks)
    if (toolId === BLOCK.WOODEN_AXE || toolId === BLOCK.STONE_AXE) {
      if (
        blockType === BLOCK.WOOD ||
        blockType === BLOCK.PLANKS ||
        blockType === BLOCK.LEAVES
      ) {
        multiplier = toolId === BLOCK.STONE_AXE ? 4 : 2;
      }
    }

    // PICKAXES (Stone)
    if (toolId === BLOCK.WOODEN_PICKAXE || toolId === BLOCK.STONE_PICKAXE) {
      if (blockType === BLOCK.STONE) {
        multiplier = toolId === BLOCK.STONE_PICKAXE ? 4 : 2;
      }
    }

    // SHOVELS (Dirt, Grass)
    if (toolId === BLOCK.WOODEN_SHOVEL || toolId === BLOCK.STONE_SHOVEL) {
      if (blockType === BLOCK.DIRT || blockType === BLOCK.GRASS) {
        multiplier = toolId === BLOCK.STONE_SHOVEL ? 4 : 2;
      }
    }

    return baseTime / multiplier;
  }

  public getBlock(x: number, y: number, z: number): number {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return 0; // AIR

    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;
    const localY = y;

    if (localY < 0 || localY >= this.chunkHeight) return 0;

    const index = this.getBlockIndex(localX, localY, localZ);
    return data[index];
  }

  public setBlock(x: number, y: number, z: number, type: number) {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return;

    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;
    const localY = y;

    if (localY < 0 || localY >= this.chunkHeight) return;

    const index = this.getBlockIndex(localX, localY, localZ);
    data[index] = type;
    this.dirtyChunks.add(key); // Mark for save

    // Regenerate mesh for CURRENT chunk
    const updateChunkMesh = (k: string, cx: number, cz: number) => {
      const chunk = this.chunks.get(k);
      if (chunk) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        (chunk.mesh.material as THREE.Material).dispose();
      }
      const chunkData = this.chunksData.get(k);
      if (chunkData) {
        const newMesh = this.generateChunkMesh(chunkData, cx, cz);
        this.scene.add(newMesh);
        this.chunks.set(k, { mesh: newMesh });
      }
    };

    updateChunkMesh(key, cx, cz);

    // Regenerate Neighbors if on border
    if (localX === 0) updateChunkMesh(`${cx - 1},${cz}`, cx - 1, cz);
    if (localX === this.chunkSize - 1)
      updateChunkMesh(`${cx + 1},${cz}`, cx + 1, cz);
    if (localZ === 0) updateChunkMesh(`${cx},${cz - 1}`, cx, cz - 1);
    if (localZ === this.chunkSize - 1)
      updateChunkMesh(`${cx},${cz + 1}`, cx, cz + 1);
  }

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }

  private placeTree(
    data: Uint8Array,
    startX: number,
    startY: number,
    startZ: number,
  ) {
    const trunkHeight = Math.floor(Math.random() * 2) + 4; // 4-5 blocks

    // Trunk
    for (let y = 0; y < trunkHeight; y++) {
      const currentY = startY + y;
      if (currentY < this.chunkHeight) {
        const index = this.getBlockIndex(startX, currentY, startZ);
        data[index] = BLOCK.WOOD;
      }
    }

    // Leaves (Volumetric)
    const leavesStart = startY + trunkHeight - 2;
    const leavesEnd = startY + trunkHeight + 1; // 1 block above trunk top

    for (let y = leavesStart; y <= leavesEnd; y++) {
      const dy = y - (startY + trunkHeight - 1); // Distance from top of trunk
      let radius = 2;
      if (dy === 2)
        radius = 1; // Top tip
      else if (dy === -1) radius = 2; // Bottomest layer

      for (let x = startX - radius; x <= startX + radius; x++) {
        for (let z = startZ - radius; z <= startZ + radius; z++) {
          // Corner rounding
          const dx = x - startX;
          const dz = z - startZ;
          if (Math.abs(dx) === radius && Math.abs(dz) === radius) {
            // Skip corners randomly to make it less square
            if (Math.random() < 0.4) continue;
          }

          if (
            x >= 0 &&
            x < this.chunkSize &&
            y >= 0 &&
            y < this.chunkHeight &&
            z >= 0 &&
            z < this.chunkSize
          ) {
            const index = this.getBlockIndex(x, y, z);
            // Don't overwrite trunk
            if (data[index] !== BLOCK.WOOD) {
              data[index] = BLOCK.LEAVES;
            }
          }
        }
      }
    }
  }

  public getTerrainHeight(worldX: number, worldZ: number): number {
    const noiseValue = this.noise2D(
      worldX / this.TERRAIN_SCALE,
      worldZ / this.TERRAIN_SCALE,
    );
    // Must match generateChunk logic exactly
    let height = Math.floor(noiseValue * this.TERRAIN_HEIGHT) + 20;
    if (height < 1) height = 1;
    if (height >= this.chunkHeight) height = this.chunkHeight - 1;
    return height;
  }

  private generateChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    const data = new Uint8Array(
      this.chunkSize * this.chunkSize * this.chunkHeight,
    );
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    // 1. Generate Terrain
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        const worldX = startX + x;
        const worldZ = startZ + z;

        const noiseValue = this.noise2D(
          worldX / this.TERRAIN_SCALE,
          worldZ / this.TERRAIN_SCALE,
        );
        // Ensure OFFSET is at least 18-20 to allow 16+ layers of stone (since bedrock is y=0)
        let height = Math.floor(noiseValue * this.TERRAIN_HEIGHT) + 20;

        if (height < 1) height = 1;
        if (height >= this.chunkHeight) height = this.chunkHeight - 1;

        for (let y = 0; y <= height; y++) {
          let type = BLOCK.STONE;
          if (y === 0) type = BLOCK.BEDROCK;
          else if (y === height) type = BLOCK.GRASS;
          else if (y >= height - 3) type = BLOCK.DIRT;

          const index = this.getBlockIndex(x, y, z);
          data[index] = type;
        }
      }
    }

    // 2. Generate Trees (Second Pass)
    for (let x = 0; x < this.chunkSize; x++) {
      for (let z = 0; z < this.chunkSize; z++) {
        // Boundary check to prevent cut trees
        if (
          x < 2 ||
          x >= this.chunkSize - 2 ||
          z < 2 ||
          z >= this.chunkSize - 2
        )
          continue;

        // Find surface height
        let height = -1;
        for (let y = this.chunkHeight - 1; y >= 0; y--) {
          if (data[this.getBlockIndex(x, y, z)] !== BLOCK.AIR) {
            height = y;
            break;
          }
        }

        if (height > 0) {
          const index = this.getBlockIndex(x, height, z);
          if (data[index] === BLOCK.GRASS) {
            if (Math.random() < 0.01) {
              this.placeTree(data, x, height + 1, z);
            }
          }
        }
      }
    }

    // Save to Global Store
    this.chunksData.set(key, data);
    this.dirtyChunks.add(key); // New chunk = needs save

    // 3. Generate Mesh
    this.buildChunkMesh(cx, cz, data);
  }

  private buildChunkMesh(cx: number, cz: number, data: Uint8Array) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return; // Already has mesh

    const mesh = this.generateChunkMesh(data, cx, cz);
    this.scene.add(mesh);
    this.chunks.set(key, { mesh });
  }

  private generateChunkMesh(
    data: Uint8Array,
    cx: number,
    cz: number,
  ): THREE.Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];

    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    // Helper to add face
    const addFace = (
      x: number,
      y: number,
      z: number,
      type: number,
      side: string,
    ) => {
      // Local block coords
      const localX = x;
      const localY = y;
      const localZ = z;

      const x0 = localX;
      const x1 = localX + 1;
      const y0 = localY;
      const y1 = localY + 1;
      const z0 = localZ;
      const z1 = localZ + 1;

      // Color Logic
      let r = 0.5,
        g = 0.5,
        b = 0.5;
      if (type === BLOCK.STONE) {
        r = 0.5;
        g = 0.5;
        b = 0.5;
      } else if (type === BLOCK.BEDROCK) {
        r = 0.05;
        g = 0.05;
        b = 0.05;
      } // Very Dark
      else if (type === BLOCK.DIRT) {
        r = 0.54;
        g = 0.27;
        b = 0.07;
      } // Brown
      else if (type === BLOCK.GRASS) {
        if (side === "top") {
          r = 0.33;
          g = 0.6;
          b = 0.33;
        } // Green
        else {
          r = 0.54;
          g = 0.27;
          b = 0.07;
        } // Dirt side
      } else if (type === BLOCK.WOOD) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } // Dark Brown
      else if (type === BLOCK.LEAVES) {
        r = 0.13;
        g = 0.55;
        b = 0.13;
      } // Forest Green
      else if (type === BLOCK.PLANKS) {
        r = 0.76;
        g = 0.6;
        b = 0.42;
      } // Light Wood
      else if (type === BLOCK.CRAFTING_TABLE) {
        r = 1.0;
        g = 1.0;
        b = 1.0;
      } // Texture handles color
      else if (type === BLOCK.STICK) {
        r = 0.4;
        g = 0.2;
        b = 0.0;
      } // Stick
      else if (type >= 20) {
        r = 1;
        g = 0;
        b = 1;
      } // Error/Tool color (Magenta)

      // Append data based on side
      if (side === "top") {
        // y+
        positions.push(x0, y1, z1, x1, y1, z1, x0, y1, z0, x1, y1, z0);
        normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      } else if (side === "bottom") {
        // y-
        positions.push(x0, y0, z0, x1, y0, z0, x0, y0, z1, x1, y0, z1);
        normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
      } else if (side === "front") {
        // z+
        positions.push(x0, y0, z1, x1, y0, z1, x0, y1, z1, x1, y1, z1);
        normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
      } else if (side === "back") {
        // z-
        positions.push(x1, y0, z0, x0, y0, z0, x1, y1, z0, x0, y1, z0);
        normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
      } else if (side === "right") {
        // x+
        positions.push(x1, y0, z1, x1, y0, z0, x1, y1, z1, x1, y1, z0);
        normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
      } else if (side === "left") {
        // x-
        positions.push(x0, y0, z0, x0, y0, z1, x0, y1, z0, x0, y1, z1);
        normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
      }

      // UVs
      // Atlas (Total slots: 6, step 1/6 = 0.16666...)
      // 0: Noise
      // 1: Leaves
      // 2: Planks
      // 3: CT Top
      // 4: CT Side
      // 5: CT Bottom
      const uvStep = 1.0 / 6.0;
      const uvInset = 0.001;
      let u0 = 0 + uvInset;
      let u1 = uvStep - uvInset;

      if (type === BLOCK.LEAVES) {
        u0 = uvStep * 1 + uvInset;
        u1 = uvStep * 2 - uvInset;
      } else if (type === BLOCK.PLANKS) {
        u0 = uvStep * 2 + uvInset;
        u1 = uvStep * 3 - uvInset;
      } else if (type === BLOCK.CRAFTING_TABLE) {
        if (side === "top") {
          u0 = uvStep * 3 + uvInset;
          u1 = uvStep * 4 - uvInset;
        } else if (side === "bottom") {
          u0 = uvStep * 5 + uvInset;
          u1 = uvStep * 6 - uvInset;
        } else {
          // Side
          u0 = uvStep * 4 + uvInset;
          u1 = uvStep * 5 - uvInset;
        }
      }

      uvs.push(u0, 0, u1, 0, u0, 1, u1, 1);

      // Colors (4 vertices per face)
      for (let i = 0; i < 4; i++) colors.push(r, g, b);
    };

    // Helper to check transparency
    const isTransparent = (t: number) => {
      return t === BLOCK.AIR || t === BLOCK.LEAVES;
    };

    // Iterate
    for (let x = 0; x < this.chunkSize; x++) {
      for (let y = 0; y < this.chunkHeight; y++) {
        for (let z = 0; z < this.chunkSize; z++) {
          const index = this.getBlockIndex(x, y, z);
          const type = data[index];

          if (type === BLOCK.AIR) continue;

          // Check neighbors
          // We draw a face if the neighbor is transparent (Air or Leaves)
          // Exception: If both are leaves, do we draw?
          // Yes, for high quality foliage we usually do.
          // Or if neighbor is AIR.

          const checkNeighbor = (nx: number, ny: number, nz: number) => {
            // Calculate global coordinate
            const gx = startX + nx;
            const gz = startZ + nz;
            const gy = ny; // Y is 0..15 relative to chunk, but we only have 1 vertical chunk layer so Y is global too basically.
            // But wait, the loop uses y from 0..15. World.getHeight is different.
            // Actually, `y` passed here is local (0-15).

            // If Y is out of vertical bounds (0-15), assume transparent (sky/void)
            if (gy < 0 || gy >= this.chunkHeight) return true;

            // Determine which chunk this neighbor belongs to
            const ncx = Math.floor(gx / this.chunkSize);
            const ncz = Math.floor(gz / this.chunkSize);

            // If it's the current chunk (common case)
            if (ncx === cx && ncz === cz) {
              const index = this.getBlockIndex(nx, ny, nz);
              return isTransparent(data[index]);
            }

            // Neighbor is in another chunk
            const nKey = `${ncx},${ncz}`;
            const nData = this.chunksData.get(nKey);

            // If neighbor chunk is loaded, check its block
            if (nData) {
              // Calculate local coordinates in that chunk
              const locX = gx - ncx * this.chunkSize;
              const locZ = gz - ncz * this.chunkSize;
              const index = this.getBlockIndex(locX, gy, locZ);
              return isTransparent(nData[index]);
            }

            // If neighbor chunk is NOT loaded, we must draw the face to prevent "holes" into the void
            return true;
          };

          // Top
          if (checkNeighbor(x, y + 1, z)) addFace(x, y, z, type, "top");
          // Bottom
          if (checkNeighbor(x, y - 1, z)) addFace(x, y, z, type, "bottom");
          // Front (z+)
          if (checkNeighbor(x, y, z + 1)) addFace(x, y, z, type, "front");
          // Back (z-)
          if (checkNeighbor(x, y, z - 1)) addFace(x, y, z, type, "back");
          // Right (x+)
          if (checkNeighbor(x + 1, y, z)) addFace(x, y, z, type, "right");
          // Left (x-)
          if (checkNeighbor(x - 1, y, z)) addFace(x, y, z, type, "left");
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    const indices: number[] = [];

    // Convert quads (4 verts) to triangles (6 indices)
    const vertCount = positions.length / 3;
    for (let i = 0; i < vertCount; i += 4) {
      indices.push(i, i + 1, i + 2);
      indices.push(i + 2, i + 1, i + 3);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere(); // Important for culling

    const material = new THREE.MeshStandardMaterial({
      map: this.noiseTexture,
      vertexColors: true,
      roughness: 0.8,
      alphaTest: 0.5,
      transparent: true, // Allows partial transparency if we wanted, but alphaTest handles cutout
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(startX, 0, startZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }
}
