/**
 * UI для выбора мира
 */

import type { WorldMetadata } from "../world/WorldMetadata";
import { WorldCreationDialog } from "./WorldCreationDialog";
import { WorldDeleteConfirm } from "./WorldDeleteConfirm";

export class WorldSelectionUI {
  private menu: HTMLElement;
  private worldsList: HTMLElement;
  private btnNewWorld: HTMLElement;
  private btnBack: HTMLElement;

  private creationDialog: WorldCreationDialog;
  private deleteConfirm: WorldDeleteConfirm;

  private onPlayWorld: ((worldId: string) => void) | null = null;
  private onBack: (() => void) | null = null;

  constructor() {
    this.menu = document.getElementById("world-selection-menu")!;
    this.worldsList = document.getElementById("worlds-list")!;
    this.btnNewWorld = document.getElementById("btn-new-world")!;
    this.btnBack = document.getElementById("btn-back-worlds")!;

    this.creationDialog = new WorldCreationDialog();
    this.deleteConfirm = new WorldDeleteConfirm();

    this.initListeners();
  }

  private initListeners(): void {
    this.btnNewWorld.addEventListener("click", () => this.showCreationDialog());
    this.btnBack.addEventListener("click", () => this.hide());
  }

  /**
   * Показать меню выбора мира
   */
  async show(
    onPlayWorld: (worldId: string) => void,
    onBack: () => void
  ): Promise<void> {
    this.onPlayWorld = onPlayWorld;
    this.onBack = onBack;
    
    this.menu.style.display = "flex";
    await this.refresh();
  }

  /**
   * Скрыть меню
   */
  hide(): void {
    this.menu.style.display = "none";
    
    if (this.onBack) {
      this.onBack();
    }
  }

  /**
   * Обновить список миров
   */
  async refresh(): Promise<void> {
    const { WorldManager } = await import("../world/WorldManager");
    const worldManager = WorldManager.getInstance();
    const worlds = await worldManager.listWorlds();

    this.worldsList.innerHTML = "";

    if (worlds.length === 0) {
      this.renderEmptyState();
      return;
    }

    for (const world of worlds) {
      this.renderWorldCard(world);
    }
  }

  /**
   * Рендер пустого состояния
   */
  private renderEmptyState(): void {
    const empty = document.createElement("div");
    empty.className = "worlds-empty";
    empty.innerHTML = `
      <p>У вас пока нет миров</p>
      <p>Создайте новый мир, чтобы начать игру!</p>
    `;
    this.worldsList.appendChild(empty);
  }

  /**
   * Рендер карточки мира
   */
  private renderWorldCard(world: WorldMetadata): void {
    const card = document.createElement("div");
    card.className = "world-card";

    // Форматирование времени
    const lastPlayed = this.formatDate(world.lastPlayed);
    const playtime = this.formatPlaytime(world.playtime);

    // Режим игры
    const modeClass = world.gameMode;
    const modeText = this.getGameModeText(world.gameMode);

    card.innerHTML = `
      <div class="world-card-header">
        <span class="world-card-name">${this.escapeHtml(world.name)}</span>
        <span class="world-card-mode ${modeClass}">${modeText}</span>
      </div>
      <div class="world-card-info">
        <span>Последняя игра: ${lastPlayed}</span>
        <span>Время в игре: ${playtime}</span>
      </div>
      <div class="world-card-buttons">
        <button class="world-card-btn play">Играть</button>
        <button class="world-card-btn delete">Удалить</button>
      </div>
    `;

    // Обработчики кнопок
    const btnPlay = card.querySelector(".world-card-btn.play")!;
    const btnDelete = card.querySelector(".world-card-btn.delete")!;

    btnPlay.addEventListener("click", (e) => {
      e.stopPropagation();
      this.playWorld(world.id);
    });

    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      this.confirmDelete(world);
    });

    // Клик по карточке = играть
    card.addEventListener("click", () => this.playWorld(world.id));

    this.worldsList.appendChild(card);
  }

  /**
   * Запустить мир
   */
  private playWorld(worldId: string): void {
    this.menu.style.display = "none";
    
    if (this.onPlayWorld) {
      this.onPlayWorld(worldId);
    }
  }

  /**
   * Показать диалог создания
   */
  private showCreationDialog(): void {
    this.creationDialog.show(
      async (world) => {
        // После создания сразу запускаем мир
        this.playWorld(world.id);
      },
      () => {
        // При отмене остаёмся в списке
      }
    );
  }

  /**
   * Показать подтверждение удаления
   */
  private confirmDelete(world: WorldMetadata): void {
    this.deleteConfirm.show(
      world.id,
      world.name,
      () => this.refresh(), // После удаления обновляем список
      () => {} // При отмене ничего не делаем
    );
  }

  /**
   * Форматирование даты
   */
  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    // Меньше минуты
    if (diff < 60000) return "только что";
    // Меньше часа
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`;
    // Меньше суток
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`;
    // Меньше недели
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} дн. назад`;

    return date.toLocaleDateString("ru-RU");
  }

  /**
   * Форматирование времени игры
   */
  private formatPlaytime(seconds: number): string {
    if (seconds < 60) return "< 1 мин";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) return `${minutes} мин`;
    return `${hours} ч ${minutes} мин`;
  }

  /**
   * Текст режима игры
   */
  private getGameModeText(mode: string): string {
    switch (mode) {
      case "survival": return "Выживание";
      case "creative": return "Творчество";
      case "hardcore": return "Хардкор";
      default: return mode;
    }
  }

  /**
   * Экранирование HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
