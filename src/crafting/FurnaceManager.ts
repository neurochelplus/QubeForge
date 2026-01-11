import type { InventorySlot } from "../inventory/Inventory";
import { worldDB } from "../utils/DB";
import { SMELTING_RECIPES, FUEL_ITEMS } from "./Recipes";

export interface FurnaceData {
  x: number;
  y: number;
  z: number;
  rotation: number; // 0=North, 1=East, 2=South, 3=West
  input: InventorySlot;
  fuel: InventorySlot;
  output: InventorySlot;
  burnTime: number; // Remaining seconds for current fuel
  maxBurnTime: number; // Total seconds for the fuel item consumed
  cookTime: number; // Current cook progress (seconds)
  totalCookTime: number; // Seconds required to cook current item
}

export class FurnaceManager {
  private static instance: FurnaceManager;
  private furnaces: Map<string, FurnaceData> = new Map();
  private dirty: boolean = false;

  private constructor() {}

  public static getInstance(): FurnaceManager {
    if (!FurnaceManager.instance) {
      FurnaceManager.instance = new FurnaceManager();
    }
    return FurnaceManager.instance;
  }

  public getFurnace(x: number, y: number, z: number): FurnaceData | undefined {
    return this.furnaces.get(`${x},${y},${z}`);
  }

  public createFurnace(x: number, y: number, z: number, rotation: number = 0) {
    const key = `${x},${y},${z}`;
    if (this.furnaces.has(key)) return;

    this.furnaces.set(key, {
      x,
      y,
      z,
      rotation,
      input: { id: 0, count: 0 },
      fuel: { id: 0, count: 0 },
      output: { id: 0, count: 0 },
      burnTime: 0,
      maxBurnTime: 0,
      cookTime: 0,
      totalCookTime: 10, // Default 10 seconds
    });
    this.dirty = true;
  }

  public removeFurnace(x: number, y: number, z: number): InventorySlot[] {
    const key = `${x},${y},${z}`;
    const furnace = this.furnaces.get(key);
    if (!furnace) return [];

    const drops: InventorySlot[] = [];
    if (furnace.input.count > 0 && furnace.input.id !== 0)
      drops.push({ ...furnace.input });
    if (furnace.fuel.count > 0 && furnace.fuel.id !== 0)
      drops.push({ ...furnace.fuel });
    if (furnace.output.count > 0 && furnace.output.id !== 0)
      drops.push({ ...furnace.output });

    this.furnaces.delete(key);
    this.dirty = true;
    worldDB.delete(key, "blockEntities");

    return drops;
  }

  public tick(deltaTime: number) {
    // deltaTime в секундах - время с последнего кадра
    this.furnaces.forEach((furnace) => {
      let isBurning = furnace.burnTime > 0;
      let inventoryChanged = false;

      // Уменьшаем время горения топлива
      if (isBurning) {
        furnace.burnTime -= deltaTime;
        if (furnace.burnTime < 0) furnace.burnTime = 0;
      }

      // Проверяем, нужно ли сжечь новое топливо
      // Топливо сжигается только если есть что плавить
      if (!isBurning && this.canSmelt(furnace)) {
        const fuelValue = this.getFuelBurnTime(furnace.fuel.id);
        if (fuelValue > 0) {
          furnace.fuel.count--;
          if (furnace.fuel.count === 0) furnace.fuel.id = 0;
          furnace.burnTime = fuelValue;
          furnace.maxBurnTime = fuelValue;
          isBurning = true;
          inventoryChanged = true;
        }
      } else if (!isBurning && furnace.burnTime <= 0) {
        // Не горит, нечего плавить или нет топлива
      }

      // Логика приготовления
      if (isBurning && this.canSmelt(furnace)) {
        furnace.cookTime += deltaTime;
        if (furnace.cookTime >= furnace.totalCookTime) {
          this.smelt(furnace); // Завершаем плавку
          inventoryChanged = true;
        }
      } else {
        // Сбрасываем прогресс приготовления, если печь не горит
        if (furnace.cookTime > 0) {
          furnace.cookTime = Math.max(0, furnace.cookTime - deltaTime * 2);
          // inventoryChanged = true; // Только визуальное изменение
        }
      }

      if (inventoryChanged) {
        this.dirty = true; // Помечаем для сохранения
      }
    });
  }

  // Проверяет, можно ли переплавить предмет в печи
  private canSmelt(furnace: FurnaceData): boolean {
    if (furnace.input.id === 0) return false; // Нет входного предмета
    const result = this.getSmeltingResult(furnace.input.id);
    if (!result) return false; // Предмет нельзя переплавить
    if (furnace.output.id === 0) return true; // Выходной слот пуст
    if (furnace.output.id !== result.id) return false; // Другой предмет в выходе
    if (furnace.output.count + result.count > 64) return false; // Переполнение стака
    return true;
  }

  // Выполняет плавку: забирает входной предмет, добавляет результат
  private smelt(furnace: FurnaceData) {
    const result = this.getSmeltingResult(furnace.input.id);
    if (!result) return;

    // Забираем 1 предмет из входа
    furnace.input.count--;
    if (furnace.input.count === 0) furnace.input.id = 0;

    // Добавляем результат в выход
    if (furnace.output.id === 0) {
      furnace.output.id = result.id;
      furnace.output.count = result.count;
    } else {
      furnace.output.count += result.count;
    }
    furnace.cookTime = 0; // Сбрасываем прогресс
  }

  // Получить время горения топлива по ID предмета
  // Возвращает 0, если предмет не является топливом
  private getFuelBurnTime(id: number): number {
    const fuel = FUEL_ITEMS.find((f) => f.id === id);
    return fuel ? fuel.burnTime : 0;
  }

  // Получить результат плавки для входного предмета
  // Возвращает null, если предмет нельзя переплавить
  private getSmeltingResult(id: number): { id: number; count: number } | null {
    const recipe = SMELTING_RECIPES.find((r) => r.input === id);
    return recipe ? recipe.output : null;
  }

  // Сохранение всех печей в IndexedDB
  public async save() {
    if (!this.dirty) return; // Нет изменений - не сохраняем
    const promises: Promise<void>[] = [];
    this.furnaces.forEach((data, key) => {
      promises.push(worldDB.set(key, data, "blockEntities"));
    });
    await Promise.all(promises);
    this.dirty = false;
  }

  // Загрузка всех печей из IndexedDB при старте игры
  public async load() {
    try {
      await worldDB.init(); // Убеждаемся, что БД открыта
      const keys = await worldDB.keys("blockEntities");
      for (const key of keys) {
        const data = await worldDB.get(key as string, "blockEntities");
        if (data) {
          this.furnaces.set(key as string, data);
        }
      }
      console.log(`Loaded ${this.furnaces.size} furnaces.`);
    } catch (e) {
      console.warn("Failed to load block entities", e);
    }
  }
}
