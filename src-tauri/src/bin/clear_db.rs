use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 获取数据库路径
    // 优先使用环境变量，否则尝试从当前目录或项目根目录查找
    let db_path = if let Ok(path) = std::env::var("DATABASE_URL") {
        if path.starts_with("sqlite:") {
            std::path::PathBuf::from(path.trim_start_matches("sqlite:"))
        } else {
            std::path::PathBuf::from(path)
        }
    } else {
        // 尝试从项目根目录查找（从 src-tauri 向上两级）
        let mut path = std::env::current_dir()?;
        // 如果在 src-tauri 目录下，向上到项目根目录
        if path.ends_with("src-tauri") {
            path = path.parent().unwrap().to_path_buf();
        }
        path.join("album.db")
    };

    println!("正在连接到数据库: {:?}", db_path);

    // 创建数据库连接
    let connect_options =
        SqliteConnectOptions::from_str(&format!("sqlite://{}", db_path.display()))?
            .create_if_missing(false);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(connect_options)
        .await?;

    println!("数据库连接成功，开始清空数据...");

    // 禁用外键检查以加快删除速度
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&pool)
        .await?;

    // 按顺序删除所有表的数据
    // 先删除关联表
    let tables = vec![
        "FileTags",
        "FileFolders",
        "Faces",
        "Files",
        "Tags",
        "Folders",
        "Persons",
    ];

    for table in &tables {
        let deleted = sqlx::query(&format!("DELETE FROM {}", table))
            .execute(&pool)
            .await?;
        println!(
            "已清空表 {}: 删除了 {} 条记录",
            table,
            deleted.rows_affected()
        );
    }

    // 重新启用外键检查
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await?;

    // 重置自增序列（SQLite 使用 sqlite_sequence 表）
    sqlx::query("DELETE FROM sqlite_sequence")
        .execute(&pool)
        .await?;
    println!("已重置自增序列");

    println!("数据库清空完成！");

    pool.close().await;

    Ok(())
}
