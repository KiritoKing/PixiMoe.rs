## Context
The AI tagging system uses English tags internally for inference and storage. Translation should happen at the application layer, preserving the core data flow while providing localized display. Community creators can generate translation dictionaries independently of the main application.

## Goals / Non-Goals
- Goals:
  - Application-layer translation mapping without affecting core AI flow
  - High fault tolerance with graceful fallback to original tags
  - Efficient lookup using database alias field with async refresh
  - Community-driven translation dictionary creation
  - CSV-based dictionary format using tag NAME as key (for cross-database compatibility)
  - Multi-language support in single dictionary file
  - Search functionality supporting both original name and alias
- Non-Goals:
  - Changing AI inference or database storage from original English tags
  - Real-time translation or LLM dependency in main application
  - Complex translation metadata storage in database
  - Translation of other UI elements (focused on tags only)

## Decisions
- Decision: Translation mapping at application layer only
  - Reason: Preserves core AI flow, maintains data consistency, reduces complexity
- Decision: Add alias field to Tags table for efficient lookups
  - Reason: Database-level efficiency, async refresh capability, simple query logic
- Decision: CSV format for translation dictionaries with tag name as key
  - Reason: Cross-database compatibility, community accessibility, dictionary reuse
  - Format: `name,translated_name,language_code`
  - Note: Using tag name instead of ID enables dictionary reuse across different user databases
- Decision: Single dictionary file supports multiple languages
  - Reason: Simplifies file management, allows community to maintain comprehensive dictionaries
  - User selects active language from available languages in dictionary
- Decision: Language selection triggers alias refresh
  - Reason: Clear user intent, predictable behavior, avoids confusion
  - Switching language clears old aliases and applies new language translations
- Decision: Provide manual refresh button for new tags
  - Reason: Handles race condition when importing images while translation is active
  - New tags added after language selection can be translated via manual refresh

## Risks / Trade-offs
- Missing translations → Graceful fallback to original English tags
- Dictionary file loading overhead → Parse on upload, apply on language selection
- Tag name mismatches → High fault tolerance, skip entries for tags not in database
- Alias refresh performance → Background async processing, non-blocking UI
- Race condition (new tags during refresh) → Manual refresh button, not auto-refresh on insert

## Migration Plan
1. Add alias field to Tags table via migration
2. Implement translation dictionary CSV parser with fault tolerance
3. Add language selection that triggers alias refresh
4. Update tag display logic to use alias when available
5. Update search to support both name and alias
6. Create dictionary upload interface in settings
7. Provide refresh button for applying translations to new tags
8. Independent community translation tool development

## Open Questions
- ~~How to handle dictionary updates while system is running?~~ → Resolved: Re-upload triggers re-parse, language selection triggers refresh
- ~~Should alias refresh be immediate or queued for background processing?~~ → Resolved: Synchronous on language selection for predictable UX
- How to validate dictionary quality and consistency? → Community responsibility, tool can provide validation
