# Унифицированная система текстур

## Обзор

Система текстур в QubeForge использует единый подход для отображения блоков во всех контекстах:
- В мире (установленные блоки)
- В инвентаре (иконки)
- В руке игрока
- В виде дропов (выпавшие предметы)

## Два типа блоков

### 1. Блоки с Vertex Colors (простые)

Используют поле `colors` в определении блока:

```typescript
export const DIRT_BLOCK: BlockDefinition = {
  id: "dirt",
  numericId: 2,
  
  colors: {
    top: { r: 0.54, g: 0.27, b: 0.07 },
    side: { r: 0.54, g: 0.27, b: 0.07 },
  },
  
  // ...
};
```

**Как работает:**
- Используют **слот 0** текстурного атласа (базовый шум)
- Цвет задаётся через vertex colors (RGB значения)
- Шум добавляет зернистость текстуре
- Примеры: трава, земля, камень, дерево

### 2. Блоки с Texture Patterns (сложные)

Используют поле `textures` в определении блока:

```typescript
export const CRAFTING_TABLE_BLOCK: BlockDefinition = {
  id: "crafting_table",
  numericId: 10,
  
  textures: {
    top: {
      pattern: CRAFTING_TABLE_TOP_PATTERN,
      colors: { primary: "#8B4513", secondary: "#D2691E" }
    },
    side: {
      pattern: CRAFTING_TABLE_SIDE_PATTERN,
      colors: { primary: "#8B4513", secondary: "#D2691E" }
    },
    bottom: {
      pattern: PLANKS_PATTERN,
      colors: { primary: "#C19A6B", secondary: "#8B7355" }
    }
  },
  
  // ...
};
```

**Как работает:**
- Автоматически выделяются слоты в текстурном атласе (1-11)
- Паттерны рисуются процедурно при инициализации
- Каждая грань может иметь свой паттерн
- Поддерживается прозрачность (символ '0' в паттерне)
- Примеры: верстак, печь, руды, доски, листва

**Прозрачность:**
- Символ '0' в паттерне = полностью прозрачный пиксель
- Символ '1' = primary цвет
- Символ '2' = secondary цвет
- Для блоков с `transparent: true` добавляется случайная прозрачность (30% пикселей)

## Автоматическая система слотов

### TextureAtlas

`TextureAtlas` автоматически:
1. Сканирует все блоки в `BlockRegistry`
2. Находит блоки с полем `textures`
3. Выделяет слоты для каждой грани
4. Рисует паттерны в атлас
5. Сохраняет маппинг `numericId → slots`

```typescript
// Автоматическое получение слота
const slot = TextureAtlas.getSlot(blockNumericId, "top");
// Для блоков с colors → возвращает 0 (базовый шум)
// Для блоков с textures → возвращает выделенный слот (1-11)
```

### Использование в рендерерах

Все рендереры используют единый метод `TextureAtlas.getSlot()`:

**ChunkMeshBuilder** (блоки в мире):
```typescript
const slot = TextureAtlas.getSlot(type, actualSide);
```

**ItemRenderer** (дропы):
```typescript
const texIdx = TextureAtlas.getSlot(type, faceName);
```

**PlayerHand** (блоки в руке):
```typescript
const texIdx = TextureAtlas.getSlot(id, faceName);
```

## Иконки для инвентаря

Для блоков с `textures` автоматически генерируются иконки:

```typescript
// В ToolTextures.ts
const allBlocks = BlockRegistry.getAll();
for (const block of allBlocks) {
  if (block.textures?.top) {
    TOOL_TEXTURES[block.numericId] = TextureGenerator.generateBlockIcon(
      block.textures.top.pattern,
      block.textures.top.colors,
    );
  }
}
```

Для блоков с `colors` иконки не нужны - они отображаются как мини-кубики с vertex colors.

## Добавление нового блока

### Простой блок (с colors)

1. Создать определение в `src/registry/blocks/`:
```typescript
export const MY_BLOCK: BlockDefinition = {
  id: "my_block",
  numericId: 20,
  colors: {
    top: { r: 1.0, g: 0.0, b: 0.0 }, // Красный
    side: { r: 0.8, g: 0.0, b: 0.0 },
  },
};
```

2. Экспортировать из `index.ts`
3. Готово! Блок автоматически зарегистрируется и будет работать везде

### Сложный блок (с textures)

1. Создать паттерн в определении блока:
```typescript
// Паттерн 16x16, где:
// '0' = прозрачный пиксель
// '1' = primary цвет
// '2' = secondary цвет
const MY_PATTERN = [
  "1111111111111111",
  "1222222222222221",
  // ... 16 строк по 16 символов
];
```

2. Создать определение в `src/registry/blocks/`:
```typescript
export const MY_BLOCK: BlockDefinition = {
  id: "my_block",
  numericId: 20,
  textures: {
    top: {
      pattern: MY_PATTERN,
      colors: { primary: "#FF0000", secondary: "#880000" }
    }
  },
  transparent: true, // Если нужна дополнительная случайная прозрачность
};
```

3. Экспортировать из `index.ts`
4. Готово! TextureAtlas автоматически:
   - Выделит слот
   - Нарисует паттерн с прозрачностью
   - Создаст иконку для инвентаря

### Прозрачный блок (например, листва)

```typescript
const LEAVES_PATTERN = [
  "1101101011011010", // 0 = прозрачные дырки
  "0110110101101101",
  // ... паттерн с дырками
];

export const LEAVES_BLOCK: BlockDefinition = {
  id: "leaves",
  numericId: 6,
  textures: {
    top: {
      pattern: LEAVES_PATTERN,
      colors: { primary: "#228B22", secondary: "#228B22" }
    }
  },
  transparent: true, // Добавит 30% случайной прозрачности
};
```

## Преимущества системы

1. **Единообразие**: Блоки выглядят одинаково везде (мир, инвентарь, рука, дроп)
2. **Автоматизация**: Не нужно вручную прописывать слоты и иконки
3. **Расширяемость**: Легко добавлять новые блоки
4. **Производительность**: Один material для всех блоков (меньше draw calls)
5. **Гибкость**: Можно использовать как простые цвета, так и сложные паттерны

## Ограничения

- Максимум 12 слотов в атласе (slot 0 = шум, slots 1-11 = блоки)
- Если нужно больше блоков с текстурами, нужно увеличить `SLOT_COUNT` в `TextureAtlas`
- Паттерны должны быть 16x16 пикселей

## Связанные файлы

- `src/world/generation/TextureAtlas.ts` - Генерация атласа
- `src/world/chunks/ChunkMeshBuilder.ts` - Рендеринг блоков в мире
- `src/entities/ItemRenderer.ts` - Рендеринг дропов
- `src/player/PlayerHand.ts` - Рендеринг блоков в руке
- `src/constants/ToolTextures.ts` - Генерация иконок для инвентаря
- `src/registry/types.ts` - Типы для определений блоков
- `doc/TEXTURE_ATLAS_AUTOMATION.md` - Детали автоматизации атласа
