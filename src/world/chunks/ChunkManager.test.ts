/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ChunkManager } from './ChunkManager';

// Hoist mocks to top level so they can be used in vi.mock
const mocks = vi.hoisted(() => {
  const mockEnsureChunk = vi.fn();
  const mockProcessGenerationQueue = vi.fn();
  const mockUnloadChunk = vi.fn();

  class MockChunkLoader {
    constructor() {}
    init() { return Promise.resolve(); }
    getChunks() { return new Map(); }
    ensureChunk(cx: number, cz: number, priority: number) { mockEnsureChunk(cx, cz, priority); }
    processGenerationQueue() { mockProcessGenerationQueue(); }
    unloadChunk(key: string) { mockUnloadChunk(key); }
    updateChunkSorting() {}
    getDirtyChunks() { return new Set(); }
    getChunksData() { return new Map(); }
    getSeed() { return 0; }
    setSeed() {}
    getNoiseTexture() { return {} as any; }
    getDB() { return {}; }
    close() {}
    getBlock() { return 0; }
    setBlock() {}
    hasBlock() { return false; }
    isChunkLoaded() { return false; }
    getTopY() { return 0; }
    waitForChunk() { return Promise.resolve(); }
    saveDirtyChunks() { return Promise.resolve(); }
    clear() { return Promise.resolve(); }
    clearMemory() {}
  }

  class MockChunkVisibility {
    constructor() {}
    update() {}
    clearBounds() {}
    clearAll() {}
  }

  return {
    MockChunkLoader,
    MockChunkVisibility,
    mockEnsureChunk,
    mockProcessGenerationQueue,
    mockUnloadChunk
  };
});

vi.mock('./ChunkLoader', () => {
  return {
    ChunkLoader: mocks.MockChunkLoader
  }
});

vi.mock('./ChunkVisibility', () => {
  return {
    ChunkVisibility: mocks.MockChunkVisibility
  }
});

vi.mock('../../utils/Logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

describe('ChunkManager', () => {
  let chunkManager: ChunkManager;
  let scene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    chunkManager = new ChunkManager(scene);
  });

  it('should only call ensureChunk when full update is triggered (Optimized)', () => {
    const playerPos = new THREE.Vector3(0, 0, 0);

    // First update - shouldFullUpdate = true
    chunkManager.update(playerPos);

    expect(mocks.mockEnsureChunk).toHaveBeenCalled();
    const callCount1 = mocks.mockEnsureChunk.mock.calls.length;
    expect(callCount1).toBeGreaterThan(0);

    // Second update - same position. shouldFullUpdate = false.
    chunkManager.update(playerPos);

    const callCount2 = mocks.mockEnsureChunk.mock.calls.length;

    // With optimization, ensureChunk loop is skipped.
    expect(callCount2).toBe(callCount1);

    // Verify processGenerationQueue is still called every frame
    expect(mocks.mockProcessGenerationQueue).toHaveBeenCalledTimes(2);
  });
});
