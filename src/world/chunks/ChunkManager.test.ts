import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ChunkManager } from './ChunkManager';
import { WORLD_GENERATION } from '../../constants/WorldConstants';

// Mock ChunkLoader
vi.mock('./ChunkLoader', () => {
  return {
    ChunkLoader: class {
      init = vi.fn();
      getDB = vi.fn();
      close = vi.fn();
      getSeed = vi.fn();
      setSeed = vi.fn();
      getNoiseTexture = vi.fn();
      getChunks = vi.fn().mockReturnValue(new Map());
      ensureChunk = vi.fn();
      processGenerationQueue = vi.fn();
      unloadChunk = vi.fn();
      updateChunkSorting = vi.fn();
      getChunksData = vi.fn().mockReturnValue(new Map());
      getDirtyChunks = vi.fn().mockReturnValue(new Set());
      clear = vi.fn();
      clearMemory = vi.fn();
    }
  };
});

// Mock ChunkVisibility
vi.mock('./ChunkVisibility', () => {
  return {
    ChunkVisibility: class {
      update = vi.fn();
      clearBounds = vi.fn();
      clearAll = vi.fn();
    }
  };
});

// Mock window.__profiler
global.window = {
  ...global.window,
  __profiler: {
    startMeasure: vi.fn(),
    endMeasure: vi.fn(),
  },
} as any;

// Mock navigator for isMobile check
Object.defineProperty(global.navigator, 'userAgent', {
  value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  writable: true,
});
Object.defineProperty(global.navigator, 'maxTouchPoints', {
  value: 0,
  writable: true,
});
global.innerWidth = 1920;

describe('ChunkManager', () => {
  let chunkManager: ChunkManager;
  let mockLoader: any;
  let scene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    scene = new THREE.Scene();
    chunkManager = new ChunkManager(scene);

    // Get the mocked instance of ChunkLoader
    mockLoader = (chunkManager as any).loader;
  });

  it('should request chunks loading on first update', () => {
    const playerPos = new THREE.Vector3(0, 0, 0);
    chunkManager.update(playerPos);

    // CHUNK_RADIUS is 3, so grid is 7x7 = 49 chunks
    // The ensureChunk might be called for each chunk in radius
    const expectedCalls = (WORLD_GENERATION.CHUNK_RADIUS * 2 + 1) ** 2;
    expect(mockLoader.ensureChunk).toHaveBeenCalledTimes(expectedCalls);
  });

  it('should NOT request chunks loading on subsequent updates within same chunk if interval not reached', () => {
    const playerPos = new THREE.Vector3(0, 0, 0);

    // First update - full update
    chunkManager.update(playerPos);
    mockLoader.ensureChunk.mockClear();

    // Second update - should be skipped for loading requests if optimized
    // UPDATE_INTERVAL is 3, so frame 2 should skip
    chunkManager.update(playerPos);

    // This expectation is for the OPTIMIZED behavior.
    // If we run this on unoptimized code, it will fail (it will be called 49 times).
    expect(mockLoader.ensureChunk).not.toHaveBeenCalled();
  });

  it('should request chunks loading when player moves to new chunk', () => {
    const playerPos1 = new THREE.Vector3(0, 0, 0);
    const playerPos2 = new THREE.Vector3(100, 0, 100); // Definitely a new chunk

    // First update
    chunkManager.update(playerPos1);
    mockLoader.ensureChunk.mockClear();

    // Second update - moved player
    chunkManager.update(playerPos2);

    expect(mockLoader.ensureChunk).toHaveBeenCalled();
  });
});
