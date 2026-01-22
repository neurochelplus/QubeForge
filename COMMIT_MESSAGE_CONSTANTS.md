# refactor: Централизация констант генерации мира

## Изменения

### Обновлённые файлы

#### `src/world/generation/TerrainGenerator.ts`
- Заменены хардкод константы на импорт из `WORLD_GENERATION`
- `TERRAIN_SCALE`, `TERRAIN_HEIGHT`, `BASE_HEIGHT` теперь берутся из централизованного файла

#### `src/world/generation/StructureGenerator.ts`
- Добавлен импорт `WORLD_GENERATION`
- Используются константы для генерации деревьев: `TREE_CHANCE`, `TREE_MIN_HEIGHT`, `TREE_MAX_HEIGHT`
- Используются константы для генерации руд: `COAL_VEIN_SIZE`, `COAL_ATTEMPTS`, `IRON_VEIN_SIZE`, `IRON_ATTEMPTS`

#### `src/world/chunks/ChunkManager.ts`
- Добавлен импорт `WORLD_GENERATION`
- Используются константы: `CHUNK_SIZE`, `CHUNK_HEIGHT`, `CHUNK_RADIUS`, `UPDATE_INTERVAL`
- Используются константы для очистки памяти: `MEMORY_CLEANUP_CHANCE_MOBILE`, `MEMORY_CLEANUP_CHANCE_DESKTOP`

#### `src/world/workers/terrain.worker.ts`
- Добавлен импорт `WORLD_GENERATION`
- Все константы генерации теперь берутся из централизованного файла
- Улучшена консистентность между главным потоком и воркером

## Результат

✅ Все константы генерации мира централизованы в `src/constants/WorldConstants.ts`  
✅ Легко изменять параметры генерации в одном месте  
✅ Улучшена поддерживаемость кода  
✅ Консистентность между главным потоком и Web Workers  
✅ Сборка проходит успешно  
✅ Нет ошибок TypeScript

## Преимущества

1. **Единая точка настройки** - все параметры генерации в одном файле
2. **Легко экспериментировать** - изменение одной константы влияет на всю систему
3. **Консистентность** - воркеры и главный поток используют одинаковые значения
4. **Документация** - константы собраны вместе с комментариями

## Время выполнения
~30 минут (как и планировалось)
