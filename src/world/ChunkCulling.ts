import * as THREE from "three";

/**
 * Система culling для чанков (аналог Sodium)
 * Скрывает чанки вне поля зрения камеры
 */
export class ChunkCulling {
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private chunkBounds: Map<string, THREE.Box3> = new Map();

  /**
   * Обновить frustum из камеры
   */
  public updateFrustum(camera: THREE.Camera): void {
    camera.updateMatrixWorld();
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }

  /**
   * Проверить видимость чанка
   */
  public isChunkVisible(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    chunkHeight: number,
  ): boolean {
    const key = `${chunkX},${chunkZ}`;

    // Получить или создать AABB для чанка
    let box = this.chunkBounds.get(key);
    if (!box) {
      const worldX = chunkX * chunkSize;
      const worldZ = chunkZ * chunkSize;

      box = new THREE.Box3(
        new THREE.Vector3(worldX, 0, worldZ),
        new THREE.Vector3(worldX + chunkSize, chunkHeight, worldZ + chunkSize),
      );
      this.chunkBounds.set(key, box);
    }

    return this.frustum.intersectsBox(box);
  }

  /**
   * Очистить кэш bounds для выгруженных чанков
   */
  public clearBounds(key: string): void {
    this.chunkBounds.delete(key);
  }

  /**
   * Очистить весь кэш
   */
  public clearAll(): void {
    this.chunkBounds.clear();
  }
}
