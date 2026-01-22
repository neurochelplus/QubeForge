/**
 * Утилиты для работы с чанками
 * Централизованные функции для преобразования координат и индексов
 */

/**
 * Получить индекс блока в одномерном массиве чанка
 * @param x - локальная X координата (0 до chunkSize-1)
 * @param y - Y координата (0 до chunkHeight-1)
 * @param z - локальная Z координата (0 до chunkSize-1)
 * @param chunkSize - размер чанка (обычно 32)
 * @param chunkHeight - высота чанка (обычно 128)
 * @returns индекс в одномерном массиве
 */
export function getBlockIndex(
  x: number,
  y: number,
  z: number,
  chunkSize: number,
  chunkHeight: number,
): number {
  return x + y * chunkSize + z * chunkSize * chunkHeight;
}

/**
 * Преобразовать координаты чанка в мировые координаты
 * @param cx - X координата чанка
 * @param cz - Z координата чанка
 * @param chunkSize - размер чанка
 * @returns объект с мировыми координатами { worldX, worldZ }
 */
export function chunkToWorld(
  cx: number,
  cz: number,
  chunkSize: number,
): { worldX: number; worldZ: number } {
  return {
    worldX: cx * chunkSize,
    worldZ: cz * chunkSize,
  };
}

/**
 * Преобразовать мировые координаты в координаты чанка
 * @param x - мировая X координата
 * @param z - мировая Z координата
 * @param chunkSize - размер чанка
 * @returns объект с координатами чанка { cx, cz }
 */
export function worldToChunk(
  x: number,
  z: number,
  chunkSize: number,
): { cx: number; cz: number } {
  return {
    cx: Math.floor(x / chunkSize),
    cz: Math.floor(z / chunkSize),
  };
}

/**
 * Создать функцию getBlockIndex с фиксированными размерами чанка
 * Полезно для передачи в генераторы
 * @param chunkSize - размер чанка
 * @param chunkHeight - высота чанка
 * @returns функция getBlockIndex с фиксированными параметрами
 */
export function createBlockIndexGetter(
  chunkSize: number,
  chunkHeight: number,
): (x: number, y: number, z: number) => number {
  return (x: number, y: number, z: number) =>
    getBlockIndex(x, y, z, chunkSize, chunkHeight);
}
