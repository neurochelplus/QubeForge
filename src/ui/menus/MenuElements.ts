/**
 * DOM элементы меню
 */
export interface MenuElements {
  mainMenu: HTMLElement;
  pauseMenu: HTMLElement;
  settingsMenu: HTMLElement;
  inventoryMenu: HTMLElement;
  uiContainer: HTMLElement;
  mobileUi: HTMLElement | null;
  bgVideo: HTMLVideoElement;
  crosshair: HTMLElement;
  
  // Buttons
  btnSingleplayer: HTMLElement;
  btnMultiplayer: HTMLButtonElement;
  btnMods: HTMLElement;
  btnResume: HTMLElement;
  btnExit: HTMLElement;
  btnSettingsMain: HTMLElement;
  btnSettingsPause: HTMLElement;
  btnBackSettings: HTMLElement;
  btnKeybindings: HTMLElement;
  btnAudioSettings: HTMLElement;
  
  // Settings
  cbShadows: HTMLInputElement;
  cbClouds: HTMLInputElement;
}

/**
 * Инициализация DOM элементов меню
 */
export function initMenuElements(): MenuElements {
  return {
    mainMenu: document.getElementById("main-menu")!,
    pauseMenu: document.getElementById("pause-menu")!,
    settingsMenu: document.getElementById("settings-menu")!,
    inventoryMenu: document.getElementById("inventory-menu")!,
    uiContainer: document.getElementById("ui-container")!,
    mobileUi: document.getElementById("mobile-ui"),
    bgVideo: document.getElementById("bg-video") as HTMLVideoElement,
    crosshair: document.getElementById("crosshair")!,
    
    btnSingleplayer: document.getElementById("btn-singleplayer")!,
    btnMultiplayer: document.getElementById("btn-multiplayer")! as HTMLButtonElement,
    btnMods: document.getElementById("btn-mods")!,
    btnResume: document.getElementById("btn-resume")!,
    btnExit: document.getElementById("btn-exit")!,
    btnSettingsMain: document.getElementById("btn-settings-main")!,
    btnSettingsPause: document.getElementById("btn-settings-pause")!,
    btnBackSettings: document.getElementById("btn-back-settings")!,
    btnKeybindings: document.getElementById("btn-keybindings")!,
    btnAudioSettings: document.getElementById("btn-audio-settings")!,
    
    cbShadows: document.getElementById("cb-shadows") as HTMLInputElement,
    cbClouds: document.getElementById("cb-clouds") as HTMLInputElement,
  };
}
