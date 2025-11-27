# ui-layout Specification

## Purpose
提供应用布局功能，包括主应用布局结构、响应式设计等。确保应用在不同屏幕尺寸下都能良好显示，布局结构清晰且易于使用。

## Requirements
### Requirement: Main Application Layout
The system SHALL organize UI components in a cohesive application layout.

#### Scenario: Layout structure is implemented
- **WHEN** application loads
- **THEN** main container uses flexbox layout
- **AND** TagFilterPanel is positioned on left (250px width, collapsible)
- **AND** ImageGrid occupies remaining right space (flex-grow: 1)
- **AND** top toolbar spans full width with import button and view controls
- **AND** layout is responsive (sidebar collapses to bottom sheet on mobile)

### Requirement: Responsive Design
The system SHALL adapt UI layout to different screen sizes.

#### Scenario: Desktop layout is optimized
- **WHEN** viewport width is ≥ 1024px
- **THEN** TagFilterPanel is visible as permanent sidebar
- **AND** ImageGrid uses 4-6 columns depending on container width
- **AND** hover effects work with mouse interaction

#### Scenario: Mobile layout is optimized
- **WHEN** viewport width is < 768px
- **THEN** TagFilterPanel collapses to bottom sheet (opened via button)
- **AND** ImageGrid uses 2-3 columns for smaller screens
- **AND** touch gestures work for scrolling and selecting
- **AND** import button is prominent in bottom navigation bar

