import * as THREE from "three";
import { ChunkCulling } from "./ChunkCulling";
import type { ChunkMesh } from "./ChunkMeshManager";

/**
 * Управление видимостью чанков (frustum culling)
 */
export class ChunkVisibility {
  private culling: ChunkCulling;
  private chunkSize: number;
  private chunkHeight: number;

  private lastCameraRotation: THREE.Euler = new THREE.Euler();
  private lastCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private visibilityUpdateThreshold: number = 0.05; // ~3 градуса
  private positionUpdateThreshold: number = 2; // блоков
  private isFirstVisibilityUpdate: boolean = true;

  constructor(chunkSize: number, chunkHeight: number) {
    this.culling = new ChunkCulling();
    this.chunkSize = chunkSize;
    this.chunkHeight = chunkHeight;
  }

  /**
   * Обновить видимость чанков (Sodium-style frustum culling)
   */
  public update(camera: THREE.Camera, chunks: Map<string, ChunkMesh>): void {
    // Проверить, изменилась ли ротация или позиция камеры
    const currentRotation = camera.rotation;
    const currentPosition = camera.position;

    const rotationChanged =
      Math.abs(currentRotation.x - this.lastCameraRotation.x) >
        this.visibilityUpdateThreshold ||
      Math.abs(currentRotation.y - this.lastCameraRotation.y) >
        this.visibilityUpdateThreshold;

    const positionChanged =
      this.lastCameraPosition.distanceTo(currentPosition) >
      this.positionUpdateThreshold;

    if (!this.isFirstVisibilityUpdate && !rotationChanged && !positionChanged) {
      return; // Пропустить обновление
    }

    this.isFirstVisibilityUpdate = false;

    // Обновить frustum
    this.culling.updateFrustum(camera);

    // Обновить видимость всех чанков
    for (const [, chunk] of chunks) {
      const visible = this.culling.isChunkVisible(
        chunk.cx,
        chunk.cz,
        this.chunkSize,
        this.chunkHeight,
      );
      chunk.mesh.visible = visible;
    }

    // Сохранить текущее состояние
    this.lastCameraRotation.copy(currentRotation);
    this.lastCameraPosition.copy(currentPosition);
  }

  /**
   * Очистить кэш bounds для чанка
   */
  public clearBounds(key: string): void {
    this.culling.clearBounds(key);
  }

  /**
   * Очистить весь кэш
   */
  public clearAll(): void {
    this.culling.clearAll();
  }
}
