// src/modding/index.ts
// Экспорт всех модулей Modding API

// Типы
export * from './types';

// Ядро
export { EventBus, GameEvent, globalEventBus } from './EventBus';
export { BlockRegistry, ItemRegistry, MobRegistry, RecipeRegistry, initVanillaRegistry } from './Registry';

// API
export { ModAPI } from './ModAPI';
export { ConfigAPI } from './ConfigAPI';
export { UIAPI } from './UIAPI';
export { ModAssetManager } from './AssetManager';
export { WorldAPI } from './WorldAPI';
export { PlayerAPI } from './PlayerAPI';

// Загрузка и хранение
export { ModLoader, modLoader, API_VERSION, GAME_VERSION } from './ModLoader';
export { ModStorage, modStorage } from './ModStorage';
export { ModInstaller, modInstaller } from './ModInstaller';

// UI
export { ModManagerUI, modManagerUI } from './ModManagerUI';
