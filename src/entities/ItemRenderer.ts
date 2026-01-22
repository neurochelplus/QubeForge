import * as THREE from "three";
import { ITEM_ENTITY } from "../constants/GameConstants";
import { BlockColors } from "../constants/BlockColors";
import { TextureAtlas } from "../world/generation/TextureAtlas";
import { BLOCK } from "../constants/Blocks";

export class ItemRenderer {
  public static createMesh(
    type: number,
    blockTexture: THREE.DataTexture,
    itemTexture: THREE.CanvasTexture | null,
  ): THREE.Mesh {
    if (itemTexture) {
      return this.createFlatItem(itemTexture);
    } else {
      return this.createBlockItem(type, blockTexture);
    }
  }

  private static createFlatItem(texture: THREE.CanvasTexture): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(ITEM_ENTITY.SIZE_FLAT, ITEM_ENTITY.SIZE_FLAT);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.8,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private static createBlockItem(
    type: number,
    blockTexture: THREE.DataTexture,
  ): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(
      ITEM_ENTITY.SIZE_BLOCK,
      ITEM_ENTITY.SIZE_BLOCK,
      ITEM_ENTITY.SIZE_BLOCK,
    );

    this.applyVertexColors(geometry, type);
    this.applyUVMapping(geometry, type);

    const material = new THREE.MeshStandardMaterial({
      map: blockTexture,
      vertexColors: true,
      roughness: 0.8,
      alphaTest: 0.5,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private static applyVertexColors(geometry: THREE.BufferGeometry, type: number) {
    const colors: number[] = [];
    const count = geometry.attributes.position.count;

    for (let i = 0; i < count; i++) {
      const faceIndex = Math.floor(i / 4);
      const face = this.getFaceName(faceIndex);
      const color = BlockColors.getColorForFace(type, face);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  }

  private static applyUVMapping(geometry: THREE.BufferGeometry, type: number) {
    const uvAttr = geometry.getAttribute("uv");
    if (!uvAttr) return;

    const uvStep = TextureAtlas.getUVStep();
    const uvInset = 0.001;

    for (let face = 0; face < 6; face++) {
      const texIdx = this.getTextureIndex(type, face);
      const min = texIdx * uvStep + uvInset;
      const max = (texIdx + 1) * uvStep - uvInset;

      const offset = face * 4;
      for (let i = 0; i < 4; i++) {
        const u = uvAttr.getX(offset + i);
        uvAttr.setX(offset + i, min + u * (max - min));
      }
    }

    uvAttr.needsUpdate = true;
  }

  private static getTextureIndex(type: number, face: number): number {
    // BoxGeometry faces: 0:Right, 1:Left, 2:Top, 3:Bottom, 4:Front, 5:Back
    const faceNames = ["right", "left", "top", "bottom", "front", "back"];
    const faceName = faceNames[face] || "top";
    
    // Автоматически получить слот из TextureAtlas
    return TextureAtlas.getSlot(type, faceName);
  }

  private static getFaceName(faceIndex: number): string {
    const faces = ["right", "left", "top", "bottom", "front", "back"];
    return faces[faceIndex] || "top";
  }
}
