import { Inventory } from "./Inventory";
import { DragDrop } from "./DragDrop";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { getBlockColor } from "../utils/BlockColors";
import { BLOCK_NAMES } from "../constants/BlockNames";
import { BLOCK } from "../constants/Blocks";

export class InventoryUI {
  private inventory: Inventory;
  private dragDrop: DragDrop;
  private hotbarContainer: HTMLElement;
  private inventoryGrid: HTMLElement;
  private inventoryMenu: HTMLElement;
  private tooltip: HTMLElement;

  private touchStartSlotIndex: number | null = null;
  
  // Cached slot elements to avoid querySelectorAll in refresh() hot path
  private slotCache: Map<number, HTMLElement[]> = new Map();

  public onInventoryChange: (() => void) | null = null;

  constructor(inventory: Inventory, dragDrop: DragDrop, _isMobile: boolean) {
    this.inventory = inventory;
    this.dragDrop = dragDrop;

    this.hotbarContainer = document.getElementById("hotbar")!;
    this.inventoryGrid = document.getElementById("inventory-grid")!;
    this.inventoryMenu = document.getElementById("inventory-menu")!;
    this.tooltip = document.getElementById("tooltip")!;

    if (!this.tooltip) {
      this.tooltip = document.createElement("div");
      this.tooltip.id = "tooltip";
      document.body.appendChild(this.tooltip);
    }

    this.init();
    this.initGlobalListeners();
  }

  private init() {
    this.hotbarContainer.innerHTML = "";
    this.inventoryGrid.innerHTML = "";
    this.slotCache.clear();

    // Hotbar (0-8)
    for (let i = 0; i < 9; i++) {
      const el = this.createSlotElement(i, true);
      this.hotbarContainer.appendChild(el);
      this.cacheSlot(i, el);
    }

    // Inventory Grid (9-35)
    for (let i = 9; i < 36; i++) {
      const el = this.createSlotElement(i, false);
      this.inventoryGrid.appendChild(el);
      this.cacheSlot(i, el);
    }

    // Separator
    const separator = document.createElement("div");
    separator.className = "slot-hotbar-separator";
    separator.style.gridColumn = "1 / -1";
    this.inventoryGrid.appendChild(separator);

    // Hotbar Copy in Grid (0-8)
    for (let i = 0; i < 9; i++) {
      const el = this.createSlotElement(i, false);
      this.inventoryGrid.appendChild(el);
      this.cacheSlot(i, el);
    }
  }
  
  private cacheSlot(index: number, el: HTMLElement) {
    const arr = this.slotCache.get(index);
    if (arr) {
      arr.push(el);
    } else {
      this.slotCache.set(index, [el]);
    }

    // Event delegation для всех слотов
    this.setupEventDelegation();
  }

  private setupEventDelegation() {
    // Hotbar delegation
    this.hotbarContainer.addEventListener("mouseenter", (e) => this.handleMouseEnter(e), true);
    this.hotbarContainer.addEventListener("mousemove", (e) => this.handleMouseMove(e), true);
    this.hotbarContainer.addEventListener("mouseleave", (e) => this.handleMouseLeave(e), true);
    this.hotbarContainer.addEventListener("mousedown", (e) => this.handleMouseDown(e), true);
    this.hotbarContainer.addEventListener("touchstart", (e) => this.handleTouchStart(e), true);

    // Inventory grid delegation
    this.inventoryGrid.addEventListener("mouseenter", (e) => this.handleMouseEnter(e), true);
    this.inventoryGrid.addEventListener("mousemove", (e) => this.handleMouseMove(e), true);
    this.inventoryGrid.addEventListener("mouseleave", (e) => this.handleMouseLeave(e), true);
    this.inventoryGrid.addEventListener("mousedown", (e) => this.handleMouseDown(e), true);
    this.inventoryGrid.addEventListener("touchstart", (e) => this.handleTouchStart(e), true);
  }

  private getSlotIndex(target: EventTarget | null): number | null {
    if (!target) return null;
    const slotEl = (target as HTMLElement).closest(".slot");
    if (!slotEl) return null;
    const index = slotEl.getAttribute("data-index");
    return index !== null ? parseInt(index) : null;
  }

  private handleMouseEnter(e: Event) {
    const index = this.getSlotIndex(e.target);
    if (index === null) return;
    
    const slot = this.inventory.getSlot(index);
    if (this.inventoryMenu.style.display !== "none" && slot.id !== 0) {
      this.tooltip.innerText = BLOCK_NAMES[slot.id] || "Block";
      this.tooltip.style.display = "block";
    }
  }

  private handleMouseMove(e: Event) {
    if (!(e instanceof MouseEvent)) return;
    if (this.inventoryMenu.style.display !== "none") {
      this.tooltip.style.left = e.clientX + 10 + "px";
      this.tooltip.style.top = e.clientY + 10 + "px";
    }
  }

