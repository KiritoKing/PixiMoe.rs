# frontend-backend-integration Specification

## Purpose
规范React前端与Tauri后端之间的交互模式，包括类型安全的命令调用、TanStack Query hooks封装、事件监听、错误处理等。确保前后端交互的类型安全、一致性和可维护性。

## Requirements
### Requirement: TypeScript Type Definitions
The system SHALL define TypeScript interfaces that exactly match Rust backend structures for type-safe communication.

#### Scenario: Type definitions match Rust structs
- **WHEN** `src/types/index.ts` is defined
- **THEN** `FileRecord` interface matches Rust `Files` table structure (snake_case field names preserved)
- **AND** `Tag` interface matches Rust `Tags` table structure
- **AND** `ImportResult` interface matches Rust command response struct
- **AND** `ProgressEvent` interface matches Rust event payload struct
- **AND** all field names and types are identical between TypeScript and Rust

#### Scenario: Type definitions are centralized
- **WHEN** developer needs to reference backend types
- **THEN** all types are exported from `src/types/index.ts`
- **AND** types are imported in hooks and components
- **AND** no duplicate type definitions exist
- **AND** types are kept in sync with Rust backend changes

### Requirement: Tauri Command Invocation
The system SHALL use type-safe `invoke()` calls for all Tauri command invocations.

#### Scenario: Commands are invoked with explicit types
- **WHEN** frontend calls a Tauri command
- **THEN** `invoke<T>()` is used with explicit return type parameter
- **AND** command name matches Rust function name (snake_case)
- **AND** parameters are passed as object with matching field names
- **AND** TypeScript compiler validates parameter and return types

#### Scenario: Command invocation pattern is consistent
- **WHEN** `invoke<T>("command_name", { param1, param2 })` is called
- **THEN** return type `T` matches Rust command's return type
- **AND** parameter object field names match Rust function parameters (snake_case)
- **AND** errors are caught and handled appropriately
- **AND** command calls are wrapped in try-catch blocks for error handling

#### Scenario: Commands are registered in backend
- **WHEN** new Tauri command is created in Rust
- **THEN** command is registered in `src-tauri/src/lib.rs` via `generate_handler![]` macro
- **AND** command function is marked with `#[tauri::command]` attribute
- **AND** command is accessible from frontend via `invoke()`

### Requirement: TanStack Query Hooks Encapsulation
The system SHALL encapsulate all Tauri command calls in TanStack Query hooks for consistent state management.

#### Scenario: Query hooks wrap read operations
- **WHEN** frontend needs to fetch data from backend
- **THEN** custom hook (e.g., `useFiles()`, `useTags()`) wraps `useQuery` from TanStack Query
- **AND** hook uses `invoke<T>()` in `queryFn`
- **AND** hook defines appropriate `queryKey` for caching
- **AND** hook configures `staleTime` and `gcTime` (cacheTime) appropriately

#### Scenario: Mutation hooks wrap write operations
- **WHEN** frontend needs to modify data on backend
- **THEN** custom hook (e.g., `useAddTag()`, `useImportFiles()`) wraps `useMutation` from TanStack Query
- **AND** hook uses `invoke<T>()` in `mutationFn`
- **AND** hook invalidates related queries in `onSuccess` callback
- **AND** hook handles errors appropriately

#### Scenario: Hooks are organized by domain
- **WHEN** developer creates new hooks
- **THEN** hooks are organized in `src/lib/hooks/` directory by domain:
  - `useFiles.ts` - file-related queries and mutations
  - `useTags.ts` - tag-related queries
  - `useTagManagement.ts` - tag mutation operations
  - `useImportFiles.ts` - file import operations
  - `useSearchFiles.ts` - file search operations
  - `useAdmin.ts` - admin operations
- **AND** hooks follow naming convention: `use[Action][Resource]()` (e.g., `useAddTag`, `useDeleteFile`)
- **AND** hooks are imported directly from their files, not from barrel exports

#### Scenario: Query keys follow consistent pattern
- **WHEN** hooks define query keys
- **THEN** query keys use consistent structure:
  - `["files"]` for all files query
  - `["file", fileHash]` for single file query
  - `["tags"]` for all tags query
  - `["file-tags", fileHash]` for file's tags query
  - `["search-files", tagIds]` for tag-filtered files query
- **AND** query keys include all parameters that affect the result
- **AND** query keys are used consistently for invalidation

#### Scenario: Query invalidation is comprehensive
- **WHEN** mutation hook succeeds
- **THEN** all affected queries are invalidated via `queryClient.invalidateQueries()`
- **AND** invalidation happens in `onSuccess` callback
- **AND** related queries are invalidated (e.g., adding tag invalidates files, tags, and file-tags queries)

