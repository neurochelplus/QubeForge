// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChunkManager } from './ChunkManager';
import * as THREE from 'three';
import { ChunkLoader } from './ChunkLoader';
import { ChunkVisibility } from './ChunkVisibility';

// Mock dependencies
const mockEnsureChunk = vi.fn();
const mockGetChunks = vi.fn().mockReturnValue(new Map());

vi.mock('./ChunkLoader', () => {
  return {
    ChunkLoader: class {
      constructor() {}
      init = vi.fn();
      getDB = vi.fn();
      close = vi.fn();
      getSeed = vi.fn();
      setSeed = vi.fn();
      getNoiseTexture = vi.fn();
      ensureChunk = mockEnsureChunk;
      processGenerationQueue = vi.fn();
      getChunks = mockGetChunks;
      unloadChunk = vi.fn();
      updateChunkSorting = vi.fn();
      getChunksData = vi.fn().mockReturnValue(new Map());
      getDirtyChunks = vi.fn().mockReturnValue(new Set());
      clear = vi.fn();
      clearMemory = vi.fn();
    }
  };
});

vi.mock('./ChunkVisibility', () => {
  return {
    ChunkVisibility: class {
      constructor() {}
      update = vi.fn();
      clearBounds = vi.fn();
      clearAll = vi.fn();
    }
  };
});

describe('ChunkManager', () => {
  let manager: ChunkManager;
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    vi.clearAllMocks();
    mockEnsureChunk.mockClear();
    mockGetChunks.mockReturnValue(new Map());

    manager = new ChunkManager(scene);
  });

  it('should call ensureChunk on first update', () => {
    const pos = new THREE.Vector3(100, 0, 100);
    manager.update(pos);

    // Should call ensureChunk for chunks in radius
    expect(mockEnsureChunk).toHaveBeenCalled();
  });

  it('should NOT call ensureChunk on throttled updates', () => {
    const pos = new THREE.Vector3(100, 0, 100);

    // First update (full update)
    manager.update(pos);
    mockEnsureChunk.mockClear();

    // Second update (same pos, should be throttled)
    manager.update(pos);

    // This expects the optimization to be in place.
    // Before optimization, this will fail because loop runs every frame.
    expect(mockEnsureChunk).not.toHaveBeenCalled();
  });

  it('should call ensureChunk again when interval is reached or player moves chunk', () => {
    const pos = new THREE.Vector3(100, 0, 100);

    // 1. Full update
    manager.update(pos);

    // 2. Throttled
    manager.update(pos);

    // 3. Throttled (assuming interval is 3)
    manager.update(pos);

    mockEnsureChunk.mockClear();

    // 4. Should be Full update (counter >= interval)
    // Note: UPDATE_INTERVAL is 3.
    // 1st update: counter resets to 0.
    // 2nd update: counter becomes 1.
    // 3rd update: counter becomes 2.
    // 4th update: counter becomes 3 -> Full Update.

    manager.update(pos);
    expect(mockEnsureChunk).toHaveBeenCalled();

    mockEnsureChunk.mockClear();

    // Move player to new chunk
    // Chunk size is 32. 100 / 32 = 3.
    // Move to 200 (chunk 6).
    const newPos = new THREE.Vector3(200, 0, 100);
    manager.update(newPos);
    expect(mockEnsureChunk).toHaveBeenCalled();
  });
});
