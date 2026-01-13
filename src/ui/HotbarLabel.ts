// Компонент для отображения текста в hotbar label
import { HOTBAR_LABEL_DURATION } from "../constants/GameConstants";

export class HotbarLabel {
  private element: HTMLElement;
  private timeoutId: number | null = null;
  private readonly DISPLAY_DURATION = HOTBAR_LABEL_DURATION;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  show(text: string): void {
    this.element.innerText = text;
    this.element.style.opacity = '1';
    
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    
    this.timeoutId = setTimeout(() => {
      this.element.style.opacity = '0';
      this.timeoutId = null;
    }, this.DISPLAY_DURATION);
  }

  hide(): void {
    this.element.style.opacity = '0';
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

