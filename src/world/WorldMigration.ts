/**
 * Миграция данных из старой БД в новую систему миров
 */

import { DB } from "../utils/DB";
import { WorldManager } from "./WorldManager";

const OLD_DB_NAME = "minecraft-world-tall";

export class WorldMigration {
  /**
   * Проверяет и выполняет миграцию старых данных
   */
  static async migrate(): Promise<void> {
    const worldManager = WorldManager.getInstance();
    await worldManager.init();

    // Проверяем есть ли старая БД
    const oldDbExists = await DB.databaseExists(OLD_DB_NAME);
    if (!oldDbExists) {
      console.log("No old database found, skipping migration");
      return;
    }

    // Проверяем есть ли данные в старой БД
    const oldDb = new DB(OLD_DB_NAME, "chunks");
    try {
      await oldDb.init();
      const hasSave = await oldDb.hasSavedData();
      
      if (!hasSave) {
        console.log("Old database is empty, skipping migration");
        oldDb.close();
        await this.deleteOldDatabase();
        return;
      }

      console.log("Found old world data, starting migration...");
      await this.performMigration(oldDb, worldManager);
      
    } catch (e) {
      console.error("Migration failed:", e);
      throw e;
    } finally {
      oldDb.close();
    }
  }

  /**
   * Выполняет миграцию данных
   */
  private static async performMigration(
    oldDb: DB, 
    worldManager: WorldManager
  ): Promise<void> {
    // Получаем метаданные из старой БД
    const oldMeta = await oldDb.get("player", "meta");
    const seed = oldMeta?.seed || Math.floor(Math.random() * 2147483647);

    // Создаём новый мир
    const newWorld = await worldManager.createWorld(
      "Старый мир",
      seed.toString(),
      "survival",
      2
    );

    console.log(`Created new world: ${newWorld.id}`);

    // Создаём новую БД для мира
    const newDbName = worldManager.getWorldDBName(newWorld.id);
    const newDb = new DB(newDbName, "chunks");
    await newDb.init();

    try {
      // Копируем чанки
      const chunks = await oldDb.getAll("chunks");
      console.log(`Migrating ${chunks.length} chunks...`);
      
      for (const chunk of chunks) {
        await newDb.set(chunk.key as string, chunk.value, "chunks");
      }

      // Копируем метаданные игрока
      if (oldMeta) {
        await newDb.set("player", oldMeta, "meta");
        
        // Обновляем метаданные мира
        await worldManager.updateWorld(newWorld.id, {
          playerPosition: oldMeta.position || { x: 8.5, y: 100, z: 20.5 },
          seed: seed,
        });
      }

      // Копируем blockEntities (печи и т.д.)
      const blockEntities = await oldDb.getAll("blockEntities");
      console.log(`Migrating ${blockEntities.length} block entities...`);
      
      for (const entity of blockEntities) {
        await newDb.set(entity.key as string, entity.value, "blockEntities");
      }

      console.log("Migration completed successfully");
      
    } finally {
      newDb.close();
    }

    // Удаляем старую БД
    await this.deleteOldDatabase();
  }

  /**
   * Удаляет старую БД
   */
  private static async deleteOldDatabase(): Promise<void> {
    try {
      await DB.deleteDatabase(OLD_DB_NAME);
      console.log("Old database deleted");
    } catch (e) {
      console.warn("Failed to delete old database:", e);
    }
  }
}
