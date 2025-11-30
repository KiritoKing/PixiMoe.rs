# Build System Capability

## Overview

The Build System capability defines requirements for reliable, cross-platform CI/CD pipeline builds that produce consistent artifacts across all supported platforms and architectures.

## ADDED Requirements

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