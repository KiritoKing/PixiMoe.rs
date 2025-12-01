<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Reference

This is a tauri app project, whose frontend is built with vite.

Dev command is `pnpm tauri dev`.

More detail information like debugging for project reference to `@/openspec/projeect.md`.

# Dev GuideLine

## Always Check Code After Finishing A Change

Use the following commands to check code quality after each change submitted and before you show it to user.

| Command | PWD | Usage |
| --- |:---:| ---:|
| `pnpm tsc --noEmit` | `./` | Check typescript code |
| `pnpm biome check --write ./src` | `./` | Lint and format typescript code |
| `cargo check` | `./src-tauri` | Check rust code |
| `cargo fmt --all` | `./src-tauri` | Format rust code |
| `cargo clippy --fix` | `./src-tauri` | Lint rust code |

> !**IMPORTANT**: All Rust commands should be ran in `src-tuari` folder!
 

## shadcn/ui Usage Rules

**MANDATORY workflow for shadcn/ui components:**

1. **Search with shadcn MCP** → Find component name
2. **Query API with Context7 MCP** → Get current props/variants
3. **Install if needed (use Non-interactive mode)** → `echo "N" | pnpm dlx shadcn@latest add <component> --yes`
4. **Import directly** → `import { Button } from "@/components/ui/button"`

**Common components:** Button, Card, Dialog, Input, Badge, Popover, Progress, ScrollArea, Skeleton

## Import Rules - No Barrel Files

**MANDATORY: Direct imports only. No barrel files.**

❌ Forbidden:
```typescript
// src/components/index.ts - DON'T CREATE
export { ImageGrid, ImageCard } from "./gallery"
```

✅ Required:
```typescript
import { ImageGrid } from "@/components/gallery/ImageGrid"
import { ImageCard } from "@/components/gallery/ImageCard"
```

**Why:** Build performance, tree shaking, code clarity, refactoring safety, IDE performance.

## SQLx Database Migration Rules

**项目使用 SQLx 离线模式，修改数据库 schema 后必须更新离线元数据。**

### 修改数据库 Schema 后的必要步骤

当添加新迁移文件或修改 SQL 查询后，**必须**执行：

```bash
cd src-tauri
export DATABASE_URL="sqlite:../piximoe.db"
sqlx migrate run --source ../migrations
cargo sqlx prepare
```

或使用脚本：`./scripts/prepare-sqlx.sh`

### 创建新迁移

```bash
cd src-tauri
export DATABASE_URL="sqlite:../piximoe.db"
sqlx migrate add migration_name --source ../migrations
# 编辑迁移文件后
sqlx migrate run --source ../migrations
cargo sqlx prepare
```

### 关键点

1. **使用现有开发数据库**：不要创建临时数据库，使用 `../piximoe.db`
2. **更新离线元数据**：每次修改 SQL 查询后运行 `cargo sqlx prepare`
3. **提交 `.sqlx/` 目录**：离线元数据文件需要提交到版本控制
4. **CI 使用离线模式**：`SQLX_OFFLINE=true`，不需要数据库连接

### 常见错误

- **"no such column" 编译错误**：运行 `sqlx migrate run` 和 `cargo sqlx prepare`
- **CI 编译失败**：检查 `.sqlx/` 目录是否已提交

详细文档参考：`@/docs/sqlx-migration-guide.md`