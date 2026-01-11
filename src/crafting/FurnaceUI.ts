import { FurnaceManager } from "./FurnaceManager";
import { DragDrop } from "../inventory/DragDrop";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { getBlockColor } from "../utils/BlockColors";

export class FurnaceUI {
  private furnaceManager: FurnaceManager;
  private dragDrop: DragDrop;

  private container: HTMLElement;
  private inputSlot: HTMLElement;
  private fuelSlot: HTMLElement;
  private outputSlot: HTMLElement;
  private flameIcon: HTMLElement;
  private arrowIcon: HTMLElement;

  private currentFurnacePos: { x: number; y: number; z: number } | null = null;
  private isOpen: boolean = false;

  constructor(
    furnaceManager: FurnaceManager,
    dragDrop: DragDrop,
  ) {
    this.furnaceManager = furnaceManager;
    this.dragDrop = dragDrop;

    // Create DOM elements
    this.container = document.createElement("div");
    this.container.id = "furnace-ui";
    this.container.style.display = "none";
    this.container.className = "furnace-container";

    // Layout
    this.container.innerHTML = `
            <div class="furnace-left-col">
                <div id="furnace-slot-input" class="slot"></div>
                <div class="furnace-flame-container">
                    <div id="furnace-flame" class="furnace-flame"></div>
                </div>
                <div id="furnace-slot-fuel" class="slot"></div>
            </div>
            <div class="furnace-mid-col">
                <div id="furnace-arrow" class="furnace-arrow">→</div>
            </div>
            <div class="furnace-right-col">
                <div id="furnace-slot-output" class="slot"></div>
            </div>
        `;

    const inventoryMenu = document.getElementById("inventory-menu")!;
    const inventoryGrid = document.getElementById("inventory-grid");
    inventoryMenu.insertBefore(this.container, inventoryGrid);

    this.inputSlot = this.container.querySelector("#furnace-slot-input")!;
    this.fuelSlot = this.container.querySelector("#furnace-slot-fuel")!;
    this.outputSlot = this.container.querySelector("#furnace-slot-output")!;
    this.flameIcon = this.container.querySelector("#furnace-flame")!;
    this.arrowIcon = this.container.querySelector("#furnace-arrow")!;

    this.setupListeners();
  }

