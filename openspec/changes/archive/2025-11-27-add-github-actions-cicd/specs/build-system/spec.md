## ADDED Requirements

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

