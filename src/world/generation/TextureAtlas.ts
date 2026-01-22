import * as THREE from "three";
import { BlockRegistry } from "../../registry/BlockRegistry";
import type { TexturePattern } from "../../registry/types";

/**
 * Текстурный атлас для блоков
 * Автоматически генерирует текстуры на основе данных из реестра
 */
export class TextureAtlas {
  private static readonly ATLAS_WIDTH = 192; // 12 slots * 16px
  private static readonly ATLAS_HEIGHT = 16;
  private static readonly SLOT_COUNT = 12;
  private static readonly SLOT_SIZE = 16;

  // Карта: numericId блока → слоты для каждой грани
  private static slotMap = new Map<number, {
    top?: number;
    side?: number;
    bottom?: number;
    front?: number;
  }>();

  // Следующий свободный слот
  private static nextSlot = 1; // Slot 0 зарезервирован для шума

  /**
   * Создать текстуру с шумом и паттернами блоков
   */
  public static createNoiseTexture(): THREE.DataTexture {
    const width = this.ATLAS_WIDTH;
    const height = this.ATLAS_HEIGHT;
    const data = new Uint8Array(width * height * 4); // RGBA

    // Заполнить базовым шумом (Slot 0 и фон для всех слотов)
    for (let i = 0; i < width * height; i++) {
      const stride = i * 4;
      const v = Math.floor(Math.random() * (255 - 150) + 150); // 150-255
      data[stride] = v; // R
      data[stride + 1] = v; // G
      data[stride + 2] = v; // B
      data[stride + 3] = 255; // Alpha
    }

    // Сбросить карту слотов и счётчик
    this.slotMap.clear();
    this.nextSlot = 1;

    // Автоматически применить текстуры из реестра
    this.applyBlockTexturesFromRegistry(data);

    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat,
    );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    console.log(`TextureAtlas: Generated with ${this.nextSlot} slots used`);
    return texture;
  }

  /**
   * Автоматически применить текстуры всех блоков из реестра
   */
  private static applyBlockTexturesFromRegistry(data: Uint8Array): void {
    const allBlocks = BlockRegistry.getAll();

    for (const block of allBlocks) {
      if (!block.textures) continue;

      const slots: {
        top?: number;
        side?: number;
        bottom?: number;
        front?: number;
      } = {};

      // Обработать каждую грань
      if (block.textures.top) {
        slots.top = this.allocateSlot();
        this.applyPattern(data, slots.top, block.textures.top, block.transparent);
      }

      if (block.textures.side) {
        slots.side = this.allocateSlot();
        this.applyPattern(data, slots.side, block.textures.side, block.transparent);
      }

      if (block.textures.bottom) {
        slots.bottom = this.allocateSlot();
        this.applyPattern(data, slots.bottom, block.textures.bottom, block.transparent);
      }

      if (block.textures.front) {
        slots.front = this.allocateSlot();
        this.applyPattern(data, slots.front, block.textures.front, block.transparent);
      }

      // Сохранить маппинг
      this.slotMap.set(block.numericId, slots);

      console.log(`TextureAtlas: Block "${block.id}" (${block.numericId}) → slots:`, slots);
    }
  }

  /**
   * Выделить следующий свободный слот
   */
  private static allocateSlot(): number {
    if (this.nextSlot >= this.SLOT_COUNT) {
      throw new Error(`TextureAtlas: No more slots available (max ${this.SLOT_COUNT})`);
    }
    return this.nextSlot++;
  }

  /**
   * Применить паттерн к слоту атласа
   */
  private static applyPattern(
    data: Uint8Array,
    slot: number,
    texturePattern: TexturePattern,
    isTransparent: boolean = false,
  ): void {
    const { pattern, colors } = texturePattern;
    const primaryRgb = this.hexToRgb(colors.primary);
    const secondaryRgb = this.hexToRgb(colors.secondary);

    const startX = slot * this.SLOT_SIZE;
    const endX = startX + this.SLOT_SIZE;

    for (let y = 0; y < this.SLOT_SIZE; y++) {
      for (let x = startX; x < endX; x++) {
        const localX = x - startX;
        const char = pattern[y][localX];
        const i = y * this.ATLAS_WIDTH + x;
        const stride = i * 4;

        if (char === "1") {
          // Primary color
          data[stride] = primaryRgb.r;
          data[stride + 1] = primaryRgb.g;
          data[stride + 2] = primaryRgb.b;
          data[stride + 3] = 255;
        } else if (char === "2") {
          // Secondary color (для руд - с шумом)
          if (colors.secondary === "#7D7D7D") {
            // Это руда - добавляем шум для камня
            const noiseV = Math.floor(Math.random() * (255 - 150) + 150);
            const stoneV = Math.floor(noiseV * 0.5);
            data[stride] = stoneV;
            data[stride + 1] = stoneV;
            data[stride + 2] = stoneV;
          } else {
            data[stride] = secondaryRgb.r;
            data[stride + 1] = secondaryRgb.g;
            data[stride + 2] = secondaryRgb.b;
          }
          data[stride + 3] = 255;
        } else if (char === "0") {
          // Transparent
          data[stride + 3] = 0;
        }

        // Для прозрачных блоков - добавить случайную прозрачность
        if (isTransparent && char !== "0" && Math.random() < 0.3) {
          data[stride + 3] = 0;
        }
      }
    }
  }

  /**
   * Получить номер слота для блока и грани
   */
  public static getSlot(blockNumericId: number, side: string): number {
    const slots = this.slotMap.get(blockNumericId);
    if (!slots) return 0; // Slot 0 = базовый шум

    // Маппинг граней
    if (side === "top" && slots.top !== undefined) return slots.top;
    if (side === "bottom" && slots.bottom !== undefined) return slots.bottom;
    if (side === "front" && slots.front !== undefined) return slots.front;
    if (slots.side !== undefined) return slots.side;

    // Fallback на top или slot 0
    return slots.top ?? 0;
  }

  /**
   * Конвертировать hex цвет в RGB
   */
  public static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  /**
   * Получить шаг UV для одного слота
   */
  public static getUVStep(): number {
    return 1.0 / this.SLOT_COUNT;
  }
}
