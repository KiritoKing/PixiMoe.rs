# Change: Add Tag Translation System

## Why
The current AI tagging system outputs fixed English tags from the CSV label file. Users need the ability to translate these tags to different languages using community-created translation dictionaries, with the translation happening at the application layer rather than changing the core AI data flow.

## What Changes
- Design translation dictionary CSV format with tag NAME as key for cross-database compatibility
- Support multiple languages in single dictionary file
- Add translation dictionary upload functionality with high fault tolerance
- Implement language selection that triggers alias refresh
- Add alias field to Tags table for efficient translated lookups
- Update search functionality to support both original name and alias
- Provide manual refresh for applying translations to newly imported tags
- Ensure graceful fallback to original English tags when translations are missing

## Impact
- Affected specs: tag-management (alias field, search, display)
- External spec: translation-tool (independent community tool)
- Affected code: Tag query commands, settings UI, Tags table schema, search logic
- New files: Dictionary parser, translation settings UI, upload components
- Core AI flow: Unchanged (still uses original English tags internally)
