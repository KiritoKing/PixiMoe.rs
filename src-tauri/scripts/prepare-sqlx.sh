#!/bin/bash
# SQLx 离线元数据准备脚本
# 在开发数据库上运行迁移，然后生成离线查询元数据

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAURI_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$TAURI_DIR")"

echo "🔧 SQLx 离线元数据准备工具"
echo "================================"

# 确定数据库路径
if [ -n "$DATABASE_URL" ]; then
    DB_URL="$DATABASE_URL"
elif [ -f "$PROJECT_ROOT/piximoe.db" ]; then
    DB_URL="sqlite:$PROJECT_ROOT/piximoe.db"
elif [ -f "$HOME/Library/Application Support/com.piximoe.rs/album.db" ]; then
    DB_URL="sqlite:$HOME/Library/Application Support/com.piximoe.rs/album.db"
elif [ -f "$HOME/.local/share/com.piximoe.rs/album.db" ]; then
    DB_URL="sqlite:$HOME/.local/share/com.piximoe.rs/album.db"
else
    echo "❌ 未找到数据库，请设置 DATABASE_URL 环境变量"
    exit 1
fi

echo "📦 数据库: $DB_URL"
export DATABASE_URL="$DB_URL"

# 运行迁移
echo "🔄 运行迁移..."
cd "$TAURI_DIR"
sqlx migrate run --source ../migrations

# 生成离线元数据
echo "📝 生成离线元数据..."
cargo sqlx prepare

echo "✅ 完成！"
