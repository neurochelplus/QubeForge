/**
 * Профайлер производительности для отслеживания фризов и узких мест
 * Только в dev режиме
 */
export class PerformanceProfiler {
  private metrics: Map<string, MetricData> = new Map();
  private frameTimings: number[] = [];
  private maxFrameTimings: number = 120; // 2 секунды при 60 FPS

  private lastFrameTime: number = performance.now();
  private freezeThreshold: number = 33.33; // >33.33ms = <30 FPS (realistic for voxel game)
  private freezeCount: number = 0;

  private container: HTMLDivElement | null = null;
  private isVisible: boolean = false;

  // Сохранённый handler для cleanup
  private keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'F3') {
      e.preventDefault();
      this.toggle();
    }
  };

  constructor() {
    this.createUI();
    this.setupKeyboardShortcut();
  }

  /**
   * Начать измерение блока кода
   */
  public startMeasure(label: string): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, {
        label,
        totalTime: 0,
        callCount: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
      });
    }

    performance.mark(`${label}-start`);
  }

  /**
   * Закончить измерение блока кода
   */
  public endMeasure(label: string): void {
    performance.mark(`${label}-end`);

    try {
      performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = performance.getEntriesByName(label).pop() as PerformanceMeasure;

      if (measure) {
        const metric = this.metrics.get(label)!;
        metric.totalTime += measure.duration;
        metric.callCount++;
        metric.avgTime = metric.totalTime / metric.callCount;
        metric.maxTime = Math.max(metric.maxTime, measure.duration);
        metric.minTime = Math.min(metric.minTime, measure.duration);
      }

      performance.clearMarks(`${label}-start`);
      performance.clearMarks(`${label}-end`);
      performance.clearMeasures(label);
    } catch (e) {
      // Ignore measurement errors
    }
  }

  /**
   * Обновить статистику кадра
   */
  public updateFrame(): void {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;

    this.frameTimings.push(frameTime);
    if (this.frameTimings.length > this.maxFrameTimings) {
      this.frameTimings.shift();
    }

    // Отслеживание фризов
    if (frameTime > this.freezeThreshold) {
      this.freezeCount++;
    }

    this.lastFrameTime = now;

    // Обновить UI если видим
    if (this.isVisible && this.container) {
      this.updateUI();
    }
  }

  /**
   * Получить статистику
   */
  public getStats(): ProfilerStats {
    const frameStats = this.calculateFrameStats();
    const metrics = Array.from(this.metrics.values())
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 10); // Топ 10 самых медленных

    return {
      frameStats,
      metrics,
      freezeCount: this.freezeCount,
      totalFrames: this.frameTimings.length,
    };
  }

  /**
   * Сбросить статистику
   */
  public reset(): void {
    this.metrics.clear();
    this.frameTimings = [];
    this.freezeCount = 0;
  }

  /**
   * Показать/скрыть UI
   */
  public toggle(): void {
    if (!this.container) return;

    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';

    if (this.isVisible) {
      this.updateUI();
    }
  }

  /**
   * Удалить профайлер и очистить event listeners
   */
  public dispose(): void {
    // Удаляем event listener
    document.removeEventListener('keydown', this.keydownHandler);

    // Удаляем UI
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }

    // Удаляем глобальную ссылку
    if ((window as any).__profiler === this) {
      delete (window as any).__profiler;
    }
  }

  private calculateFrameStats(): FrameStats {
    if (this.frameTimings.length === 0) {
      return {
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
      };
    }

    const sorted = [...this.frameTimings].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      avg: sum / sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'performance-profiler';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.95);
      color: #0f0;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 15px;
      border-radius: 8px;
      z-index: 10001;
      min-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      display: none;
      box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
    `;

    document.body.appendChild(this.container);
  }

  private setupKeyboardShortcut(): void {
    // F3 для открытия профайлера (как в Minecraft)
    // Используем сохранённый handler для возможности cleanup
    document.addEventListener('keydown', this.keydownHandler);
  }

  private updateUI(): void {
    if (!this.container) return;

    const stats = this.getStats();
    const { frameStats, metrics, freezeCount, totalFrames } = stats;

    const freezePercent = totalFrames > 0
      ? ((freezeCount / totalFrames) * 100).toFixed(1)
      : '0.0';

    let html = `
      <div style="margin-bottom: 15px; border-bottom: 1px solid #0f0; padding-bottom: 10px;">
        <h3 style="margin: 0 0 10px 0; color: #0ff;">⚡ Performance Profiler</h3>
        <div style="color: #888; font-size: 10px;">Press F3 to close</div>
      </div>

      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #ff0;">Frame Timings (ms)</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 3px;">Avg:</td>
            <td style="padding: 3px; text-align: right; color: ${frameStats.avg > 16.67 ? '#f00' : '#0f0'};">
              ${frameStats.avg.toFixed(2)}ms
            </td>
            <td style="padding: 3px; padding-left: 15px;">Min:</td>
            <td style="padding: 3px; text-align: right;">${frameStats.min.toFixed(2)}ms</td>
          </tr>
          <tr>
            <td style="padding: 3px;">P95:</td>
            <td style="padding: 3px; text-align: right; color: ${frameStats.p95 > 16.67 ? '#ff0' : '#0f0'};">
              ${frameStats.p95.toFixed(2)}ms
            </td>
            <td style="padding: 3px; padding-left: 15px;">Max:</td>
            <td style="padding: 3px; text-align: right; color: ${frameStats.max > 16.67 ? '#f00' : '#ff0'};">
              ${frameStats.max.toFixed(2)}ms
            </td>
          </tr>
          <tr>
            <td style="padding: 3px;">P99:</td>
            <td style="padding: 3px; text-align: right; color: ${frameStats.p99 > 16.67 ? '#f00' : '#ff0'};">
              ${frameStats.p99.toFixed(2)}ms
            </td>
            <td style="padding: 3px; padding-left: 15px;">Freezes:</td>
            <td style="padding: 3px; text-align: right; color: ${parseFloat(freezePercent) > 5 ? '#f00' : '#0f0'};">
              ${freezeCount} (${freezePercent}%)
            </td>
          </tr>
        </table>
      </div>

      <div>
        <h4 style="margin: 0 0 8px 0; color: #ff0;">Top 10 Slowest Operations</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="border-bottom: 1px solid #0f0;">
              <th style="text-align: left; padding: 5px;">Operation</th>
              <th style="text-align: right; padding: 5px;">Avg (ms)</th>
              <th style="text-align: right; padding: 5px;">Max (ms)</th>
              <th style="text-align: right; padding: 5px;">Calls</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const metric of metrics) {
      const avgColor = metric.avgTime > 5 ? '#f00' : metric.avgTime > 2 ? '#ff0' : '#0f0';
      const maxColor = metric.maxTime > 10 ? '#f00' : metric.maxTime > 5 ? '#ff0' : '#0f0';

      html += `
        <tr style="border-bottom: 1px solid #333;">
          <td style="padding: 5px;">${metric.label}</td>
          <td style="padding: 5px; text-align: right; color: ${avgColor};">
            ${metric.avgTime.toFixed(2)}
          </td>
          <td style="padding: 5px; text-align: right; color: ${maxColor};">
            ${metric.maxTime.toFixed(2)}
          </td>
          <td style="padding: 5px; text-align: right;">${metric.callCount}</td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
      </div>

      <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #0f0;">
        <button onclick="window.__profiler?.reset()" style="
          background: #0f0;
          color: #000;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-weight: bold;
        ">Reset Stats</button>
      </div>
    `;

    this.container.innerHTML = html;
  }
}

interface MetricData {
  label: string;
  totalTime: number;
  callCount: number;
  avgTime: number;
  maxTime: number;
  minTime: number;
}

interface FrameStats {
  avg: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}

interface ProfilerStats {
  frameStats: FrameStats;
  metrics: MetricData[];
  freezeCount: number;
  totalFrames: number;
}

/**
 * Создать профайлер только в dev режиме
 */
export function createProfiler(): PerformanceProfiler | null {
  if (import.meta.env.DEV) {
    const profiler = new PerformanceProfiler();
    // Сделать доступным глобально для кнопки Reset
    (window as any).__profiler = profiler;
    console.log('🔍 Performance Profiler enabled (F3 to open)');
    return profiler;
  }
  return null;
}
