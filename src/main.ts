import { Renderer } from "./core/Renderer";
import { GameState } from "./core/GameState";
import { World } from "./world/World";
import { ItemEntity } from "./entities/ItemEntity";
import { initToolTextures, TOOL_TEXTURES } from "./constants/ToolTextures";
import { MobManager } from "./mobs/MobManager";
import { Player } from "./player/Player";
import { Inventory } from "./inventory/Inventory";
import { DragDrop } from "./inventory/DragDrop";
import { InventoryUI } from "./inventory/InventoryUI";
import { CraftingSystem } from "./crafting/CraftingSystem";
import { CraftingUI } from "./crafting/CraftingUI";
import { Environment } from "./world/Environment";
import { initDebugControls } from "./utils/DebugUtils";
import { BlockCursor } from "./blocks/BlockCursor";
import { BlockBreaking } from "./blocks/BlockBreaking";
import { BlockInteraction } from "./blocks/BlockInteraction";
import { Game } from "./core/Game";
import { BLOCK_NAMES } from "./constants/BlockNames";
import { HotbarLabel } from "./ui/HotbarLabel";
import { HealthBar } from "./ui/HealthBar";
import * as THREE from "three";
import "./style.css";

// Initialize Tool Textures
initToolTextures();

// Initialize Renderer (handles scene, camera, renderer, controls)
const gameRenderer = new Renderer();
const gameState = new GameState();
const isMobile = gameRenderer.getIsMobile();

// Get references to Three.js objects from Renderer
const scene = gameRenderer.scene;
const uiCamera = gameRenderer.uiCamera;
const camera = gameRenderer.camera;
const controls = gameRenderer.controls;

// Lights - Handled by Environment
const environment = new Environment(scene);
initDebugControls(environment);

// World Generation
const world = new World(scene);

// Initialize Player
const damageOverlay = document.getElementById("damage-overlay")!;
const healthBarElement = document.getElementById("health-bar")!;
const healthBar = new HealthBar(healthBarElement);

// Interaction (needed for Player)
const blockCursor = new BlockCursor(scene, camera, controls);
const cursorMesh = blockCursor.getMesh();

// Inventory System (needed for Player)
const inventory = new Inventory();
const dragDrop = new DragDrop();
const inventoryUI = new InventoryUI(inventory, dragDrop, isMobile);

// --- Block Breaking System --- (needed for Player ctor as crackMesh placeholder, but wait, crackMesh is created by BlockBreaking)
// Actually PlayerCombat uses crackMesh.
// But BlockBreaking creates it.
// We need to resolve this dependency cycle or ordering.
// BlockBreaking needs inventory to get selected item ID.
// Player needs crackMesh for Combat (visuals).

// Let's init BlockBreaking first.
const blockBreaking = new BlockBreaking(
  scene,
  camera,
  controls,
  () => inventory.getSelectedSlotItem().id,
  (x, y, z, id) => {
    // Drop Item
    if (id !== 0) {
      let toolTexture = null;
      if (TOOL_TEXTURES[id] && (id >= 20 || id === 8)) {
        toolTexture = TOOL_TEXTURES[id].texture;
      }
      entities.push(
        new ItemEntity(
          world,
          scene,
          x,
          y,
          z,
          id,
          world.noiseTexture,
          toolTexture,
        ),
      );
    }
    world.setBlock(x, y, z, 0); // AIR
  },
  cursorMesh,
);
const crackMesh = blockBreaking.getCrackMesh();

const player = new Player(
  controls,
  world,
  camera,
  scene,
  uiCamera,
  () => inventory.getSelectedSlotItem().id,
  cursorMesh,
  crackMesh,
  damageOverlay,
  healthBar,
  world.noiseTexture,
  TOOL_TEXTURES,
);

const entities: ItemEntity[] = [];
const mobManager = new MobManager(world, scene, entities);

// UI Lighting
const uiScene = gameRenderer.uiScene;
const uiLight = new THREE.DirectionalLight(0xffffff, 1.5);
uiLight.position.set(1, 1, 1);
uiScene.add(uiLight);
const uiAmbient = new THREE.AmbientLight(0xffffff, 0.5);
uiScene.add(uiAmbient);

// Crafting System
const craftingSystem = new CraftingSystem();
const craftingUI = new CraftingUI(
  craftingSystem,
  inventory,
  inventoryUI,
  dragDrop,
  isMobile,
);

// UI Components
const hotbarLabelElement = document.getElementById("hotbar-label")!;
const hotbarLabel = new HotbarLabel(hotbarLabelElement);

