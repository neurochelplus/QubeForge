/**
 * Диалог создания нового мира
 */

import type { WorldMetadata } from "../world/WorldMetadata";

export class WorldCreationDialog {
  private dialog: HTMLElement;
  private nameInput: HTMLInputElement;
  private nameError: HTMLElement;
  private seedInput: HTMLInputElement;
  private gameModeSelect: HTMLSelectElement;
  private difficultySelect: HTMLSelectElement;
  private btnCreate: HTMLButtonElement;
  private btnCancel: HTMLElement;

  private onCreated: ((world: WorldMetadata) => void) | null = null;
  private onCancelled: (() => void) | null = null;

  constructor() {
    this.dialog = document.getElementById("world-creation-dialog")!;
    this.nameInput = document.getElementById("world-name-input") as HTMLInputElement;
    this.nameError = document.getElementById("world-name-error")!;
    this.seedInput = document.getElementById("world-seed-input") as HTMLInputElement;
    this.gameModeSelect = document.getElementById("world-gamemode-select") as HTMLSelectElement;
    this.difficultySelect = document.getElementById("world-difficulty-select") as HTMLSelectElement;
    this.btnCreate = document.getElementById("btn-create-world") as HTMLButtonElement;
    this.btnCancel = document.getElementById("btn-cancel-create")!;

    this.initListeners();
  }

  private initListeners(): void {
    // Валидация имени в реальном времени
    this.nameInput.addEventListener("input", () => this.validateName());
    
    this.btnCreate.addEventListener("click", () => this.createWorld());
    this.btnCancel.addEventListener("click", () => this.hide());

    // Enter для создания
    this.nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.createWorld();
    });
  }

  /**
   * Показать диалог
   */
  show(onCreated: (world: WorldMetadata) => void, onCancelled?: () => void): void {
    this.onCreated = onCreated;
    this.onCancelled = onCancelled || null;
    
    // Сброс формы
    this.nameInput.value = "";
    this.seedInput.value = "";
    this.gameModeSelect.value = "survival";
    this.difficultySelect.value = "2";
    this.nameError.textContent = "";
    
    this.dialog.style.display = "flex";
    this.nameInput.focus();
  }

  /**
   * Скрыть диалог
   */
  hide(): void {
    this.dialog.style.display = "none";
    
    if (this.onCancelled) {
      this.onCancelled();
    }
  }

  /**
   * Валидация имени мира
   */
  private async validateName(): Promise<boolean> {
    const name = this.nameInput.value;
    
    if (name.trim() === "") {
      this.nameError.textContent = "";
      return false;
    }
    
    const { validateWorldName } = await import("../world/WorldMetadata");
    const result = validateWorldName(name);
    this.nameError.textContent = result.error || "";
    return result.valid;
  }

  /**
   * Создание мира
   */
  private async createWorld(): Promise<void> {
    const name = this.nameInput.value.trim();
    
    // Проверка пустого имени
    if (name === "") {
      this.nameError.textContent = "Введите название мира";
      this.nameInput.focus();
      return;
    }

    // Валидация
    if (!(await this.validateName())) {
      this.nameInput.focus();
      return;
    }

    const seed = this.seedInput.value.trim() || undefined;
    const gameMode = this.gameModeSelect.value as 'survival' | 'creative' | 'hardcore';
    const difficulty = parseInt(this.difficultySelect.value) as 0 | 1 | 2 | 3;

    this.btnCreate.textContent = "Создание...";
    this.btnCreate.disabled = true;

    try {
      const { WorldManager } = await import("../world/WorldManager");
      const worldManager = WorldManager.getInstance();
      const world = await worldManager.createWorld(name, seed, gameMode, difficulty);
      
      this.dialog.style.display = "none";
      
      if (this.onCreated) {
        this.onCreated(world);
      }
    } catch (e) {
      console.error("Failed to create world:", e);
      this.nameError.textContent = "Ошибка создания: " + e;
    } finally {
      this.btnCreate.textContent = "Создать";
      this.btnCreate.disabled = false;
    }
  }
}
