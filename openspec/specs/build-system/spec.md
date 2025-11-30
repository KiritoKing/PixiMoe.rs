# build-system Specification

## Purpose
提供项目构建系统配置，包括Tauri应用初始化、Vite构建配置、TypeScript配置、开发工具链（ESLint、Prettier/Biome）、包管理器配置等。确保项目能够正确编译、运行和打包。
## Requirements
### Requirement: Tauri Application Initialization
The system SHALL initialize a Tauri v2 application with React + TypeScript frontend using the official `create-tauri-app` CLI tool.

#### Scenario: Successful project creation
- **WHEN** developer runs `pnpm create tauri-app@latest`
- **AND** selects TypeScript as language
- **AND** selects pnpm as package manager
- **AND** selects React as UI template
- **AND** selects TypeScript as flavor
- **THEN** project structure is created with `src/` (React) and `src-tauri/` (Rust) directories
- **AND** all necessary configuration files are generated (`tauri.conf.json`, `Cargo.toml`, `package.json`, `vite.config.ts`, `tsconfig.json`)

#### Scenario: Application can start in development mode
- **WHEN** developer runs `pnpm install` to install dependencies
- **AND** runs `pnpm tauri dev`
- **THEN** Vite development server starts on localhost
- **AND** Tauri window opens displaying the React application
- **AND** hot module replacement (HMR) is functional for frontend changes

### Requirement: Vite Build Configuration
The system SHALL configure Vite as the build tool with proper settings for Tauri integration.

#### Scenario: Vite serves assets correctly
- **WHEN** application runs in development mode
- **THEN** Vite resolves all module imports correctly
- **AND** Tailwind CSS styles are processed and applied
- **AND** TypeScript files are transpiled without errors
- **AND** Source maps are generated for debugging

#### Scenario: Production build succeeds
- **WHEN** developer runs `pnpm tauri build --debug`
- **THEN** Vite bundles frontend assets with optimizations
- **AND** Rust backend compiles successfully
- **AND** Executable is generated in `src-tauri/target/debug/` directory
- **AND** Application launches without errors

### Requirement: Package Manager Configuration
The system SHALL use pnpm as the primary package manager with proper workspace and caching configuration.

#### Scenario: Dependencies install efficiently
- **WHEN** developer runs `pnpm install` in fresh clone
- **THEN** pnpm uses content-addressable storage for deduplication
- **AND** all dependencies are installed within 60 seconds on standard hardware
- **AND** `node_modules/` directory is created with hard links

#### Scenario: Dependency resolution is strict
- **WHEN** a module imports a package not listed in `package.json`
- **THEN** pnpm raises an error about undeclared dependency
- **AND** build fails until dependency is properly declared

### Requirement: TypeScript Configuration
The system SHALL enforce strict TypeScript type checking across the entire frontend codebase.

#### Scenario: Strict mode catches common errors
- **WHEN** developer writes TypeScript code
- **THEN** compiler enforces strict null checks
- **AND** implicit `any` types are disallowed
- **AND** unused variables and parameters trigger errors
- **AND** all Tauri invoke calls have proper type annotations

#### Scenario: IDE provides accurate type hints
- **WHEN** developer uses VS Code or compatible IDE
- **THEN** IntelliSense provides autocompletion for all imports
- **AND** type errors are highlighted in real-time
- **AND** refactoring tools work correctly with type information

### Requirement: Development Tooling
The system SHALL provide automated code quality tools (Biome) integrated into the development workflow.

#### Scenario: Code formatting is consistent
- **WHEN** developer runs `pnpm format`
- **THEN** Biome formats all `.ts`, `.tsx`, `.css`, and `.json` files
- **AND** formatting matches project style guide configured in `biome.json`
- **AND** Git hooks can auto-format on commit

#### Scenario: Linting catches code quality issues
- **WHEN** developer runs `pnpm lint`
- **THEN** Biome analyzes all TypeScript files
- **AND** React-specific rules (hooks, JSX) are enforced
- **AND** code quality issues are reported
- **AND** errors can be auto-fixed with `pnpm lint:fix`

### Requirement: Build Scripts
The system SHALL provide npm scripts for common development tasks in `package.json`.

#### Scenario: Development workflow scripts exist
- **WHEN** developer inspects `package.json`
- **THEN** the following scripts are defined:
  - `dev`: Starts Tauri dev server with HMR
  - `build`: Creates production build
  - `lint`: Runs Biome checks
  - `format`: Runs Biome formatting
  - `type-check`: Runs TypeScript compiler in no-emit mode
  - `check`: Runs type-check, lint, and Rust clippy
