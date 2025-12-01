## 1. Database Schema Updates
- [x] 1.1 Create migration script to add `alias` field to Tags table
- [x] 1.2 Add indexes for efficient alias field querying
- [x] 1.3 Test migration on existing database with data
- [x] 1.4 Verify backward compatibility with existing queries

## 2. Translation Dictionary Management
- [x] 2.1 Define CSV translation dictionary format: name,translated_name,language_code
- [x] 2.2 Implement translation dictionary CSV parser with fault tolerance
- [x] 2.3 Add validation for required columns and data formats
- [x] 2.4 Create translation dictionary file storage management (single file)
- [x] 2.5 Implement error handling and logging for invalid entries
- [x] 2.6 Extract available languages from dictionary file

## 3. Backend API Updates
- [x] 3.1 Update `get_all_tags()` command to include alias field
- [x] 3.2 Modify tag display logic to use COALESCE(alias, name) for sorting
- [x] 3.3 Add translation dictionary upload Tauri command
- [x] 3.4 Implement alias refresh for selected language
- [x] 3.5 Add language preference management commands
- [x] 3.6 Add translation progress event emissions
- [x] 3.7 Update existing tag queries to gracefully handle alias field
- [x] 3.8 Add refresh_translations command for manual refresh
- [x] 3.9 Update search_tags to support both name and alias

## 4. Async Alias Refresh System
- [x] 4.1 Implement background task for updating Tags.alias field
- [x] 4.2 Add batch processing to handle large datasets efficiently
- [x] 4.3 Create progress reporting system for alias refresh
- [x] 4.4 Add error handling for failed updates
- [x] 4.5 Implement tag name matching (not tag_id) for cross-database compatibility
- [x] 4.6 Clear existing aliases before applying new language

## 5. Frontend UI Components
- [x] 5.1 Create translation settings panel component
- [x] 5.2 Add translation dictionary upload interface with drag-and-drop
- [x] 5.3 Implement language selection from available languages in dictionary
- [x] 5.4 Update tag display components to use alias when available
- [x] 5.5 Add translation management buttons (upload, delete, refresh)
- [x] 5.6 Implement fallback display logic for missing translations
- [x] 5.7 Add refresh button for applying translations to new tags
- [x] 5.8 Update frontend search/filter to support both name and alias

## 6. Settings and Configuration
- [x] 6.1 Add translation settings to main settings dialog
- [x] 6.2 Implement language preference persistence
- [x] 6.3 Add translation dictionary storage location display
- [x] 6.4 Create translation status indicators (loaded, language, count)
- [x] 6.5 Display available languages from dictionary

## 7. Testing and Validation
- [ ] 7.1 Test database migration and alias field functionality
- [ ] 7.2 Test translation dictionary upload with multi-language file
- [ ] 7.3 Test language switching and alias refresh
- [ ] 7.4 Validate fault tolerance with malformed CSV files
- [ ] 7.5 Test fallback behavior when translations are missing
- [ ] 7.6 Test search functionality with both name and alias

## 8. External Translation Tool (Separate Project)
- [ ] 8.1 Create independent TypeScript translation script repository
- [ ] 8.2 Implement OpenAI SDK integration with configurable API endpoints
- [ ] 8.3 Add batch processing with context window optimization
- [ ] 8.4 Create translation output format validation
- [ ] 8.5 Add CLI interface with progress reporting
- [ ] 8.6 Create documentation for community content creators

## 9. Documentation
- [x] 9.1 Write translation dictionary format specification
- [x] 9.2 Create community guide for dictionary creation
- [ ] 9.3 Document translation tool usage for content creators
- [ ] 9.4 Create troubleshooting guide for common translation issues
