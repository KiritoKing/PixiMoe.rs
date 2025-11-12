### 🚀 综合技术方案蓝图：v1.0 (MVP)

#### 1\. 核心理念与技术栈 (Philosophy & Stack)

  * **理念：** 本地优先、非破坏性、高性能。**v1.0 重点**：功能完整性优先于启动 UI 优化。
  * **启动方式：** 标准 `Vite + React` 客户端渲染 (CSR)。接受启动时短暂的白屏，后续版本再优化。
  * **核心技术栈：**

| 类别 | 技术选型 | 备注 (Why?) |
| :--- | :--- | :--- |
| **应用框架** | `Tauri` (v2+) | Rust 后端 + Webview 前端 |
| **后端语言** | `Rust` | 性能、安全、Tauri 核心 |
| **前端框架** | `React` (v18+) | 强大的 UI 构建能力 |
| **前端构建** | `Vite` | 极速的开发服务器 (HMR) |
| **UI 组件库** | `shadcn/ui` + `Tailwind CSS` | 高度可定制、美观、现代 |
| **数据库** | `SQLite` | 嵌入式、零配置、高性能 |
| **数据库驱动** | **`sqlx`** | **[关键选型]** 异步、编译时 SQL 检查、高性能 |
| **AI 推理** | `ONNX Runtime (ort)` | **[关键选型]** 跨平台 AI，自动硬件加速 |
| **前端状态** | `Zustand` | (UI 状态) 轻量级全局 UI 状态管理 |
| **前端数据** | `TanStack Query` (React Query) | (服务器状态) 管理 Rust 调用、缓存 |
| **数据持久化** | **`tauri-plugin-store`** | **[关键选型]** 持久化 `TanStack Query` 的缓存 |
| **CI/CD** | `tauri-action` (GitHub) | 自动化跨平台构建与发布 |

-----

#### 2\. 后端架构 (Rust / Tauri)

1.  **数据库 (sqlx)：**

      * **连接：** 在 `main.rs` 的 `setup` 钩子中，使用 `sqlx::SqlitePool::connect_with` 创建一个异步连接池。
      * **迁移：** 使用 `sqlx-cli` 和 `migrations` 文件夹管理数据库 `schema`。在 `setup` 钩子中，连接池创建后**立即**调用 `sqlx::migrate!("./migrations").run(&pool)` 来确保数据库是最新结构。
      * **注入：** `app.manage(pool)` 将连接池作为 Tauri **受管状态 (Managed State)** 注入。
      * **调用：** 在 `#[tauri::command]` 中通过 `tauri::State<'_, SqlitePool>` 获取连接池。

2.  **AI 推理 (ONNX Runtime)：**

      * **模型：** `.onnx` 格式的 `SmilingWolf/swin-v2-tagger-v3` (分类)、`SCRFD_kps` (人脸检测)、`ArcFace/iresnet100` (人脸嵌入)。
      * **执行：** 使用 `ort` Crate 加载模型。`ort` 会自动检测并使用最佳硬件：`CUDA` (Nvidia) -\> `CoreML` (Apple) -\> `DirectML` (Windows/Intel/AMD) -\> `CPU`。
      * **任务：** 所有 AI 任务**必须**在 `tokio::task::spawn` 中执行，以避免阻塞 Tauri 主线程。

3.  **API 与事件 (Tauri Commands & Events)：**

      * **读取 (Read)：** 所有“读”操作 (如 `get_tags`, `get_files_in_folder`) 均通过 `#[tauri::command]` 暴露给前端。
      * **写入 (Write)：** 所有“写”操作 (如 `rename_tag`) 也通过 `#[tauri::command]` 暴露。
      * **长时间任务 (Long Tasks)：** AI 索引、文件哈希等长时间任务，`#[tauri::command]` 应该**立即返回** `Ok(())`，并通过 `tokio::spawn` 启动后台任务。该任务通过 `app.emit("indexing_progress", ...)` 向前端**推送**进度。

4.  **错误处理 (Error Handling)：**

      * **方案：** 使用 `thiserror` Crate 定义一个顶层、可序列化 (`serde::Serialize`) 的 `AppError` 枚举。
      * **实现：** 所有的 `#[tauri::command]` 均返回 `Result<T, AppError>`。Rust 端的 `sqlx::Error` 或 `std::io::Error` 会被 `From` trait 自动转换为 `AppError`。
      * **效果：** `TanStack Query` (前端) 可以通过 `onError` 钩子优雅地捕获结构化的 `AppError` JSON 对象，并向用户显示友好的错误信息。

5.  **缩略图服务 (Thumbnail Service)：**

      * **方案：** 使用 `Tauri 自定义协议 (app-asset://)`。
      * **后端：** Rust 在启动时注册 `asset_protocol("app-asset", ...)`。处理器负责从 `[AppDataDir]/thumbnails/{file_hash}.webp` 安全地读取文件，并返回带**永久缓存头** (`Cache-Control: public, max-age=31536000, immutable`) 的 `Response`。
      * **前端：** `<img>` 标签的 `src` 直接设为 `app-asset://thumbnails/{hash}.webp`。

#### 3\. 前端架构 (React / Vite)

