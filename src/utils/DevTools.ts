import * as THREE from "three";

/**
 * Утилиты для разработки (только в dev режиме)
 * Показывает FPS, статистику рендеринга, количество чанков
 */
export class DevTools {
  private container: HTMLDivElement;
  private fpsDisplay: HTMLDivElement;
  private statsDisplay: HTMLDivElement;

  private frames: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 0;

  constructor() {
    // Создать контейнер для dev-панели
    this.container = document.createElement("div");
    this.container.id = "dev-tools";
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 10000;
      min-width: 200px;
      pointer-events: none;
      user-select: none;
    `;

    // FPS дисплей
    this.fpsDisplay = document.createElement("div");
    this.fpsDisplay.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #0f0;
    `;

    // Статистика
    this.statsDisplay = document.createElement("div");
    this.statsDisplay.style.cssText = `
      font-size: 11px;
      line-height: 1.4;
      color: #0f0;
    `;

    this.container.appendChild(this.fpsDisplay);
    this.container.appendChild(this.statsDisplay);
    document.body.appendChild(this.container);
  }

  /**
   * Обновить FPS и статистику
   */
  public update(
    renderer: THREE.WebGLRenderer,
    visibleChunks: number,
    totalChunks: number,
  ): void {
    // Подсчёт FPS
    this.frames++;
    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= 1000) {
      this.fps = Math.round((this.frames * 1000) / delta);
      this.frames = 0;
      this.lastTime = now;
    }

    // Получить статистику рендера
    const info = renderer.info;

    // Цвет FPS в зависимости от значения
    let fpsColor = "#0f0"; // Зелёный
    if (this.fps < 30) fpsColor = "#f00"; // Красный
    else if (this.fps < 50) fpsColor = "#ff0"; // Жёлтый

    this.fpsDisplay.style.color = fpsColor;
    this.fpsDisplay.textContent = `FPS: ${this.fps}`;

    // Статистика
    const culledPercent = totalChunks > 0 
      ? Math.round(((totalChunks - visibleChunks) / totalChunks) * 100) 
      : 0;

    const stats = [
      `Chunks: ${visibleChunks}/${totalChunks}`,
      `Culled: ${totalChunks - visibleChunks} (${culledPercent}%)`,
      `Draw Calls: ${info.render.calls}`,
      `Triangles: ${info.render.triangles.toLocaleString()}`,
      `Geometries: ${info.memory.geometries}`,
      `Textures: ${info.memory.textures}`,
    ];

    this.statsDisplay.innerHTML = stats.join("<br>");
  }

  /**
   * Удалить dev-панель
   */
  public dispose(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  /**
   * Показать/скрыть панель
   */
  public toggle(): void {
    this.container.style.display =
      this.container.style.display === "none" ? "block" : "none";
  }
}

/**
 * Создать dev-утилиты только в dev режиме
 */
export function createDevTools(): DevTools | null {
  if (import.meta.env.DEV) {
    console.log("🛠️ Dev Tools enabled");
    return new DevTools();
  }
  return null;
}
