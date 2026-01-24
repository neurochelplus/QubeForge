## 2024-05-22 - Throttling Chunk Update Loop
**Learning:** High-frequency loops (running every frame) in `ChunkManager` were creating significant string allocation pressure (`${x},${z}`) and Map lookups even when the game state dictated no updates were needed (throttling active).
**Action:** When implementing throttling logic (like `UPDATE_INTERVAL`), ensure that *all* associated heavy logic (including the checks that build the work queue) is also inside the throttled block, not just the execution phase. Move `activeChunks` set generation inside the `if (shouldFullUpdate)` block.
