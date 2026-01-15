# Звуковые файлы QubeForge

Формат: `.ogg` (Vorbis) — оптимальный баланс качества и размера.

## Структура папок

```
sounds/
├── music/          # Фоновая музыка
│   ├── game_day.ogg
│   ├── game_night.ogg
│   └── combat.ogg
│
├── blocks/         # Звуки блоков
│   ├── break_stone_1.ogg ... break_stone_4.ogg
│   ├── break_wood_1.ogg ... break_wood_3.ogg
│   ├── break_dirt_1.ogg ... break_dirt_3.ogg
│   ├── place_stone.ogg
│   ├── place_wood.ogg
│   └── place_dirt.ogg
│
├── mobs/           # Звуки мобов
│   ├── zombie_hurt_1.ogg ... zombie_hurt_3.ogg
│   ├── zombie_death.ogg
│   ├── zombie_ambient_1.ogg ... zombie_ambient_3.ogg
│   ├── boar_hurt.ogg
│   └── boar_death.ogg
│
├── player/         # Звуки игрока
│   ├── hurt_1.ogg ... hurt_3.ogg
│   ├── death.ogg
│   ├── jump.ogg
│   ├── land.ogg
│   └── attack_swing.ogg
│
├── ui/             # UI звуки
│   ├── click.ogg
│   ├── inventory_open.ogg
│   ├── inventory_close.ogg
│   └── item_pickup.ogg
│
└── ambient/        # Окружение
    ├── wind_1.ogg ... wind_3.ogg
    └── cave_1.ogg ... cave_3.ogg
```

## Рекомендации по созданию

- Битрейт: 96-128 kbps (достаточно для игровых эффектов)
- Частота: 44100 Hz
- Каналы: Mono для эффектов, Stereo для музыки
- Длительность эффектов: 0.3-2 секунды
- Нормализация: -3 dB peak

## Источники бесплатных звуков

- [Freesound.org](https://freesound.org) — CC0/CC-BY лицензии
- [OpenGameArt.org](https://opengameart.org) — игровые ассеты
- [Kenney.nl](https://kenney.nl) — CC0 звуки