### Requirement: Event Listening
The system SHALL use a generic, type-safe hook for listening to Tauri events, ensuring consistent event handling and automatic cleanup.

#### Scenario: Generic event hook is used for all event listening
- **WHEN** frontend needs to listen to backend events
- **THEN** `useTauriEvent<T>()` hook from `src/lib/hooks/useTauriEvent.ts` is used
- **AND** hook accepts event name, typed handler function, and optional dependencies
- **AND** hook automatically handles event listener setup and cleanup
- **AND** hook provides type safety via generic type parameter `T` for event payload

#### Scenario: Event hook provides type safety
- **WHEN** `useTauriEvent<ProgressEvent>("event_name", handler)` is called
- **THEN** TypeScript validates that handler function receives correctly typed payload
- **AND** event payload type `T` matches backend event payload structure
- **AND** type errors are caught at compile time if types don't match

#### Scenario: Event hook handles cleanup automatically
- **WHEN** component using `useTauriEvent` unmounts or dependencies change
- **THEN** event listener is automatically unsubscribed
- **AND** cleanup happens in `useEffect` return function
- **AND** no manual cleanup code is required in components
- **AND** no memory leaks occur from orphaned listeners

#### Scenario: Events trigger query invalidation or state updates
- **WHEN** backend emits progress or completion events
- **THEN** event handler in `useTauriEvent` callback can invalidate related queries
- **AND** handler can update local component state
- **AND** UI updates automatically via TanStack Query refetch or React state updates
- **AND** event payload is used directly in handler without manual type casting

#### Scenario: Event hook supports dependency management
- **WHEN** `useTauriEvent` is called with dependency array
- **THEN** event listener is recreated when dependencies change
- **AND** previous listener is cleaned up before creating new one
- **AND** handler function can safely reference values from component scope via dependencies

### Requirement: Error Handling
The system SHALL handle errors consistently across all Tauri command calls and event listeners.

#### Scenario: Command errors are caught and handled
- **WHEN** Tauri command returns an error
- **THEN** error is caught in try-catch block or handled by TanStack Query error state
- **AND** error message is displayed to user (via toast or notification)
- **AND** error does not crash the application
- **AND** error is logged for debugging

#### Scenario: Event listener errors are handled
- **WHEN** event listener encounters an error
- **THEN** error is caught and logged
- **AND** listener continues to work for subsequent events
- **AND** error does not break the event listening mechanism

#### Scenario: Type errors are caught at compile time
- **WHEN** TypeScript types don't match Rust structs
- **THEN** TypeScript compiler reports type errors
- **AND** build fails until types are corrected
- **AND** type mismatches are caught before runtime

### Requirement: Query Cache Management
The system SHALL manage TanStack Query cache effectively for optimal performance and data consistency.

#### Scenario: Query cache configuration is consistent
- **WHEN** hooks use `useQuery`
- **THEN** default configuration is applied:
  - `staleTime`: 5 minutes (for server state)
  - `gcTime`: 10 minutes (formerly cacheTime)
  - `refetchOnWindowFocus`: false (desktop app context)
- **AND** configuration is consistent across all query hooks

#### Scenario: Query invalidation is strategic
- **WHEN** data is modified via mutation
- **THEN** only affected queries are invalidated
- **AND** invalidation is specific (e.g., `["file-tags", fileHash]` not all `["file-tags"]`)
- **AND** invalidation happens immediately after successful mutation
- **AND** background refetch updates UI automatically

#### Scenario: Query keys enable precise invalidation
- **WHEN** query keys are structured hierarchically
- **THEN** invalidation can target specific queries or groups
- **AND** `queryClient.invalidateQueries({ queryKey: ["files"] })` invalidates all file-related queries
- **AND** `queryClient.invalidateQueries({ queryKey: ["file-tags", fileHash] })` invalidates only specific file's tags

### Requirement: Hook Naming and Organization
The system SHALL follow consistent naming and organization patterns for all custom hooks.

#### Scenario: Hooks follow naming convention
- **WHEN** hook is created for querying data
- **THEN** hook name follows pattern: `use[Resource]()` (e.g., `useFiles()`, `useTags()`)
- **WHEN** hook is created for mutation
- **THEN** hook name follows pattern: `use[Action][Resource]()` (e.g., `useAddTag()`, `useDeleteFile()`)
- **WHEN** hook is created for search
- **THEN** hook name follows pattern: `useSearch[Resource]()` (e.g., `useSearchFiles()`, `useSearchTags()`)

