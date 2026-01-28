## 2024-05-23 - Throttling Chunk Updates
**Learning:** Checking for chunks in radius every frame (string allocations + map lookups) creates unnecessary garbage and CPU load, even if `ensureChunk` returns early.
**Action:** Always move the loop that calculates `activeChunks` and queues loading inside the `if (shouldFullUpdate)` throttle block to respect the update interval.
