## 1. Project Initialization
- [x] 1.1 Run `pnpm create tauri-app@latest` with React + TypeScript template
- [x] 1.2 Verify project structure created successfully
- [x] 1.3 Test initial application build with `pnpm tauri dev`

## 2. Database Setup
- [x] 2.1 Add `sqlx` dependency to `Cargo.toml` with features: `runtime-tokio`, `sqlite`, `macros`
- [x] 2.2 Create `migrations/` directory at project root
- [x] 2.3 Install `sqlx-cli`: `cargo install sqlx-cli --no-default-features --features sqlite`
- [x] 2.4 Initialize sqlx: `sqlx database create`
- [x] 2.5 Create initial migration: `sqlx migrate add init_schema`
- [x] 2.6 Implement 7-table schema in migration file (Files, Tags, Folders, Persons, Faces, FileTags, FileFolders)
- [x] 2.7 Run migration: `sqlx migrate run`
- [x] 2.8 Configure `DATABASE_URL` environment variable in `.env`

## 3. UI Framework Configuration
- [x] 3.1 Initialize shadcn/ui: `pnpm dlx shadcn@latest init`
- [x] 3.2 Configure Tailwind CSS with proper content paths
- [x] 3.3 Add essential shadcn/ui components: `button`, `dialog`, `select`, `input`, `card`
- [x] 3.4 Verify component imports and styling work correctly

## 4. Rust Backend Structure
- [x] 4.1 Create `src-tauri/src/db/mod.rs` for database connection pool management
- [x] 4.2 Create `src-tauri/src/commands/mod.rs` for Tauri command organization
- [x] 4.3 Create `src-tauri/src/error.rs` for centralized error handling with `thiserror`
- [x] 4.4 Implement `AppState` struct to hold `SqlitePool` in `main.rs`
- [x] 4.5 Configure connection pool in `main.rs` setup hook
- [x] 4.6 Register managed state with `.manage(pool)`

## 5. AI Runtime Integration
- [x] 5.1 Add `ort` (ONNX Runtime) dependency to `Cargo.toml`
- [x] 5.2 Configure feature flags for hardware acceleration (`download` strategy)
- [x] 5.3 Create `src-tauri/src/ai/mod.rs` module structure
- [x] 5.4 Create placeholder directories for ONNX models: `src-tauri/models/`
- [x] 5.5 Document model download requirements in README

## 6. Frontend State Management
- [x] 6.1 Install TanStack Query: `pnpm add @tanstack/react-query`
- [x] 6.2 Install Zustand: `pnpm add zustand`
- [x] 6.3 Install Tauri Store plugin: `pnpm add @tauri-apps/plugin-store`
- [x] 6.4 Install query persistence: `pnpm add @tanstack/react-query-persist-client`
- [x] 6.5 Set up QueryClientProvider in `src/main.tsx`
- [x] 6.6 Create custom Persister adapter for `tauri-plugin-store`
- [x] 6.7 Replace QueryClientProvider with PersistQueryClientProvider

## 7. Development Tooling
- [x] 7.1 Configure TypeScript with strict mode in `tsconfig.json`
- [x] 7.2 Set up ESLint with Tauri and React configurations
- [x] 7.3 Add Prettier with configuration file
- [x] 7.4 Create `.gitignore` with Tauri + Node.js patterns
- [x] 7.5 Add development scripts to `package.json` (dev, build, lint, format)

## 8. Thumbnail Service Setup
- [x] 8.1 Create `src-tauri/src/protocols/mod.rs` for custom protocol handlers
- [ ] 8.2 Implement `app-asset://` protocol handler for thumbnail serving (deferred)
- [ ] 8.3 Configure cache headers (Cache-Control: public, max-age=31536000, immutable) (deferred)
- [ ] 8.4 Register protocol in `main.rs` with `.asset_protocol("app-asset", ...)` (deferred)
- [ ] 8.5 Create thumbnail storage directory structure in AppDataDir (deferred)

## 9. Testing Infrastructure
- [ ] 9.1 Add `tokio-test` and `rstest` to dev dependencies (deferred)
- [ ] 9.2 Create `src-tauri/tests/` directory for integration tests (deferred)
- [ ] 9.3 Add sample unit test for database connection (deferred)
- [ ] 9.4 Configure `cargo test` to run with proper environment (deferred)

## 10. Documentation & Validation
- [x] 10.1 Create comprehensive README.md with setup instructions
- [x] 10.2 Document environment variable requirements
- [ ] 10.3 Create DEVELOPMENT.md with architecture overview (deferred)
- [x] 10.4 Verify all dependencies install correctly: `pnpm install && cargo check`
- [ ] 10.5 Build application successfully: `pnpm tauri build --debug` (not needed for MVP)
- [ ] 10.6 Run OpenSpec validation: `openspec validate init-project-scaffold --strict` (if available)
