# Fix ImageViewer Tag Display Limitation

## Problem
The ImageViewer component was limiting tag display to only the first 20 tags, preventing users from seeing all associated tags for images with many tags.

## Solution
Removed the artificial 20-tag limit in the ImageViewer component to display all tags as required by the ui-components specification.

## Changes
- Removed `tags.slice(0, 20)` limitation in ImageViewer.tsx
- Simplified tag rendering logic to display all tags
- Removed warning message about tag limits
- Maintains all existing functionality (tag removal, styling, etc.)

## Impact
- Users can now see all tags associated with an image in the lightbox viewer
- Aligns with ui-components spec requirement for displaying "List of associated tags"
- No performance impact for reasonable tag counts
- Improves user experience for heavily tagged images