  private setupListeners() {
    const handleSlot = (
      e: Event,
      type: "input" | "fuel" | "output",
      btn: number = 0,
    ) => {
      e.stopPropagation();
      if (e instanceof MouseEvent || e instanceof TouchEvent) {
        if (e.cancelable) e.preventDefault();
        this.handleSlotClick(type, btn);
      }
    };

    this.inputSlot.addEventListener("mousedown", (e) =>
      handleSlot(e, "input", e.button),
    );
    this.inputSlot.addEventListener("touchstart", (e) => {
      e.preventDefault(); // Stop mouse emulation
      handleSlot(e, "input");
    });

    this.fuelSlot.addEventListener("mousedown", (e) =>
      handleSlot(e, "fuel", e.button),
    );
    this.fuelSlot.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleSlot(e, "fuel");
    });

    this.outputSlot.addEventListener("mousedown", (e) =>
      handleSlot(e, "output", e.button),
    );
    this.outputSlot.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleSlot(e, "output");
    });
  }
  public open(x: number, y: number, z: number) {
    this.currentFurnacePos = { x, y, z };
    this.isOpen = true;
    this.container.style.display = "flex";
    this.updateVisuals();
  }

  public close() {
    this.isOpen = false;
    this.currentFurnacePos = null;
    this.container.style.display = "none";
  }

  public isVisible(): boolean {
    return this.isOpen;
  }

  public updateVisuals() {
    if (!this.isOpen || !this.currentFurnacePos) return;
    const furnace = this.furnaceManager.getFurnace(
      this.currentFurnacePos.x,
      this.currentFurnacePos.y,
      this.currentFurnacePos.z,
    );

    if (!furnace) {
      this.close();
      return;
    }

    this.renderSlot(this.inputSlot, furnace.input);
    this.renderSlot(this.fuelSlot, furnace.fuel);
    this.renderSlot(this.outputSlot, furnace.output);

    // Progress Bars
    // Flame (Height: 0 to 14px roughly, or just use opacity/color)
    const burnRatio =
      furnace.maxBurnTime > 0 ? furnace.burnTime / furnace.maxBurnTime : 0;
    // Simple visual: height of flame
    this.flameIcon.style.height = `${burnRatio * 100}%`;
    this.flameIcon.style.backgroundColor = burnRatio > 0 ? "orange" : "#333";

    // Arrow (Width/Color)
    const cookRatio =
      furnace.totalCookTime > 0 ? furnace.cookTime / furnace.totalCookTime : 0;
    this.arrowIcon.style.background = `linear-gradient(to right, #fff ${
      cookRatio * 100
    }%, #555 ${cookRatio * 100}%)`;
    // Clip text to background if needed, or just use overlay
    this.arrowIcon.style.webkitBackgroundClip = "text";
    this.arrowIcon.style.color = "transparent";
    if (cookRatio === 0) {
      this.arrowIcon.style.background = "none";
      this.arrowIcon.style.color = "#555";
    }
  }

  private renderSlot(el: HTMLElement, item: { id: number; count: number }) {
    el.innerHTML = "";
    if (item.id !== 0 && item.count > 0) {
      const icon = document.createElement("div");
      icon.classList.add("block-icon");
      if (TOOL_TEXTURES[item.id]) {
        icon.classList.add("item-tool");
        icon.style.backgroundImage = `url(${TOOL_TEXTURES[item.id].dataUrl})`;
      } else if (item.id === 7) {
        icon.classList.add("item-planks");
        icon.style.backgroundColor = getBlockColor(item.id);
      } else {
        icon.style.backgroundColor = getBlockColor(item.id);
        icon.style.backgroundImage = "var(--noise-url)";
      }

      const count = document.createElement("div");
      count.className = "slot-count";
      count.innerText = item.count.toString();

      el.appendChild(icon);
      el.appendChild(count);
    }
  }

  private handleSlotClick(
    type: "input" | "fuel" | "output",
    button: number = 0,
  ) {
    if (!this.currentFurnacePos) return;
    const furnace = this.furnaceManager.getFurnace(
      this.currentFurnacePos.x,
      this.currentFurnacePos.y,
      this.currentFurnacePos.z,
    );
    if (!furnace) return;

    let dragged = this.dragDrop.getDraggedItem();
    const slotItem = furnace[type];

    // Mobile Fix: If we are dragging something, but the UI thinks we aren't (or vice versa), force sync?
    // Actually, sticky usually means 'dragged' is set, but we expect it to be null after drop.
    // If we tap a slot and we are holding something, we drop it.
    // The issue might be that `handleSlotClick` logic for drop/place is working, but maybe `dragDrop.setDraggedItem` isn't updating visuals fast enough on mobile?
    // Or maybe the touch event is firing multiple times?
    // We added preventDefault, so that should be fine.

    if (type === "output") {
      if (slotItem.id === 0) return;
      // Output: Right click behaves same as left (take all) for now, or maybe split?
      // Usually output is "Take All" or "Take Half". Standard is Take All or Split if dragging nothing.

      if (dragged) {
        if (dragged.id === slotItem.id) {
          dragged.count += slotItem.count;
          slotItem.id = 0;
          slotItem.count = 0;
          this.dragDrop.setDraggedItem(dragged);
        }
      } else {
        if (button === 2) {
          // Split output? Usually we just take all from output in simple implementations.
          // Let's implement split.
          const half = Math.ceil(slotItem.count / 2);
          dragged = { id: slotItem.id, count: half };
          slotItem.count -= half;
          if (slotItem.count === 0) slotItem.id = 0;
          this.dragDrop.setDraggedItem(dragged);
        } else {
          this.dragDrop.setDraggedItem({ ...slotItem });
          slotItem.id = 0;
          slotItem.count = 0;
        }
      }
    } else {
      // Input / Fuel
      if (dragged) {
        if (slotItem.id === 0) {
          // Place
          if (button === 2) {
            // Place One
            slotItem.id = dragged.id;
            slotItem.count = 1;
            dragged.count--;
            if (dragged.count === 0) dragged = null;
          } else {
            // Place All
            slotItem.id = dragged.id;
            slotItem.count = dragged.count;
            dragged = null;
          }
        } else if (slotItem.id === dragged.id) {
          // Add
          if (button === 2) {
            // Add One
            slotItem.count++;
            dragged.count--;
            if (dragged.count === 0) dragged = null;
          } else {
            // Add All
            slotItem.count += dragged.count;
            dragged = null;
          }
        } else {
          // Swap
          const temp = { ...slotItem };
          slotItem.id = dragged.id;
          slotItem.count = dragged.count;
          dragged = temp;
        }
        this.dragDrop.setDraggedItem(dragged);
      } else {
        // Pickup
        if (slotItem.id !== 0) {
          if (button === 2) {
            // Split
            const half = Math.ceil(slotItem.count / 2);
            dragged = { id: slotItem.id, count: half };
            slotItem.count -= half;
            if (slotItem.count === 0) slotItem.id = 0;
          } else {
            // Pickup All
            dragged = { ...slotItem };
            slotItem.id = 0;
            slotItem.count = 0;
          }
          this.dragDrop.setDraggedItem(dragged);
        }
      }
    }

    this.updateVisuals();
  }
}
