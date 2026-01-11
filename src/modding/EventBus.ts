// src/modding/EventBus.ts
// Система событий для модов

import type { EventPriority, EventListener, GameEventInterface } from './types';

const PRIORITY_ORDER: Record<EventPriority, number> = {
  LOWEST: 0,
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  HIGHEST: 4,
  MONITOR: 5,
};

/**
 * Игровое событие с возможностью отмены
 */
export class GameEvent<T = unknown> implements GameEventInterface<T> {
  private cancelled: boolean = false;
  public readonly type: string;
  public readonly data: T;
  public readonly timestamp: number;

  constructor(type: string, data: T) {
    this.type = type;
    this.data = data;
    this.timestamp = performance.now();
  }

  cancel(): void {
    this.cancelled = true;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }
}

/**
 * Шина событий для модов
 */
export class EventBus {
  private listeners: Map<string, EventListener[]> = new Map();
  private eventHistory: GameEvent[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Подписка на событие
   */
  on(
    event: string,
    handler: (event: GameEventInterface) => void,
    modId: string,
    priority: EventPriority = 'NORMAL',
    once: boolean = false
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener: EventListener = { handler, priority, modId, once };
    const listeners = this.listeners.get(event)!;
    listeners.push(listener);

    // Сортировка по приоритету (высший первый)
    listeners.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);

    // Возвращаем функцию отписки
    return () => this.off(event, handler, modId);
  }

  /**
   * Одноразовая подписка
   */
  once(
    event: string,
    handler: (event: GameEventInterface) => void,
    modId: string,
    priority: EventPriority = 'NORMAL'
  ): () => void {
    return this.on(event, handler, modId, priority, true);
  }

  /**
   * Отписка от события
   */
  off(event: string, handler: (event: GameEventInterface) => void, modId: string): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex(
      (l) => l.handler === handler && l.modId === modId
    );
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Удалить все обработчики мода
   */
  removeAllForMod(modId: string): void {
    for (const [event, listeners] of this.listeners) {
      this.listeners.set(
        event,
        listeners.filter((l) => l.modId !== modId)
      );
    }
  }

  /**
   * Отправить событие
   */
  emit<T>(event: string, data: T): GameEvent<T> {
    const gameEvent = new GameEvent(event, data);
    const listeners = this.listeners.get(event) || [];
    const toRemove: EventListener[] = [];

    for (const listener of listeners) {
      // MONITOR не может отменять события, но всегда получает их
      if (gameEvent.isCancelled() && listener.priority !== 'MONITOR') {
        continue;
      }

      try {
        listener.handler(gameEvent);

        if (listener.once) {
          toRemove.push(listener);
        }
      } catch (error) {
        console.error(
          `[ModAPI] Error in event handler for ${event} (mod: ${listener.modId}):`,
          error
        );
      }
    }

    // Удалить одноразовые обработчики
    for (const listener of toRemove) {
      this.off(event, listener.handler, listener.modId);
    }

    // Сохранить в историю для отладки
    this.eventHistory.push(gameEvent);
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }

    return gameEvent;
  }

  /**
   * Получить историю событий (для отладки)
   */
  getEventHistory(): GameEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Получить количество слушателей
   */
  getListenerCount(event?: string): number {
    if (event) {
      return this.listeners.get(event)?.length || 0;
    }
    let total = 0;
    for (const listeners of this.listeners.values()) {
      total += listeners.length;
    }
    return total;
  }

  /**
   * Очистить все слушатели
   */
  clear(): void {
    this.listeners.clear();
    this.eventHistory = [];
  }
}

// Глобальный экземпляр
export const globalEventBus = new EventBus();
