## MODIFIED Requirements

### Requirement: shadcn/ui Component Library Setup
The system SHALL integrate shadcn/ui component library with Tailwind CSS for building accessible UI components and ensure all developers follow shadcn MCP lookup workflow.

#### Scenario: shadcn/ui initialization succeeds
- **WHEN** developer runs `pnpm dlx shadcn@latest init`
- **AND** selects default TypeScript style
- **AND** confirms Tailwind CSS configuration
- **THEN** `components.json` is created in project root
- **AND** `src/lib/utils.ts` is created with `cn()` utility function
- **AND** Tailwind CSS config is updated with shadcn theme variables
- **AND** `globals.css` contains CSS variable definitions for theme colors

#### Scenario: Components can be added on-demand
- **WHEN** developer runs `pnpm dlx shadcn@latest add button`
- **THEN** `src/components/ui/button.tsx` is created
- **AND** component uses Radix UI primitives internally
- **AND** component imports work without additional configuration
- **AND** component respects dark/light theme variables

#### Scenario: Developer follows shadcn component usage workflow
- **WHEN** developer needs to use a shadcn component
- **THEN** developer MUST first use shadcn MCP to search for the component
- **AND** developer MUST use Context7 MCP to query the component's API documentation
- **AND** developer adds the component via CLI if not already installed
- **AND** developer imports and uses component according to documented API patterns

#### Scenario: Essential components are available
- **WHEN** project initialization completes
- **THEN** the following components are added:
  - `button`: Primary action component
  - `dialog`: Modal dialog for confirmations
  - `select`: Dropdown selection component
  - `input`: Form input fields
  - `card`: Content container component
  - `badge`: Tag display component
  - `popover`: Contextual overlays
  - `progress`: Progress indicators
  - `scroll-area`: Custom scrollable regions
  - `skeleton`: Loading placeholders
- **AND** all components are importable from `@/components/ui/`

### Requirement: Tailwind CSS Configuration
The system SHALL configure Tailwind CSS with proper content paths, theme customization, and dark mode support.

#### Scenario: Tailwind processes all source files
- **WHEN** Tailwind CSS is compiled
- **THEN** content paths include `src/**/*.{ts,tsx}` patterns
- **AND** utility classes from components are detected
- **AND** unused classes are purged from production builds
- **AND** final CSS bundle is minimized

#### Scenario: Dark mode is properly configured
- **WHEN** Tailwind CSS config is loaded
- **THEN** `darkMode: 'class'` is enabled for manual theme control
- **AND** CSS variables are defined for both light and dark themes in `globals.css`
- **AND** all shadcn/ui components adapt to theme changes automatically

#### Scenario: Theme variables are consistent
- **WHEN** application runs in light mode
- **THEN** CSS variables for primary, secondary, accent colors are applied from `:root`
- **WHEN** application runs in dark mode (`.dark` class on html)
- **THEN** dark mode color variants from `.dark` selector are applied
- **AND** all shadcn/ui components adapt to theme changes without custom dark: classes

### Requirement: Theme Management with System Detection
The system SHALL provide dark/light theme support with system preference detection and manual toggle.

#### Scenario: System theme preference is detected on startup
- **WHEN** application initializes
- **THEN** `window.matchMedia('(prefers-color-scheme: dark)')` is queried
- **AND** initial theme is set to 'light', 'dark', or 'system' based on stored preference (default: 'system')
- **AND** appropriate `.dark` class is applied to html element
- **AND** theme preference is persisted via localStorage

#### Scenario: User can toggle theme manually
- **WHEN** user clicks theme toggle button in toolbar
- **THEN** theme cycles through: light → dark → system
- **AND** html element's `.dark` class is updated immediately
- **AND** new preference is saved to localStorage
- **AND** all components re-render with new theme

#### Scenario: System theme changes are detected
- **WHEN** theme preference is set to 'system'
- **AND** OS theme changes from light to dark (or vice versa)
- **THEN** `matchMedia` listener fires
- **AND** `.dark` class on html element is updated automatically
- **AND** UI adapts to new system theme without page reload

#### Scenario: ThemeProvider wraps application
- **WHEN** `src/main.tsx` renders
- **THEN** custom ThemeProvider (or next-themes) wraps App component
- **AND** ThemeProvider manages theme state and localStorage sync
- **AND** useTheme() hook is available to all child components
- **AND** theme transition is smooth without flash of unstyled content

## ADDED Requirements

### Requirement: Component Migration to shadcn/ui
The system SHALL replace all custom UI components with shadcn/ui equivalents for consistency and accessibility.

#### Scenario: ImportButton uses shadcn components
- **WHEN** ImportButton component is refactored
- **THEN** native button is replaced with shadcn Button component
- **AND** progress stats popover uses shadcn Popover component
- **AND** progress bars use shadcn Progress component
- **AND** all dark: Tailwind classes are removed (rely on CSS variables)

#### Scenario: ImageCard uses shadcn Card
- **WHEN** ImageCard component is refactored
- **THEN** container div is replaced with shadcn Card component
- **AND** loading state uses shadcn Skeleton component
- **AND** error state displays within CardContent
- **AND** all inline background/border styles use theme CSS variables

#### Scenario: ImageGrid uses shadcn Skeleton
- **WHEN** ImageGrid component is refactored
- **THEN** loading placeholder divs are replaced with shadcn Skeleton components
- **AND** empty state uses proper typography with muted-foreground color
- **AND** grid container uses responsive CSS Grid without hard-coded dark: classes

#### Scenario: TagInput uses shadcn components
- **WHEN** TagInput component is refactored
- **THEN** native input is replaced with shadcn Input component
- **AND** tag badges use shadcn Badge component with variants
- **AND** autocomplete dropdown uses shadcn Popover or Combobox

#### Scenario: TagFilterPanel uses shadcn components
- **WHEN** TagFilterPanel component is refactored
- **THEN** sidebar container uses shadcn ScrollArea for overflow handling
- **AND** tag badges use shadcn Badge with secondary variant
- **AND** section headers use proper typography components
- **AND** checkboxes use shadcn Checkbox (if needed) or native with proper styling

#### Scenario: ImageViewer uses shadcn Dialog
- **WHEN** ImageViewer component is refactored
- **THEN** modal overlay is replaced with shadcn Dialog component
- **AND** close button uses shadcn Button with ghost variant
- **AND** dialog content follows shadcn DialogContent patterns
- **AND** dialog respects theme without custom dark mode classes

### Requirement: Development Guidelines for shadcn Usage
The system SHALL enforce a consistent workflow for using shadcn components through MCP tools and documentation lookup.

#### Scenario: AGENTS.md documents shadcn workflow
- **WHEN** developer reads AGENTS.md
- **THEN** clear instructions exist for shadcn component usage workflow:
  1. Use shadcn MCP to search for component
  2. Use Context7 MCP to query component API documentation
  3. Add component via `pnpm dlx shadcn@latest add <component>`
  4. Import and use according to documented patterns
- **AND** workflow applies to all shadcn component usage across the project
- **AND** examples demonstrate proper MCP tool usage

#### Scenario: Developers query component APIs before use
- **WHEN** developer needs component API reference
- **THEN** developer uses Context7 MCP with query like "shadcn/ui Button API"
- **AND** Context7 returns comprehensive API documentation
- **AND** developer follows documented prop types and usage patterns
- **AND** no guessing or trial-and-error with component APIs
