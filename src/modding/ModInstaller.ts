// src/modding/ModInstaller.ts
// Установка модов из файлов

import type { ModManifest, StoredMod } from './types';
import { modStorage } from './ModStorage';

const API_VERSION = '1.0';

interface InstallResult {
  success: boolean;
  error?: string;
  modId?: string;
}

/**
 * Установщик модов
 */
export class ModInstaller {
  /**
   * Установить мод из файла
   */
  async installFromFile(file: File): Promise<InstallResult> {
    try {
      const code = await file.text();
      return await this.installFromCode(code, file.name);
    } catch (error) {
      return { success: false, error: `Failed to read file: ${error}` };
    }
  }

  /**
   * Установить мод из кода
   */
  async installFromCode(code: string, _filename: string): Promise<InstallResult> {
    // 1. Валидация: проверить что это мод
    if (!code.includes('QubeForge.registerMod')) {
      return { success: false, error: 'Invalid mod file: missing QubeForge.registerMod()' };
    }

    // 2. Извлечь манифест
    const manifest = this.extractManifest(code);
    if (!manifest) {
      return { success: false, error: 'Failed to parse mod manifest' };
    }

    // 3. Проверить версию API
    if (!this.isApiVersionCompatible(manifest.apiVersion)) {
      return {
        success: false,
        error: `Incompatible API version: mod requires ${manifest.apiVersion}, game has ${API_VERSION}`,
      };
    }

    // 4. Проверить, не установлен ли уже
    const existing = await modStorage.getMod(manifest.id);
    if (existing) {
      // Обновление существующего мода
      existing.code = code;
      existing.manifest = manifest;
      await modStorage.saveMod(existing);
      return { success: true, modId: manifest.id };
    }

    // 5. Определить порядок (в конец списка)
    const nextOrder = await modStorage.getNextOrder();

    // 6. Сохранить
    const storedMod: StoredMod = {
      id: manifest.id,
      manifest,
      code,
      enabled: false, // По умолчанию выключен
      order: nextOrder,
      installedAt: Date.now(),
    };

    await modStorage.saveMod(storedMod);

    return { success: true, modId: manifest.id };
  }

  /**
   * Извлечь манифест из кода мода
   */
  private extractManifest(code: string): ModManifest | null {
    // Ищем QubeForge.registerMod('id', { manifest }, { definition })
    const match = code.match(
      /QubeForge\.registerMod\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\{[\s\S]*?\})\s*,/
    );
    if (!match) return null;

    const id = match[1];
    try {
      // Попытка парсинга JSON-подобного объекта
      let manifestStr = match[2]
        .replace(/'/g, '"') // Одинарные кавычки → двойные
        .replace(/(\w+)\s*:/g, '"$1":') // Ключи без кавычек → с кавычками
        .replace(/,\s*}/g, '}') // Trailing commas
        .replace(/,\s*]/g, ']');

      const manifest = JSON.parse(manifestStr);
      manifest.id = id;

      // Валидация обязательных полей
      if (!manifest.name) manifest.name = id;
      if (!manifest.version) manifest.version = '1.0.0';
      if (!manifest.apiVersion) manifest.apiVersion = '1.0';
      if (!manifest.permissions) manifest.permissions = [];

      return manifest as ModManifest;
    } catch {
      // Fallback: минимальный манифест
      return {
        id,
        name: id,
        version: '1.0.0',
        apiVersion: '1.0',
        permissions: [],
      };
    }
  }

  /**
   * Проверить совместимость версии API
   */
  private isApiVersionCompatible(apiVersion: string): boolean {
    const [major] = apiVersion.split('.').map(Number);
    const [currentMajor] = API_VERSION.split('.').map(Number);
    return major === currentMajor;
  }
}

// Глобальный экземпляр
export const modInstaller = new ModInstaller();
