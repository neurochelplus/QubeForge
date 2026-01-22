import * as THREE from "three";
import { BLOCK } from "../../constants/Blocks";
import { TextureAtlas } from "../generation/TextureAtlas";
import { FurnaceManager } from "../../crafting/FurnaceManager";
import { BlockColors } from "../../constants/BlockColors";

export class ChunkMeshBuilder {
  private noiseTexture: THREE.DataTexture;

  // Shared material для всех чанков — создаётся один раз, используется везде
  private static sharedMaterial: THREE.MeshStandardMaterial | null = null;

  constructor() {
    this.noiseTexture = TextureAtlas.createNoiseTexture();
    // Инициализировать shared material при первом создании builder'а
    if (!ChunkMeshBuilder.sharedMaterial) {
      ChunkMeshBuilder.sharedMaterial = new THREE.MeshStandardMaterial({
        map: this.noiseTexture,
        vertexColors: true,
        roughness: 0.8,
        alphaTest: 0.5,
        transparent: true,
      });
    }
  }

  public getNoiseTexture(): THREE.DataTexture {
    return this.noiseTexture;
  }

  /**
   * Получить shared material (для использования в других местах, если нужно)
   */
  public static getSharedMaterial(): THREE.MeshStandardMaterial | null {
    return ChunkMeshBuilder.sharedMaterial;
  }

  public buildMesh(
    data: Uint8Array,
    cx: number,
    cz: number,
    chunkSize: number,
    chunkHeight: number,
    _getBlockIndex: (x: number, y: number, z: number) => number,
    getNeighborBlock: (x: number, y: number, z: number) => number,
  ): THREE.Mesh {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];

    const startX = cx * chunkSize;
    const startZ = cz * chunkSize;

    // Предвычислить границы Y с блоками (оптимизированный поиск)
    let minY = chunkHeight;
    let maxY = 0;

