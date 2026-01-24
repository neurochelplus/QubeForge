// src/modding/UIAPI.ts
// API для создания UI элементов модами

import type { UIAPIInterface, HUDElementOptions } from './types';

/**
 * API для создания HUD элементов и уведомлений
 */
export class UIAPI implements UIAPIInterface {
  private modId: string;
  private elements: Map<string, HTMLElement> = new Map();

  constructor(modId: string) {
    this.modId = modId;
  }

  /**
   * Добавить HUD элемент
   */
  addHUDElement(id: string, options: HUDElementOptions): string {
    const elementId = `mod_${this.modId}_${id}`;

    // Удалить существующий элемент
    this.removeHUDElement(id);

    const element = document.createElement('div');
    element.id = elementId;
    element.className = `mod-hud-element mod-hud-${options.position}`;

    // Безопасная установка контента
    if (options.text) {
      element.textContent = options.text;
    } else if (options.html) {
      element.innerHTML = this.sanitizeHTML(options.html);
    }

    // Применить стили
    if (options.style) {
      Object.assign(element.style, options.style);
    }

    document.body.appendChild(element);
    this.elements.set(id, element);

    return elementId;
  }

  /**
   * Обновить содержимое HUD элемента
   */
  updateHUDElement(id: string, content: { html?: string; text?: string }): void {
    const element = this.elements.get(id);
    if (!element) return;

    if (content.text !== undefined) {
      element.textContent = content.text;
    } else if (content.html !== undefined) {
      element.innerHTML = this.sanitizeHTML(content.html);
    }
  }

  /**
   * Удалить HUD элемент
   */
  removeHUDElement(id: string): void {
    const element = this.elements.get(id);
    if (element) {
      element.remove();
      this.elements.delete(id);
    }
  }

  /**
   * Показать уведомление
   */
  showNotification(message: string, duration: number = 3000): void {
    const notification = document.createElement('div');
    notification.className = 'mod-notification';
    notification.textContent = message; // Безопасно, textContent

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  /**
   * Санитизация HTML для защиты от XSS
   */
  private sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Удалить опасные теги
    const dangerous = div.querySelectorAll('script, style, iframe, object, embed, link, meta, base, form');
    dangerous.forEach((el) => el.remove());

    // Удалить on* атрибуты и javascript: ссылки
    const allElements = div.querySelectorAll('*');
    allElements.forEach((el) => {
      const attrs = [...el.attributes];
      attrs.forEach((attr) => {
        const name = attr.name.toLowerCase();
        // Удаляем все пробельные символы для проверки протокола
        // Это предотвращает обход вида "j a v a s c r i p t :"
        const value = attr.value.toLowerCase().replace(/[\s\x00-\x1F]/g, '');

        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
          return;
        }

        if (
          name === 'href' ||
          name === 'src' ||
          name === 'action' ||
          name === 'formaction' ||
          name === 'data'
        ) {
          if (
            value.startsWith('javascript:') ||
            value.startsWith('vbscript:') ||
            (value.startsWith('data:') && !value.startsWith('data:image/'))
          ) {
            el.removeAttribute(attr.name);
          }
        }
      });
    });

    return div.innerHTML;
  }

  /**
   * Очистка всех элементов мода
   */
  _cleanup(): void {
    for (const element of this.elements.values()) {
      element.remove();
    }
    this.elements.clear();
  }
}