- **AND** all scripts execute without configuration errors

### Requirement: Git Hooks Configuration
The system SHALL configure Git hooks for automated code quality checks.

#### Scenario: Pre-commit hook is configured
- **WHEN** developer commits code
- **THEN** pre-commit hook runs automatically
- **AND** hook executes code formatting and linting checks
- **AND** commit is blocked if checks fail
- **AND** hook configuration is in `.git-hooks/` directory

### Requirement: GitHub Actions CI/CD Pipeline
The system SHALL provide automated continuous integration and deployment via GitHub Actions, building the application for multiple platforms and architectures on every push to the main branch.

#### Scenario: Workflow triggers on push to main
- **WHEN** code is pushed to the main branch
- **THEN** GitHub Actions workflow is automatically triggered
- **AND** workflow runs code quality checks (TypeScript type check, Biome lint, Rust clippy)
- **AND** workflow builds the application for all supported platform-architecture combinations
- **AND** build artifacts are uploaded as workflow artifacts

#### Scenario: Matrix build supports all target platforms
- **WHEN** workflow runs
- **THEN** builds are executed for the following combinations:
  - Windows x86_64
  - Windows ARM64 (if supported by Tauri)
  - Linux x86_64
  - Linux ARM64
  - macOS x86_64
  - macOS ARM64
- **AND** all builds run in parallel
- **AND** each build produces a distributable artifact

#### Scenario: Code quality checks run before builds
- **WHEN** workflow is triggered
- **THEN** TypeScript type checking runs (`pnpm type-check`)
- **AND** Biome linting runs (`pnpm lint`)
- **AND** Rust clippy runs (`cargo clippy`)
- **AND** Rust formatting check runs (`cargo fmt --all -- --check`)
- **AND** if any check fails, the workflow stops and reports the failure
- **AND** builds only proceed if all checks pass

#### Scenario: Build artifacts are accessible
- **WHEN** workflow completes successfully
- **THEN** build artifacts are uploaded as workflow artifacts
- **AND** artifacts are named with platform and architecture (e.g., `piximoe-rs-windows-x86_64.exe`)
- **AND** artifacts can be downloaded from the workflow run page
- **AND** artifacts are retained for at least 90 days

#### Scenario: GitHub Releases are created on tag
- **WHEN** a git tag is pushed (e.g., `v1.0.0`)
- **THEN** workflow creates or updates a GitHub Release
- **AND** all build artifacts are attached to the release
- **AND** release is named with the tag version
- **AND** release notes can be automatically generated or manually provided

#### Scenario: Build caching optimizes performance
- **WHEN** workflow runs
- **THEN** pnpm dependencies are cached
- **AND** Rust compilation artifacts (target directory) are cached
- **AND** cache keys include commit hash and platform/architecture
- **AND** cache restoration speeds up subsequent builds

#### Scenario: Manual workflow trigger is available
- **WHEN** developer navigates to GitHub Actions tab
- **THEN** workflow can be manually triggered via "Run workflow" button
- **AND** manual trigger allows selecting branch
- **AND** manual trigger runs the same checks and builds as automatic triggers

### Requirement: SQLx Offline Mode Support in CI

The CI/CD pipeline SHALL support SQLx query macros in offline mode using pre-generated query cache without requiring database connections during builds.

#### Scenario: Offline SQLx Compilation
- **Given** the build job is running in GitHub Actions
- **And** SQLX_OFFLINE environment variable is set to true
- **When** the Rust compiler encounters SQLx query macros
- **Then** the build MUST use pre-generated query cache from `.sqlx/` directory
- **And** the build SHALL NOT attempt to connect to a database
- **And** the build SHALL NOT fail due to missing DATABASE_URL

### Requirement: Consistent SQLx Offline Configuration

All CI jobs SHALL use consistent SQLx offline mode configuration regardless of the target platform.

#### Scenario: Platform-Independent Offline Mode
- **Given** any CI job (quality-check, build, etc.)
- **When** the job starts
- **Then** SQLX_OFFLINE MUST be set to true
- **And** no DATABASE_URL SHALL be configured
- **And** no query cache preparation SHALL be performed in CI

### Requirement: Optimized Dependency Installation

CI jobs SHALL avoid redundant package installations and optimize dependency installation for performance.

#### Scenario: Efficient Dependency Management
- **Given** multiple installation steps for system dependencies
- **When** installing ARM64 cross-compilation dependencies
- **Then** only additional packages not already installed in base steps SHALL be added
- **And** package installation SHALL be minimized to reduce CI runtime

