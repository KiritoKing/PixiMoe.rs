## ADDED Requirements
### Requirement: Tag Translation Dictionary Generation
The translation tool SHALL provide a TypeScript script to translate existing CSV tag files using LLM services.

#### Scenario: Translation script processes CSV file in batches
- **WHEN** `translate-tags.ts` script is executed with input CSV and target language
- **THEN** script reads CSV file in configurable batch sizes (default: 100 tags per batch)
- **AND** each batch includes system prompt with context about tag translation requirements
- **AND** user prompt includes batch data with tag_id, name, category for context
- **AND** OpenAI SDK is used with configurable API endpoint and model
- **AND** LLM response is parsed and validated for correct format
- **AND** translated results are written to output CSV incrementally

#### Scenario: Batch processing optimizes context window usage
- **WHEN** processing large CSV files (10,000+ tags)
- **THEN** batch size is automatically adjusted based on model context window limits
- **AND** system prompt includes tag type categories and translation guidelines
- **AND** each request includes previous translations for consistency reference
- **AND** parallel requests are limited by configurable concurrency (default: 3)
- **AND** failed requests are retried with exponential backoff (max 3 attempts)

#### Scenario: Translation output format is structured
- **WHEN** LLM returns translation results
- **THEN** output format is validated as JSON array with required fields
- **AND** each translated tag includes: tag_id, original_name, translated_name, language_code
- **AND** output CSV uses format: tag_id,translated_name,language_code
- **AND** tag_id consistency is maintained with original selected_tags.csv
- **AND** translated results are sorted by tag_id for verification

### Requirement: Translation Quality Assurance
The translation tool SHALL provide mechanisms to ensure translation quality and consistency.

#### Scenario: Translation consistency checking
- **WHEN** batch translating tags
- **THEN** same root tag variants maintain consistent translation style
- **AND** special terminology (character names, series names) maintains uniform translation
- **AND** translation examples are passed between batches for consistency
- **AND** system prompt includes translation style and terminology guidelines

#### Scenario: Translation result validation
- **WHEN** translation is complete
- **THEN** all tag_ids have corresponding translations in output
- **AND** translated text has reasonable length (avoiding too short or too long)
- **AND** special characters and formatting are handled correctly
- **AND** validation report is generated with translation statistics and potential issues

### Requirement: Tool Configuration and Usability
The translation tool SHALL provide flexible configuration options and user-friendly interface.

#### Scenario: Tool configuration management
- **WHEN** configuring translation parameters
- **THEN** configuration file support for API endpoint, model, batch size settings
- **AND** command line arguments override configuration file settings
- **AND** multiple LLM provider support (OpenAI compatible)
- **AND** custom system prompt and translation guidelines support

#### Scenario: Progress reporting and error handling
- **WHEN** executing translation process
- **THEN** real-time progress information display (current batch, total batches, ETA)
- **AND** translation statistics logging (success count, failure count, skipped count)
- **AND** detailed error logging and debugging information
- **AND** checkpoint recovery support for interrupted translation tasks