    // Быстрый поиск границ — проверяем только первый/последний блок в каждом слое
    for (let y = 0; y < chunkHeight; y++) {
      for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
          if (data[x + y * chunkSize + z * chunkSize * chunkHeight] !== BLOCK.AIR) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            break; // Нашли блок в этом слое, переходим к следующему x
          }
        }
        if (y >= minY && y <= maxY) break; // Уже нашли границы для этого y
      }
    }

    // Если чанк пустой
    if (minY > maxY) {
      return this.createMesh(positions, normals, uvs, colors, startX, startZ);
    }

    // Расширить границы на 1 для корректной проверки соседей
    minY = Math.max(0, minY - 1);
    maxY = Math.min(chunkHeight - 1, maxY + 1);

    for (let y = minY; y <= maxY; y++) {
      for (let x = 0; x < chunkSize; x++) {
        for (let z = 0; z < chunkSize; z++) {
          const index = x + y * chunkSize + z * chunkSize * chunkHeight;
          const type = data[index];

          if (type === BLOCK.AIR) continue;

          const worldX = startX + x;
          const worldZ = startZ + z;

          // Используем getNeighborBlock для всех проверок (безопасно, но медленнее)
          if (this.isTransparent(getNeighborBlock(worldX, y + 1, worldZ))) {
            this.addFace(positions, normals, uvs, colors, x, y, z, type, "top", startX, startZ);
          }
          if (this.isTransparent(getNeighborBlock(worldX, y - 1, worldZ))) {
            this.addFace(positions, normals, uvs, colors, x, y, z, type, "bottom", startX, startZ);
          }
          if (this.isTransparent(getNeighborBlock(worldX, y, worldZ + 1))) {
            this.addFace(positions, normals, uvs, colors, x, y, z, type, "front", startX, startZ);
          }
          if (this.isTransparent(getNeighborBlock(worldX, y, worldZ - 1))) {
            this.addFace(positions, normals, uvs, colors, x, y, z, type, "back", startX, startZ);
          }
          if (this.isTransparent(getNeighborBlock(worldX + 1, y, worldZ))) {
            this.addFace(positions, normals, uvs, colors, x, y, z, type, "right", startX, startZ);
          }
          if (this.isTransparent(getNeighborBlock(worldX - 1, y, worldZ))) {
            this.addFace(positions, normals, uvs, colors, x, y, z, type, "left", startX, startZ);
          }
        }
      }
    }

    return this.createMesh(positions, normals, uvs, colors, startX, startZ);
  }

  private isTransparent(blockType: number): boolean {
    return blockType === BLOCK.AIR || blockType === BLOCK.LEAVES;
  }

  private addFace(
    positions: number[],
    normals: number[],
    uvs: number[],
    colors: number[],
    x: number,
    y: number,
    z: number,
    type: number,
    side: string,
    startX: number,
    startZ: number,
  ) {
    const x0 = x;
    const x1 = x + 1;
    const y0 = y;
    const y1 = y + 1;
    const z0 = z;
    const z1 = z + 1;

    // Add vertices based on side
    if (side === "top") {
      positions.push(x0, y1, z1, x1, y1, z1, x0, y1, z0, x1, y1, z0);
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
    } else if (side === "bottom") {
      positions.push(x0, y0, z0, x1, y0, z0, x0, y0, z1, x1, y0, z1);
      normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
    } else if (side === "front") {
      positions.push(x0, y0, z1, x1, y0, z1, x0, y1, z1, x1, y1, z1);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
    } else if (side === "back") {
      positions.push(x1, y0, z0, x0, y0, z0, x1, y1, z0, x0, y1, z0);
      normals.push(0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1);
    } else if (side === "right") {
      positions.push(x1, y0, z1, x1, y0, z0, x1, y1, z1, x1, y1, z0);
      normals.push(1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0);
    } else if (side === "left") {
      positions.push(x0, y0, z0, x0, y0, z1, x0, y1, z0, x0, y1, z1);
      normals.push(-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0);
    }

    // Add UVs
    const { u0, u1 } = this.getUVCoords(type, side, startX + x, y, startZ + z);
    uvs.push(u0, 0, u1, 0, u0, 1, u1, 1);

    // Add colors
    const { r, g, b } = this.getBlockColor(type, side);
    for (let i = 0; i < 4; i++) {
      colors.push(r, g, b);
    }
  }

  private getUVCoords(
    type: number,
    side: string,
    worldX: number,
    worldY: number,
    worldZ: number,
  ): { u0: number; u1: number } {
    const uvStep = TextureAtlas.getUVStep();
    const uvInset = 0.001;
    let slot = 0;

    if (type === BLOCK.LEAVES) slot = 1;
    else if (type === BLOCK.PLANKS) slot = 2;
    else if (type === BLOCK.CRAFTING_TABLE) {
      if (side === "top") slot = 3;
      else if (side === "bottom") slot = 5;
      else slot = 4;
    } else if (type === BLOCK.COAL_ORE) slot = 6;
    else if (type === BLOCK.IRON_ORE) slot = 7;
    else if (type === BLOCK.FURNACE) {
      if (side === "top") slot = 10;
      else if (side === "bottom") slot = 9;
      else {
        const furnace = FurnaceManager.getInstance().getFurnace(worldX, worldY, worldZ);
        const rot = furnace?.rotation ?? 0;

        let frontFace = "front";
        if (rot === 0) frontFace = "back";
        else if (rot === 1) frontFace = "right";
        else if (rot === 2) frontFace = "front";
        else if (rot === 3) frontFace = "left";

        slot = side === frontFace ? 8 : 9;
      }
    }

    return {
      u0: uvStep * slot + uvInset,
      u1: uvStep * (slot + 1) - uvInset,
    };
  }

  private getBlockColor(type: number, side: string): { r: number; g: number; b: number } {
    return BlockColors.getColorForFace(type, side);
  }

  private createMesh(
    positions: number[],
    normals: number[],
    uvs: number[],
    colors: number[],
    startX: number,
    startZ: number,
  ): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    const indices: number[] = [];

    const vertCount = positions.length / 3;
    for (let i = 0; i < vertCount; i += 4) {
      indices.push(i, i + 1, i + 2);
      indices.push(i + 2, i + 1, i + 3);
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    // Используем shared material — НЕ создаём новый для каждого чанка!
    const material = ChunkMeshBuilder.sharedMaterial!;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(startX, 0, startZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }
}
