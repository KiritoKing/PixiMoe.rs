# SQLx 迁移指南

## 概述

项目使用 SQLx 的离线模式进行编译，避免 CI/CD 中需要数据库连接。本地开发时需要在修改数据库 schema 后更新离线元数据。

## 本地开发工作流程

### 修改数据库 Schema 后

当添加新的迁移文件或修改 SQL 查询后，执行以下步骤：

```bash
cd src-tauri

# 1. 设置数据库路径（使用现有开发数据库）
export DATABASE_URL="sqlite:../piximoe.db"

# 2. 运行迁移
sqlx migrate run --source ../migrations

# 3. 生成离线元数据
cargo sqlx prepare

# 4. 验证编译
cargo check
```

或者使用自动化脚本：

```bash
cd src-tauri
./scripts/prepare-sqlx.sh
```

### 创建新迁移

```bash
cd src-tauri
export DATABASE_URL="sqlite:../piximoe.db"

# 创建迁移文件
sqlx migrate add your_migration_name --source ../migrations

# 编辑生成的迁移文件
# migrations/YYYYMMDDHHMMSS_your_migration_name.sql

# 运行迁移并更新离线元数据
sqlx migrate run --source ../migrations
cargo sqlx prepare
```

## CI/CD 配置

CI 中使用离线模式，不需要数据库连接：

1. **环境变量**：设置 `SQLX_OFFLINE=true`（项目 `build.rs` 已配置）
2. **离线元数据**：确保 `.sqlx/` 目录已提交到版本控制
3. **无需 DATABASE_URL**：离线模式不需要数据库连接

### 关键配置

```yaml
# .github/workflows/ci.yml
env:
  SQLX_OFFLINE: true
```

```rust
// src-tauri/build.rs
fn main() {
    std::env::set_var("SQLX_OFFLINE", "true");
    tauri_build::build()
}
```

## 常见问题

### Q: 编译报错 "no such column"

A: 数据库 schema 变更后未更新离线元数据。运行：
```bash
cd src-tauri
export DATABASE_URL="sqlite:../piximoe.db"
sqlx migrate run --source ../migrations
cargo sqlx prepare
```

### Q: CI 编译失败

A: 检查 `.sqlx/` 目录是否已提交，且包含所有查询的元数据。

### Q: 迁移失败

A: 检查迁移文件语法，确保数据库文件可写。

## 文件说明

- `migrations/` - 迁移文件目录
- `src-tauri/.sqlx/` - 离线查询元数据（需提交到版本控制）
- `src-tauri/scripts/prepare-sqlx.sh` - 自动化准备脚本
