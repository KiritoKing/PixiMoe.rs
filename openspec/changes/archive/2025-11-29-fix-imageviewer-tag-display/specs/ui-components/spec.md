## MODIFIED Requirements

### Requirement: Image Lightbox Viewer
The system SHALL provide a modal viewer for displaying full-resolution images with navigation.

#### Scenario: Image metadata is displayed
- **WHEN** lightbox is open
- **THEN** sidebar or overlay shows:
  - File name
  - Dimensions (width × height)
  - File size
  - Date imported
  - List of associated tags (clickable) - **ALL** tags are displayed without artificial limits
- **AND** metadata is scrollable if list is long
- **AND** tags are rendered in a flex-wrap layout that accommodates any number of tags
- **AND** each tag includes a remove button for individual tag management
- **AND** all tags maintain consistent styling regardless of total count
- **AND** no arbitrary tag count limits are imposed (removed previous 20-tag limitation)