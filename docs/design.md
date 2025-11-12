好的，这是一份为您定制的、融合了我们所有讨论的\*\*“高性能 AI 图库客户端”\*\*完整技术方案蓝图。

本方案以 `Tauri` (Rust) 为核心，旨在实现一个**本地优先、非破坏性、高性能、零配置**的桌面图库管理工具。

-----

### 1\. 概述 (Overview)

#### 1.1 项目理念 (Philosophy)

  * **本地优先 (Local-First):** 所有数据（数据库、缩略图缓存）和 AI 模型均在用户本地运行。
  * **非破坏性 (Non-Destructive):** 永远不修改用户的原始文件。所有管理（标签、文件夹）都是存储在数据库中的“元数据”。
  * **内容寻址 (Content-Addressed):** 使用文件内容的 `BLAKE3` 哈希作为唯一 ID，自动去重并实现健壮的文件追踪。
  * **零配置 AI (Zero-Config AI):** 使用 `ONNX Runtime` 自动利用用户的硬件 (NPU, GPU, CPU) 进行 AI 加速，无需用户安装 Python/CUDA。

#### 1.2 核心技术栈 (Core Technology Stack)

  * **应用框架 (Framework):** `Tauri` (v2+)
  * **后端语言 (Backend):** `Rust`
  * **前端框架 (Frontend):** 任意 Web 框架 (Vue, React, Svelte...)
  * **数据库 (Database):** `SQLite` (通过 `rusqlite` Crate 访问)
  * **AI 推理 (AI Runtime):** `ONNX Runtime` (通过 `ort` Crate 访问)
  * **图像处理 (Imaging):** `image-rs` Crate (用于生成 WebP 缩略图)
  * **哈希算法 (Hashing):** `blake3` Crate

-----

### 2\. 数据库设计 (Database Schema)

这是系统的“中央大脑”，采用以 `Files` 表为核心的“星型”结构，实现完全解耦。

```sql
-- 1. 文件表 (核心)
-- 存储文件的物理和不变属性
CREATE TABLE Files (
    file_hash TEXT PRIMARY KEY NOT NULL,  -- BLAKE3 哈希值
    original_path TEXT NOT NULL,          -- 原始物理路径 (易变)
    file_size_bytes INTEGER NOT NULL,
    file_last_modified INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    date_imported INTEGER NOT NULL,
    is_missing INTEGER NOT NULL DEFAULT 0  -- 0=正常, 1=文件丢失
);

-- 2. 标签定义表
CREATE TABLE Tags (
    tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL DEFAULT 'general'  -- 'general', 'character', 'artist', 'series'
);

-- 3. 文件夹定义表 (逻辑文件夹/相簿)
CREATE TABLE Folders (
    folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_folder_id INTEGER,            -- 实现层级结构
    date_created INTEGER NOT NULL,
    FOREIGN KEY (parent_folder_id) REFERENCES Folders (folder_id)
);

-- 4. 人物定义表 (Coser)
CREATE TABLE Persons (
    person_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,          -- '伊织萌' 或 'Person 1' (待命名)
    cover_face_id INTEGER              -- (可选) 封面, 指向 Faces.face_id
);

-- 5. 人脸实例表 (AI 分析结果)
CREATE TABLE Faces (
    face_id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_hash TEXT NOT NULL,              -- 关联到文件
    person_id INTEGER,                  -- 关联到人物 (NULL=未聚类/未命名)
    embedding BLOB NOT NULL,              -- 512维特征向量
    box_coords TEXT NOT NULL,           -- '[x1, y1, x2, y2]'
    FOREIGN KEY (file_hash) REFERENCES Files (file_hash) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES Persons (person_id) ON DELETE SET NULL
);

-- 6. [关联表] 文件-标签 (多对多)
CREATE TABLE FileTags (
    file_hash TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (file_hash, tag_id),
    FOREIGN KEY (file_hash) REFERENCES Files (file_hash) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES Tags (tag_id) ON DELETE CASCADE
);

-- 7. [关联表] 文件-文件夹 (多对多)
CREATE TABLE FileFolders (
    file_hash TEXT NOT NULL,
    folder_id INTEGER NOT NULL,
    PRIMARY KEY (file_hash, folder_id),
    FOREIGN KEY (file_hash) REFERENCES Files (file_hash) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES Folders (folder_id) ON DELETE CASCADE
);
```

-----

### 3\. 核心工作流：文件导入与 AI 分析 (File Import & AI Pipeline)

这是一个**异步的后台 Tauri 命令**，由 Rust 在高性能线程池中执行。

**触发：** 用户拖拽文件夹到 App。

**对扫描到的每一个文件 `file_path` 执行：**

1.  **[计算哈希]**
      * **算法:** `BLAKE3`。
      * **动作:** `let file_hash = blake3::hash(fs::read(file_path));`
2.  **[数据库去重]**
      * **动作:** `SELECT 1 FROM Files WHERE file_hash = ?`
      * **逻辑:** 如果记录已存在，**立即停止**，跳到下一个文件。
3.  **[生成缩略图]**
      * **算法:** `image-rs` (Lanczos3 缩放) + `WebP` 编码。
      * **动作:**
          * `let img = image::open(file_path);`
          * `let thumb = img.resize_to_fill(400, 400, ...);`
          * `let cache_path = [AppDataDir]/thumbnails/{file_hash}.webp;`
          * `thumb.save_with_format(cache_path, ImageFormat::WebP);`
4.  **[写入文件主表]**
      * **动作:** `INSERT INTO Files (file_hash, original_path, ...) VALUES (?, ?, ...)`
