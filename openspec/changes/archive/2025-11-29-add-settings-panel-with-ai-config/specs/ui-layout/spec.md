# ui-layout Specification Deltas

## ADDED Requirements

### Requirement: Settings Panel Layout
The system SHALL provide a Notion-style split-pane settings panel with left navigation and right content area.

#### Scenario: Settings panel is accessible
- **WHEN** user clicks settings icon or navigates to settings
- **THEN** settings panel opens as a modal or full-page view
- **AND** panel uses split-pane layout (left sidebar + right content)
- **AND** left sidebar contains navigation items (Account, AI Settings, Notifications, Connections, Offline)
- **AND** right content area displays selected section's configuration UI
- **AND** currently selected navigation item is highlighted

#### Scenario: Settings panel navigation works
- **WHEN** user clicks a navigation item in left sidebar
- **THEN** right content area updates to show corresponding configuration page
- **AND** navigation item is visually highlighted (icon and text)
- **AND** URL or state reflects current section (for bookmarking/deep linking)
- **AND** navigation is smooth without full page reload

#### Scenario: Settings panel is responsive
- **WHEN** viewport width is < 768px
- **THEN** left sidebar collapses to a dropdown or bottom sheet
- **AND** right content area expands to full width
- **AND** navigation can be accessed via hamburger menu or bottom navigation

### Requirement: AI Settings Page Layout
The system SHALL provide a dedicated AI Settings page within the settings panel.

#### Scenario: AI Settings page is displayed
- **WHEN** user selects "AI Settings" from settings navigation
- **THEN** right content area shows AI configuration interface
- **AND** page is divided into sections: "ONNX AI Features" and "LLM Interface By Network API"
- **AND** "ONNX AI Features" section is on the left side of content area
- **AND** "LLM Interface By Network API" section is on the right side of content area
- **AND** both sections are visible simultaneously (side-by-side layout)

#### Scenario: ONNX AI Features section layout
- **WHEN** AI Settings page is displayed
- **THEN** "ONNX AI Features" section shows:
  - Title: "ONNX AI Features"
  - Sub-section: "Tag" (标签模型)
  - Upload area for .ONNX model file (dashed border box with upload icon)
  - Upload area for .CSV label map file (dashed border box with upload icon)
  - Action button: "识别" (Recognition) - placeholder for future functionality
  - Information note about SHA256 verification (hash values are built into the application, can be left empty for now)

#### Scenario: Model upload area is interactive
- **WHEN** user clicks on .ONNX upload area
- **THEN** file picker dialog opens
- **AND** user can select .onnx model file
- **AND** selected file name is displayed in upload area
- **AND** upload button or auto-upload triggers file upload process

