// src/modding/AssetManager.ts
// Загрузка и создание текстур для модов

import * as THREE from 'three';
import type { AssetManagerInterface } from './types';

/**
 * Менеджер ассетов для модов
 */
export class ModAssetManager implements AssetManagerInterface {
  private modId: string;
  private textureCache: Map<string, THREE.Texture> = new Map();

  constructor(modId: string) {
    this.modId = modId;
  }

  /**
   * Загрузить текстуру из URL или base64
   */
  async loadTexture(source: string): Promise<THREE.Texture> {
    const cacheKey = `${this.modId}:${source.substring(0, 50)}`;

    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }

    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();

      loader.load(
        source,
        (texture) => {
          // Пиксельный стиль по умолчанию
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;

          this.textureCache.set(cacheKey, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.error(`[${this.modId}] Failed to load texture:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Создать текстуру из canvas
   */
  createTextureFromCanvas(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    draw(ctx);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    return texture;
  }

  /**
   * Создать текстуру из пиксельного паттерна
   */
  createTextureFromPattern(
    pattern: string[],
    colorMap: Record<string, string>,
    pixelSize: number = 1
  ): THREE.CanvasTexture {
    const height = pattern.length;
    const width = pattern[0]?.length || 0;

    return this.createTextureFromCanvas(width * pixelSize, height * pixelSize, (ctx) => {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const char = pattern[y][x];
          const color = colorMap[char];

          if (color && color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
          }
        }
      }
    });
  }

  /**
   * Очистить все загруженные ресурсы
   */
  dispose(): void {
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }
}
