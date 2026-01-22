# refactor: Создана утилита ChunkUtils для устранения дублирования кода

## Изменения

### Новый файл
- `src/utils/ChunkUtils.ts` - централизованные утилиты для работы с чанками

### Функции
- `getBlockIndex(x, y, z, chunkSize, chunkHeight)` - получить индекс блока в массиве
- `chunkToWorld(cx, cz, chunkSize)` - преобразовать координаты чанка в мировые
- `worldToChunk(x, z, chunkSize)` - преобразовать мировые координаты в координаты чанка
- `createBlockIndexGetter(chunkSize, chunkHeight)` - создать функцию с фиксированными параметрами

### Обновлённые файлы
- `src/world/chunks/ChunkLoader.ts` - использует `getBlockIndex` и `createBlockIndexGetter` из ChunkUtils
- `src/world/chunks/ChunkDataManager.ts` - использует `getBlockIndex` из ChunkUtils
- `src/world/chunks/ChunkGenerationQueue.ts` - использует `createBlockIndexGetter` из ChunkUtils
- `src/world/workers/terrain.worker.ts` - использует `getBlockIndex` из ChunkUtils

## Результат

✅ Устранено дублирование функции `getBlockIndex` в 5 файлах  
✅ Улучшена архитектура кода  
✅ Добавлены утилиты для преобразования координат  
✅ Сборка проходит успешно  
✅ Нет ошибок TypeScript

## Время выполнения
~15 минут (как и планировалось)
