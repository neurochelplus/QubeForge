/**
 * KeybindingsManager - Singleton for managing keybindings
 */

// Type declarations
type GameAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'jump'
  | 'sprint'
  | 'inventory'
  | 'pause'
  | 'chat'
  | 'command';

interface KeyBinding {
  primary: string;
  secondary?: string;
}

type KeybindingsConfig = Record<GameAction, KeyBinding>;

// Type exports (verbatimModuleSyntax compatible)
export type { GameAction, KeyBinding, KeybindingsConfig };

export const ACTION_LABELS: Record<GameAction, string> = {
  moveForward: 'Вперёд',
  moveBackward: 'Назад',
  moveLeft: 'Влево',
  moveRight: 'Вправо',
  jump: 'Прыжок',
  sprint: 'Бег',
  inventory: 'Инвентарь',
  pause: 'Пауза',
  chat: 'Чат',
  command: 'Команда',
};

export const KEY_DISPLAY_NAMES: Record<string, string> = {
  KeyW: 'W',
  KeyA: 'A',
  KeyS: 'S',
  KeyD: 'D',
  KeyE: 'E',
  KeyT: 'T',
  Space: 'Пробел',
  ControlLeft: 'Ctrl',
  ControlRight: 'Ctrl',
  Escape: 'Esc',
  Slash: '/',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};

const STORAGE_KEY = 'qubeforge_keybindings';

export class KeybindingsManager {
  private static instance: KeybindingsManager | null = null;
  private bindings: KeybindingsConfig;

  private static readonly DEFAULT_BINDINGS: KeybindingsConfig = {
    moveForward: { primary: 'KeyW', secondary: 'ArrowUp' },
    moveBackward: { primary: 'KeyS', secondary: 'ArrowDown' },
    moveLeft: { primary: 'KeyA', secondary: 'ArrowLeft' },
    moveRight: { primary: 'KeyD', secondary: 'ArrowRight' },
    jump: { primary: 'Space' },
    sprint: { primary: 'ControlLeft', secondary: 'ControlRight' },
    inventory: { primary: 'KeyE' },
    pause: { primary: 'Escape' },
    chat: { primary: 'KeyT' },
    command: { primary: 'Slash' },
  };

  private constructor() {
    this.bindings = this.cloneDefaults();
    this.load();
  }

  public static getInstance(): KeybindingsManager {
    if (KeybindingsManager.instance === null) {
      KeybindingsManager.instance = new KeybindingsManager();
    }
    return KeybindingsManager.instance;
  }

  public load(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<KeybindingsConfig>;
        this.bindings = { ...this.cloneDefaults(), ...parsed };
      }
    } catch {
      this.bindings = this.cloneDefaults();
    }
  }

  public save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bindings));
    } catch {
      // Ignore save errors
    }
  }

  public get(action: GameAction): KeyBinding {
    return this.bindings[action];
  }

  public getAll(): KeybindingsConfig {
    return { ...this.bindings };
  }

  public set(action: GameAction, key: string, isSecondary = false): void {
    this.removeKeyFromAll(key);
    if (isSecondary) {
      this.bindings[action].secondary = key;
    } else {
      this.bindings[action].primary = key;
    }
    this.save();
  }

  public reset(): void {
    this.bindings = this.cloneDefaults();
    this.save();
  }

  public isKeyForAction(keyCode: string, action: GameAction): boolean {
    const binding = this.bindings[action];
    return binding.primary === keyCode || binding.secondary === keyCode;
  }

  public getKeyDisplayName(keyCode: string): string {
    return KEY_DISPLAY_NAMES[keyCode] || keyCode.replace('Key', '');
  }

  private removeKeyFromAll(key: string): void {
    for (const action of Object.keys(this.bindings) as GameAction[]) {
      const binding = this.bindings[action];
      if (binding.primary === key) binding.primary = '';
      if (binding.secondary === key) binding.secondary = undefined;
    }
  }

  private cloneDefaults(): KeybindingsConfig {
    return JSON.parse(JSON.stringify(KeybindingsManager.DEFAULT_BINDINGS));
  }
}
