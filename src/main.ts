import { Renderer } from "./core/Renderer";
import { GameState } from "./core/GameState";
import { World } from "./world/World";
import { BLOCK } from "./constants/Blocks";
import { ItemEntity } from "./entities/ItemEntity";
import { initToolTextures, TOOL_TEXTURES } from "./constants/ToolTextures";
import { MobManager } from "./mobs/MobManager";
import { Player } from "./player/Player";
import { Inventory } from "./inventory/Inventory";
import { DragDrop } from "./inventory/DragDrop";
import { InventoryUI } from "./inventory/InventoryUI";
import { CraftingSystem } from "./crafting/CraftingSystem";
import { CraftingUI } from "./crafting/CraftingUI";
import { FurnaceManager } from "./crafting/FurnaceManager";
import { FurnaceUI } from "./crafting/FurnaceUI";
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
    if (game) game.handleToolUse(1); // Reduce durability by 1

    // Drop Item Logic
    if (id !== 0) {
      if (id === BLOCK.FURNACE) {
        const drops = FurnaceManager.getInstance().removeFurnace(x, y, z);
        drops.forEach((d) => {
          let toolTexture = null;
          if (
            TOOL_TEXTURES[d.id] &&
            (d.id >= 20 ||
              d.id === 8 ||
              d.id === 12 ||
              d.id === 13 ||
              d.id === 14)
          ) {
            toolTexture = TOOL_TEXTURES[d.id].texture;
          }
          entities.push(
            new ItemEntity(
              world,
              scene,
              x,
              y,
              z,
              d.id,
              world.noiseTexture,
              d.id === 14 ? null : toolTexture, // Force null for Furnace
              d.count,
            ),
          );
        });
      }

      const toolId = inventory.getSelectedSlotItem().id;
      let shouldDrop = true;
      let dropId = id;

      // Drop Rules
      if (id === BLOCK.STONE) {
        // Stone: Only drops with Pickaxes
        if (
          toolId !== BLOCK.WOODEN_PICKAXE &&
          toolId !== BLOCK.STONE_PICKAXE &&
          toolId !== BLOCK.IRON_PICKAXE
        ) {
          shouldDrop = false;
        }
      } else if (id === BLOCK.IRON_ORE) {
        // Iron Ore: Only drops with Stone Pickaxe (or better)
        if (toolId !== BLOCK.STONE_PICKAXE && toolId !== BLOCK.IRON_PICKAXE) {
          shouldDrop = false;
        }
      } else if (id === BLOCK.COAL_ORE) {
        // Coal Ore: Drops with any Pickaxe
        if (
          toolId !== BLOCK.WOODEN_PICKAXE &&
          toolId !== BLOCK.STONE_PICKAXE &&
          toolId !== BLOCK.IRON_PICKAXE
        ) {
          shouldDrop = false;
        } else {
          dropId = BLOCK.COAL; // Drop Coal item
        }
      } else if (id === BLOCK.FURNACE) {
        if (
          toolId !== BLOCK.WOODEN_PICKAXE &&
          toolId !== BLOCK.STONE_PICKAXE &&
          toolId !== BLOCK.IRON_PICKAXE
        ) {
          shouldDrop = false;
        }
      }

      if (shouldDrop) {
        let toolTexture = null;
        if (
          TOOL_TEXTURES[dropId] &&
          (dropId >= 20 ||
            dropId === 8 ||
            dropId === 12 ||
            dropId === 13 ||
            dropId === 14)
        ) {
          toolTexture = TOOL_TEXTURES[dropId].texture;
        }
        entities.push(
          new ItemEntity(
            world,
            scene,
            x,
            y,
            z,
            dropId,
            world.noiseTexture,
            dropId === 14 ? null : toolTexture, // Force null for Furnace to render as block
          ),
        );
      }
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
  (amount) => {
    if (game) game.handleToolUse(amount);
  },
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

const furnaceManager = FurnaceManager.getInstance();
// furnaceManager.load() called later after DB might be more ready, or call it here and hope for the best.
// The issue is likely that DB init happens in World.loadWorld (which isn't called explicitly here?),
// or just DB init is async.
// worldDB.init() is called inside world.loadWorld() but we are not calling world.loadWorld() in main.ts?
// Ah, `world` is just `new World(scene)`.
// Let's check `World.ts`.

const furnaceUI = new FurnaceUI(
  furnaceManager,
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
    if (id === BLOCK.FURNACE) {
      // Calculate rotation based on player yaw
      // Player rotation.y: 0 is -Z (North), PI/2 is -X (West), PI is +Z (South), -PI/2 is +X (East)
      // We want block to FACE the player.
      // If player faces North (0), Block should face South (2).
      // Standard mapping:
      // 0: North (-Z), 1: East (+X), 2: South (+Z), 3: West (-X)
      // Three.js rotation is in radians.

      const rot = controls.object.rotation.y;
      // Normalize to 0..2PI
      let angle = rot % (Math.PI * 2);
      if (angle < 0) angle += Math.PI * 2;

      // 4 quadrants
      // 0 (North) -> 315-45 deg
      // 1 (West) -> 45-135 deg
      // 2 (South) -> 135-225 deg
      // 3 (East) -> 225-315 deg

      // But we want the block BACK to face the player? Or FRONT?
      // Usually "facing player" means the front of the block points to player.
      // So if player looks North, block faces South.

      const segment = Math.floor((angle + Math.PI / 4) / (Math.PI / 2)) % 4;
      // segment 0: North, 1: West, 2: South, 3: East (ThreeJS coord system is slightly different logic often)

      // Let's map segment to our 0-3:
      // 0: North (-Z), 1: East (+X), 2: South (+Z), 3: West (-X)

      // Player Look:
      // 0 (North) -> Oppose: South (2)
      // 1 (West) -> Oppose: East (1)
      // 2 (South) -> Oppose: North (0)
      // 3 (East) -> Oppose: West (3)

      // Map:
      let blockRot = 0;
      // segment 0 (North 315-45) -> Face South (2)
      // segment 1 (West 45-135) -> Face East (1)
      // segment 2 (South 135-225) -> Face North (0)
      // segment 3 (East 225-315) -> Face West (3)

      // Wait, in World.ts we used:
      // Rot 0 (North/-Z): Front texture on "back" face
      // Rot 1 (East/+X): Front texture on "right" face
      // Rot 2 (South/+Z): Front texture on "front" face
      // Rot 3 (West/-X): Front texture on "left" face

      // If we want block Front to face Player:
      // Player faces North (0) -> Block Front should look South (Rot 2)
      // Player faces West (1) -> Block Front should look East (Rot 1)
      // Player faces South (2) -> Block Front should look North (Rot 0)
      // Player faces East (3) -> Block Front should look West (Rot 3)

      // Correct Mapping based on my World.ts comment assumptions:
      if (segment === 0) blockRot = 2;
      else if (segment === 1) blockRot = 1;
      else if (segment === 2) blockRot = 0;
      else if (segment === 3) blockRot = 3;

      // Debug log
      console.log(
        `Placing Furnace: PlayerRot=${rot.toFixed(2)} Segment=${segment} BlockRot=${blockRot}`,
      );

      furnaceManager.createFurnace(x, y, z, blockRot);
    }

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
  (x, y, z) => toggleInventory("furnace", { x, y, z }),
  cursorMesh,
  crackMesh,
  () => mobManager.mobs,
  () => {
    // onConsumeItem
    const slot = inventory.getSelectedSlotItem();
    
    // Healing Logic
    if (slot.id === BLOCK.COOKED_MEAT) {
        player.health.setHp(player.health.getHp() + 4);
    } else if (slot.id === BLOCK.RAW_MEAT) {
        player.health.setHp(player.health.getHp() + 1); // Less healing for raw
    }

    if (slot.count > 0) {
      slot.count--;
      if (slot.count === 0) slot.id = 0;
      inventoryUI.refresh();
      if (inventoryUI.onInventoryChange) inventoryUI.onInventoryChange();
    }
  },
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
  furnaceUI,
);

// Toggle Inventory Helper
function toggleInventory(
  param: boolean | "furnace" = false,
  furnacePos?: { x: number; y: number; z: number },
) {
  if (game.inventoryUI) {
    const inventoryMenu = document.getElementById("inventory-menu")!;
    const crosshair = document.getElementById("crosshair")!;
    const isInventoryOpen = inventoryMenu.style.display === "flex";

    dragDrop.setInventoryOpen(!isInventoryOpen);

    if (!isInventoryOpen) {
      const useCraftingTable = param === true;
      const useFurnace = param === "furnace";

      controls.unlock();

      // Stop Movement
      player.physics.moveForward = false;
      player.physics.moveBackward = false;
      player.physics.moveLeft = false;
      player.physics.moveRight = false;
      player.physics.isSprinting = false;

      inventoryMenu.style.display = "flex";
      crosshair.style.display = "none";

      if (useFurnace && furnacePos) {
        furnaceUI.open(furnacePos.x, furnacePos.y, furnacePos.z);
        craftingUI.setVisible(false, false);
      } else {
        furnaceUI.close();
        craftingUI.setVisible(true, useCraftingTable);
      }

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
      FurnaceManager.getInstance().save();

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
      furnaceUI.close();

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
  const inventoryMenu = document.getElementById("inventory-menu")!;
  const isInventoryOpen = inventoryMenu.style.display === "flex";

  // Prevent movement keys when inventory is open
  if (isInventoryOpen) {
    if (
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowLeft",
        "ArrowDown",
        "ArrowRight",
        "Space",
      ].includes(event.code)
    ) {
      return;
    }
  }

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
    case "ControlLeft":
    case "ControlRight":
      player.physics.isSprinting = !player.physics.isSprinting;
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
      player.physics.isSprinting = false; // Stop sprinting when forward key is released
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
  } else if (event.button === 2) {
      game.isUsePressed = true;
      performInteract(); // Initial click interaction (for instant actions like placing block)
  }
});

