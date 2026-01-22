import type { InventorySlot } from "../inventory/Inventory";
import { DB, worldDB } from "../utils/DB";
import { SMELTING_RECIPES, FUEL_ITEMS } from "./Recipes";
import { logger } from "../utils/Logger";

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
  private db: DB = worldDB; // По умолчанию используется глобальная БД

  private constructor() { }

  public static getInstance(): FurnaceManager {
    if (!FurnaceManager.instance) {
      FurnaceManager.instance = new FurnaceManager();
    }
    return FurnaceManager.instance;
  }

  public getFurnace(x: number, y: number, z: number): FurnaceData | undefined {
    return this.furnaces.get(`${x},${y},${z}`);
  }

  /**
   * Установить базу данных для сохранения печей
   * Вызывается при загрузке мира
   */
  public setDB(db: DB): void {
    this.db = db;
    logger.debug(`FurnaceManager: Using database ${db.getDbName()}`);
  }

  /**
   * Очистить все печи (при переключении миров)
   */
  public clear(): void {
    this.furnaces.clear();
    this.dirty = false;
  }

  // Проверяет целостность данных печи (защита от поврежденных данных из IndexedDB)
  private validateFurnaceData(furnace: FurnaceData): boolean {
    if (!furnace) return false;
    // Инициализируем отсутствующие слоты
    if (!furnace.input) furnace.input = { id: 0, count: 0 };
    if (!furnace.fuel) furnace.fuel = { id: 0, count: 0 };
    if (!furnace.output) furnace.output = { id: 0, count: 0 };
    return true;
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
    this.db.delete(key, "blockEntities");

    return drops;
  }

  public tick(deltaTime: number) {
    // deltaTime в секундах - время с последнего кадра
    // Используем for...of вместо forEach (избегаем создания замыкания каждый тик)
    for (const furnace of this.furnaces.values()) {
      // Защита от поврежденных данных печи из IndexedDB
      if (!this.validateFurnaceData(furnace)) continue;

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
        const fuelValue = furnace.fuel ? this.getFuelBurnTime(furnace.fuel.id) : 0;
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
    }
  }

  // Проверяет, можно ли переплавить предмет в печи
  private canSmelt(furnace: FurnaceData): boolean {
    // Защита от поврежденных данных из IndexedDB
    if (!furnace.input || furnace.input.id === 0) return false; // Нет входного предмета
    const result = this.getSmeltingResult(furnace.input.id);
    if (!result) return false; // Предмет нельзя переплавить
    if (!furnace.output || furnace.output.id === 0) return true; // Выходной слот пуст
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
    for (const [key, data] of this.furnaces) {
      promises.push(this.db.set(key, data, "blockEntities"));
    }
    await Promise.all(promises);
    this.dirty = false;
    logger.debug(`Saved ${this.furnaces.size} furnaces to ${this.db.getDbName()}`);
  }

  // Загрузка всех печей из IndexedDB при старте игры
  public async load() {
    try {
      // Очищаем старые печи перед загрузкой (важно при переключении миров)
      this.furnaces.clear();

      const keys = await this.db.keys("blockEntities");
      for (const key of keys) {
        const data = await this.db.get(key as string, "blockEntities");
        if (data) {
          this.furnaces.set(key as string, data);
        }
      }
      logger.debug(`Loaded ${this.furnaces.size} furnaces from ${this.db.getDbName()}`);
    } catch (e) {
      console.warn("Failed to load block entities", e);
    }
  }
}
