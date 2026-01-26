# Bolt's Journal

## 2025-02-18 - ChunkManager Update Loop Optimization
**Learning:** `ChunkManager.update` contained a nested loop iterating over chunk radius (approx 300 iterations) that ran every frame, even when the player hadn't moved and no chunk update was needed. This created unnecessary string allocations and map lookups.
**Action:** Move expensive update logic inside throttling conditionals (`shouldFullUpdate`) whenever possible, especially if the result is only needed for the throttled logic.
