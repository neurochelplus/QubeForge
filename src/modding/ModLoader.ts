// src/modding/ModLoader.ts
// Загрузка и управление модами

import type { ModManifest, ModDefinition } from './types';
import { ModAPI } from './ModAPI';
import { globalEventBus } from './EventBus';
import { initVanillaRegistry } from './Registry';
import { modStorage } from './ModStorage';

export const API_VERSION = '1.0';
export const GAME_VERSION = '1.0.0';

interface InternalLoadedMod {
  manifest: ModManifest;
  definition: ModDefinition;
  api: ModAPI;
  enabled: boolean;
}

/**
 * Загрузчик модов
 */
export class ModLoader {
  private mods: Map<string, InternalLoadedMod> = new Map();
  private pendingMods: Map<string, { manifest: ModManifest; definition: ModDefinition }> = new Map();
  private game: unknown = null;
  private initialized: boolean = false;

  constructor() {
    // Инициализация ванильных регистров
    initVanillaRegistry();

    // Создание глобального API для модов
    this.setupGlobalAPI();
  }

  /**
   * Настройка глобального API window.QubeForge
   */
  private setupGlobalAPI(): void {
    window.QubeForge = {
      registerMod: (id: string, manifest: Omit<ModManifest, 'id'>, definition: ModDefinition) => {
        this.pendingMods.set(id, {
          manifest: { ...manifest, id } as ModManifest,
          definition,
        });
        console.log(`[ModLoader] Mod "${id}" registered, waiting for initialization`);
      },
      API_VERSION,
      GAME_VERSION,
    };
  }

  /**
   * Установить ссылку на игру
   */
  setGame(game: unknown): void {
    this.game = game;
  }

  /**
   * Загрузить все моды
   */
  async loadAllMods(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      // 1. Инициализировать хранилище
      await modStorage.init();

      // 2. Загрузить моды из IndexedDB
      const enabledMods = await modStorage.getEnabledMods();

      for (const storedMod of enabledMods) {
        await this.loadModFromCode(storedMod.code, storedMod.manifest);
      }

      // 3. Загрузить pending моды (встроенные через <script>)
      await this.loadPendingMods();

      console.log(`[ModLoader] Loaded ${this.mods.size} mods`);
    } catch (error) {
      console.error('[ModLoader] Failed to load mods:', error);
    }
  }

  /**
   * Загрузить мод из кода
   */
  private async loadModFromCode(code: string, manifest: ModManifest): Promise<void> {
    try {
      // Создать Blob из кода
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      // Загрузить через <script>
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        script.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error(`Failed to load mod script: ${manifest.id}`));
        };
        document.head.appendChild(script);
      });

      // Мод должен был зарегистрироваться через QubeForge.registerMod()
      const pending = this.pendingMods.get(manifest.id);
      if (pending) {
        await this.initializeMod(pending.manifest, pending.definition);
        this.pendingMods.delete(manifest.id);
      }
    } catch (error) {
      console.error(`[ModLoader] Failed to load mod "${manifest.id}":`, error);
    }
  }

  /**
   * Загрузить pending моды
   */
  private async loadPendingMods(): Promise<void> {
    // Разрешить зависимости и отсортировать
    const manifests = [...this.pendingMods.values()].map((m) => m.manifest);
    const sorted = this.resolveDependencies(manifests);

    for (const manifest of sorted) {
      const pending = this.pendingMods.get(manifest.id);
      if (!pending) continue;

      // Пропустить уже загруженные
      if (this.mods.has(manifest.id)) continue;

      await this.initializeMod(pending.manifest, pending.definition);
    }

    this.pendingMods.clear();
  }

  /**
   * Инициализировать мод
   */
  private async initializeMod(manifest: ModManifest, definition: ModDefinition): Promise<void> {
    try {
      // Валидация
      this.validateManifest(manifest);
      this.checkApiVersion(manifest.apiVersion);

      // Создание API для мода
      const api = new ModAPI(
        manifest.id,
        manifest.version,
        manifest.apiVersion,
        manifest.permissions,
        globalEventBus
      );

      // Инъекция зависимостей
      if (this.game) {
        const g = this.game as {
          world?: unknown;
          environment?: unknown;
          player?: unknown;
          inventory?: unknown;
        };
        api._injectDependencies(g.world, g.environment, g.player, g.inventory);
      }

      // Инициализация мода
      definition.init(api);
      definition.onEnable?.();

      this.mods.set(manifest.id, {
        manifest,
        definition,
        api,
        enabled: true,
      });

      console.log(`[ModLoader] ✅ Loaded: ${manifest.name} v${manifest.version}`);
    } catch (error) {
      console.error(`[ModLoader] ❌ Failed to load "${manifest.id}":`, error);
    }
  }

  /**
   * Включить/выключить мод
   */
  toggleMod(modId: string, enabled: boolean): void {
    const mod = this.mods.get(modId);
    if (!mod) return;

    if (enabled && !mod.enabled) {
      mod.definition.onEnable?.();
      mod.enabled = true;
    } else if (!enabled && mod.enabled) {
      mod.definition.onDisable?.();
      mod.api._cleanup();
      mod.enabled = false;
    }
  }

  /**
   * Получить список загруженных модов
   */
  getLoadedMods(): { id: string; name: string; version: string; enabled: boolean }[] {
    return [...this.mods.values()].map((m) => ({
      id: m.manifest.id,
      name: m.manifest.name,
      version: m.manifest.version,
      enabled: m.enabled,
    }));
  }

  /**
   * Валидация манифеста
   */
  private validateManifest(manifest: ModManifest): void {
    if (!manifest.id || !manifest.name || !manifest.version) {
      throw new Error('Invalid manifest: missing required fields');
    }
    if (!manifest.apiVersion) {
      throw new Error('Invalid manifest: apiVersion is required');
    }
    if (!Array.isArray(manifest.permissions)) {
      throw new Error('Invalid manifest: permissions must be an array');
    }
  }

  /**
   * Проверка версии API
   */
  private checkApiVersion(apiVersion: string): void {
    const [major] = apiVersion.split('.').map(Number);
    const [currentMajor] = API_VERSION.split('.').map(Number);

    if (major !== currentMajor) {
      throw new Error(`API version mismatch: mod requires ${apiVersion}, game has ${API_VERSION}`);
    }
  }

  /**
   * Разрешение зависимостей (топологическая сортировка)
   */
  private resolveDependencies(manifests: ModManifest[]): ModManifest[] {
    const graph = new Map<string, string[]>();
    const manifestMap = new Map<string, ModManifest>();

    for (const manifest of manifests) {
      graph.set(manifest.id, manifest.dependencies || []);
      manifestMap.set(manifest.id, manifest);
    }

    const sorted: ModManifest[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected: ${id}`);
      }

      visiting.add(id);

      for (const dep of graph.get(id) || []) {
        if (manifestMap.has(dep)) {
          visit(dep);
        } else {
          console.warn(`[ModLoader] Missing dependency: ${dep} (required by ${id})`);
        }
      }

      visiting.delete(id);
      visited.add(id);

      const manifest = manifestMap.get(id);
      if (manifest) sorted.push(manifest);
    };

    for (const id of graph.keys()) {
      visit(id);
    }

    return sorted;
  }
}

// Глобальный экземпляр
export const modLoader = new ModLoader();
