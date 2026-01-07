import * as THREE from "three";
import { World } from "../world/World";
import { Zombie } from "./Zombie";
import { ChunkErrorMob } from "./ChunkErrorMob";
import { Mob } from "./Mob";

import { ItemEntity } from "../entities/ItemEntity";

import { Environment } from "../world/Environment";
import { Player } from "../player/Player";

export class MobManager {
  public mobs: Mob[] = [];
  private world: World;
  private scene: THREE.Scene;
  private entities: ItemEntity[];

  private lastSpawnTime = 0;
  private spawnInterval = 10000; // 10 seconds
  private readonly MAX_MOBS = 10;

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
      playerPos = player.physics['controls'].object.position;
    }

    // 1. Update existing mobs & check despawn
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];

      if (mob.isDead) {
        // Drop Item
        this.entities.push(
          new ItemEntity(
            this.world,
            this.scene,
            mob.mesh.position.x,
            mob.mesh.position.y,
            mob.mesh.position.z,
            6, // Loot ID
            this.world.noiseTexture,
          ),
        );

        this.despawnMob(i);
        continue;
      }

      mob.update(delta, player, onPlayerHit, isDay);

      // Despawn if too far (> 80 blocks)
      const dist = mob.mesh.position.distanceTo(playerPos);
      if (dist > 80) {
        this.despawnMob(i);
      }
    }

    // 2. Spawn logic (Only at Night or ChunkError special spawn)
    if (
      this.mobs.length < this.MAX_MOBS &&
      now - this.lastSpawnTime > this.spawnInterval
    ) {
      // ChunkError can spawn at day too? User didn't specify, assuming normal spawn rules or rare spawn
      // Let's spawn zombies only at night, but maybe ChunkError anytime?
      // "Status: Neutral".
      // Let's stick to Night spawning for monsters, but add small chance for ChunkError
      if (!isDay) {
        this.attemptSpawn(playerPos);
        this.lastSpawnTime = now + Math.random() * 5000;
      }
    }
  }

  private attemptSpawn(playerPos: THREE.Vector3) {
    // Try 10 times to find a valid spot
    for (let i = 0; i < 10; i++) {
      // Random angle
      const angle = Math.random() * Math.PI * 2;
      // Random distance 20-40
      const dist = 20 + Math.random() * 20;

      const x = Math.floor(playerPos.x + Math.sin(angle) * dist);
      const z = Math.floor(playerPos.z + Math.cos(angle) * dist);

      // Check height
      // Since World.getHeight logic might be complex or chunk-based,
      // we can just scan downwards from a reasonable height (e.g. 255 or playerHeight + 20)
      // Or if World has a direct helper, use that.
      // Assuming we need to implement a simple scanner here if world.getHeight doesn't exist yet.

      const y = this.findSurfaceY(x, z);

      if (y !== -1) {
        // Found valid ground
        // 20% Chance for Chunk Error
        let mob: Mob;
        if (Math.random() < 0.2) {
             mob = new ChunkErrorMob(this.world, this.scene, x + 0.5, y + 1, z + 0.5);
        } else {
             mob = new Zombie(this.world, this.scene, x + 0.5, y + 1, z + 0.5);
        }

        this.mobs.push(mob);
        // console.log(`Spawned Mob at ${x}, ${y+1}, ${z}`);
        break; // Spawned one, stop trying
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
    this.scene.remove(mob.mesh);
    mob.dispose();
    this.mobs.splice(index, 1);
  }
}
