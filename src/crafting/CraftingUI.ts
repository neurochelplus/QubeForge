import { CraftingSystem } from "./CraftingSystem";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { DragDrop } from "../inventory/DragDrop";
import { CraftingGridRenderer } from "./CraftingGridRenderer";
import { CraftingResultRenderer } from "./CraftingResultRenderer";
import { CraftingSlotHandler } from "./CraftingSlotHandler";
import { MobileCraftingList } from "./MobileCraftingList";

export class CraftingUI {
  private craftingSystem: CraftingSystem;
  private isMobile: boolean;

  private craftingArea: HTMLElement;
  private craftGridContainer: HTMLElement;
  private inventoryMenu: HTMLElement;

  private gridRenderer: CraftingGridRenderer;
  private resultRenderer: CraftingResultRenderer;
  private slotHandler: CraftingSlotHandler;
  private mobileList: MobileCraftingList | null;

  constructor(
    craftingSystem: CraftingSystem,
    inventory: Inventory,
    inventoryUI: InventoryUI,
    dragDrop: DragDrop,
    isMobile: boolean,
  ) {
    this.craftingSystem = craftingSystem;
    this.isMobile = isMobile;
    this.inventoryMenu = document.getElementById("inventory-menu")!;

    const { craftingArea, craftGridContainer, resultIcon, resultCount } =
      this.createElements();

    this.craftingArea = craftingArea;
    this.craftGridContainer = craftGridContainer;

    this.gridRenderer = new CraftingGridRenderer(
      craftingSystem,
      craftGridContainer,
    );
    this.resultRenderer = new CraftingResultRenderer(
      craftingSystem,
      resultIcon,
      resultCount,
    );
    this.slotHandler = new CraftingSlotHandler(
      craftingSystem,
      dragDrop,
      () => this.updateVisuals(),
    );

    this.mobileList = isMobile
      ? new MobileCraftingList(craftingSystem, inventory, inventoryUI, () =>
          this.updateVisuals(),
        )
      : null;

    this.init();
  }

  private createElements() {
    const craftingArea = document.createElement("div");
    craftingArea.id = "crafting-area";

    const craftGridContainer = document.createElement("div");
    craftGridContainer.id = "crafting-grid-container";
    craftingArea.appendChild(craftGridContainer);

    const arrowDiv = document.createElement("div");
    arrowDiv.className = "crafting-arrow";
    arrowDiv.innerText = "→";
    craftingArea.appendChild(arrowDiv);

    const resultContainer = document.createElement("div");
    resultContainer.id = "crafting-result-container";

    const resultSlotDiv = document.createElement("div");
    resultSlotDiv.classList.add("slot");
    resultSlotDiv.id = "slot-result";

    const resultIcon = document.createElement("div");
    resultIcon.className = "block-icon";
    resultIcon.style.display = "none";

    const resultCount = document.createElement("div");
    resultCount.className = "slot-count";

    resultSlotDiv.appendChild(resultIcon);
    resultSlotDiv.appendChild(resultCount);

    resultSlotDiv.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      this.slotHandler.handleResultClick();
    });
    resultSlotDiv.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      this.slotHandler.handleResultClick();
    });

    resultContainer.appendChild(resultSlotDiv);
    craftingArea.appendChild(resultContainer);

    return { craftingArea, craftGridContainer, resultIcon, resultCount };
  }

  private init() {
    const inventoryGrid = document.getElementById("inventory-grid");
    this.inventoryMenu.insertBefore(this.craftingArea, inventoryGrid);
  }

  public updateCraftingGridSize() {
    this.craftGridContainer.innerHTML = "";
    const size = this.craftingSystem.isCraftingTable ? 3 : 2;
    const total = size * size;

    if (this.craftingSystem.isCraftingTable) {
      this.craftGridContainer.classList.add("grid-3x3");
    } else {
      this.craftGridContainer.classList.remove("grid-3x3");
    }

    for (let i = 0; i < total; i++) {
      const div = document.createElement("div");
      div.classList.add("slot");
      div.setAttribute("data-craft-index", i.toString());

      const icon = document.createElement("div");
      icon.classList.add("block-icon");
      icon.style.display = "none";
      div.appendChild(icon);

      const countEl = document.createElement("div");
      countEl.classList.add("slot-count");
      div.appendChild(countEl);

      const handleCraftSlot = (btn: number = 0) => {
        this.slotHandler.handleCraftSlotClick(i, btn);
      };

      div.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        handleCraftSlot(e.button);
      });
      div.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        handleCraftSlot();
      });

      this.craftGridContainer.appendChild(div);
    }
  }

  public updateVisuals() {
    if (this.isMobile && this.mobileList) {
      this.mobileList.updateVisuals();
      return;
    }

    this.gridRenderer.updateVisuals();
    this.resultRenderer.updateVisuals();
  }

  public setVisible(visible: boolean, isCraftingTable: boolean) {
    if (visible) {
      this.craftingArea.style.display = this.isMobile ? "none" : "flex";
      if (this.mobileList) {
        this.mobileList.setVisible(this.isMobile);
      }
      this.craftingSystem.setCraftingTable(isCraftingTable);
      this.updateCraftingGridSize();
      this.updateVisuals();
    } else {
      this.craftingArea.style.display = "none";
      if (this.mobileList) {
        this.mobileList.setVisible(false);
      }
    }
  }
}
