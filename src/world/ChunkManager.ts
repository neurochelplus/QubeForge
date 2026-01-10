import * as THREE from "three";
import { BLOCK } from "../constants/Blocks";
import { TerrainGenerator } from "./TerrainGenerator";
import { StructureGenerator } from "./StructureGenerator";
import { ChunkMeshBuilder } from "./ChunkMeshBuilder";
import { ChunkPersistence } from "./ChunkPersistence";

type Chunk = {
  mesh: THREE.Mesh;
};

export class ChunkManager {
  private scene: THREE.Scene;
  private chunkSize: number = 32;
  private chunkHeight: number = 128;

  private chunks: Map<string, Chunk> = new Map();
  private chunksData: Map<string, Uint8Array> = new Map();
  private dirtyChunks: Set<string> = new Set();

  private terrainGen: TerrainGenerator;
  private structureGen: StructureGenerator;
  private meshBuilder: ChunkMeshBuilder;
  private persistence: ChunkPersistence;

  constructor(scene: THREE.Scene, seed?: number) {
    this.scene = scene;
    this.terrainGen = new TerrainGenerator(seed);
    this.structureGen = new StructureGenerator(this.terrainGen);
    this.meshBuilder = new ChunkMeshBuilder();
    this.persistence = new ChunkPersistence();
  }

  public async init(): Promise<void> {
    await this.persistence.init();
  }

  public getSeed(): number {
    return this.terrainGen.getSeed();
  }

  public setSeed(seed: number) {
    this.terrainGen.setSeed(seed);
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.meshBuilder.getNoiseTexture();
  }

