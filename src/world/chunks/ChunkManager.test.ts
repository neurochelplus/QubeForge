// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkManager } from './ChunkManager';
import * as THREE from 'three';

// Mock dependencies
vi.mock('./ChunkLoader', () => {
  return {
    ChunkLoader: class {
        constructor() {
            return {
                init: vi.fn(),
                getChunks: vi.fn().mockReturnValue(new Map()),
                ensureChunk: vi.fn(),
                processGenerationQueue: vi.fn(),
                unloadChunk: vi.fn(),
                updateChunkSorting: vi.fn(),
                getNoiseTexture: vi.fn(),
                getChunksData: vi.fn().mockReturnValue(new Map()),
                getDirtyChunks: vi.fn().mockReturnValue(new Set()),
                getSeed: vi.fn(),
                setSeed: vi.fn(),
            };
        }
    }
  };
});

vi.mock('./ChunkVisibility', () => {
    return {
        ChunkVisibility: class {
            constructor() {
                return {
                    update: vi.fn(),
                    clearBounds: vi.fn(),
                    clearAll: vi.fn()
                };
            }
        }
    }
});

describe('ChunkManager', () => {
  let chunkManager: ChunkManager;
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
    chunkManager = new ChunkManager(scene);
    // @ts-ignore
    chunkManager.loader.ensureChunk.mockClear();
  });

  it('should throttle chunk updates', () => {
    const playerPos = new THREE.Vector3(0, 0, 0);

    // First update - should trigger full update
    chunkManager.update(playerPos);
    // @ts-ignore
    const callsAfterFirst = chunkManager.loader.ensureChunk.mock.calls.length;
    // With Radius 3 (default), (3*2+1)^2 = 49 chunks.
    expect(callsAfterFirst).toBeGreaterThan(0);

    // Second update (same pos) - should be throttled
    chunkManager.update(playerPos);
    // @ts-ignore
    const callsAfterSecond = chunkManager.loader.ensureChunk.mock.calls.length;

    // In optimized version, calls should NOT increase.
    // In CURRENT unoptimized version, calls WILL increase.
    expect(callsAfterSecond).toBe(callsAfterFirst);

    // Third update - should still be throttled
    chunkManager.update(playerPos);
     // @ts-ignore
     const callsAfterThird = chunkManager.loader.ensureChunk.mock.calls.length;
     expect(callsAfterThird).toBe(callsAfterFirst);

    // Fourth update - should trigger update (UPDATE_INTERVAL is 3)
    chunkManager.update(playerPos);
    // @ts-ignore
    const callsAfterFourth = chunkManager.loader.ensureChunk.mock.calls.length;
    expect(callsAfterFourth).toBeGreaterThan(callsAfterFirst);
  });
});