5.  **[AI Tagger (分类)]**
      * **模型:** `SmilingWolf/swin-v2-tagger-v3` (`.onnx`)
      * **动作:**
          * 加载模型 `ort::Session`。
          * 预处理图片（缩放、归一化）。
          * `session.run(...)` 推理。
          * 解析输出，获取标签列表 `tags` (例如: `[('cosplay', 0.9), ('jk', 0.8)]`)。
6.  **[写入标签数据]**
      * **动作:** 遍历 `tags`：
          * `INSERT OR IGNORE INTO Tags (name, type) VALUES (?, ?);`
          * `INSERT INTO FileTags (file_hash, tag_id) VALUES (?, ...);`
7.  **[AI 路由]**
      * **逻辑:** `if tags.contains("cosplay") || tags.contains("photorealistic") { ... }`
8.  **[AI 人脸管线] (仅当步骤7为 True 时执行)**
      * **8a. [检测]**
          * **模型:** `SCRFD_kps` (`.onnx`)
          * **动作:** 推理，获取人脸 `box_coords` 和 5 个 `landmarks`。
      * **8b. [对齐]**
          * **算法:** 仿射变换 (Affine Transformation)。
          * **动作:** 使用 `landmarks` 将原始图片中的人脸“扭正”并裁剪为 112x112。
      * **8c. [嵌入]**
          * **模型:** `ArcFace (iresnet100)` (`.onnx`)
          * **动作:** 推理，获取 512 维 `embedding` (特征向量) `Vec<f32>`。
      * **8d. [写入人脸]**
          * **动作:** `INSERT INTO Faces (file_hash, person_id, embedding, box_coords) VALUES (?, NULL, ?, ?);` (此时 `person_id` 为 `NULL`)。

-----

### 4\. 核心工作流：人脸聚类 (Face Clustering)

这是一个**独立的后台 Tauri 命令**，例如 `cluster_unknown_faces`。

1.  **[查询数据]**
      * **动作:** `SELECT face_id, embedding FROM Faces WHERE person_id IS NULL;`
2.  **[执行聚类]**
      * **算法:** `DBSCAN` (使用 `dbscan` Crate)。
      * **关键:** 必须提供**余弦距离 (Cosine Distance)** (`1.0 - CosineSimilarity`) 作为 `DBSCAN` 的度量函数。
      * **调参:** `epsilon` (例如 0.7) 和 `min_samples` (例如 3) 是关键参数。
3.  **[分配ID]**
      * **动作:** `DBSCAN` 输出聚类结果 `Vec<Option<usize>>` (簇ID 或 噪声)。
      * 遍历每个新发现的“簇” (例如 `Cluster 0`, `Cluster 1`...)：
          * `INSERT INTO Persons (name) VALUES ('Person 1');` (获取 `new_person_id`)
          * `UPDATE Faces SET person_id = ? WHERE face_id IN (face_id_A, face_id_B, ...);`

-----

### 5\. 核心工作流：UI 渲染与缓存 (UI Rendering & Caching)

这是实现“丝滑”瀑布流的关键，使用 **Tauri 自定义协议**。

1.  **[前端 JS]**
      * 从后端获取到 `file_hash` 列表。
      * 在 `<img>` 标签中设置 `src`：
        `<img src="app-asset://thumbnails/{file_hash}.webp" />`
2.  **[后端 Rust (`main.rs`)]**
      * **注册协议:** `tauri::Builder::default().asset_protocol("app-asset", ...)`
      * **编写处理器:** Tauri 会截获 `app-asset://` 请求（无网络开销）。
      * 处理器函数解析 `file_hash`，安全地从 `[AppDataDir]/thumbnails/{file_hash}.webp` 读取文件。
      * **关键：** 构建 `Response` 时，设置**永久缓存头**：
        `ResponseBuilder::new().header("Cache-Control", "public, max-age=31536000, immutable")`
3.  **[效果]**
      * **首次加载:** Rust 读取文件，WebView (浏览器) 收到数据并将其**写入磁盘缓存**。
      * **后续加载:** WebView 甚至**不会**再向 Rust 发起请求，而是直接从它自己的磁盘缓存中读取图片，实现**瞬时**加载。

-----

### 6\. 健壮性与性能 (Robustness & Performance)

#### 6.1 文件丢失处理

1.  **检测:** 当用户尝试打开原图时，Rust 发现 `fs::metadata(original_path)` 失败。
2.  **标记:** `UPDATE Files SET is_missing = 1 WHERE file_hash = ?`
3.  **UI:** 刷新并显示“\!”图标。
4.  **重连:** 用户点击“\!”，选择新文件 `new_path`。
5.  **验证:** 后端**必须**计算 `BLAKE3(new_path)`，**只有**当 `hash(new_path) == file_hash` 时，才允许重连。
6.  **修复:** `UPDATE Files SET original_path = ?, is_missing = 0 WHERE file_hash = ?`

#### 6.2 性能管理

  * **AI 性能:** `ONNX Runtime` 会自动为用户选择最佳硬件（NVIDIA `CUDA` \> Apple `CoreML` \> Intel/AMD `DirectML` \> 高性能 `CPU`）。
  * **UI 预期:** 必须在 UI 上清晰地传达：AI 索引是**一次性、高开销**的后台任务。一个进度条或状态指示器是必要的，告知用户“正在处理 X / Y 张图片”。
  * **IO 性能:** `BLAKE3` 哈希和 `WebP` 缩略图生成速度极快，完全受限于用户的磁盘 IO，体验良好。