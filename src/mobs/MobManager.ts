import * as THREE from "three";
import { World } from "../world/World";
import { Zombie } from "./Zombie";
import { WildBoar } from "./WildBoar";
import { ChunkErrorMob } from "./ChunkErrorMob";
import { Mob } from "./Mob";

import { ItemEntity } from "../entities/ItemEntity";
import { BLOCK } from "../constants/Blocks";

import { Environment } from "../world/Environment";
import { Player } from "../player/Player";
import { TOOL_TEXTURES } from "../constants/ToolTextures";
import { globalEventBus } from "../modding";

export class MobManager {
  public mobs: Mob[] = [];
  private world: World;
  private scene: THREE.Scene;
  private entities: ItemEntity[];

  private lastSpawnTime = 0;
  private spawnInterval = 10000; // 10 seconds
  private readonly MAX_MOBS = 10;

  // Chunk Error Mob Singleton Logic
  private chunkErrorActive = false;
  private chunkErrorCooldown = 0; // Seconds until next spawn

  constructor(world: World, scene: THREE.Scene, entities: ItemEntity[]) {
    this.world = world;
    this.scene = scene;
    this.entities = entities;
  }

  public update(
    delta: number,
    player: Player | THREE.Vector3,
    environment: Environment,
    onPlayerHit?: (damage: number) => void,
  ) {
    const now = performance.now();
    const isDay = environment.isDay;

    let playerPos: THREE.Vector3;
    if (player instanceof THREE.Vector3) {
      playerPos = player;
    } else {
      playerPos = player.physics.controls.object.position;
    }

    // 1. Update existing mobs & check despawn
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];

      if (mob.isDead) {
        // Emit event for mods
        globalEventBus.emit('mob:death', {
          mobType: mob.constructor.name,
          x: mob.mesh.position.x,
          y: mob.mesh.position.y,
          z: mob.mesh.position.z,
        });

        // Drop Item (Only for non-ChunkError mobs, or general zombies)
        if (mob instanceof WildBoar) {
            // Drop Meat
            const count = 1 + Math.floor(Math.random() * 2); // 1-2
            for(let k=0; k<count; k++) {
                 this.entities.push(
                  new ItemEntity(
                    this.world,
                    this.scene,
                    mob.mesh.position.x,
                    mob.mesh.position.y,
                    mob.mesh.position.z,
                    BLOCK.RAW_MEAT,
                    this.world.noiseTexture,
                    TOOL_TEXTURES[BLOCK.RAW_MEAT] ? TOOL_TEXTURES[BLOCK.RAW_MEAT].texture : null
                  ),
                );
            }
        } else if (!(mob instanceof ChunkErrorMob)) {
            this.entities.push(
              new ItemEntity(
                this.world,
                this.scene,
                mob.mesh.position.x,
                mob.mesh.position.y,
                mob.mesh.position.z,
                6, // Loot ID (Leaves placeholder)
                this.world.noiseTexture,
              ),
            );
        }

        this.despawnMob(i);
        continue;
      }

      // Mob culling: скрыть дальних мобов
      const dist = mob.mesh.position.distanceTo(playerPos);
      mob.mesh.visible = dist < 60; // 60 блоков видимости

      // AI обновляется только для близких мобов
      if (dist < 40) {
        mob.update(delta, player, onPlayerHit, isDay);
      }

