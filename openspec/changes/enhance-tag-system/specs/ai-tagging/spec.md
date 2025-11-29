# AI Tagging Enhancement

## MODIFIED Requirements

### Requirement: Model Output Postprocessing with Category Preservation
Model output SHALL be postprocessed while preserving AI model's category classification throughout the pipeline.

#### Scenario: AI model categories preserved through entire processing chain
- **WHEN** inference returns output tensor with category information
- **THEN** confidence scores are extracted with category preservation
- **AND** category IDs (9=rating, 4=character, 0=general) are mapped to strings
- **AND** TagPrediction structure includes category field from model
- **AND** category information flows to database storage without loss

### Requirement: TagPrediction Structure Enhancement
TagPrediction structure SHALL include category information from AI model inference.

#### Scenario: Enhanced prediction data structure with category preservation
- **WHEN** AI inference completes and generates predictions
- **THEN** each TagPrediction SHALL contain: name, confidence, category
- **AND** category SHALL be string derived from model category ID
- **AND** category mapping shall be: 9→"rating", 4→"character", 0→"general"
- **AND** structure shall maintain backward compatibility for existing consumers

### Requirement: Tag Insertion from AI Results with Correct Classification
AI-generated tags SHALL be stored in database with their actual model classification instead of hardcoded 'general'.

#### Scenario: Database insertion uses actual AI categorization
- **WHEN** `classify_image()` returns tag predictions with categories
- **THEN** database INSERT query uses actual category parameter
- **AND** query format: `INSERT INTO Tags (name, type) VALUES (?, ?)`
- **AND** type parameter comes from AI model category, not hardcoded
- **AND** rating category (9) stores as database type 'rating'
- **AND** character category (4) stores as database type 'character'
- **AND** general category (0) stores as database type 'general'

#### Scenario: Model category ID to database type mapping consistency
- **WHEN** AI model outputs category ID 9 (rating)
- **THEN** tag is stored with database type 'rating'
- **WHEN** AI model outputs category ID 4 (character)
- **THEN** tag is stored with database type 'character'
- **WHEN** AI model outputs category ID 0 (general)
- **THEN** tag is stored with database type 'general'
- **AND** mapping is consistent with WD-Tagger standard and model expectations

### Requirement: Category Processing Pipeline
AI classification processing pipeline SHALL maintain category information from model output to database storage.

#### Scenario: End-to-end category preservation
- **WHEN** AI model produces categorized predictions
- **THEN** category information preserved through TagPrediction creation
- **AND** maintained during tag processing and validation
- **AND** correctly passed to database insertion operation
- **AND** verified in final database storage

### Requirement: Tag Type Inference Removal
Hardcoded tag type inference SHALL be removed in favor of preserving AI model's actual classification.

#### Scenario: Eliminate incorrect type inference logic
- **WHEN** processing AI-generated tags for database storage
- **THEN** system SHALL NOT infer type from naming patterns
- **AND** SHALL NOT default all AI tags to 'general' type
- **AND** SHALL use AI model's actual sophisticated categorization
- **AND** maintain full compatibility with model's classification intelligence