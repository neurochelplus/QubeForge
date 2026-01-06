import * as THREE from "three";
import { Game } from "../core/Game";

export class MobileControls {
  private game: Game;
  private joystickZone: HTMLElement;
  private joystickStick: HTMLElement;
  private stickStartX: number = 0;
  private stickStartY: number = 0;
  private isDraggingStick: boolean = false;
  private joystickTouchId: number | null = null;

  // Touch IDs for multi-touch handling
  private attackTouchId: number | null = null;
  private lastAttackX: number = 0;
  private lastAttackY: number = 0;

  private lookTouchId: number | null = null;
  private lastLookX: number = 0;
  private lastLookY: number = 0;

  constructor(game: Game) {
    this.game = game;
    this.joystickZone = document.getElementById("joystick-zone")!;
    this.joystickStick = document.getElementById("joystick-stick")!;

    if (!this.game.renderer.getIsMobile()) return;

    this.initJoystick();
    this.initButtons();
    this.initCameraLook();
  }

  private initJoystick() {
    this.joystickZone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.isDraggingStick) return;

      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;

      this.stickStartX = touch.clientX;
      this.stickStartY = touch.clientY;

      this.joystickStick.style.transition = "none";
      this.joystickStick.style.transform = `translate(-50%, -50%)`;