  private handleMouseLeave(e: Event) {
    const index = this.getSlotIndex(e.target);
    if (index === null) return;
    this.tooltip.style.display = "none";
  }

  private handleMouseDown(e: Event) {
    if (!(e instanceof MouseEvent)) return;
    const index = this.getSlotIndex(e.target);
    if (index === null) return;

    e.stopPropagation();
    if (this.inventoryMenu.style.display !== "none") {
      this.handleSlotClick(index, e.button);
    }
  }

  private handleTouchStart(e: Event) {
    if (!(e instanceof TouchEvent)) return;
    const index = this.getSlotIndex(e.target);
    if (index === null) return;

    e.stopPropagation();
    if (e.cancelable) e.preventDefault();

    const slotEl = (e.target as HTMLElement).closest(".slot");
    const isHotbar = slotEl?.parentElement === this.hotbarContainer;

    if (this.inventoryMenu.style.display !== "none") {
      this.touchStartSlotIndex = index;
      this.handleSlotClick(index);
    } else if (isHotbar) {
      this.inventory.setSelectedSlot(index);
      this.refresh();
      if (this.onInventoryChange) this.onInventoryChange();
    }
  }

  private initGlobalListeners() {
    // Handle dropping items via touch
    window.addEventListener("touchend", (e) => {
      const draggedItem = this.dragDrop.getDraggedItem();
      if (
        draggedItem &&
        this.inventoryMenu.style.display !== "none"
        // Allow dropping even if touchStartSlotIndex is null (e.g. dragged from Furnace)
      ) {
        const touch = e.changedTouches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const slotEl = target?.closest(".slot");

        if (slotEl) {
          // Check if slot belongs to inventory UI
          if (
            !this.hotbarContainer.contains(slotEl) &&
            !this.inventoryGrid.contains(slotEl)
          ) {
            // Not our slot (e.g. Furnace slot), ignore (let other UI handle or drop?)
            // If we don't return to start, and don't place, it stays on cursor.
            // But FurnaceUI doesn't implement 'touchend' placement.
            // So if user drags from Inventory to Furnace, InventoryUI sees "End on Slot (Furnace)".
            // It ignores it.
            // Item stays on cursor.
            // User has to TAP Furnace to place.

            // To fix "sticking" feeling:
            // 1. Either enable Tap-to-Place (which works now).
            // 2. Or enable Drag-to-Furnace.

            // The user complaint is "it sticks". This confirms they tried to Drag-and-Drop.
            // Since FurnaceUI has no drop handler, nothing happens.

            // We should ideally call FurnaceUI handle click here?
            // Or just return, and user learns to tap?
            // User said "you have to press it again". That confirms Tap works.
            // They find the "sticking" annoying.

            // If we want seamless Drag-Drop:
            // We need a shared DragDrop manager that handles Drop on ANY slot.

            // QUICK FIX for now:
            // If we drop on a Furnace slot, try to simulate a click on it?

            if (slotEl.classList.contains("slot")) {
              // It is a slot, just not ours.
              // Dispatch a click/touchstart on it?
              // But we are in `touchend`.
              // Let's manually trigger the click logic for that element.
              // slotEl.click(); // Might work if click listener exists.
              // FurnaceUI uses `mousedown` and `touchstart`.
              // Let's dispatch `mousedown`?

              // Better: dispatch a custom event or reuse logic.
              // Simple hack: check if it has an id like `furnace-slot-...`

              const event = new MouseEvent("mousedown", {
                bubbles: true,
                cancelable: true,
                view: window,
                button: 0, // Left click
              });
              slotEl.dispatchEvent(event);

              // If successful, `draggedItem` should become null.
              // We should check that before clearing `touchStartSlotIndex`.
            }
          } else {
            const targetIndex = parseInt(
              slotEl.getAttribute("data-index") || "-1",
            );
            if (targetIndex !== -1) {
              this.handleSlotClick(targetIndex);
            }
          }
        } else if (this.touchStartSlotIndex !== null) {
          // Return to start if we know where we came from
          this.handleSlotClick(this.touchStartSlotIndex);
        }

        this.touchStartSlotIndex = null;
      }
    });
  }

  private createSlotElement(index: number, _isHotbar: boolean): HTMLElement {
    const div = document.createElement("div");
    div.classList.add("slot");
    div.setAttribute("data-index", index.toString());

    const icon = document.createElement("div");
    icon.classList.add("block-icon");
    icon.style.display = "none";
    div.appendChild(icon);

    const count = document.createElement("div");
    count.classList.add("slot-count");
    count.innerText = "";
    div.appendChild(count);

    const durability = document.createElement("div");
    durability.classList.add("slot-durability");
    durability.style.display = "none";
    div.appendChild(durability);

    return div;
  }

