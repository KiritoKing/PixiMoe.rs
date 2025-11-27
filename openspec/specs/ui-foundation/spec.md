# ui-foundation Specification

## Purpose
提供UI基础设施，包括shadcn/ui组件库设置、Tailwind CSS配置、React状态管理（Zustand和TanStack Query）、类型安全等基础功能。

## Requirements
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
  - `input`: Form input fields
  - `card`: Content container component
  - `badge`: Tag display component
  - `popover`: Contextual overlays
  - `progress`: Progress indicators
  - `scroll-area`: Custom scrollable regions
  - `skeleton`: Loading placeholders
  - `checkbox`: Checkbox input component
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
The system SHALL provide dark/light theme support with system preference detection and manual toggle using next-themes library.

#### Scenario: ThemeProvider wraps application
- **WHEN** `src/main.tsx` renders
- **THEN** ThemeProvider from next-themes (0.4.6+) wraps App component
- **AND** ThemeProvider is configured with `attribute="class"`, `defaultTheme="system"`, and `enableSystem`
- **AND** ThemeProvider manages theme state and localStorage sync
- **AND** useTheme() hook from next-themes is available to all child components
- **AND** theme transition is smooth without flash of unstyled content

#### Scenario: System theme preference is detected on startup
- **WHEN** application initializes
- **THEN** next-themes automatically queries `window.matchMedia('(prefers-color-scheme: dark)')`
- **AND** initial theme is set to 'light', 'dark', or 'system' based on stored preference (default: 'system')
- **AND** appropriate `.dark` class is applied to html element
- **AND** theme preference is persisted via localStorage automatically

#### Scenario: User can toggle theme manually
- **WHEN** user clicks theme toggle button (ThemeToggle component)
- **THEN** theme cycles through: light → dark → system
- **AND** html element's `.dark` class is updated immediately
- **AND** new preference is saved to localStorage automatically
- **AND** all components re-render with new theme via React context

#### Scenario: System theme changes are detected
- **WHEN** theme preference is set to 'system'
- **AND** OS theme changes from light to dark (or vice versa)
- **THEN** next-themes automatically detects change via `matchMedia` listener
- **AND** `.dark` class on html element is updated automatically
- **AND** UI adapts to new system theme without page reload

### Requirement: React State Management
The system SHALL implement dual state management with Zustand (UI state) and TanStack Query (server state).

#### Scenario: Zustand manages UI state
- **WHEN** application initializes
- **THEN** Zustand store is created for global UI state
- **AND** store tracks at minimum: `isSidebarOpen`, `currentTheme`, `indexingProgress`
- **AND** components can access and update state via hooks
- **AND** state changes trigger React re-renders

#### Scenario: TanStack Query manages server state
- **WHEN** `src/main.tsx` renders
- **THEN** `QueryClientProvider` wraps the application root
- **AND** QueryClient is configured with appropriate defaults (TanStack Query 5.90.8+):
  - `staleTime`: 5 minutes
  - `cacheTime`: 10 minutes
  - `refetchOnWindowFocus`: false (desktop app context)
- **AND** custom hooks like `useTags()` can be created to wrap Tauri commands

### Requirement: Component Type Safety
The system SHALL ensure all UI components and Tauri invocations are fully type-safe.

#### Scenario: Tauri commands have TypeScript types
- **WHEN** developer creates typed wrapper for Tauri commands in `src/lib/tauri.ts`
- **THEN** all `invoke()` calls have explicit return types
- **AND** TypeScript compiler catches mismatched types
- **AND** IntelliSense provides parameter hints

#### Scenario: Component props are validated
- **WHEN** developer uses shadcn/ui components
- **THEN** TypeScript validates all prop types
- **AND** invalid prop combinations are caught at compile time
- **AND** React DevTools shows correct prop types

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

