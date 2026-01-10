import * as THREE from "three";
import { ChunkMeshBuilder } from "./ChunkMeshBuilder";

export type ChunkMesh = {
  mesh: THREE.Mesh;
  cx: number;
  cz: number;
};

/**
 * Управление мешами чанков (построение, перестроение, выгрузка)
 */
export class ChunkMeshManager {
  private scene: THREE.Scene;
  private chunkSize: number;
  private chunkHeight: number;
  private meshBuilder: ChunkMeshBuilder;
  
  private chunks: Map<string, ChunkMesh> = new Map();

  constructor(scene: THREE.Scene, chunkSize: number, chunkHeight: number) {
    this.scene = scene;
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
    this.meshBuilder = new ChunkMeshBuilder();
  }

  /**
   * Построить меш для чанка
   */
  public buildMesh(
    cx: number,
    cz: number,
    data: Uint8Array,
    getBlockIndex: (x: number, y: number, z: number) => number,
    getNeighborBlock: (x: number, y: number, z: number) => number,
  ): void {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return;

    const mesh = this.meshBuilder.buildMesh(
      data,
      cx,
      cz,
      this.chunkSize,
      this.chunkHeight,
      getBlockIndex,
      getNeighborBlock,
    );

    this.scene.add(mesh);
    this.chunks.set(key, { mesh, cx, cz });
  }

  /**
   * Перестроить меш чанка
   */
  public rebuildMesh(
    cx: number,
    cz: number,
    data: Uint8Array | undefined,
    getBlockIndex: (x: number, y: number, z: number) => number,
    getNeighborBlock: (x: number, y: number, z: number) => number,
  ): void {
    const key = `${cx},${cz}`;
    const chunk = this.chunks.get(key);
    
    if (chunk) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
      this.chunks.delete(key);
    }

    if (data) {
      this.buildMesh(cx, cz, data, getBlockIndex, getNeighborBlock);
    }
  }

  /**
   * Выгрузить меш чанка
   */
  public unloadMesh(key: string): void {
    const chunk = this.chunks.get(key);
    if (chunk) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
      this.chunks.delete(key);
    }
  }

  /**
   * Обновить сортировку мешей для early-z optimization
   */
  public updateSorting(playerPos: THREE.Vector3): void {
    const playerCx = Math.floor(playerPos.x / this.chunkSize);
    const playerCz = Math.floor(playerPos.z / this.chunkSize);

    for (const [, chunk] of this.chunks) {
      const dx = chunk.cx - playerCx;
      const dz = chunk.cz - playerCz;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Ближние чанки рендерятся первыми (меньший renderOrder)
      chunk.mesh.renderOrder = Math.floor(distance);
    }
  }

  /**
   * Получить все меши
   */
  public getAllMeshes(): Map<string, ChunkMesh> {
    return this.chunks;
  }

  /**
   * Получить noise текстуру
   */
  public getNoiseTexture(): THREE.DataTexture {
    return this.meshBuilder.getNoiseTexture();
  }

  /**
   * Очистить все меши
   */
  public clear(): void {
    for (const [, chunk] of this.chunks) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      (chunk.mesh.material as THREE.Material).dispose();
    }
    this.chunks.clear();
  }
}
