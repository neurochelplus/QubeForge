/**
 * KeybindingsMenu - UI для настройки клавиш управления
 * 
 * Позволяет переназначать клавиши через интерактивный интерфейс.
 */

import type { GameAction } from '../input/KeybindingsManager';
import {
  KeybindingsManager,
  ACTION_LABELS,
} from '../input/KeybindingsManager';

export class KeybindingsMenu {
  private container: HTMLElement;
  private keysList: HTMLElement;
  private manager: KeybindingsManager;
  private previousMenu: HTMLElement | null = null;

  // Состояние записи новой клавиши
  private isRecording = false;
  private recordingAction: GameAction | null = null;
  private recordingIsSecondary = false;
  private recordingElement: HTMLElement | null = null;

  // Callback для возврата в предыдущее меню
  private onBack: (() => void) | null = null;

  // Сохранённый handler для cleanup
  private keydownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);

  constructor() {
    this.manager = KeybindingsManager.getInstance();
    this.container = document.getElementById('keybindings-menu')!;
    this.keysList = document.getElementById('keybindings-list')!;

    this.initListeners();
    this.render();
  }

  private initListeners(): void {
    // Кнопка "Назад"
    const btnBack = document.getElementById('btn-back-keybindings')!;
    btnBack.addEventListener('click', () => this.hide());

    // Кнопка "Сбросить всё"
    const btnReset = document.getElementById('btn-reset-keybindings')!;
    btnReset.addEventListener('click', () => {
      this.manager.reset();
      this.render();
    });

    // Глобальный обработчик клавиш для записи (с сохранённым handler для cleanup)
    document.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Показать меню keybindings
   */
  public show(fromMenu: HTMLElement, onBack?: () => void): void {
    this.previousMenu = fromMenu;
    this.onBack = onBack || null;
    fromMenu.style.display = 'none';
    this.container.style.display = 'flex';
    this.render();
  }

  /**
   * Скрыть меню keybindings
   */
  public hide(): void {
    this.cancelRecording();
    this.container.style.display = 'none';

    if (this.onBack) {
      this.onBack();
    } else if (this.previousMenu) {
      this.previousMenu.style.display = 'flex';
    }
  }

  /**
   * Отрисовать список биндингов
   */
  private render(): void {
    this.keysList.innerHTML = '';
    const bindings = this.manager.getAll();

    for (const action of Object.keys(bindings) as GameAction[]) {
      const binding = bindings[action];
      const row = this.createBindingRow(action, binding.primary, binding.secondary);
      this.keysList.appendChild(row);
    }
  }

  /**
   * Создать строку для одного биндинга
   */
  private createBindingRow(
    action: GameAction,
    primary: string,
    secondary?: string
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'keybinding-row';

    // Название действия
    const label = document.createElement('span');
    label.className = 'keybinding-label';
    label.textContent = ACTION_LABELS[action];
    row.appendChild(label);

    // Контейнер для клавиш
    const keysContainer = document.createElement('div');
    keysContainer.className = 'keybinding-keys';

    // Основная клавиша
    const primaryBtn = this.createKeyButton(action, primary, false);
    keysContainer.appendChild(primaryBtn);

    // Альтернативная клавиша
    const secondaryBtn = this.createKeyButton(action, secondary || '', true);
    keysContainer.appendChild(secondaryBtn);

    row.appendChild(keysContainer);
    return row;
  }

  /**
   * Создать кнопку клавиши
   */
  private createKeyButton(
    action: GameAction,
    keyCode: string,
    isSecondary: boolean
  ): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'keybinding-key';
    btn.textContent = keyCode ? this.manager.getKeyDisplayName(keyCode) : '—';
    btn.dataset.action = action;
    btn.dataset.secondary = isSecondary ? 'true' : 'false';

    btn.addEventListener('click', () => {
      this.startRecording(action, isSecondary, btn);
    });

    return btn;
  }

  /**
   * Начать запись новой клавиши
   */
  private startRecording(
    action: GameAction,
    isSecondary: boolean,
    element: HTMLElement
  ): void {
    // Отменить предыдущую запись если была
    this.cancelRecording();

    this.isRecording = true;
    this.recordingAction = action;
    this.recordingIsSecondary = isSecondary;
    this.recordingElement = element;

    element.classList.add('recording');
    element.textContent = '...';
  }

  /**
   * Отменить запись
   */
  private cancelRecording(): void {
    if (this.recordingElement) {
      this.recordingElement.classList.remove('recording');
    }
    this.isRecording = false;
    this.recordingAction = null;
    this.recordingIsSecondary = false;
    this.recordingElement = null;
    this.render();
  }

  /**
   * Обработчик нажатия клавиши
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isRecording || !this.recordingAction) return;

    event.preventDefault();
    event.stopPropagation();

    const keyCode = event.code;

    // Escape отменяет запись
    if (keyCode === 'Escape') {
      this.cancelRecording();
      return;
    }

    // Игнорируем модификаторы без основной клавиши
    if (['ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(keyCode)) {
      return;
    }

    // Устанавливаем новую клавишу
    this.manager.set(this.recordingAction, keyCode, this.recordingIsSecondary);
    this.cancelRecording();
  }

  /**
   * Проверить, открыто ли меню
   */
  public isOpen(): boolean {
    return this.container.style.display === 'flex';
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.keydownHandler);
  }
}
