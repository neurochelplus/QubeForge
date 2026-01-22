import { Environment } from "../world/Environment";
import { FeatureToggles } from "./FeatureToggles";

/**
 * Контроллер отладочных функций с поддержкой cleanup
 */
export class DebugControls {
  private environment: Environment;

  // Сохранённый handler для cleanup
  private keydownHandler = (event: KeyboardEvent) => {
    // Check if day/night keys are enabled
    const toggles = FeatureToggles.getInstance();
    if (!toggles.isEnabled('enable_day_night_keys')) {
      return;
    }

    // Only trigger if not typing in an input
    if (
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA"
    )
      return;

    switch (event.code) {
      case "KeyK":
        console.log("Debug: Setting time to Night");
        this.environment.setTimeToNight();
        break;
      case "KeyL":
        console.log("Debug: Setting time to Day");
        this.environment.setTimeToDay();
        break;
    }
  };

  constructor(environment: Environment) {
    this.environment = environment;
    window.addEventListener("keydown", this.keydownHandler);
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    window.removeEventListener("keydown", this.keydownHandler);
  }
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use new DebugControls(environment) instead
 */
export function initDebugControls(environment: Environment): DebugControls {
  return new DebugControls(environment);
}

