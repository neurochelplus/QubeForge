import { BlockRegistry } from "./BlockRegistry";
import { ToolRegistry } from "./ToolRegistry";
import { ToolType, ToolMaterial } from "./types";

/**
 * Калькулятор времени ломания блоков
 * Использует реестры для определения времени ломания с учётом инструмента
 */
export class BreakTimeCalculator {
  /**
   * Получить время ломания блока с учётом инструмента
   * @param blockNumericId - числовой ID блока
   * @param toolNumericId - числовой ID инструмента (0 = рука)
   * @returns время ломания в миллисекундах
   */
  public static getBreakTime(
    blockNumericId: number,
    toolNumericId: number = 0,
  ): number {
    // Получить определение блока
    const blockDef = BlockRegistry.getByNumericId(blockNumericId);
    if (!blockDef) {
      console.warn(`Block with numericId ${blockNumericId} not found in registry`);
      return 1000; // Дефолтное время
    }

    // Если блок неразрушимый
    if (blockDef.breakTime === Infinity) {
      return Infinity;
    }

    // Если ломаем рукой (toolNumericId === 0)
    if (toolNumericId === 0) {
      return blockDef.breakTime;
    }

    // Получить определение инструмента
    const toolDef = ToolRegistry.getByNumericId(toolNumericId);
    if (!toolDef) {
      // Инструмент не найден, возможно это предмет - ломаем как рукой
      return blockDef.breakTime;
    }

    // Проверить, подходит ли инструмент для этого блока
    const isCorrectTool = this.isCorrectTool(blockDef.requiredTool, toolDef.toolType);
    
    // Проверить, достаточен ли материал инструмента
    const hasRequiredMaterial = this.hasRequiredMaterial(
      blockDef.minToolMaterial,
      toolDef.material,
    );

    // Если инструмент подходит и материал достаточен
    if (isCorrectTool && hasRequiredMaterial) {
      // Применить множитель скорости инструмента
      return blockDef.breakTime / toolDef.speedMultiplier;
    }

    // Если инструмент не подходит или материал недостаточен
    // Возвращаем базовое время (как рукой)
    return blockDef.breakTime;
  }

  /**
   * Проверить, подходит ли тип инструмента для блока
   */
  private static isCorrectTool(
    requiredTool: ToolType | undefined,
    toolType: ToolType,
  ): boolean {
    // Если блок не требует специального инструмента
    if (!requiredTool || requiredTool === ToolType.NONE) {
      return true;
    }

    // Проверить соответствие типа
    return requiredTool === toolType;
  }

  /**
   * Проверить, достаточен ли материал инструмента
   */
  private static hasRequiredMaterial(
    minMaterial: ToolMaterial | undefined,
    toolMaterial: ToolMaterial,
  ): boolean {
    // Если блок не требует минимального материала
    if (!minMaterial) {
      return true;
    }

    // Порядок материалов по качеству
    const materialOrder = [
      ToolMaterial.WOOD,
      ToolMaterial.STONE,
      ToolMaterial.IRON,
      ToolMaterial.DIAMOND,
    ];

    const minIndex = materialOrder.indexOf(minMaterial);
    const toolIndex = materialOrder.indexOf(toolMaterial);

    // Материал инструмента должен быть >= минимального
    return toolIndex >= minIndex;
  }

  /**
   * Проверить, можно ли добыть блок данным инструментом
   * (получить дроп)
   */
  public static canHarvest(
    blockNumericId: number,
    toolNumericId: number = 0,
  ): boolean {
    const blockDef = BlockRegistry.getByNumericId(blockNumericId);
    if (!blockDef) return false;

    // Если блок не требует инструмента для дропа
    if (!blockDef.drops || blockDef.drops.length === 0) {
      return true;
    }

    // Проверить требования дропа
    const drop = blockDef.drops[0]; // Берём первый дроп
    if (!drop.requiresTool) {
      return true; // Дропается без инструмента
    }

    // Если ломаем рукой
    if (toolNumericId === 0) {
      return false;
    }

    // Получить инструмент
    const toolDef = ToolRegistry.getByNumericId(toolNumericId);
    if (!toolDef) return false;

    // Проверить тип инструмента
    const isCorrectTool = this.isCorrectTool(drop.requiresTool, toolDef.toolType);
    
    // Проверить материал
    const hasRequiredMaterial = this.hasRequiredMaterial(
      blockDef.minToolMaterial,
      toolDef.material,
    );

    return isCorrectTool && hasRequiredMaterial;
  }
}
