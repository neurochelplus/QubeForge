import * as THREE from "three";
import { World } from "../world/World";
import { ItemEntity } from "./ItemEntity";

/**
 * Object Pool для ItemEntity
 * Переиспользует объекты вместо создания/удаления для уменьшения нагрузки на GC
 */
export class ItemEntityPool {
    private static instance: ItemEntityPool;

    private pool: ItemEntity[] = [];
    private activeEntities: Set<ItemEntity> = new Set();

    // Лимиты пула
    private readonly MAX_POOL_SIZE = 50;

    // Зависимости для создания entity
    private world: World | null = null;
    private scene: THREE.Scene | null = null;
    private blockTexture: THREE.DataTexture | null = null;

    private constructor() { }

    public static getInstance(): ItemEntityPool {
        if (!ItemEntityPool.instance) {
            ItemEntityPool.instance = new ItemEntityPool();
        }
        return ItemEntityPool.instance;
    }

    /**
     * Инициализация пула с зависимостями
     */
    public init(
        world: World,
        scene: THREE.Scene,
        blockTexture: THREE.DataTexture
    ): void {
        this.world = world;
        this.scene = scene;
        this.blockTexture = blockTexture;
    }

    /**
     * Получить entity из пула или создать новую
     */
    public acquire(
        x: number,
        y: number,
        z: number,
        type: number,
        itemTexture: THREE.CanvasTexture | null = null,
        count: number = 1
    ): ItemEntity | null {
        if (!this.world || !this.scene || !this.blockTexture) {
            console.warn('ItemEntityPool not initialized');
            return null;
        }

        // Попробовать взять из пула
        let entity = this.pool.pop();

        if (entity) {
            // Реинициализировать существующую entity
            this.reinitialize(entity, x, y, z, type, itemTexture, count);
        } else {
            // Создать новую entity
            entity = new ItemEntity(
                this.world,
                this.scene,
                x,
                y,
                z,
                type,
                this.blockTexture,
                itemTexture,
                count
            );
        }

        this.activeEntities.add(entity);
        return entity;
    }

    /**
     * Вернуть entity в пул вместо уничтожения
     */
    public release(entity: ItemEntity): void {
        if (!this.activeEntities.has(entity)) return;

        this.activeEntities.delete(entity);

        // Скрыть entity
        entity.mesh.visible = false;
        entity.isDead = false;

        // Добавить в пул если не переполнен
        if (this.pool.length < this.MAX_POOL_SIZE) {
            this.pool.push(entity);
        } else {
            // Пул полон — уничтожить entity
            entity.dispose();
        }
    }

    /**
     * Очистить пул (при выходе из игры)
     */
    public clear(): void {
        // Очистить активные
        for (const entity of this.activeEntities) {
            entity.dispose();
        }
        this.activeEntities.clear();

        // Очистить пул
        for (const entity of this.pool) {
            entity.dispose();
        }
        this.pool = [];
    }

    /**
     * Получить статистику пула
     */
    public getStats(): { pooled: number; active: number } {
        return {
            pooled: this.pool.length,
            active: this.activeEntities.size
        };
    }

    /**
     * Реинициализировать entity для повторного использования
     * Примечание: В текущей реализации просто создаём новую entity,
     * так как полная реинициализация требует рефакторинга ItemEntity
     */
    private reinitialize(
        entity: ItemEntity,
        x: number,
        y: number,
        z: number,
        type: number,
        _itemTexture: THREE.CanvasTexture | null,
        count: number
    ): void {
        // Обновить позицию
        entity.mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
        entity.mesh.visible = true;
        entity.isDead = false;

        // Обновить тип и количество
        entity.type = type;
        entity.count = count;

        // Добавить в сцену если был удалён
        if (this.scene && !entity.mesh.parent) {
            this.scene.add(entity.mesh);
        }
    }
}

// Экспорт синглтона
export const itemEntityPool = ItemEntityPool.getInstance();
