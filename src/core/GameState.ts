// Класс для управления состоянием игры

export class GameState {
  private isPaused: boolean = true;
  private isGameStarted: boolean = false;
  private isResuming: boolean = false;
  private previousMenu: HTMLElement | null = null;
  private sessionStartTime: number = 0;
  private lastSaveTime: number = 0;

  public getPaused(): boolean {
    return this.isPaused;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public getGameStarted(): boolean {
    return this.isGameStarted;
  }

  public setGameStarted(started: boolean): void {
    this.isGameStarted = started;
    if (started) {
      this.sessionStartTime = Date.now();
      this.lastSaveTime = Date.now();
    }
  }

  public getIsResuming(): boolean {
    return this.isResuming;
  }

  public setIsResuming(resuming: boolean): void {
    this.isResuming = resuming;
  }

  public getPreviousMenu(): HTMLElement | null {
    return this.previousMenu;
  }

  public setPreviousMenu(menu: HTMLElement | null): void {
    this.previousMenu = menu;
  }

  /**
   * Получить время с последнего сохранения (в секундах)
   */
  public getTimeSinceLastSave(): number {
    return Math.floor((Date.now() - this.lastSaveTime) / 1000);
  }

  /**
   * Отметить время сохранения
   */
  public markSaveTime(): void {
    this.lastSaveTime = Date.now();
  }

  public reset(): void {
    this.isPaused = true;
    this.isGameStarted = false;
    this.previousMenu = null;
    this.sessionStartTime = 0;
    this.lastSaveTime = 0;
  }
}