  public refresh() {
    for (let i = 0; i < 36; i++) {
      this.updateSlotVisuals(i);
    }
  }

  private updateSlotVisuals(index: number) {
    const slot = this.inventory.getSlot(index);
    const elements = this.slotCache.get(index) || [];

    elements.forEach((el) => {
      if (el.parentElement === this.hotbarContainer) {
        if (index === this.inventory.getSelectedSlot())
          el.classList.add("active");
        else el.classList.remove("active");
      }

      const icon = el.querySelector(".block-icon") as HTMLElement;
      const countEl = el.querySelector(".slot-count") as HTMLElement;
      const durabilityEl = el.querySelector(".slot-durability") as HTMLElement;

      if (slot.id !== 0 && slot.count > 0) {
        icon.style.display = "block";

        // Reset
        icon.className = "block-icon";
        icon.style.backgroundImage = "";
        icon.style.backgroundColor = "";

        if (TOOL_TEXTURES[slot.id]) {
          icon.classList.add("item-tool");
          icon.style.backgroundImage = `url(${TOOL_TEXTURES[slot.id].dataUrl})`;
        } else if (slot.id === BLOCK.PLANKS) {
          icon.classList.add("item-planks");
          icon.style.backgroundColor = getBlockColor(slot.id);
        } else if (slot.id === BLOCK.CRAFTING_TABLE) {
          icon.style.backgroundColor = getBlockColor(slot.id);
          icon.style.backgroundImage = "var(--noise-url)";
        } else {
          icon.style.backgroundColor = getBlockColor(slot.id);
          icon.style.backgroundImage = "var(--noise-url)";
        }

        countEl.innerText = slot.count.toString();

        if (slot.durability !== undefined && slot.maxDurability !== undefined) {
            durabilityEl.style.display = "block";
            const percent = slot.durability / slot.maxDurability;
            durabilityEl.style.width = `${percent * 100}%`;
            
            // Color based on health
            if (percent > 0.5) durabilityEl.style.backgroundColor = "#00ff00"; // Green
            else if (percent > 0.2) durabilityEl.style.backgroundColor = "#ffff00"; // Yellow
            else durabilityEl.style.backgroundColor = "#ff0000"; // Red
        } else {
            durabilityEl.style.display = "none";
        }

      } else {
        icon.style.display = "none";
        countEl.innerText = "";
        durabilityEl.style.display = "none";
      }
    });
  }

  private handleSlotClick(index: number, button: number = 0) {
    const slot = this.inventory.getSlot(index);
    let draggedItem = this.dragDrop.getDraggedItem();

    // Logic copied from main.ts handleSlotClick
    if (!draggedItem) {
      if (slot.id !== 0) {
        if (button === 2) {
          // Right Click: Split
          const half = Math.ceil(slot.count / 2);
          draggedItem = { id: slot.id, count: half };
          slot.count -= half;
          if (slot.count === 0) slot.id = 0;
        } else {
          // Pickup All
          draggedItem = { ...slot };
          slot.id = 0;
          slot.count = 0;
        }
      }
    } else {
      if (slot.id === 0) {
        if (button === 2) {
          // Place One
          slot.id = draggedItem.id;
          slot.count = 1;
          draggedItem.count--;
          if (draggedItem.count === 0) draggedItem = null;
        } else {
          // Place All
          slot.id = draggedItem.id;
          slot.count = draggedItem.count;
          draggedItem = null;
        }
      } else if (slot.id === draggedItem.id) {
        const isTool = slot.id >= 20;
        const maxStack = isTool ? 1 : 64;

        if (slot.count >= maxStack) {
          // Stack full (or tool), Swap
          const temp = { ...slot };
          slot.id = draggedItem.id;
          slot.count = draggedItem.count;
          draggedItem = temp;
        } else {
          if (button === 2) {
            // Add One
            slot.count++;
            draggedItem.count--;
            if (draggedItem.count === 0) draggedItem = null;
          } else {
            // Add All (respect limit)
            const space = maxStack - slot.count;
            const move = Math.min(space, draggedItem.count);
            slot.count += move;
            draggedItem.count -= move;
            if (draggedItem.count === 0) draggedItem = null;
          }
        }
      } else {
        // Swap
        const temp = { ...slot };
        slot.id = draggedItem.id;
        slot.count = draggedItem.count;
        draggedItem = temp;
      }
    }

    // Update Inventory Data
    this.inventory.setSlot(index, slot);
    this.dragDrop.setDraggedItem(draggedItem);

    this.refresh();
    if (this.onInventoryChange) this.onInventoryChange();
  }
}
