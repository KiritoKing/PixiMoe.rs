# Change: Enhanced Tag System

## Why
Current tag system has critical AI classification bugs, lacks organization features, and provides poor user experience for managing large tag collections. The AI model correctly categorizes tags but all are stored as 'general', wasting sophisticated categorization capability.

## What Changes
- **Critical Fix**: Restore AI model's rating/general/character classification capability
- Add custom tag categories with color coding and user-defined organization
- Implement favorites functionality for quick content access
- Enhance tag filter UI with sorting, collapsible sections, and selected tags display
- Add comprehensive tag management capabilities

## Impact
- **Affected specs:** ai-tagging, tag-management, favorites, file-management, ui-components
- **Affected code:**
  - AI classification pipeline and TagPrediction structure
  - Database schema with TagCategories and Favorites tables
  - Favorite management system and APIs
  - TagFilterPanel, ImageViewer, and related UI components
  - Batch operations and tag management interfaces

## Success Criteria
- AI-generated tags correctly categorized (rating/general/character)
- Users can create unlimited custom categories with colors
- Favorites integrate seamlessly with tag filtering
- Tag filter UI provides efficient organization and search
- Complete system works cohesively without breaking existing functionality

## Risk Assessment
- **Risk Level:** Medium (database migration + UI complexity)
- **Mitigation:** Comprehensive testing, incremental rollout, backup procedures
- **Impact:** High - transforms core user experience while maintaining compatibility