import { CraftingSystem } from "./CraftingSystem";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { getBlockColor } from "../utils/BlockColors";

export class CraftingGridRenderer {
  private craftingSystem: CraftingSystem;
  private craftGridContainer: HTMLElement;

  constructor(craftingSystem: CraftingSystem, craftGridContainer: HTMLElement) {
    this.craftingSystem = craftingSystem;
    this.craftGridContainer = craftGridContainer;
  }

  public updateVisuals() {
    const size = this.craftingSystem.isCraftingTable ? 3 : 2;
    const total = size * size;
    const slots = this.craftGridContainer.children;

    for (let i = 0; i < total; i++) {
      const slot = this.craftingSystem.craftingSlots[i];
      const el = slots[i] as HTMLElement;
      const icon = el.querySelector(".block-icon") as HTMLElement;
      const countEl = el.querySelector(".slot-count") as HTMLElement;

      if (slot.id !== 0 && slot.count > 0) {
        icon.style.display = "block";
        this.applyIconStyle(icon, slot.id);
        countEl.innerText = slot.count.toString();
      } else {
        icon.style.display = "none";
        countEl.innerText = "";
      }
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
