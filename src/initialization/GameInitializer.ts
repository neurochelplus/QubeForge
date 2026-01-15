import * as THREE from "three";
import { Renderer } from "../core/Renderer";
import { GameState } from "../core/GameState";
import { World } from "../world/World";
import { Environment } from "../world/Environment";
import { Player } from "../player/Player";
import { Inventory } from "../inventory/Inventory";
import { InventoryUI } from "../inventory/InventoryUI";
import { DragDrop } from "../inventory/DragDrop";
import { CraftingSystem } from "../crafting/CraftingSystem";
import { CraftingUI } from "../crafting/CraftingUI";
import { FurnaceManager } from "../crafting/FurnaceManager";
import { FurnaceUI } from "../crafting/FurnaceUI";
import { MobManager } from "../mobs/MobManager";
import { BlockCursor } from "../blocks/BlockCursor";
import { BlockBreaking } from "../blocks/BlockBreaking";
import { BlockInteraction } from "../blocks/BlockInteraction";
import { BlockDropHandler } from "../blocks/BlockDropHandler";
import { ItemEntity } from "../entities/ItemEntity";
import { HotbarLabel } from "../ui/HotbarLabel";
import { HealthBar } from "../ui/HealthBar";
import { Game } from "../core/Game";
import { BLOCK } from "../constants/Blocks";
import { BLOCK_NAMES } from "../constants/BlockNames";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { initDebugControls } from "../utils/DebugUtils";

/**
 * Initializes all game systems and returns references
 */
export class GameInitializer {
  static initialize(worldId?: string, dbName?: string) {
    // Renderer & Scene
    const gameRenderer = new Renderer();
    const gameState = new GameState();
    const isMobile = gameRenderer.getIsMobile();

    const scene = gameRenderer.scene;
    const uiCamera = gameRenderer.uiCamera;
    const camera = gameRenderer.camera;
    const controls = gameRenderer.controls;

    // Environment
    const environment = new Environment(scene);
    initDebugControls(environment);

    // World (с поддержкой worldId)
    const world = new World(scene, worldId, dbName);

    // UI Elements
    const damageOverlay = document.getElementById("damage-overlay")!;
    const healthBarElement = document.getElementById("health-bar")!;
    const healthBar = new HealthBar(healthBarElement);
    const hotbarLabelElement = document.getElementById("hotbar-label")!;
    const hotbarLabel = new HotbarLabel(hotbarLabelElement);

    // Inventory System
    const inventory = new Inventory();
    const dragDrop = new DragDrop();
    const inventoryUI = new InventoryUI(inventory, dragDrop, isMobile);

    // Block Cursor
    const blockCursor = new BlockCursor(scene, camera, controls);
    const cursorMesh = blockCursor.getMesh();

    // Entities
    const entities: ItemEntity[] = [];

    // Block Breaking with drop logic
    const blockBreaking = new BlockBreaking(
      scene,
      camera,
      controls,
      () => inventory.getSelectedSlotItem().id,
      (x, y, z, id) => {
        // Reduce tool durability
        if (game) game.handleToolUse(1);

        // Handle furnace drops
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
                d.id === 14 ? null : toolTexture,
                d.count,
              ),
            );
          });
        }

        // Handle regular block drops
        if (id !== 0) {
          const toolId = inventory.getSelectedSlotItem().id;
          const { shouldDrop, dropId } = BlockDropHandler.getDropInfo(id, toolId);

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
                dropId === 14 ? null : toolTexture,
              ),
            );
          }
        }

        world.setBlock(x, y, z, 0); // Set to AIR
      },
      cursorMesh,
    );
    const crackMesh = blockBreaking.getCrackMesh();

    // Player
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

    // Mob Manager
    const mobManager = new MobManager(world, scene, entities);

    // UI Scene Lighting
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
    const furnaceUI = new FurnaceUI(furnaceManager, dragDrop);

    // Block Interaction
    const blockInteraction = new BlockInteraction(
      camera,
      scene,
      controls,
      () => inventory.getSelectedSlotItem(),
      (x, y, z, id) => {
        // Handle furnace placement with rotation
        if (id === BLOCK.FURNACE) {
          const rot = controls.object.rotation.y;
          let angle = rot % (Math.PI * 2);
          if (angle < 0) angle += Math.PI * 2;

          const segment = Math.floor((angle + Math.PI / 4) / (Math.PI / 2)) % 4;
          let blockRot = 0;

          if (segment === 0) blockRot = 2;
          else if (segment === 1) blockRot = 1;
          else if (segment === 2) blockRot = 0;
          else if (segment === 3) blockRot = 3;

          console.log(
            `Placing Furnace: PlayerRot=${rot.toFixed(2)} Segment=${segment} BlockRot=${blockRot}`,
          );

          furnaceManager.createFurnace(x, y, z, blockRot);
        }

        world.setBlock(x, y, z, id);

        // Consume item from inventory
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
      undefined, // onOpenCraftingTable - set later
      undefined, // onOpenFurnace - set later
      cursorMesh,
      crackMesh,
      () => mobManager.mobs,
      () => {
        // onConsumeItem - Healing logic
        const slot = inventory.getSelectedSlotItem();

        if (slot.id === BLOCK.COOKED_MEAT) {
          player.health.setHp(player.health.getHp() + 4);
        } else if (slot.id === BLOCK.RAW_MEAT) {
          player.health.setHp(player.health.getHp() + 1);
        }

        if (slot.count > 0) {
          slot.count--;
          if (slot.count === 0) slot.id = 0;
          inventoryUI.refresh();
          if (inventoryUI.onInventoryChange) inventoryUI.onInventoryChange();
        }
      },
    );

    // Game instance (will be set after initialization)
    let game: Game;

    // Inventory change callback
    inventoryUI.onInventoryChange = () => {
      const slot = inventory.getSelectedSlotItem();
      player.hand.updateItem(slot.id);
      if (slot.id !== 0) {
        hotbarLabel.show(BLOCK_NAMES[slot.id] || "Block");
      } else {
        hotbarLabel.hide();
      }

      // Update crafting visuals if inventory is open
      if (game && game.menus) {
        const invMenu = document.getElementById("inventory-menu");
        if (invMenu && invMenu.style.display === "flex") {
          craftingUI.updateVisuals();
        }
      }
    };

    return {
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
      controls,
      isMobile,
      setGame: (g: Game) => {
        game = g;
      },
    };
  }
}
