# Album Demo - AI-Powered Image Gallery

A local-first, AI-powered desktop image gallery application built with Tauri v2, React, and TypeScript.

## Features

- **Local-First Architecture**: All data, thumbnails, and AI models run locally on your machine
- **Content-Addressed Storage**: Files identified by BLAKE3 hash for deduplication
- **AI-Powered Tagging**: Automatic image classification using ONNX Runtime
- **Face Recognition**: Detect and recognize faces (future feature)
- **Non-Destructive**: Original files never modified; metadata stored in SQLite
- **Zero-Config AI**: Automatic hardware acceleration (NPU > GPU > CPU)

## Tech Stack

### Backend (Rust)
- **Tauri v2**: Desktop application framework
- **SQLite + sqlx**: Database with compile-time query validation
- **ONNX Runtime**: Cross-platform AI inference
- **tokio**: Async runtime

### Frontend (TypeScript/React)
- **React 19**: UI framework
- **Vite**: Build tool with HMR
- **TanStack Query**: Server state management with persistence
- **Zustand**: Client UI state management
- **shadcn/ui**: Component library with Tailwind CSS

## Prerequisites

- **Node.js** 18+ (for frontend)
- **pnpm** 8+ (package manager)
- **Rust** 1.70+ (for Tauri backend)
- **sqlx-cli** (for database migrations)

## Setup Instructions

### 1. Install Dependencies

```bash
# Install frontend dependencies
pnpm install

# Install sqlx-cli (if not already installed)
cargo install sqlx-cli --no-default-features --features sqlite
```

### 2. Database Setup

```bash
# Create database
sqlx database create

# Run migrations
sqlx migrate run
```

The `.env` file should already contain:
```
DATABASE_URL=sqlite:album.db
```

### 3. AI Models (Optional for now)

Download ONNX models and place them in `src-tauri/models/`:
- See `src-tauri/models/README.md` for instructions
- AI features work without models (placeholder implementation)

### 4. Git Hooks Setup (Required)

```bash
# Set up git hooks for automatic formatting and linting
./.git-hooks/scripts/setup-hooks.sh
```

This will configure git hooks to automatically:
- Format TypeScript/JavaScript files with Biome
- Format Rust files with rustfmt
- Lint Rust files with clippy
- Format configuration files (JSON, YAML, Markdown)
- Run TypeScript type checking
- Re-stage formatted files before commit

### 5. Run Development Server

```bash
pnpm tauri dev
```

This will:
- Start Vite dev server with HMR
- Compile Rust backend
- Launch desktop application

## Project Structure

```
album-demo/
├── src/                      # React frontend
│   ├── components/ui/        # shadcn/ui components
│   ├── lib/                  # Utilities (query client, persister)
│   └── main.tsx              # Entry point with providers
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── db/               # Database connection & migrations
│   │   ├── commands/         # Tauri commands (API)
│   │   ├── ai/               # ONNX inference modules
│   │   └── error.rs          # Centralized error handling
│   └── models/               # ONNX model files (.gitignored)
├── migrations/               # SQL migration files
└── album.db                  # SQLite database (.gitignored)
```

## Database Schema

7-table relational schema:
- **Files**: Content-addressed image metadata (BLAKE3 hash as PK)
- **Tags**: AI-generated and user tags (Danbooru-style taxonomy)
- **Folders**: User-defined hierarchical organization
- **Persons**: Named individuals for face recognition
- **Faces**: Detected faces with embeddings and bounding boxes
- **FileTags**: Many-to-many junction (Files ↔ Tags)
- **FileFolders**: Many-to-many junction (Files ↔ Folders)

## Development Commands

```bash
# Development
pnpm tauri dev              # Run dev server
pnpm tauri build            # Build for production

# Code Quality
pnpm lint                   # TypeScript type checking only
pnpm lint:fix               # Fix TypeScript/JavaScript linting issues
pnpm format                 # Format frontend code with Prettier
pnpm format:all             # Format all code (TypeScript + Rust)
pnpm format:check           # Check if code is properly formatted
pnpm check                  # Run all linting and type checks
pnpm check:fix              # Fix all linting issues automatically

# Rust-specific
cd src-tauri && cargo check # Check Rust compilation
cd src-tauri && cargo test  # Run Rust tests
cargo fmt                   # Format Rust code
cargo clippy                # Lint Rust code

# Git Hooks
pnpm setup-hooks            # Set up git hooks (alternative to setup script)
./.git-hooks/scripts/setup-hooks.sh  # Set up git hooks with verification
git config core.hooksPath ""  # Temporarily disable hooks
git config core.hooksPath .git-hooks  # Re-enable hooks

# Database
sqlx migrate add <name>     # Create new migration
sqlx migrate run           # Run pending migrations
```

## Git Hooks

The project includes comprehensive git hooks that automatically:

- **Format Code**: TypeScript/JavaScript with Biome, Rust with rustfmt
- **Lint Code**: TypeScript with Biome, Rust with clippy
- **Type Check**: TypeScript compilation check
- **Format Config Files**: JSON, YAML, Markdown formatting
- **Re-stage Changes**: Automatically adds formatted files to commit

**Hooks run on every commit** and will block commits with formatting/linting errors.

### Managing Hooks

```bash
# Check if hooks are properly configured
./.git-hooks/scripts/setup-hooks.sh --check

# Temporarily disable hooks
git config core.hooksPath ""

# Re-enable hooks
git config core.hooksPath .git-hooks
```

## IDE Setup

- [VS Code](https://code.visualstudio.com/)
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Documentation

- Architecture details: See `docs/design.md` and `docs/spec.md`
- OpenSpec change proposals: See `openspec/changes/`
