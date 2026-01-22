/**
 * Типы для системы реестров блоков, предметов и инструментов
 */

/**
 * Тип блока (для определения, какой инструмент эффективен)
 */
export const BlockType = {
  NONE: "none",       // Нельзя добыть
  EARTH: "earth",     // Земляные блоки (лопата)
  STONE: "stone",     // Каменные блоки (кирка)
  WOOD: "wood",       // Деревянные блоки (топор)
  PLANT: "plant",     // Растения (любой инструмент)
} as const;

export type BlockType = typeof BlockType[keyof typeof BlockType];

/**
 * Тип инструмента
 */
export const ToolType = {
  NONE: "none",
  PICKAXE: "pickaxe",
  AXE: "axe",
  SHOVEL: "shovel",
  SWORD: "sword",
} as const;

export type ToolType = typeof ToolType[keyof typeof ToolType];

/**
 * Материал инструмента
 */
export const ToolMaterial = {
  WOOD: "wood",
  STONE: "stone",
  IRON: "iron",
  DIAMOND: "diamond",  // Для будущего
} as const;

export type ToolMaterial = typeof ToolMaterial[keyof typeof ToolMaterial];

/**
 * Физика блока
 */
export const BlockPhysics = {
  SOLID: "solid",      // Твёрдый блок (нельзя пройти)
  LIQUID: "liquid",    // Жидкость (можно пройти, замедляет)
  GAS: "gas",          // Газ (можно пройти)
  NONE: "none",        // Нет физики (воздух)
} as const;

export type BlockPhysics = typeof BlockPhysics[keyof typeof BlockPhysics];

/**
 * RGB цвет
 */
export interface RGB {
  r: number; // 0.0 - 1.0
  g: number;
  b: number;
}

/**
 * Текстурный паттерн для процедурной генерации
 * Массив из 16 строк по 16 символов:
 * '0' = прозрачный
 * '1' = основной цвет (primary)
 * '2' = вторичный цвет (secondary)
 */
export interface TexturePattern {
  pattern: string[];           // 16x16 паттерн
  colors: {
    primary: string;           // Hex цвет (#RRGGBB)
    secondary: string;         // Hex цвет (#RRGGBB)
  };
}

/**
 * Текстуры блока (для сложных блоков типа верстака, печи)
 */
export interface BlockTextures {
  top?: TexturePattern;        // Текстура верхней грани
  side?: TexturePattern;       // Текстура боковых граней
  bottom?: TexturePattern;     // Текстура нижней грани
  front?: TexturePattern;      // Текстура передней грани (для направленных блоков)
}

/**
 * Базовое определение игрового объекта
 */
export interface GameObjectDefinition {
  id: string;           // Уникальный ID (например, "grass", "wooden_sword")
  numericId: number;    // Числовой ID (для обратной совместимости)
  name: string;         // Название для UI
  description?: string; // Описание
  stackSize: number;    // Максимальный размер стака (64 по умолчанию)
  
  // PNG текстуры (опционально, для будущего/модов)
  texturePath?: string;     // Путь к PNG текстуре (если null - процедурная генерация)
  iconPath?: string;        // Путь к PNG иконке (если null - процедурная генерация)
}

/**
 * Дроп блока
 */
export interface BlockDrop {
  itemId: string;               // ID предмета
  count: number | [number, number]; // Количество или диапазон [min, max]
  chance?: number;              // Шанс выпадения (0.0 - 1.0, по умолчанию 1.0)
  requiresTool?: ToolType;      // Требуется инструмент для дропа
}

/**
 * Определение блока
 */
export interface BlockDefinition extends GameObjectDefinition {
  type: BlockType;              // Тип блока
  physics: BlockPhysics;        // Физика блока
  
  // Характеристики ломания
  breakTime: number;            // Базовое время ломания (мс)
  requiredTool?: ToolType;      // Требуемый инструмент (если null - любой)
  minToolMaterial?: ToolMaterial; // Минимальный материал инструмента
  
  // Дроп
  drops: BlockDrop[];           // Что выпадает при ломании
  
  // Рендеринг (процедурная генерация)
  // Для простых блоков - используем colors (vertex colors)
  colors?: {
    top: RGB;
    side: RGB;
    bottom?: RGB;
  };
  // Для сложных блоков - используем textures (паттерны)
  textures?: BlockTextures;
  transparent?: boolean;        // Прозрачный блок (листья, стекло)
  
  // Функциональность
  isInteractable?: boolean;     // Можно ли взаимодействовать (верстак, печь)
  onInteract?: string;          // Имя функции-обработчика
  isPlaceable?: boolean;        // Можно ли установить в мир (по умолчанию true)
}

/**
 * Определение предмета
 */
export interface ItemDefinition extends GameObjectDefinition {
  // Еда
  isFood?: boolean;
  foodValue?: number;           // Сколько HP восстанавливает
  eatTime?: number;             // Время поедания (секунды)
  
  // Топливо
  isFuel?: boolean;
  burnTime?: number;            // Время горения (секунды)
  
  // Специальные эффекты
  onUse?: string;               // Имя функции-обработчика (для broken_compass)
  
  // Рендеринг (процедурная генерация)
  color?: string;               // Цвет для процедурной генерации (hex)
  texture?: TexturePattern;     // Паттерн для процедурной генерации
}

/**
 * Определение инструмента
 */
export interface ToolDefinition extends GameObjectDefinition {
  toolType: ToolType;           // Тип инструмента
  material: ToolMaterial;       // Материал
  
  // Характеристики
  durability: number;           // Прочность (количество использований)
  speedMultiplier: number;      // Множитель скорости добычи
  damage?: number;              // Урон (для мечей)
  
  // Рендеринг (процедурная генерация)
  color?: string;               // Цвет для процедурной генерации (hex)
  texture?: TexturePattern;     // Паттерн для процедурной генерации
  
  // 3D модель (опционально, для будущего)
  model?: string;               // Путь к 3D модели
}
