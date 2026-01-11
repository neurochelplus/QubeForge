import { CraftingSystem } from "./CraftingSystem";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { getBlockColor } from "../utils/BlockColors";

export class CraftingResultRenderer {
  private craftingSystem: CraftingSystem;
  private resultIcon: HTMLElement;
  private resultCount: HTMLElement;

  constructor(
    craftingSystem: CraftingSystem,
    resultIcon: HTMLElement,
    resultCount: HTMLElement,
  ) {
    this.craftingSystem = craftingSystem;
    this.resultIcon = resultIcon;
    this.resultCount = resultCount;
  }

  public updateVisuals() {
    const result = this.craftingSystem.craftingResult;

    if (result.id !== 0) {
      this.resultIcon.style.display = "block";
      this.applyIconStyle(this.resultIcon, result.id);
      this.resultCount.innerText = result.count.toString();
    } else {
      this.resultIcon.style.display = "none";
      this.resultCount.innerText = "";
    }
  }

  private applyIconStyle(icon: HTMLElement, itemId: number) {
    icon.classList.remove("item-stick", "item-planks", "item-tool");
    icon.style.backgroundImage = "";

    if (TOOL_TEXTURES[itemId]) {
      icon.classList.add("item-tool");
      icon.style.backgroundImage = `url(${TOOL_TEXTURES[itemId].dataUrl})`;
    } else if (itemId === 7) {
      icon.classList.add("item-planks");
      icon.style.backgroundColor = getBlockColor(itemId);
    } else if (itemId === 9) {
      icon.style.backgroundColor = getBlockColor(itemId);
    } else {
      icon.style.backgroundColor = getBlockColor(itemId);
      icon.style.backgroundImage = "var(--noise-url)";
    }
  }
}
