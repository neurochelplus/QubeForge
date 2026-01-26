// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { ChunkManager } from './ChunkManager';

// Mock ChunkLoader
vi.mock('./ChunkLoader', () => {
  const Mock = vi.fn();
  Mock.prototype.init = vi.fn();
  Mock.prototype.getChunks = vi.fn().mockReturnValue(new Map());
  Mock.prototype.ensureChunk = vi.fn();
  Mock.prototype.processGenerationQueue = vi.fn();
  Mock.prototype.updateChunkSorting = vi.fn();
  Mock.prototype.unloadChunk = vi.fn();
  Mock.prototype.getDB = vi.fn();
  Mock.prototype.getNoiseTexture = vi.fn();
  Mock.prototype.setSeed = vi.fn();
  Mock.prototype.getSeed = vi.fn();
  Mock.prototype.getChunksData = vi.fn().mockReturnValue(new Map());
  Mock.prototype.getDirtyChunks = vi.fn().mockReturnValue(new Set());
  Mock.prototype.clearMemory = vi.fn();
  Mock.prototype.clear = vi.fn();

  return { ChunkLoader: Mock };
});

// Mock ChunkVisibility
vi.mock('./ChunkVisibility', () => {
  const Mock = vi.fn();
  Mock.prototype.update = vi.fn();
  Mock.prototype.clearBounds = vi.fn();
  Mock.prototype.clearAll = vi.fn();

  return { ChunkVisibility: Mock };
});

// Mock Logger
vi.mock('../../utils/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

describe('ChunkManager', () => {
  let chunkManager: ChunkManager;
  let mockScene: THREE.Scene;

  beforeEach(() => {
    vi.clearAllMocks();
    mockScene = new THREE.Scene();

    // Mock window.__profiler
    window.__profiler = {
      startMeasure: vi.fn(),
      endMeasure: vi.fn(),
    };

    chunkManager = new ChunkManager(mockScene);
  });

  it('should throttle chunk updates when player is stationary', () => {
    // Access the private loader instance
    const loader = (chunkManager as any).loader;

    const playerPos = new THREE.Vector3(0, 0, 0);

    // First update: should trigger ensureChunk loop because it's the first run (player moved from Infinity)
    chunkManager.update(playerPos);

    const callsAfterFirstUpdate = loader.ensureChunk.mock.calls.length;
    expect(callsAfterFirstUpdate).toBeGreaterThan(0);

    // Second update: same position
    // Expectation: updateCounter increments to 1 (interval is 3), so shouldFullUpdate is false.
    // If optimized, ensureChunk loop should be skipped.
    chunkManager.update(playerPos);

    const callsAfterSecondUpdate = loader.ensureChunk.mock.calls.length;

    // This assertion will FAIL before optimization, establishing the baseline
    expect(callsAfterSecondUpdate).toBe(callsAfterFirstUpdate);
  });
});