      // Despawn if too far (> 80 blocks)
      if (dist > 80) {
        this.despawnMob(i);
      }
    }

    // Chunk Error Cooldown
    if (this.chunkErrorCooldown > 0) {
      this.chunkErrorCooldown -= delta;
    }

    // 2. Spawn logic
    if (
      this.mobs.length < this.MAX_MOBS &&
      now - this.lastSpawnTime > this.spawnInterval
    ) {
      // Attempt to spawn regular mobs at night
      if (!isDay) {
        this.attemptSpawnZombie(playerPos);
      } else {
        // Spawn passive mobs during day
        this.attemptSpawnPassive(playerPos);
      }
      
      // Attempt to spawn ChunkError (Only at night, 90-150s cooldown)
      if (!isDay && !this.chunkErrorActive && this.chunkErrorCooldown <= 0) {
        // Try to spawn ChunkError in camera view
        this.attemptSpawnChunkError(player, playerPos);
      }

      this.lastSpawnTime = now + Math.random() * 5000;
    }
  }

  private attemptSpawnZombie(playerPos: THREE.Vector3) {
      // Try 10 times
      for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 20 + Math.random() * 20;
          const x = Math.floor(playerPos.x + Math.sin(angle) * dist);
          const z = Math.floor(playerPos.z + Math.cos(angle) * dist);
          const y = this.findSurfaceY(x, z);

          if (y !== -1) {
              const mob = new Zombie(this.world, this.scene, x + 0.5, y + 1, z + 0.5);
              this.mobs.push(mob);
              break;
          }
      }
  }

  private attemptSpawnPassive(playerPos: THREE.Vector3) {
      // Try 10 times
      for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 20 + Math.random() * 20;
          const x = Math.floor(playerPos.x + Math.sin(angle) * dist);
          const z = Math.floor(playerPos.z + Math.cos(angle) * dist);
          const y = this.findSurfaceY(x, z);

          if (y !== -1) {
              // Check block below is Grass (ID 1)
              // We need to check block type. World.ts has getBlock(x,y,z).
              // Assuming ID 1 is Grass.
              const blockId = this.world.getBlock(x, y, z);
              if (blockId === 1) { // Only spawn on grass
                  const mob = new WildBoar(this.world, this.scene, x + 0.5, y + 1, z + 0.5);
                  this.mobs.push(mob);
                  break;
              }
          }
      }
  }

  private attemptSpawnChunkError(player: Player | THREE.Vector3, playerPos: THREE.Vector3) {
      // Determine camera direction
      let dir = new THREE.Vector3(0, 0, -1);
      if (player instanceof Player) {
          player.physics.controls.getDirection(dir);
      }
      // If we don't have direction (Player param is just Vector3), pick random
      if (!(player instanceof Player)) {
          dir.set(Math.random()-0.5, 0, Math.random()-0.5).normalize();
      }

      // Try to find spot "in camera area" (in front)
      // Cone of 60 degrees?
      // Just pick a point in front 20-40 blocks away + random jitter
      for (let i = 0; i < 5; i++) {
          // Angle offset (-45 to +45 degrees)
          const angleOffset = (Math.random() - 0.5) * (Math.PI / 2);
          
          // Rotate dir by angleOffset around Y
          const spawnDir = dir.clone().applyAxisAngle(new THREE.Vector3(0,1,0), angleOffset);
          const dist = 15 + Math.random() * 25; // 15 to 40 blocks

          const x = Math.floor(playerPos.x + spawnDir.x * dist);
          const z = Math.floor(playerPos.z + spawnDir.z * dist);
          
          const y = this.findSurfaceY(x, z);
          if (y !== -1) {
              const mob = new ChunkErrorMob(this.world, this.scene, x + 0.5, y + 1, z + 0.5);
              this.mobs.push(mob);
              this.chunkErrorActive = true;
              // console.log("Spawned ChunkErrorMob");
              break;
          }
      }
  }

  private findSurfaceY(x: number, z: number): number {
    // Find highest block at x,z
    // Start checking from somewhat high up. Max terrain height is usually ~30-40 based on generation settings
    // TERRAIN_HEIGHT=8, OFFSET=4, plus some hills... let's check from 50 down.
    for (let y = 100; y > 0; y--) {
      if (this.world.hasBlock(x, y, z)) {
        // Ensure space above is free (2 blocks)
        if (
          !this.world.hasBlock(x, y + 1, z) &&
          !this.world.hasBlock(x, y + 2, z)
        ) {
          return y;
        }
        // If space above not free, this spot is invalid (e.g. under a tree or in a cave)
        return -1;
      }
    }
    return -1;
  }

  private despawnMob(index: number) {
    const mob = this.mobs[index];
    
    if (mob instanceof ChunkErrorMob) {
        this.chunkErrorActive = false;
        // Respawn timer: 1.5 - 2.5 minutes (90 - 150 seconds)
        this.chunkErrorCooldown = 90 + Math.random() * 60;

        // Drop Broken Compass
        if (mob.isDead) {
             this.entities.push(
                new ItemEntity(
                  this.world,
                  this.scene,
                  mob.mesh.position.x,
                  mob.mesh.position.y,
                  mob.mesh.position.z,
                  30, // BROKEN_COMPASS
                  this.world.noiseTexture,
                  TOOL_TEXTURES[30] ? TOOL_TEXTURES[30].texture : null
                )
             );
        }
    }

    this.scene.remove(mob.mesh);
    mob.dispose();
    this.mobs.splice(index, 1);
  }
}