1.  **启动方式 (Startup)：**

      * **标准 CSR：** `Vite` + `React`。`index.html` 包含一个空的 `<div id="root"></div>`。接受 v1.0 启动时的短暂白屏。

2.  **UI 状态 (Zustand)：**

      * **用途：** 管理非服务器、全局性的 UI 状态。
      * **示例：** `isSidebarOpen`, `currentTheme` (`dark` / `light`), `indexingProgress` (由 Tauri 事件更新)。

3.  **数据状态 (TanStack Query)：**

      * **用途：** 自动管理、缓存和同步所有来自 Rust 后端的“服务器状态”。
      * **`useQuery` (读)：** 封装所有 `invoke('get_...')` 调用 (如 `useTags`, `useFiles`)。提供自动缓存和 UI 加载状态。
      * **`useMutation` (写)：** 封装所有 `invoke('rename_...')` 调用。通过 `onSuccess` 中的 `queryClient.invalidateQueries(...)` 自动使相关缓存失效并触发 UI 刷新。

4.  **数据持久化 (tauri-plugin-store)：**

      * **目标：** 使 `TanStack Query` 的缓存**在应用重启后依然存在**，实现“秒开”体验。
      * **方案：**
        1.  在 Tauri 中安装 `tauri-plugin-store`。
        2.  在 React 中安装 `@tauri-apps/plugin-store` 和 `@tanstack/react-query-persist-client`。
        3.  创建一个**自定义 Persister**（适配器），将 `tauri-plugin-store` 的 `Store` API (`.set`, `.get`, `.save`) 包装成 `react-query-persist-client` 所需的格式。
        4.  在 `main.tsx` 中，使用 `<PersistQueryClientProvider>` 替换 `<QueryClientProvider>`，并传入此自定义 Persister。

#### 4\. 关键数据库 Schema (7-Table Model)

\<details\>
\<summary\>\<b\>点击展开：核心 7 表 SQL Schema\</b\>\</summary\>

```sql
-- 1. Files (文件核心表)
CREATE TABLE Files (
    file_hash TEXT PRIMARY KEY NOT NULL,  -- BLAKE3 哈希
    original_path TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_last_modified INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    date_imported INTEGER NOT NULL,
    is_missing INTEGER NOT NULL DEFAULT 0
);

-- 2. Tags (标签定义表)
CREATE TABLE Tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'general'
);

-- 3. Folders (逻辑文件夹/相簿)
CREATE TABLE Folders (
    folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_folder_id INTEGER,
    FOREIGN KEY (parent_folder_id) REFERENCES Folders (folder_id)
);

-- 4. Persons (人物定义表)
CREATE TABLE Persons (
    person_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- 5. Faces (人脸实例表, AI结果)
CREATE TABLE Faces (
    face_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_hash TEXT NOT NULL,
    person_id INTEGER,
    embedding BLOB NOT NULL,
    box_coords TEXT NOT NULL,
    FOREIGN KEY (file_hash) REFERENCES Files (file_hash) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES Persons (person_id) ON DELETE SET NULL
);

-- 6. FileTags (文件-标签 关联表)
CREATE TABLE FileTags (
    file_hash TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (file_hash, tag_id),
    FOREIGN KEY (file_hash) REFERENCES Files (file_hash),
    FOREIGN KEY (tag_id) REFERENCES Tags (tag_id)
);

-- 7. FileFolders (文件-文件夹 关联表)
CREATE TABLE FileFolders (
    file_hash TEXT NOT NULL,
    folder_id INTEGER NOT NULL,
    PRIMARY KEY (file_hash, folder_id),
    FOREIGN KEY (file_hash) REFERENCES Files (file_hash),
    FOREIGN KEY (folder_id) REFERENCES Folders (folder_id)
);
```

\</details\>

-----

#### 5\. 构建与部署 (CI/CD)

  * **工具：** `tauri-action` (GitHub Action)。
  * **触发：** 当 `git push --tags` 一个新版本 (如 `v1.0.0`) 时自动触发。
  * **矩阵 (Matrix)：** 自动在 `[windows-latest, macos-latest, ubuntu-20.04]` 虚拟机上并发构建。
  * **产物：** 自动生成 `.msi` (Windows), `.app.tar.gz` (macOS), `.deb` / `.AppImage` (Linux) 安装包。
  * **发布：** 自动将所有产物附加到一个新的 GitHub Release 草稿中。
  * **更新：** 在 `tauri.conf.json` 中启用 `updater` 功能，指向您的 GitHub 仓库。当您发布该 Release 后，已安装的应用将能自动检测并提示更新。

-----

#### 6\. v1.1+ 优化项 (Parking Lot)

  * **[启动性能]** 实施“手动 App Shell” (SSG 骨架) 或“Tauri 闪屏”，消除 v1.0 中的启动白屏。
  * **[AI 性能]** 探索 AI 模型的进一步量化（如 `fp16`），以减小模型体积和加快 CPU 推理速度。
  * **[健壮性]** 实现一个“库健康检查”后台任务，主动扫描 `is_missing = 1` 的文件，或检测 `original_path` 已被移动但哈希未变的情况。