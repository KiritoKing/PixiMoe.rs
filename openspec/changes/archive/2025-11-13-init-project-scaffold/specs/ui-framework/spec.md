## ADDED Requirements

### Requirement: shadcn/ui Component Library Setup
The system SHALL integrate shadcn/ui component library with Tailwind CSS for building accessible UI components.

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

#### Scenario: Essential components are available
- **WHEN** project initialization completes
- **THEN** the following components are added:
  - `button`: Primary action component
  - `dialog`: Modal dialog for confirmations
  - `select`: Dropdown selection component
  - `input`: Form input fields
  - `card`: Content container component
- **AND** all components are importable from `@/components/ui/`

### Requirement: Tailwind CSS Configuration
The system SHALL configure Tailwind CSS with proper content paths and theme customization.

#### Scenario: Tailwind processes all source files
- **WHEN** Tailwind CSS is compiled
- **THEN** content paths include `src/**/*.{ts,tsx}` patterns
- **AND** utility classes from components are detected
- **AND** unused classes are purged from production builds
- **AND** final CSS bundle is minimized

#### Scenario: Theme variables are consistent
- **WHEN** application runs in light mode
- **THEN** CSS variables for primary, secondary, accent colors are applied
- **WHEN** application runs in dark mode
- **THEN** dark mode color variants are applied automatically
- **AND** all shadcn/ui components adapt to theme changes

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
- **AND** QueryClient is configured with appropriate defaults:
  - `staleTime`: 5 minutes
  - `cacheTime`: 10 minutes
  - `refetchOnWindowFocus`: false (desktop app context)
- **AND** custom hooks like `useTags()` can be created to wrap Tauri commands

### Requirement: Query Persistence
The system SHALL persist TanStack Query cache across application restarts using tauri-plugin-store.

#### Scenario: Custom persister is created
- **WHEN** developer implements Persister adapter
- **THEN** adapter implements `persistClient()` to save cache to Tauri Store
- **AND** adapter implements `restoreClient()` to load cache from Tauri Store
- **AND** adapter implements `removeClient()` to clear stored cache
- **AND** adapter serializes/deserializes query cache correctly

#### Scenario: Cache survives application restart
- **WHEN** user fetches data via TanStack Query
- **AND** data is cached in memory
- **AND** application closes normally
- **THEN** query cache is persisted to disk via tauri-plugin-store
- **WHEN** application restarts
- **THEN** persisted cache is loaded automatically
- **AND** UI displays cached data instantly
- **AND** background refetching happens according to `staleTime` configuration

#### Scenario: PersistQueryClientProvider is used
- **WHEN** `src/main.tsx` is implemented
- **THEN** `PersistQueryClientProvider` replaces standard `QueryClientProvider`
- **AND** custom Persister is passed via `persistOptions` prop
- **AND** `buster` string is set to `"v1"` for cache versioning
- **AND** `maxAge` matches TanStack Query's `cacheTime` (10 minutes)

### Requirement: Tauri Store Plugin Integration
The system SHALL install and configure tauri-plugin-store for persistent key-value storage.

#### Scenario: Tauri Store is available in Rust
- **WHEN** `src-tauri/Cargo.toml` is configured
- **THEN** `tauri-plugin-store` dependency is added
- **AND** plugin is registered in `tauri::Builder` in `main.rs`
- **AND** default store file is created in AppDataDir

#### Scenario: Tauri Store is available in TypeScript
- **WHEN** frontend imports `@tauri-apps/plugin-store`
- **THEN** `Store` class is available for use
- **AND** `Store.get()`, `Store.set()`, `Store.save()` methods work correctly
- **AND** store persists data between application restarts

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
