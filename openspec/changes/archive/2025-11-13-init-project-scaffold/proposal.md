# Change: Initialize Project Scaffold

## Why
The project currently only contains documentation (`design.md`, `spec.md`) without any actual code infrastructure. We need to bootstrap the Tauri + React + TypeScript application structure to begin implementing the AI-powered image gallery system described in the technical specifications.

## What Changes
- Initialize Tauri v2 project using `create-tauri-app` CLI with React + TypeScript template
- Set up Vite build system with proper configuration for Tauri
- Configure pnpm as the package manager
- Install and configure shadcn/ui component library with Tailwind CSS
- Set up SQLite database infrastructure using sqlx with migration system
- Configure ONNX Runtime integration for AI inference
- Establish project directory structure following the 7-table database model
- Configure development tooling (TypeScript, ESLint, Prettier)
- Set up initial Tauri commands structure for future API implementation

## Impact
- **Affected specs**: 
  - `build-system` (new capability)
  - `ui-framework` (new capability)
  - `database-infrastructure` (new capability)
  - `ai-runtime` (new capability)
  
- **Affected code**: 
  - Creates entire project structure from scratch
  - Key directories: `src/` (React), `src-tauri/` (Rust), `migrations/` (SQL)
  - Configuration files: `tauri.conf.json`, `vite.config.ts`, `tsconfig.json`, `Cargo.toml`

- **Breaking changes**: None (initial setup)

- **Migration path**: N/A (new project)
