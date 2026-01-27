## 2024-05-22 - Chunk Update Loop Bottleneck
**Learning:** The `ChunkManager.update` method was iterating 49 times (7x7 radius) every frame to check for chunk loading, constructing string keys (`${x},${z}`) and doing Map lookups, even when the player hadn't moved.
**Action:** Moved the chunk loading check inside the `shouldFullUpdate` block (throttled to every 3 frames or on chunk crossing). This prevents thousands of unnecessary string allocations and map lookups per second. Always check for tight loops in `update` methods that run every frame!