// Connect Inventory to PlayerHand and HotbarLabel
inventoryUI.onInventoryChange = () => {
  const slot = inventory.getSelectedSlotItem();
  player.hand.updateItem(slot.id);
  if (slot.id !== 0) {
    hotbarLabel.show(BLOCK_NAMES[slot.id] || "Block");
  } else {
    hotbarLabel.hide();
  }

  // Update crafting visuals if needed (handled by UI classes usually, but trigger here)
  if (game && game.menus) {
    // Check if inventory menu is visible.
    // Accessing DOM directly is quick fix for now.
    const invMenu = document.getElementById("inventory-menu");
    if (invMenu && invMenu.style.display === "flex") {
      craftingUI.updateVisuals();
    }
  }
};

// Block Interaction
const blockInteraction = new BlockInteraction(
  camera,
  scene,
  controls,
  () => inventory.getSelectedSlotItem(),
  (x, y, z, id) => {
    world.setBlock(x, y, z, id);

    const index = inventory.getSelectedSlot();
    const slot = inventory.getSlot(index);
    slot.count--;
    if (slot.count <= 0) {
      slot.id = 0;
      slot.count = 0;
    }
    inventoryUI.refresh();
    if (inventoryUI.onInventoryChange) inventoryUI.onInventoryChange();
    return true;
  },
  () => toggleInventory(true),
  cursorMesh,
  crackMesh,
  () => mobManager.mobs,
);

const game = new Game(
  gameRenderer,
  gameState,
  world,
  environment,
  entities,
  mobManager,
  player,
  blockCursor,
  blockBreaking,
  blockInteraction,
  inventory,
  inventoryUI,
  craftingSystem,
  craftingUI,
);

// Toggle Inventory Helper
function toggleInventory(useCraftingTable = false) {
  if (game.inventoryUI) {
    const inventoryMenu = document.getElementById("inventory-menu")!;
    const crosshair = document.getElementById("crosshair")!;
    const isInventoryOpen = inventoryMenu.style.display === "flex";

    dragDrop.setInventoryOpen(!isInventoryOpen);

    if (!isInventoryOpen) {
      controls.unlock();
      inventoryMenu.style.display = "flex";
      crosshair.style.display = "none";
      craftingUI.setVisible(true, useCraftingTable);

      if (isMobile) {
        const mobUi = document.getElementById("mobile-ui");
        if (mobUi) mobUi.style.display = "none";
      }

      inventoryUI.refresh();

      // Close btn init
      if (!document.getElementById("btn-close-inv")) {
        const closeBtn = document.createElement("div");
        closeBtn.id = "btn-close-inv";
        closeBtn.innerText = "X";
        closeBtn.addEventListener("touchstart", (e) => {
          e.preventDefault();
          toggleInventory();
        });
        closeBtn.addEventListener("click", () => toggleInventory());
        inventoryMenu.appendChild(closeBtn);
      }
    } else {
      // Close
      world.saveWorld({
        position: controls.object.position,
        inventory: inventory.serialize(),
      });

      // Return items
      craftingSystem.consumeIngredients();
      for (let i = 0; i < 9; i++) {
        if (craftingSystem.craftingSlots[i].id !== 0) {
          inventory.addItem(
            craftingSystem.craftingSlots[i].id,
            craftingSystem.craftingSlots[i].count,
          );
          craftingSystem.craftingSlots[i].id = 0;
          craftingSystem.craftingSlots[i].count = 0;
        }
      }
      craftingSystem.craftingResult.id = 0;
      craftingSystem.craftingResult.count = 0;
      craftingUI.setVisible(false, false);

      if (isMobile) {
        const mobUi = document.getElementById("mobile-ui");
        if (mobUi) mobUi.style.display = "block";
        document.getElementById("joystick-zone")!.style.display = "block";
        document.getElementById("mobile-actions")!.style.display = "flex";
      }

      controls.lock();
      inventoryMenu.style.display = "none";
      crosshair.style.display = "block";

      const dragged = dragDrop.getDraggedItem();
      if (dragged) {
        inventory.addItem(dragged.id, dragged.count);
        dragDrop.setDraggedItem(null);
      }
    }
  }
}

// Global Event Listeners
controls.addEventListener("lock", () => {
  // CRITICAL: This is the only place we confirm the game is back in action.

  // If we were resuming (flag set by Resume button), finalize the resume.
  if (gameState.getIsResuming()) {
    game.menus.hidePauseMenu();
    gameState.setIsResuming(false);
  }
  // Or if we just somehow got locked while paused (e.g. edge case), ensure we unpause.
  else if (gameState.getPaused() && gameState.getGameStarted()) {
    game.menus.hidePauseMenu();
  }

  const inventoryMenu = document.getElementById("inventory-menu")!;
  if (inventoryMenu.style.display === "flex") toggleInventory();
});