document.addEventListener("mouseup", () => {
  game.isAttackPressed = false;
  game.isUsePressed = false;
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
    FurnaceManager.getInstance().save();
  }
}, 30000);

// Start Loading Sequence
const loadingScreen = document.getElementById("loading-screen")!;
const loadingBarInner = document.getElementById("loading-bar-inner")!;
const bgVideo = document.getElementById("bg-video") as HTMLVideoElement;

let loadProgress = 0;
const startTime = performance.now();
const MIN_LOAD_TIME = 2000; // Minimum visibility time in ms

// Init World Data
world.loadWorld().then(async (data) => {
  if (data.playerPosition) {
    // Add small Y offset to prevent falling through floor or sticking in block on load
    data.playerPosition.y += 0.5;
    controls.object.position.copy(data.playerPosition);
  }
  if (data.inventory) {
    inventory.deserialize(data.inventory);
    inventoryUI.refresh();
  }
  // Load Furnaces
  await FurnaceManager.getInstance().load();

  // Ensure starting chunk is loaded before hiding loading screen
  const cx = Math.floor(controls.object.position.x / 32);
  const cz = Math.floor(controls.object.position.z / 32);
  await world.waitForChunk(cx, cz);
});

// Force check for video ready state if event missed
const checkVideoReady = () => {
  return bgVideo.readyState >= 3; // HAVE_FUTURE_DATA or better
};

