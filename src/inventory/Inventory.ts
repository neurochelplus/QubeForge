// Класс для управления данными инвентаря

export type InventorySlot = {
  id: number;
  count: number;
  durability?: number;
  maxDurability?: number;
};

export class Inventory {
  private slots: InventorySlot[];
  private selectedSlot: number = 0;
  private readonly SLOT_COUNT = 36;
  private readonly HOTBAR_SIZE = 9;

  constructor() {
    this.slots = Array.from({ length: this.SLOT_COUNT }, () => ({
      id: 0,
      count: 0,
    }));
  }

  public getSlots(): InventorySlot[] {
    return this.slots;
  }

  public getSlot(index: number): InventorySlot {
    return this.slots[index];
  }

  public setSlot(index: number, slot: InventorySlot): void {
    this.slots[index] = { ...slot };
  }

  public getSelectedSlot(): number {
    return this.selectedSlot;
  }

  public setSelectedSlot(index: number): void {
    if (index >= 0 && index < this.HOTBAR_SIZE) {
      this.selectedSlot = index;
    }
  }

  public getSelectedSlotItem(): InventorySlot {
    return this.slots[this.selectedSlot];
  }

  public addItem(id: number, count: number): number {
    let remaining = count;
    // Tools are 20-39. Food (40+) is stackable.
    const isTool = id >= 20 && id < 40;
    const maxStack = isTool ? 1 : 64;

    // 1. Try to stack with existing items (ONLY if not a tool)
    if (!isTool) {
      for (let i = 0; i < this.SLOT_COUNT; i++) {
        if (this.slots[i].id === id && this.slots[i].count < maxStack) {
          const space = maxStack - this.slots[i].count;
          const add = Math.min(remaining, space);
          this.slots[i].count += add;
          remaining -= add;
          if (remaining === 0) return 0;
        }
      }
    }

    // 2. Find empty slot
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      if (this.slots[i].id === 0) {
        const add = Math.min(remaining, maxStack);
        this.slots[i].id = id;
        this.slots[i].count = add;
        
        // Reset durability for new items if not specified
        delete this.slots[i].durability;
        delete this.slots[i].maxDurability;

        remaining -= add;
        if (remaining === 0) return 0;
      }
    }

    return remaining; // Return items that didn't fit
  }

  public removeItem(id: number, count: number): boolean {
    let remaining = count;
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      if (this.slots[i].id === id) {
        const take = Math.min(remaining, this.slots[i].count);
        this.slots[i].count -= take;
        remaining -= take;
        if (this.slots[i].count === 0) {
          this.slots[i].id = 0;
          delete this.slots[i].durability;
          delete this.slots[i].maxDurability;
        }
        if (remaining <= 0) return true;
      }
    }
    return remaining === 0;
  }

  public clear(): void {
    for (let i = 0; i < this.SLOT_COUNT; i++) {
      this.slots[i] = { id: 0, count: 0 };
    }
  }

  public serialize(): InventorySlot[] {
    return this.slots.map((slot) => ({ ...slot }));
  }

  public deserialize(data: InventorySlot[]): void {
    for (let i = 0; i < Math.min(data.length, this.SLOT_COUNT); i++) {
      if (data[i]) {
        this.slots[i] = { ...data[i] };
      }
    }
  }
}
