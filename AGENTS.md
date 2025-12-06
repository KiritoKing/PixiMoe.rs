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

**项目使用 SQLx 离线模式，修改数据库 schema 后必须更新离线元数据，否则会导致编译错误。**

### 修改数据库 Schema 后的强制执行步骤

**在以下情况后必须执行完整流程：**
- 添加新的迁移文件 (`migrations/*.sql`)
- 修改现有 SQL 查询（特别是添加新字段）
- 出现 `no such column` 或相关编译错误

```bash
# Step 1: 进入 src-tauri 目录
cd src-tauri

# Step 2: 设置数据库环境变量（必须使用现有开发数据库）
export DATABASE_URL="sqlite:../piximoe.db"

# Step 3: 运行所有未执行的迁移
sqlx migrate run --source ../migrations

# Step 4: 重新生成离线查询元数据（关键步骤）
cargo sqlx prepare

# Step 5: 验证编译成功
cargo check
```

### 新建迁移文件的完整流程

```bash
cd src-tauri
export DATABASE_URL="sqlite:../piximoe.db"

# 1. 创建新迁移文件（自动生成时间戳前缀）
sqlx migrate add your_migration_name --source ../migrations

# 2. 编辑生成的迁移文件
# 文件位置：../migrations/YYYYMMDDHHMMSS_your_migration_name.sql

# 3. 执行迁移并更新元数据
sqlx migrate run --source ../migrations
cargo sqlx prepare

# 4. 提交变更到版本控制
git add ../migrations/YOUR_MIGRATION_FILE.sql .sqlx/
git commit -m "Add migration: your_migration_name"
```

### 绝对关键点

1. **数据库路径**：必须使用 `../piximoe.db`，不要创建临时数据库
2. **元数据更新**：`cargo sqlx prepare` 是必须的，否则 CI 会编译失败
3. **版本控制**：`.sqlx/` 目录必须提交，包含所有查询的离线验证信息
4. **字段映射**：使用 `COALESCE(field, default_value) as field_alias` 处理 NULL 值
5. **查询一致性**：所有 FileRecord 查询必须包含相同字段集合

### 处理编译错误的快速诊断

**错误类型：`missing fields` 在 FileRecord 初始化**
```rust
// 错误示例：缺少新字段
FileRecord {
    file_hash: row.get("file_hash"),
    // 缺少 thumbnail_health, last_health_check
}

// 正确做法：添加所有新字段
FileRecord {
    file_hash: row.get("file_hash"),
    // ... 其他字段
    thumbnail_health: Some(row.get("thumbnail_health")),
    last_health_check: row.get("last_health_check"),
}
```

**错误类型：`no such column`**
```bash
# 立即执行
cd src-tauri
export DATABASE_URL="sqlite:../piximoe.db"
sqlx migrate run --source ../migrations
cargo sqlx prepare
```

### 验证清单

每次修改数据库相关代码后，确保：
- [ ] Migration 文件语法正确
- [ ] Migration 已成功执行
- [ ] `cargo sqlx prepare` 已运行
- [ ] `.sqlx/` 文件已更新
- [ ] `cargo check` 编译通过
- [ ] 所有查询字段映射完整
- [ ] 新增字段已添加到相关 struct 和查询

详细文档和故障排除：`@/docs/sqlx-migration-guide.md`