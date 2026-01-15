export class DB {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(
    dbName: string = "minecraft-world-tall",
    storeName: string = "chunks",
  ) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  /**
   * Удаляет базу данных по имени
   */
  static async deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
      request.onblocked = () => {
        console.warn(`Database ${dbName} deletion blocked, retrying...`);
        // Попробуем ещё раз через небольшую задержку
        setTimeout(() => resolve(), 100);
      };
    });
  }

  /**
   * Проверяет существование базы данных
   */
  static async databaseExists(dbName: string): Promise<boolean> {
    try {
      const databases = await indexedDB.databases();
      return databases.some(db => db.name === dbName);
    } catch {
      // Fallback для браузеров без поддержки databases()
      return new Promise((resolve) => {
        const request = indexedDB.open(dbName);
        let existed = true;
        request.onupgradeneeded = () => {
          existed = false;
        };
        request.onsuccess = () => {
          request.result.close();
          if (!existed) {
            indexedDB.deleteDatabase(dbName);
          }
          resolve(existed);
        };
        request.onerror = () => resolve(false);
      });
    }
  }

  /**
   * Закрывает соединение с БД
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Возвращает имя текущей БД
   */
  getDbName(): string {
    return this.dbName;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 3);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
        if (!db.objectStoreNames.contains("blockEntities")) {
          db.createObjectStore("blockEntities");
        }
      };
    });
  }

  async set(
    key: string,
    value: any,
    store: string = this.storeName,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readwrite");
      const objectStore = transaction.objectStore(store);
      // Если store имеет keyPath (in-line keys), не передаём key отдельно
      const request = objectStore.keyPath 
        ? objectStore.put(value) 
        : objectStore.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(key: string, store: string = this.storeName): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readonly");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async delete(key: string, store: string = this.storeName): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readwrite");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async keys(store: string = this.storeName): Promise<IDBValidKey[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readonly");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAllKeys();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction(
        [this.storeName, "meta"],
        "readwrite",
      );

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      transaction.objectStore(this.storeName).clear();
      transaction.objectStore("meta").clear();
    });
  }

  async hasSavedData(): Promise<boolean> {
    try {
      if (!this.db) await this.init();
      const meta = await this.get("player", "meta");
      return !!meta;
    } catch (e) {
      return false;
    }
  }

  /**
   * Получает все данные из store
   */
  async getAll(store: string = this.storeName): Promise<{ key: IDBValidKey; value: any }[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("DB not initialized");
      const transaction = this.db.transaction([store], "readonly");
      const objectStore = transaction.objectStore(store);
      const request = objectStore.openCursor();
      const results: { key: IDBValidKey; value: any }[] = [];

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    });
  }
}

export const worldDB = new DB();

/**
 * Создаёт новый экземпляр DB для конкретного мира
 */
export function createWorldDB(worldId: string): DB {
  return new DB(`qubeforge-world-${worldId}`, "chunks");
}
