// src/modding/ModManagerUI.ts
// UI для управления модами

import { modStorage } from './ModStorage';
import { modInstaller } from './ModInstaller';
import type { StoredMod } from './types';

/**
 * UI менеджера модов
 */
export class ModManagerUI {
  private container: HTMLElement | null = null;
  private isVisible: boolean = false;
  private onCloseCallback: (() => void) | null = null;

  /**
   * Показать менеджер модов
   */
  show(onClose?: () => void): void {
    this.onCloseCallback = onClose || null;
    this.isVisible = true;
    this.render();
  }

  /**
   * Скрыть менеджер модов
   */
  hide(): void {
    this.isVisible = false;
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.onCloseCallback?.();
  }

  /**
   * Проверить видимость
   */
  getIsVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Рендер UI
   */
  private async render(): Promise<void> {
    // Удалить старый контейнер
    if (this.container) this.container.remove();

    // Создать новый
    this.container = document.createElement('div');
    this.container.className = 'mod-manager-overlay';
    this.container.innerHTML = `
      <div class="mod-manager-modal">
        <div class="mod-manager-header">
          <h2>Моды</h2>
          <button class="mod-manager-close">✕</button>
        </div>
        
        <div class="mod-manager-content">
          <div class="mod-manager-dropzone" id="mod-dropzone">
            <p>Перетащите .js файл мода сюда</p>
            <p>или</p>
            <button class="mod-manager-browse">Выбрать файл</button>
            <input type="file" accept=".js" style="display: none" id="mod-file-input">
          </div>
          
          <div class="mod-manager-list" id="mod-list">
            <p class="mod-list-loading">Загрузка...</p>
          </div>
        </div>
        
        <div class="mod-manager-footer">
          <span class="mod-manager-info" id="mod-info"></span>
          <button class="mod-manager-apply">Применить и перезагрузить</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Привязка событий
    this.bindEvents();

    // Загрузить список модов
    await this.refreshModList();
  }

  /**
   * Привязка событий
   */
  private bindEvents(): void {
    if (!this.container) return;

    // Закрытие по кнопке
    this.container.querySelector('.mod-manager-close')?.addEventListener('click', () => this.hide());

    // Закрытие по клику вне модалки
    this.container.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('mod-manager-overlay')) {
        this.hide();
      }
    });

    // Закрытие по Escape
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Drag & Drop
    const dropzone = this.container.querySelector('#mod-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');

        const files = (e as DragEvent).dataTransfer?.files;
        if (files && files.length > 0) {
          await this.installMod(files[0]);
        }
      });
    }

    // Выбор файла
    const fileInput = this.container.querySelector('#mod-file-input') as HTMLInputElement;
    const browseBtn = this.container.querySelector('.mod-manager-browse');

    browseBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async () => {
      if (fileInput.files && fileInput.files.length > 0) {
        await this.installMod(fileInput.files[0]);
        fileInput.value = '';
      }
    });

    // Применить
    this.container.querySelector('.mod-manager-apply')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  /**
   * Установить мод
   */
  private async installMod(file: File): Promise<void> {
    this.showInfo('Установка...', 'info');

    const result = await modInstaller.installFromFile(file);

    if (result.success) {
      this.showInfo(`Мод "${result.modId}" установлен!`, 'success');
      await this.refreshModList();
    } else {
      this.showInfo(`Ошибка: ${result.error}`, 'error');
    }
  }

  /**
   * Обновить список модов
   */
  private async refreshModList(): Promise<void> {
    const listContainer = this.container?.querySelector('#mod-list');
    if (!listContainer) return;

    try {
      const mods = await modStorage.getAllMods();

      if (mods.length === 0) {
        listContainer.innerHTML = '<p class="mod-list-empty">Нет установленных модов</p>';
        return;
      }

      listContainer.innerHTML = mods
        .map(
          (mod) => `
        <div class="mod-item" data-mod-id="${mod.id}">
          <label class="mod-item-toggle">
            <input type="checkbox" ${mod.enabled ? 'checked' : ''}>
            <span class="mod-item-checkbox"></span>
          </label>
          <div class="mod-item-info">
            <span class="mod-item-name">${this.escapeHtml(mod.manifest.name)}</span>
            <span class="mod-item-version">v${this.escapeHtml(mod.manifest.version)}</span>
            ${mod.manifest.author ? `<span class="mod-item-author">by ${this.escapeHtml(mod.manifest.author)}</span>` : ''}
          </div>
          <button class="mod-item-delete" title="Удалить">🗑️</button>
        </div>
      `
        )
        .join('');

      // Привязка событий для каждого мода
      this.bindModItemEvents(listContainer, mods);
    } catch (error) {
      listContainer.innerHTML = '<p class="mod-list-error">Ошибка загрузки модов</p>';
      console.error('[ModManagerUI] Failed to load mods:', error);
    }
  }

  /**
   * Привязка событий для элементов списка
   */
  private bindModItemEvents(container: Element, mods: StoredMod[]): void {
    container.querySelectorAll('.mod-item').forEach((item) => {
      const modId = item.getAttribute('data-mod-id')!;

      // Галка включения
      item.querySelector('input[type="checkbox"]')?.addEventListener('change', async (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        await modStorage.setEnabled(modId, enabled);
      });

      // Удаление
      item.querySelector('.mod-item-delete')?.addEventListener('click', async () => {
        const mod = mods.find((m) => m.id === modId);
        const name = mod?.manifest.name || modId;

        if (confirm(`Удалить мод "${name}"?`)) {
          await modStorage.deleteMod(modId);
          await this.refreshModList();
          this.showInfo(`Мод "${name}" удалён`, 'success');
        }
      });
    });
  }

  /**
   * Показать информационное сообщение
   */
  private showInfo(message: string, type: 'success' | 'error' | 'info'): void {
    const info = this.container?.querySelector('#mod-info');
    if (info) {
      info.textContent = message;
      info.className = `mod-manager-info ${type}`;

      if (type !== 'info') {
        setTimeout(() => {
          info.textContent = '';
          info.className = 'mod-manager-info';
        }, 3000);
      }
    }
  }

  /**
   * Экранирование HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Глобальный экземпляр
export const modManagerUI = new ModManagerUI();
