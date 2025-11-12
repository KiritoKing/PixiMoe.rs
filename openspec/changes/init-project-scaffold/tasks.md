## 1. Project Initialization
- [ ] 1.1 Run `pnpm create tauri-app@latest` with React + TypeScript template
- [ ] 1.2 Verify project structure created successfully
- [ ] 1.3 Test initial application build with `pnpm tauri dev`

## 2. Database Setup
- [ ] 2.1 Add `sqlx` dependency to `Cargo.toml` with features: `runtime-tokio`, `sqlite`, `macros`
- [ ] 2.2 Create `migrations/` directory at project root
- [ ] 2.3 Install `sqlx-cli`: `cargo install sqlx-cli --no-default-features --features sqlite`
- [ ] 2.4 Initialize sqlx: `sqlx database create`
- [ ] 2.5 Create initial migration: `sqlx migrate add init_schema`
- [ ] 2.6 Implement 7-table schema in migration file (Files, Tags, Folders, Persons, Faces, FileTags, FileFolders)
- [ ] 2.7 Run migration: `sqlx migrate run`
- [ ] 2.8 Configure `DATABASE_URL` environment variable in `.env`

## 3. UI Framework Configuration
- [ ] 3.1 Initialize shadcn/ui: `pnpm dlx shadcn@latest init`
- [ ] 3.2 Configure Tailwind CSS with proper content paths
- [ ] 3.3 Add essential shadcn/ui components: `button`, `dialog`, `select`, `input`, `card`
- [ ] 3.4 Verify component imports and styling work correctly

## 4. Rust Backend Structure
- [ ] 4.1 Create `src-tauri/src/db/mod.rs` for database connection pool management
- [ ] 4.2 Create `src-tauri/src/commands/mod.rs` for Tauri command organization
- [ ] 4.3 Create `src-tauri/src/error.rs` for centralized error handling with `thiserror`
- [ ] 4.4 Implement `AppState` struct to hold `SqlitePool` in `main.rs`
- [ ] 4.5 Configure connection pool in `main.rs` setup hook
- [ ] 4.6 Register managed state with `.manage(pool)`

## 5. AI Runtime Integration
- [ ] 5.1 Add `ort` (ONNX Runtime) dependency to `Cargo.toml`
- [ ] 5.2 Configure feature flags for hardware acceleration (`download` strategy)
- [ ] 5.3 Create `src-tauri/src/ai/mod.rs` module structure
- [ ] 5.4 Create placeholder directories for ONNX models: `src-tauri/models/`
- [ ] 5.5 Document model download requirements in README

## 6. Frontend State Management
- [ ] 6.1 Install TanStack Query: `pnpm add @tanstack/react-query`
- [ ] 6.2 Install Zustand: `pnpm add zustand`
- [ ] 6.3 Install Tauri Store plugin: `pnpm add @tauri-apps/plugin-store`
- [ ] 6.4 Install query persistence: `pnpm add @tanstack/react-query-persist-client`
- [ ] 6.5 Set up QueryClientProvider in `src/main.tsx`
- [ ] 6.6 Create custom Persister adapter for `tauri-plugin-store`
- [ ] 6.7 Replace QueryClientProvider with PersistQueryClientProvider

## 7. Development Tooling
- [ ] 7.1 Configure TypeScript with strict mode in `tsconfig.json`
- [ ] 7.2 Set up ESLint with Tauri and React configurations
- [ ] 7.3 Add Prettier with configuration file
- [ ] 7.4 Create `.gitignore` with Tauri + Node.js patterns
- [ ] 7.5 Add development scripts to `package.json` (dev, build, lint, format)

## 8. Thumbnail Service Setup
- [ ] 8.1 Create `src-tauri/src/protocols/mod.rs` for custom protocol handlers
- [ ] 8.2 Implement `app-asset://` protocol handler for thumbnail serving
- [ ] 8.3 Configure cache headers (Cache-Control: public, max-age=31536000, immutable)
- [ ] 8.4 Register protocol in `main.rs` with `.asset_protocol("app-asset", ...)`
- [ ] 8.5 Create thumbnail storage directory structure in AppDataDir

## 9. Testing Infrastructure
- [ ] 9.1 Add `tokio-test` and `rstest` to dev dependencies
- [ ] 9.2 Create `src-tauri/tests/` directory for integration tests
- [ ] 9.3 Add sample unit test for database connection
- [ ] 9.4 Configure `cargo test` to run with proper environment

## 10. Documentation & Validation
- [ ] 10.1 Create comprehensive README.md with setup instructions
- [ ] 10.2 Document environment variable requirements
- [ ] 10.3 Create DEVELOPMENT.md with architecture overview
- [ ] 10.4 Verify all dependencies install correctly: `pnpm install && cargo check`
- [ ] 10.5 Build application successfully: `pnpm tauri build --debug`
- [ ] 10.6 Run OpenSpec validation: `openspec validate init-project-scaffold --strict`
