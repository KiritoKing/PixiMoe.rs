# Fix Import Progress Display Accuracy

## Why
The import progress display in ImportButton component had inaccurate progress counts:
1. AI tagging progress count was manually incremented instead of using backend-provided `current` values, causing double-counting
2. AI tagging "processing" count was tracked using a Set that never got cleared during batch operations, causing the count to accumulate incorrectly

## What Changes
Updated the progress tracking logic to:
1. Use backend-provided `current` and `total` values directly for AI tagging progress instead of manual counting
2. Calculate "processing" count as `total - current` for batch operations instead of tracking individual file hashes in a Set
3. Clear the processing Set when batch operation events are received (which have `current`/`total` but no `file_hash`)

## Changes
- Modified `ImportButton.tsx` AI tagging progress event handler to use `current`/`total` from backend
- Updated "processing" count calculation to use `total - current` for batch operations
- Added logic to clear processing Set when batch events are received
- Added comments explaining the difference between batch and individual file tracking

## Impact
- Progress counts now accurately reflect backend state
- "Processing" count correctly shows remaining files during batch operations
- Aligns with backend event structure where batch operations send `current`/`total` without `file_hash`
- No breaking changes, only fixes accuracy of existing functionality

