## 2026-01-25 - Redundant Chunk Queuing Loop
**Learning:** The `ChunkManager.update` loop was iterating over the entire chunk radius (49+ chunks) every single frame to check/queue chunks, even when no update was needed (player didn't move, interval not reached). This caused continuous string allocations and map lookups.
**Action:** Move "poll-style" loops that depend on slow-changing state (like chunk position) inside throttling/dirty-check blocks. Ensure only frame-critical updates (like processing the queue) run every frame.