// Simulate/Track Progress
const updateLoading = () => {
  const elapsed = performance.now() - startTime;
  const timeProgress = Math.min((elapsed / MIN_LOAD_TIME) * 100, 100);

  // We can also check document.readyState, but main.ts runs, so it's mostly interactive.
  // Video loading is the main heavy asset we can track easily.
  let videoProgress = 0;
  if (bgVideo.buffered.length > 0) {
    const duration = bgVideo.duration || 1; // Avoid divide by zero
    // Approximation: just check if we have *some* buffer
    videoProgress = 100; // Assume ready if buffered
  } else if (checkVideoReady()) {
    videoProgress = 100;
  } else {
    // Fake trickle if video is taking time
    videoProgress = 50;
  }

  // Weighted progress
  // 60% time (to show logo), 40% video
  const totalProgress = timeProgress * 0.6 + videoProgress * 0.4;

  loadProgress = Math.max(loadProgress, totalProgress); // Never go back
  loadingBarInner.style.width = `${loadProgress}%`;

  if (loadProgress >= 99 && elapsed >= MIN_LOAD_TIME) {
    // Done
    loadingBarInner.style.width = "100%";
    setTimeout(() => {
      loadingScreen.style.transition = "opacity 0.5s";
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
        game.start();
      }, 500);
    }, 200);
  } else {
    requestAnimationFrame(updateLoading);
  }
};

// Start the loop
requestAnimationFrame(updateLoading);