      this.isDraggingStick = true;
    });

    this.joystickZone.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!this.isDraggingStick || this.joystickTouchId === null) return;

      let touch: Touch | undefined;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          touch = e.changedTouches[i];
          break;
        }
      }

      if (!touch) return;

      const dx = touch.clientX - this.stickStartX;
      const dy = touch.clientY - this.stickStartY;

      const maxDist = 40;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(distance, maxDist);
      const angle = Math.atan2(dy, dx);

      const stickX = Math.cos(angle) * clampedDist;
      const stickY = Math.sin(angle) * clampedDist;

      this.joystickStick.style.transform = `translate(calc(-50% + ${stickX}px), calc(-50% + ${stickY}px))`;

      const threshold = 10;
      this.game.player.physics.moveForward = dy < -threshold;
      this.game.player.physics.moveBackward = dy > threshold;
      this.game.player.physics.moveLeft = dx < -threshold;
      this.game.player.physics.moveRight = dx > threshold;
    });

    const resetStick = (e: TouchEvent) => {
      if (!this.isDraggingStick || this.joystickTouchId === null) return;

      let touchFound = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          touchFound = true;
          break;
        }
      }

      if (touchFound) {
        this.isDraggingStick = false;
        this.joystickTouchId = null;
        this.joystickStick.style.transform = `translate(-50%, -50%)`;
        this.game.player.physics.moveForward = false;
        this.game.player.physics.moveBackward = false;
        this.game.player.physics.moveLeft = false;
        this.game.player.physics.moveRight = false;
      }
    };

    this.joystickZone.addEventListener("touchend", resetStick);
    this.joystickZone.addEventListener("touchcancel", resetStick);
  }

  private initButtons() {
    document.getElementById("btn-jump")!.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.game.player.physics.jump();
    });

    const btnAttack = document.getElementById("btn-attack")!;

    btnAttack.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (this.attackTouchId !== null) return;

      const touch = e.changedTouches[0];
      this.attackTouchId = touch.identifier;
      this.lastAttackX = touch.clientX;
      this.lastAttackY = touch.clientY;

      this.game.isAttackPressed = true;
      this.game.player.hand.punch();
      this.game.player.combat.performAttack();
      this.game.blockBreaking.start(this.game.world);
    });

    btnAttack.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (this.attackTouchId === null) return;

      let touch: Touch | undefined;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.attackTouchId) {
          touch = e.changedTouches[i];
          break;
        }
      }
      if (!touch) return;

      const dx = touch.clientX - this.lastAttackX;
      const dy = touch.clientY - this.lastAttackY;

      this.lastAttackX = touch.clientX;
      this.lastAttackY = touch.clientY;

      const SENSITIVITY = 0.005;
      this.game.renderer.controls.object.rotation.y -= dx * SENSITIVITY;
      this.game.renderer.camera.rotation.x -= dy * SENSITIVITY;
      this.game.renderer.camera.rotation.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.game.renderer.camera.rotation.x),
      );
    });

    const endAttack = (e: TouchEvent) => {
      e.preventDefault();
      if (this.attackTouchId === null) return;

      let touchFound = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.attackTouchId) {
          touchFound = true;
          break;
        }
      }

      if (touchFound) {
        this.game.isAttackPressed = false;
        this.game.player.hand.stopPunch();
        this.game.blockBreaking.stop();
        this.attackTouchId = null;
      }
    };

    btnAttack.addEventListener("touchend", endAttack);
    btnAttack.addEventListener("touchcancel", endAttack);

    document
      .getElementById("btn-place")!
      .addEventListener("touchstart", (e) => {
        e.preventDefault();
        // Access blockInteraction via game property if needed,
        // but main.ts was calling performInteract() wrapper.
        // Game class has blockInteraction public.
        this.game.blockInteraction.interact(this.game.world);
      });

    // Inventory button needs access to toggleInventory from main/Game.
    // Ideally Game should have toggleInventory method or similar.
    // For now we can dispatch an event or use a callback if we want strict decoupling,
    // but sticking to direct access pattern:
    // We need to trigger the inventory UI. The Game class has inventoryUI.
    // But toggling inventory involves UI state changes (menu display).
    // Let's assume Game or UI manager handles this.
    // Re-implementation of toggleInventory logic inside MobileControls or callback?
    // Let's pass a callback or dispatch event.
    // Actually, btn-inv listener was calling toggleInventory(false) in main.ts.

    document.getElementById("btn-inv")!.addEventListener("touchstart", (e) => {
      e.preventDefault();
      // Dispatch custom event to be handled by main/Game
      window.dispatchEvent(new CustomEvent("toggle-inventory"));
    });

    // Menu Button
    document.getElementById("btn-menu")!.addEventListener("touchstart", (e) => {
      e.preventDefault();
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent("toggle-pause-menu"));
    });
  }

  private initCameraLook() {
    document.addEventListener("touchstart", (e) => {
      if (this.lookTouchId !== null) return;

      const target = e.target as HTMLElement;

      if (
        target.closest("#joystick-zone") ||
        target.closest(".mob-btn") ||
        target.closest("#inventory-menu") ||
        target.closest("#hotbar") ||
        target.closest("#btn-inv") ||
        target.closest("#btn-menu") // Added btn-menu
      )
        return;

      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lastLookX = touch.clientX;
      this.lastLookY = touch.clientY;
    });

    document.addEventListener(
      "touchmove",
      (e) => {
        if (this.lookTouchId === null) return;
        if (e.cancelable) e.preventDefault();

        const target = e.target as HTMLElement;
        // Skip check? logic was: if touch started elsewhere, we continue dragging.
        // But we need to ensure we are tracking the CORRECT touch.

        let touch: Touch | undefined;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.lookTouchId) {
            touch = e.changedTouches[i];
            break;
          }
        }

        if (!touch) return;

        const dx = touch.clientX - this.lastLookX;
        const dy = touch.clientY - this.lastLookY;

        this.lastLookX = touch.clientX;
        this.lastLookY = touch.clientY;

        const SENSITIVITY = 0.005;
        this.game.renderer.controls.object.rotation.y -= dx * SENSITIVITY;
        this.game.renderer.camera.rotation.x -= dy * SENSITIVITY;
        this.game.renderer.camera.rotation.x = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, this.game.renderer.camera.rotation.x),
        );
      },
      { passive: false },
    );

    const endLook = (e: TouchEvent) => {
      if (this.lookTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.lookTouchId) {
          this.lookTouchId = null;
          break;
        }
      }
    };

    document.addEventListener("touchend", endLook);
    document.addEventListener("touchcancel", endLook);
  }
}
