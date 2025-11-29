# Tag Management Enhancement

## ADDED Requirements

### Requirement: Custom Tag Categories
Users SHALL be able to create unlimited custom tag categories with personalized organization and visual differentiation.

#### Scenario: Creating photography categories
- **WHEN** a user wants to organize photography-related tags
- **THEN** they can create categories like "Locations" (blue), "Photography Style" (green), "Equipment" (orange)
- **AND** assign multiple tags to each category for better organization

#### Scenario: Category visual customization
- **WHEN** creating or editing categories
- **THEN** users can choose from predefined color palette or custom colors
- **AND** selected colors are used consistently across all tag displays
- **AND** colors provide visual cues for quick category identification

### Requirement: Category Management Operations
Users SHALL be able to manage custom categories with full CRUD operations while protecting built-in categories.

#### Scenario: Category lifecycle management
- **WHEN** managing custom categories
- **THEN** users can create, edit name/color, and delete custom categories
- **AND** built-in categories (GENERAL, CHARACTER, RATING, ARTIST) cannot be deleted
- **AND** deleting custom category reassigns tags to GENERAL category

#### Scenario: Category reordering
- **WHEN** user wants to prioritize frequently used categories
- **THEN** they can drag-and-drop categories to reorder them
- **AND** new order is persisted across application sessions
- **AND** tag displays reflect updated category order

### Requirement: Bulk Category Assignment
Users SHALL be able to assign multiple tags to categories efficiently through bulk operations.

#### Scenario: Bulk category reorganization
- **WHEN** user selects multiple location-related tags
- **THEN** they can assign all selected tags to "Locations" category in single operation
- **AND** system confirms number of affected tags before executing
- **AND** operation provides progress feedback for large selections

#### Scenario: Tag category management interface
- **WHEN** user opens tag management interface
- **THEN** they can search, select, and categorize multiple tags efficiently
- **AND** interface provides visual feedback for all operations
- **AND** supports keyboard navigation for power users

## MODIFIED Requirements

### Requirement: Tag Database Schema Enhancement
Tags table SHALL support category references while maintaining backward compatibility with existing type system.

#### Scenario: Dual schema compatibility
- **WHEN** migrating to category system
- **THEN** Tags table gets category_id foreign key referencing TagCategories
- **AND** existing type field maintained for backward compatibility
- **AND** migration script maps existing types to built-in categories
- **AND** both old type-based and new category-based queries work

#### Scenario: Category type mapping
- **WHEN** existing tags have type 'general', 'character', 'rating', 'artist'
- **THEN** migration creates corresponding built-in categories
- **AND** tags get appropriate category_id assignments
- **AND** original type values preserved for compatibility

### Requirement: Tag Query Operations Enhancement
Tag queries SHALL support both legacy type-based filtering and new category-based operations.

#### Scenario: Backward compatible tag queries
- **WHEN** existing code queries tags by type parameter
- **THEN** system automatically maps type to corresponding category
- **AND** maintains API compatibility while using new category infrastructure
- **AND** performance remains acceptable through proper indexing

#### Scenario: Enhanced tag queries with categories
- **WHEN** new code queries tags using category system
- **THEN** queries use category_id for efficient filtering
- **AND** support both category names and IDs in query parameters
- **AND** provide category metadata in query results

### Requirement: Tag Management Operations Enhancement
Tag management operations SHALL support both type and category parameters with automatic mapping.

#### Scenario: Enhanced tag creation with categorization
- **WHEN** creating new tags through API
- **THEN** system accepts both legacy type and new category parameters
- **AND** type parameters automatically map to built-in categories
- **AND** category parameters use custom or built-in categories directly
- **AND** operation succeeds with either parameter type

#### Scenario: Category-aware tag operations
- **WHEN** performing tag operations (search, filter, assign)
- **THEN** operations understand category relationships
- **AND** provide category context in results
- **AND** maintain consistency across all tag operations

### Requirement: Tag Inference Logic Update
Tag type inference logic SHALL be updated to work with AI model's actual categorization instead of naming patterns.

#### Scenario: AI categorization integration
- **WHEN** AI model generates categorized tags
- **THEN** system uses AI model's category output directly
- **AND**不再依赖命名模式推断类型
- **AND** maintains consistency with WD-Tagger behavior

## REMOVED Requirements

### Requirement: Fixed Tag Type Enumeration
Hardcoded enumeration of tag types SHALL be replaced with dynamic category system while preserving built-in categories.

**Reason:** Dynamic categories provide superior flexibility and user customization while maintaining essential built-in functionality.
**Migration:** Existing fixed types mapped to built-in categories during schema migration with full backward compatibility.