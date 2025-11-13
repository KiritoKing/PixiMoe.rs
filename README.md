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

### 4. Run Development Server

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
# Run dev server
pnpm tauri dev

# Build for production
pnpm tauri build

# Lint frontend
pnpm run lint

# Check Rust types
cd src-tauri && cargo check

# Run Rust tests
cd src-tauri && cargo test

# Create new migration
sqlx migrate add <name>

# Run pending migrations
sqlx migrate run
```

## IDE Setup

- [VS Code](https://code.visualstudio.com/)
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
  - [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)

## Documentation

- Architecture details: See `docs/design.md` and `docs/spec.md`
- OpenSpec change proposals: See `openspec/changes/`
