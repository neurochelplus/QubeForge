# CSS Architecture

## Модульная структура стилей

Файл `src/style.css` разбит на 9 модулей по функциональному назначению:

### 1. **base.css** — Глобальные стили
- Импорт шрифта Press Start 2P
- Базовые стили body, canvas
- Сброс отступов, overflow

### 2. **loading.css** — Экран загрузки
- `#loading-screen` — полноэкранный оверлей
- `#loading-bar-container` — контейнер прогресс-бара
- `#loading-bar-inner` — анимация заполнения

### 3. **ui-overlay.css** — Оверлеи интерфейса
- `#blocker` — блокировка указателя (pointer lock)
- `#instructions` — подсказки управления
- `#damage-overlay` — красная вспышка при уроне
- `#crosshair` — прицел (псевдоэлементы)

### 4. **health-hotbar.css** — Здоровье и хотбар
- `#ui-container` — контейнер нижнего UI
- `#health-bar` — сердечки здоровья
- `#hotbar` — панель быстрого доступа (9 слотов)
- `.slot` — стили слотов (активный, hover, счётчик, прочность)
- `.block-icon` — иконки предметов (блоки, инструменты, палки)

### 5. **inventory.css** — Инвентарь
- `#inventory-menu` — модальное окно инвентаря
- `#inventory-grid` — сетка 9×4 слотов
- `#btn-close-inv` — кнопка закрытия (мобильная)
- `#drag-icon` — иконка перетаскивания
- `#tooltip` — всплывающая подсказка

### 6. **crafting.css** — Крафтинг и печи
- `#crafting-area` — область крафта (2×2 / 3×3)
- `#crafting-grid-container` — сетка крафта
- `#crafting-result-container` — слот результата
- `#mobile-crafting-list` — список рецептов (мобильный)
- `.furnace-container` — интерфейс печи
- `.furnace-flame` — анимация огня

### 7. **menus.css** — Меню игры
- `#bg-video` — фоновое видео
- `#main-menu` — главное меню (логотип + кнопки)
- `#pause-menu` — меню паузы
- `#settings-menu` — настройки
- `.menu-btn` — стилизованные кнопки (3D эффект, hover, active)

### 8. **mobile.css** — Мобильные контролы
- `#mobile-ui` — контейнер мобильного UI
- `#joystick-zone` — виртуальный джойстик
- `#mobile-actions` — кнопки действий (прыжок, атака)
- `#btn-inv`, `#btn-menu`, `#btn-run` — кнопки интерфейса
- `.is-mobile` — адаптивные стили (уменьшенные слоты, закрытие инвентаря)

### 9. **cli.css** — Консоль команд
- `#cli-container` — контейнер консоли (нижняя часть экрана)
- `#cli-input` — поле ввода команд

## Принципы организации

### Разделение ответственности
- Каждый модуль отвечает за одну область UI
- Нет дублирования стилей между модулями
- Легко найти и изменить конкретный компонент

### Порядок импорта
1. **base** — глобальные стили (применяются первыми)
2. **loading** — экран загрузки (z-index: 9999)
3. **ui-overlay** — оверлеи (z-index: 10-20)
4. **health-hotbar** — игровой UI (z-index: 5)
5. **inventory** — инвентарь (z-index: 20-30)
6. **crafting** — крафтинг (z-index: 25)
7. **menus** — меню (z-index: 100)
8. **mobile** — мобильные контролы (z-index: 50-55)
9. **cli** — консоль (z-index: 100)

### Z-Index иерархия
```
9999 — Loading Screen
100  — Menus, CLI
55   — Mobile Run Button
50   — Mobile UI
30   — Tooltip
26   — Close Inventory Button
25   — Mobile Crafting List
20   — Inventory Menu, Crosshair
15   — Damage Overlay
10   — Blocker
5    — UI Container (Health, Hotbar)
0    — Background Video
```

## Рекомендации по изменению

### Добавление нового компонента
1. Определите категорию (UI overlay, inventory, mobile и т.д.)
2. Добавьте стили в соответствующий модуль
3. Если компонент не вписывается ни в один модуль — создайте новый файл
4. Добавьте `@import` в `src/style.css`

### Изменение существующих стилей
- **Hotbar/Health:** `health-hotbar.css`
- **Inventory slots:** `inventory.css`
- **Crafting grid:** `crafting.css`
- **Menu buttons:** `menus.css`
- **Mobile joystick:** `mobile.css`

### Адаптация под мобильные
- Используйте класс `.is-mobile` (добавляется JS)
- Мобильные переопределения в `mobile.css`
- Уменьшайте размеры слотов/кнопок через медиа-запросы

## Производительность

### Оптимизация
- CSS модули объединяются Vite в один файл при сборке
- Минификация и gzip сжатие (10.03 kB → 2.57 kB)
- Нет избыточных селекторов или дублирования

### Рендеринг
- Используйте `transform` вместо `top/left` для анимаций
- `will-change` для часто анимируемых элементов (не используется сейчас)
- `image-rendering: pixelated` для пиксельной графики

## Совместимость

### Браузеры
- Chrome/Edge: ✅ Полная поддержка
- Firefox: ✅ Полная поддержка
- Safari: ✅ Требует `-webkit-` префиксы (scrollbar)

### Мобильные
- iOS Safari: ✅ Виртуальный джойстик
- Android Chrome: ✅ Touch events
- Viewport units (vh/vw): ✅ Адаптивные размеры