controls.addEventListener("unlock", () => {
  const inventoryMenu = document.getElementById("inventory-menu")!;

  // If we are in the middle of a resume attempt, IGNORE the unlock event.
  // This prevents the menu from popping back up if the lock request
  // momentarily triggers an unlock or fails briefly.
  if (gameState.getIsResuming()) return;

  if (
    inventoryMenu.style.display !== "flex" &&
    !gameState.getPaused() &&
    gameState.getGameStarted() &&
    !game.cli.isOpen
  ) {
    game.menus.showPauseMenu();
  }
});

const onKeyDown = (event: KeyboardEvent) => {
  if (game.cli.isOpen) return;

  switch (event.code) {
    case "Slash":
      event.preventDefault();
      game.cli.toggle(true, "/");
      break;
    case "KeyT":
      const inventoryMenu = document.getElementById("inventory-menu")!;
      if (
        !gameState.getPaused() &&
        gameState.getGameStarted() &&
        inventoryMenu.style.display !== "flex"
      ) {
        event.preventDefault();
        game.cli.toggle(true, "");
      }
      break;
    case "ArrowUp":
    case "KeyW":
      player.physics.moveForward = true;
      break;
    case "ArrowLeft":
    case "KeyA":
      player.physics.moveLeft = true;
      break;
    case "ArrowDown":
    case "KeyS":
      player.physics.moveBackward = true;
      break;
    case "ArrowRight":
    case "KeyD":
      player.physics.moveRight = true;
      break;
    case "Space":
      player.physics.jump();
      break;
    case "KeyE":
      if (!gameState.getPaused()) toggleInventory(false);
      break;
    case "Escape":
      const invMenu = document.getElementById("inventory-menu")!;
      if (invMenu.style.display === "flex") toggleInventory();
      else if (gameState.getGameStarted()) {
        // Only open pause menu, never close it via ESC.
        // Closing is done via "Resume" button which triggers lock -> hidePauseMenu.
        game.menus.showPauseMenu();
      }
      break;
  }
};

const onKeyUp = (event: KeyboardEvent) => {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      player.physics.moveForward = false;
      break;
    case "ArrowLeft":
    case "KeyA":
      player.physics.moveLeft = false;
      break;
    case "ArrowDown":
    case "KeyS":
      player.physics.moveBackward = false;
      break;
    case "ArrowRight":
    case "KeyD":
      player.physics.moveRight = false;
      break;
  }
};

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", onKeyUp);

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});

// Helper for interaction
function performInteract() {
  blockInteraction.interact(world);
}

document.addEventListener("mousedown", (event) => {
  if (gameState.getPaused() || !gameState.getGameStarted()) return;
  const invMenu = document.getElementById("inventory-menu")!;
  if (invMenu.style.display === "flex") return;

  // Click-to-lock fallback
  if (!controls.isLocked && !isMobile) {
    controls.lock();
    return;
  }

  if (event.button === 0) {
    game.isAttackPressed = true;
    player.hand.punch();
    player.combat.performAttack();
    game.blockBreaking.start(world);
  } else if (event.button === 2) performInteract();
});

document.addEventListener("mouseup", () => {
  game.isAttackPressed = false;
  player.hand.stopPunch();
  blockBreaking.stop();
});

// Mobile Events
window.addEventListener("toggle-inventory", () => toggleInventory(false));
window.addEventListener("toggle-pause-menu", () =>
  game.menus.togglePauseMenu(),
);

// Hotbar Scroll
window.addEventListener("wheel", (event) => {
  let selected = inventory.getSelectedSlot();
  if (event.deltaY > 0) selected = (selected + 1) % 9;
  else selected = (selected - 1 + 9) % 9;
  inventory.setSelectedSlot(selected);
  inventoryUI.refresh();
  if (inventoryUI.onInventoryChange) inventoryUI.onInventoryChange();
});

window.addEventListener("keydown", (event) => {
  const key = parseInt(event.key);
  if (key >= 1 && key <= 9) {
    inventory.setSelectedSlot(key - 1);
    inventoryUI.refresh();
    if (inventoryUI.onInventoryChange) inventoryUI.onInventoryChange();
  }
});

// Generate CSS Noise
const canvas = document.createElement("canvas");
canvas.width = 64;
canvas.height = 64;
const ctx = canvas.getContext("2d")!;
for (let i = 0; i < 64 * 64; i++) {
  const x = i % 64;
  const y = Math.floor(i / 64);
  const v = Math.floor(Math.random() * 50 + 200); // Light noise
  ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
  ctx.fillRect(x, y, 1, 1);
}
document.body.style.setProperty("--noise-url", `url(${canvas.toDataURL()})`);

// Auto-save
setInterval(() => {
  if (gameState.getGameStarted() && !gameState.getPaused()) {
    world.saveWorld({
      position: controls.object.position,
      inventory: inventory.serialize(),
    });
  }
}, 30000);

// Start
game.start();
