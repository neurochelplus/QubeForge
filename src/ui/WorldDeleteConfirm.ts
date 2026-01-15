/**
 * Диалог подтверждения удаления мира
 */

export class WorldDeleteConfirm {
  private dialog: HTMLElement;
  private worldNameEl: HTMLElement;
  private btnConfirm: HTMLElement;
  private btnCancel: HTMLElement;
  
  private currentWorldId: string | null = null;
  private onDeleted: (() => void) | null = null;
  private onCancelled: (() => void) | null = null;

  constructor() {
    this.dialog = document.getElementById("world-delete-confirm")!;
    this.worldNameEl = document.getElementById("delete-world-name")!;
    this.btnConfirm = document.getElementById("btn-confirm-delete")!;
    this.btnCancel = document.getElementById("btn-cancel-delete")!;

    this.initListeners();
  }

  private initListeners(): void {
    this.btnConfirm.addEventListener("click", () => this.confirmDelete());
    this.btnCancel.addEventListener("click", () => this.hide());
  }

  /**
   * Показать диалог подтверждения
   */
  show(
    worldId: string, 
    worldName: string, 
    onDeleted: () => void,
    onCancelled?: () => void
  ): void {
    this.currentWorldId = worldId;
    this.onDeleted = onDeleted;
    this.onCancelled = onCancelled || null;
    
    this.worldNameEl.textContent = `"${worldName}"`;
    this.dialog.style.display = "flex";
  }

  /**
   * Скрыть диалог
   */
  hide(): void {
    this.dialog.style.display = "none";
    this.currentWorldId = null;
    
    if (this.onCancelled) {
      this.onCancelled();
    }
  }

  /**
   * Подтвердить удаление
   */
  private async confirmDelete(): Promise<void> {
    if (!this.currentWorldId) return;

    this.btnConfirm.textContent = "Удаление...";
    (this.btnConfirm as HTMLButtonElement).disabled = true;

    try {
      const { WorldManager } = await import("../world/WorldManager");
      const worldManager = WorldManager.getInstance();
      await worldManager.deleteWorld(this.currentWorldId);
      
      this.dialog.style.display = "none";
      
      if (this.onDeleted) {
        this.onDeleted();
      }
    } catch (e) {
      console.error("Failed to delete world:", e);
      alert("Ошибка при удалении мира: " + e);
    } finally {
      this.btnConfirm.textContent = "Удалить";
      (this.btnConfirm as HTMLButtonElement).disabled = false;
      this.currentWorldId = null;
    }
  }
}
