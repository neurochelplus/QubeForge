# Автоматическая регистрация в реестрах

**Дата:** 22 января 2026  
**Статус:** ✅ Реализовано

---

## 🎯 Цель

Упростить добавление новых блоков, предметов и инструментов, минимизировав количество файлов, которые нужно редактировать.

---

## 📊 Сравнение

### До (ручная регистрация)

При добавлении нового блока нужно было редактировать **4 файла**:

1. ✏️ Создать `src/registry/blocks/category/my_block.ts`
2. ✏️ Добавить экспорт в `src/registry/blocks/index.ts`
3. ✏️ **Импортировать и зарегистрировать в `src/registry/BlockRegistry.ts`**
4. ✏️ Добавить ID в `src/constants/Blocks.ts`

```typescript
// BlockRegistry.ts - НУЖНО БЫЛО РЕДАКТИРОВАТЬ!
import { MY_BLOCK } from "./blocks/category/my_block";

public static init(): void {
  // ...
  this.register(MY_BLOCK); // Легко забыть!
}
```

**Проблемы:**
- ❌ Легко забыть зарегистрировать блок
- ❌ Нужно редактировать `BlockRegistry.ts` при каждом новом блоке
- ❌ Больше файлов = больше конфликтов при работе в команде

---

### После (автоматическая регистрация)

При добавлении нового блока нужно редактировать **3 файла**:

1. ✏️ Создать `src/registry/blocks/category/my_block.ts`
2. ✏️ Добавить экспорт в `src/registry/blocks/index.ts`
3. ✏️ Добавить ID в `src/constants/Blocks.ts`

```typescript
// blocks/index.ts - просто добавляем экспорт
export { MY_BLOCK } from "./category/my_block";

// BlockRegistry.ts - НЕ НУЖНО РЕДАКТИРОВАТЬ!
// Автоматически подхватит все экспорты
```

**Преимущества:**
- ✅ Невозможно забыть зарегистрировать блок
- ✅ Меньше файлов для редактирования
- ✅ Меньше конфликтов при работе в команде
- ✅ Проще для новичков

---

## 🔧 Реализация

### BlockRegistry

```typescript
import type { BlockDefinition } from "./types";
import * as AllBlocks from "./blocks/index";

export class BlockRegistry {
  public static init(): void {
    // Автоматически регистрируем все блоки из ./blocks/index.ts
    Object.values(AllBlocks).forEach((block) => {
      if (this.isBlockDefinition(block)) {
        this.register(block);
      }
    });
  }

  private static isBlockDefinition(obj: unknown): obj is BlockDefinition {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "numericId" in obj &&
      "type" in obj
    );
  }
}
```

### ItemRegistry

```typescript
import type { ItemDefinition } from "./types";
import * as AllItems from "./items/index";

export class ItemRegistry {
  public static init(): void {
    // Автоматически регистрируем все предметы из ./items/index.ts
    Object.values(AllItems).forEach((item) => {
      if (this.isItemDefinition(item)) {
        this.register(item);
      }
    });
  }

  private static isItemDefinition(obj: unknown): obj is ItemDefinition {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "numericId" in obj &&
      "stackSize" in obj
    );
  }
}
```

### ToolRegistry

```typescript
import type { ToolDefinition } from "./types";
import * as AllTools from "./tools/index";

export class ToolRegistry {
  public static init(): void {
    // Автоматически регистрируем все инструменты из ./tools/index.ts
    Object.values(AllTools).forEach((tool) => {
      if (this.isToolDefinition(tool)) {
        this.register(tool);
      }
    });
  }

  private static isToolDefinition(obj: unknown): obj is ToolDefinition {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "id" in obj &&
      "numericId" in obj &&
      "toolType" in obj &&
      "material" in obj
    );
  }
}
```

---

## 📝 Как добавить новый блок

### Шаг 1: Создать определение

```typescript
// src/registry/blocks/natural/sand.ts
import type { BlockDefinition } from "../../types";
import { BlockType, BlockPhysics, ToolType } from "../../types";

export const SAND_BLOCK: BlockDefinition = {
  id: "sand",
  numericId: 15,
  name: "Sand",
  type: BlockType.EARTH,
  physics: BlockPhysics.SOLID,
  breakTime: 500,
  requiredTool: ToolType.SHOVEL,
  drops: [{ itemId: "sand", count: 1, chance: 1.0 }],
  colors: {
    top: { r: 0.93, g: 0.87, b: 0.69 },
    side: { r: 0.93, g: 0.87, b: 0.69 },
  },
  stackSize: 64,
};
```

### Шаг 2: Экспортировать

```typescript
// src/registry/blocks/index.ts
export { SAND_BLOCK } from "./natural/sand";
```

### Шаг 3: Добавить ID

```typescript
// src/constants/Blocks.ts
export const BLOCK = {
  // ...
  SAND: 15,
};
```

**Готово!** Блок автоматически зарегистрируется при `BlockRegistry.init()`.

---

## 🧪 Проверка

При запуске игры в консоли появится:

```
Initializing BlockRegistry...
BlockRegistry initialized with 12 blocks
```

Если блок не зарегистрировался:
1. Проверьте, что он экспортирован в `blocks/index.ts`
2. Проверьте, что экспорт имеет правильный формат: `export { BLOCK_NAME } from "..."`
3. Проверьте, что объект соответствует интерфейсу `BlockDefinition`

---

## 🚀 Преимущества для моддинга

Моды могут создавать свои `index.ts` файлы:

```typescript
// mod/blocks/index.ts
export { CUSTOM_BLOCK_1 } from "./custom_block_1";
export { CUSTOM_BLOCK_2 } from "./custom_block_2";

// mod/init.ts
import * as ModBlocks from "./blocks/index";

Object.values(ModBlocks).forEach((block) => {
  BlockRegistry.register(block);
});
```

---

## 📊 Статистика

- **Блоков:** 11 (автоматически зарегистрировано)
- **Предметов:** 6 (автоматически зарегистрировано)
- **Инструментов:** 12 (автоматически зарегистрировано)
- **Итого:** 29 игровых объектов

---

## 🔗 Связанные документы

- [REGISTRY_SYSTEM.md](REGISTRY_SYSTEM.md) - Полная документация системы реестров
- [TEXTURE_ATLAS_MIGRATION.md](TEXTURE_ATLAS_MIGRATION.md) - Миграция текстурных паттернов

---

**Последнее обновление:** 22 января 2026