#### Scenario: Hooks are imported directly
- **WHEN** component needs to use a hook
- **THEN** hook is imported directly from its file (e.g., `from "@/lib/hooks/useFiles"`)
- **AND** components import hooks from specific files, not from barrel exports
- **AND** no barrel file (`index.ts`) is used for hooks exports

#### Scenario: Hooks are grouped by domain
- **WHEN** hooks are organized in files
- **THEN** related hooks are grouped in same file (e.g., all tag management hooks in `useTagManagement.ts`)
- **AND** file names reflect the domain (e.g., `useFiles.ts`, `useTags.ts`)
- **AND** each file exports multiple related hooks

### Requirement: Type-Safe Event Payloads
The system SHALL define TypeScript types for all Tauri event payloads.

#### Scenario: Progress event types are defined
- **WHEN** backend emits progress events
- **THEN** TypeScript types are defined for event payloads:
  - `ProgressEvent` - generic progress event structure
  - `ImportProgressStage` - import-specific stages
  - `ThumbnailProgressStage` - thumbnail-specific stages
  - `AITaggingProgressStage` - AI tagging-specific stages
- **AND** types are used in `listen<T>()` calls
- **AND** types match Rust event payload structures

#### Scenario: Event types are used consistently
- **WHEN** event listener is set up
- **THEN** event payload type is specified: `listen<ProgressEvent>("event_name", ...)`
- **AND** TypeScript validates event payload structure
- **AND** type errors are caught at compile time

### Requirement: Command Parameter Validation
The system SHALL validate command parameters before invocation when appropriate.

#### Scenario: Required parameters are validated
- **WHEN** hook calls Tauri command
- **THEN** required parameters are checked before `invoke()` call
- **AND** validation errors are returned early (e.g., empty array check)
- **AND** user-friendly error messages are provided

#### Scenario: Optional parameters are handled correctly
- **WHEN** command accepts optional parameters
- **THEN** undefined values are not passed to backend (or passed as `undefined` explicitly)
- **AND** backend handles optional parameters correctly
- **AND** TypeScript types reflect optional nature of parameters

### Requirement: Query Cache Persistence
The system SHALL persist TanStack Query cache across application restarts using tauri-plugin-store for instant data loading.

#### Scenario: Custom persister is created
- **WHEN** developer implements Persister adapter in `src/lib/persister.ts`
- **THEN** adapter implements `persistClient()` to save cache to Tauri Store
- **AND** adapter implements `restoreClient()` to load cache from Tauri Store
- **AND** adapter implements `removeClient()` to clear stored cache
- **AND** adapter uses `Store.load()` to initialize store instance
- **AND** adapter serializes/deserializes query cache correctly

#### Scenario: PersistQueryClientProvider is configured
- **WHEN** `src/main.tsx` is implemented
- **THEN** `PersistQueryClientProvider` from `@tanstack/react-query-persist-client` wraps application
- **AND** custom Persister from `createTauriPersister()` is passed via `persistOptions` prop
- **AND** `queryClient` is passed to provider
- **AND** cache is automatically persisted and restored

#### Scenario: Cache survives application restart
- **WHEN** user fetches data via TanStack Query hooks
- **AND** data is cached in memory
- **AND** application closes normally
- **THEN** query cache is persisted to disk via tauri-plugin-store
- **WHEN** application restarts
- **THEN** persisted cache is loaded automatically on startup
- **AND** UI displays cached data instantly without backend call
- **AND** background refetching happens according to `staleTime` configuration (5 minutes)

#### Scenario: Files and tags queries are persisted
- **WHEN** user views image grid and closes application
- **THEN** `files` query cache is saved to Tauri Store via custom Persister
- **WHEN** user reopens application
- **THEN** persisted cache is loaded immediately
- **AND** ImageGrid displays thumbnails instantly without backend call
- **AND** TagFilterPanel displays tag list instantly from persisted cache
- **AND** background refetch occurs according to `staleTime` (5 minutes)

### Requirement: Tauri Store Plugin Integration
The system SHALL install and configure tauri-plugin-store for persistent key-value storage.

#### Scenario: Tauri Store plugin is registered
- **WHEN** `src-tauri/src/lib.rs` is configured
- **THEN** `tauri-plugin-store` plugin is registered in `tauri::Builder`
- **AND** plugin is available for use in frontend via `@tauri-apps/plugin-store`

#### Scenario: Tauri Store is available in TypeScript
- **WHEN** frontend imports `@tauri-apps/plugin-store`
- **THEN** `Store` class is available for use
- **AND** `Store.load()`, `Store.get()`, `Store.set()`, `Store.save()`, `Store.delete()` methods work correctly
- **AND** store persists data between application restarts
- **AND** store file is created in AppDataDir (platform-specific location)