  public update(playerPos: THREE.Vector3) {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    const radius = isMobile ? 2 : 3;

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    const activeChunks = new Set<string>();

    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let z = cz - radius; z <= cz + radius; z++) {
        const key = `${x},${z}`;
        activeChunks.add(key);

        if (!this.chunks.has(key)) {
          this.ensureChunk(x, z, key);
        }
      }
    }

    // Unload far chunks
    for (const [key, chunk] of this.chunks) {
      if (!activeChunks.has(key)) {
        this.scene.remove(chunk.mesh);
        chunk.mesh.geometry.dispose();
        (chunk.mesh.material as THREE.Material).dispose();
        this.chunks.delete(key);
      }
    }

    // Memory cleanup
    if (Math.random() < (isMobile ? 0.05 : 0.01)) {
      this.checkMemory(playerPos);
    }
  }

  private checkMemory(playerPos: THREE.Vector3) {
    if (this.chunksData.size <= 500) return;

    const cx = Math.floor(playerPos.x / this.chunkSize);
    const cz = Math.floor(playerPos.z / this.chunkSize);

    const entries = Array.from(this.chunksData.entries());
    entries.sort((a, b) => {
      const [ax, az] = a[0].split(",").map(Number);
      const [bx, bz] = b[0].split(",").map(Number);
      const distA = (ax - cx) ** 2 + (az - cz) ** 2;
      const distB = (bx - cx) ** 2 + (bz - cz) ** 2;
      return distB - distA;
    });

    for (let i = 0; i < 50 && i < entries.length; i++) {
      const [key, data] = entries[i];

      if (this.dirtyChunks.has(key)) {
        this.persistence.saveChunk(key, data);
        this.dirtyChunks.delete(key);
      }

      this.chunksData.delete(key);

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

  private async ensureChunk(cx: number, cz: number, key: string) {
    if (this.chunksData.has(key)) {
      this.buildChunkMesh(cx, cz, this.chunksData.get(key)!);
      return;
    }

    if (this.persistence.hasChunk(key)) {
      if (this.persistence.isLoading(key)) return;

      const data = await this.persistence.loadChunk(key);
      if (data) {
        this.chunksData.set(key, data);
        this.buildChunkMesh(cx, cz, data);
      } else {
        this.generateChunk(cx, cz);
      }
      return;
    }

    this.generateChunk(cx, cz);
  }

  private generateChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    const data = new Uint8Array(this.chunkSize * this.chunkSize * this.chunkHeight);
    const startX = cx * this.chunkSize;
    const startZ = cz * this.chunkSize;

    // Generate terrain
    this.terrainGen.generateTerrain(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      this.getBlockIndex.bind(this),
    );

    // Generate ores
    this.structureGen.generateOres(
      data,
      this.chunkSize,
      this.chunkHeight,
      startX,
      startZ,
      this.getBlockIndex.bind(this),
    );

    // Generate trees
    this.structureGen.generateTrees(
      data,
      this.chunkSize,
      this.chunkHeight,
      this.getBlockIndex.bind(this),
    );

    this.chunksData.set(key, data);
    this.dirtyChunks.add(key);
    this.buildChunkMesh(cx, cz, data);
  }

  private buildChunkMesh(cx: number, cz: number, data: Uint8Array) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return;

    const mesh = this.meshBuilder.buildMesh(
      data,
      cx,
      cz,
      this.chunkSize,
      this.chunkHeight,
      this.getBlockIndex.bind(this),
      this.getNeighborBlock.bind(this),
    );

    this.scene.add(mesh);
    this.chunks.set(key, { mesh });
  }

  private getBlockIndex(x: number, y: number, z: number): number {
    return x + y * this.chunkSize + z * this.chunkSize * this.chunkHeight;
  }

  private getNeighborBlock(worldX: number, worldY: number, worldZ: number): number {
    if (worldY < 0 || worldY >= this.chunkHeight) return BLOCK.AIR;

    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return BLOCK.AIR;

    const localX = worldX - cx * this.chunkSize;
    const localZ = worldZ - cz * this.chunkSize;

    const index = this.getBlockIndex(localX, worldY, localZ);
    return data[index];
  }

  public getBlock(x: number, y: number, z: number): number {
    return this.getNeighborBlock(x, y, z);
  }

  public setBlock(x: number, y: number, z: number, type: number) {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;

    const data = this.chunksData.get(key);
    if (!data) return;

    const localX = x - cx * this.chunkSize;
    const localZ = z - cz * this.chunkSize;

    if (y < 0 || y >= this.chunkHeight) return;

    const index = this.getBlockIndex(localX, y, localZ);
    data[index] = type;
    this.dirtyChunks.add(key);

    // Rebuild meshes
    this.rebuildChunkMesh(cx, cz);

    // Rebuild neighbors if on border
    if (localX === 0) this.rebuildChunkMesh(cx - 1, cz);
    if (localX === this.chunkSize - 1) this.rebuildChunkMesh(cx + 1, cz);
    if (localZ === 0) this.rebuildChunkMesh(cx, cz - 1);
    if (localZ === this.chunkSize - 1) this.rebuildChunkMesh(cx, cz + 1);
  }

  private rebuildChunkMesh(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    const chunk = this.chunks.get(key);
    if (chunk) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
      this.chunks.delete(key);
    }

    const data = this.chunksData.get(key);
    if (data) {
      this.buildChunkMesh(cx, cz, data);
    }
  }

  public hasBlock(x: number, y: number, z: number): boolean {
    return this.getBlock(x, y, z) !== BLOCK.AIR;
  }

  public isChunkLoaded(x: number, z: number): boolean {
    const cx = Math.floor(x / this.chunkSize);
    const cz = Math.floor(z / this.chunkSize);
    const key = `${cx},${cz}`;
    return this.chunksData.has(key);
  }

  public getTopY(worldX: number, worldZ: number): number {
    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;
    const data = this.chunksData.get(key);

    if (!data) return this.terrainGen.getTerrainHeight(worldX, worldZ);

    const localX = worldX - cx * this.chunkSize;
    const localZ = worldZ - cz * this.chunkSize;

    for (let y = this.chunkHeight - 1; y >= 0; y--) {
      const index = this.getBlockIndex(localX, y, localZ);
      if (data[index] !== BLOCK.AIR) {
        return y;
      }
    }
    return 0;
  }

  public async loadChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    await this.ensureChunk(cx, cz, key);
  }

  public async waitForChunk(cx: number, cz: number): Promise<void> {
    const key = `${cx},${cz}`;
    if (this.chunksData.has(key)) return;

    return new Promise((resolve) => {
      const check = () => {
        if (this.chunksData.has(key)) {
          resolve();
        } else {
          this.ensureChunk(cx, cz, key);
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  public async saveDirtyChunks(): Promise<void> {
    const toSave = new Map<string, Uint8Array>();
    for (const key of this.dirtyChunks) {
      const data = this.chunksData.get(key);
      if (data) {
        toSave.set(key, data);
      }
    }

    await this.persistence.saveBatch(toSave);
    this.dirtyChunks.clear();
  }

  public async clear() {
    await this.persistence.clear();

    this.chunksData.clear();
    this.dirtyChunks.clear();

    for (const [, chunk] of this.chunks) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
    }
    this.chunks.clear();

    this.terrainGen.setSeed(Math.floor(Math.random() * 2147483647));
  }
}
