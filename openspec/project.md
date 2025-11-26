```markdown
# Project Context

## Purpose
一个基于 Tauri 的本地优先 AI 图像管理桌面应用，提供非破坏性照片管理，具备自动标签、人脸检测识别和智能组织功能。系统采用内容寻址存储（BLAKE3 哈希）确保数据完整性，支持自动去重和健壮的文件追踪。

### 核心理念
- **本地优先 (Local-First)**：所有数据和 AI 模型均在用户本地运行，无需云端服务
- **非破坏性 (Non-Destructive)**：永不修改原始文件，所有管理操作均为元数据
- **内容寻址 (Content-Addressed)**：使用文件内容的 BLAKE3 哈希作为唯一标识符
- **零配置 AI (Zero-Config AI)**：自动利用用户硬件（NPU/GPU/CPU）进行 AI 加速

### 项目结构
- **前端**：`src/` - React + TypeScript + shadcn/ui
- **后端**：`src-tauri/` - Rust 核心逻辑
- **AI 模型**：ONNX 格式，支持分类、人脸检测和人脸识别
- **数据库**：SQLite 7表星型架构，支持文件、标签、人物、人脸关联

### 开发调试
```bash
# 开发模式启动
pnpm tauri dev

# 构建应用
pnpm tauri build

# 数据库迁移
cd src-tauri && sqlx migrate run

# AI 模型下载
# 首次启动时自动从 Hugging Face 下载 ONNX 模型
```

## Tech Stack
- **Application Framework**: Tauri v2+ (Rust 后端 + WebView 前端)
- **Backend Language**: Rust (高性能、内存安全)
- **Frontend Framework**: React 18+ with TypeScript
- **Build System**: Vite (支持 HMR 快速开发)
- **UI Components**: shadcn/ui + Tailwind CSS (现代化、可定制)
- **Database**: SQLite with sqlx (嵌入式、零配置、编译时 SQL 检查)
- **AI Runtime**: ONNX Runtime (ort crate) - 自动硬件加速
- **State Management**:
  - Zustand (UI 状态管理)
  - TanStack Query (服务端状态管理) + tauri-plugin-store 持久化
- **Image Processing**: image-rs crate (WebP 缩略图生成)
- **Hashing**: BLAKE3 (内容寻址、去重)

## Project Conventions

### Code Style
- **Rust**: 遵循 Rust 2021 版本规范，使用 `rustfmt` 格式化
- **TypeScript**: 严格模式，显式返回类型，禁止隐式 `any`
- **命名规范**:
  - Rust: 函数/变量用 snake_case，类型/结构体用 PascalCase
  - TypeScript: 函数/变量用 camelCase，组件/类型用 PascalCase
  - 数据库: 表名和字段名用 snake_case
- **注释**: 公共 API 使用文档注释 (`///` in Rust, JSDoc in TypeScript)
- **错误处理**: Rust 使用 `Result<T, E>`，生产代码避免 `unwrap()`

### Architecture Patterns
- **本地优先**: 所有数据（数据库、缩略图、AI 模型）本地运行
- **非破坏性**: 原文件永不修改，元数据存储在 SQLite
- **内容寻址**: 文件通过 BLAKE3 哈希标识，支持去重和追踪
- **全异步**: Rust 使用 tokio，避免阻塞主线程
- **星型数据库**: Files 表为中心，6 个关联表支持
- **关注点分离**:
  - Rust: 模块化结构 (db/, commands/, ai/, protocols/)
  - React: Hooks 处理逻辑，组件负责展示
- **协议缩略图**: 使用 Tauri 自定义协议 (`app-asset://`) 和永久缓存头

### Testing Strategy
- **单元测试**: 测试纯函数 (Rust: `#[cfg(test)]`, TypeScript: Vitest)
- **集成测试**: 使用测试数据库测试数据库查询和 Tauri 命令
- **端到端测试**: v1.0 MVP 手动测试，自动化 E2E 推迟到 v1.1+
- **性能基准**: 记录 AI 推理预期时间作为基准

### Git Workflow
- **分支策略**: `main` 用于生产就绪代码，功能分支用于开发
- **提交格式**: 约定式提交格式 (feat:, fix:, docs:, refactor: 等)
- **Pull Requests**: 所有更改都需要 PR，合并前必须通过验证
- **OpenSpec**: 重大变更需要已批准的提案才能实施

## Domain Context

### Core Concepts
- **文件哈希**: 文件内容的 BLAKE3 哈希，作为不可变标识符
- **逻辑文件夹**: 用户创建的相簿/收藏夹（与文件多对多关系）
- **标签**: AI 生成和用户添加的标签，包含类型（通用、角色、作者、系列）
- **人物**: 通过人脸聚类识别的命名个体
- **人脸**: 包含 512 维嵌入向量的单人脸实例
- **缩略图**: WebP 格式（400x400px），存储在 AppDataDir 中，使用内容寻址文件名

### AI Pipeline
1. **图像分类**: SmilingWolf/swin-v2-tagger-v3 模型对图像进行分类标记
2. **条件人脸检测**: 仅当检测到 "cosplay" 或 "photorealistic" 标签时运行
3. **人脸检测**: SCRFD_kps 检测人脸和关键点
4. **人脸对齐**: 仿射变换将人脸标准化为 112x112px
5. **人脸嵌入**: ArcFace (iresnet100) 生成 512 维向量
6. **人脸聚类**: DBSCAN 基于余弦距离对相似人脸进行分组（离线处理）

### Performance Expectations
- **哈希计算**: 受磁盘 I/O 限制（SSD 上约 100-200 MB/s）
- **缩略图生成**: 每张图片约 50-100ms
- **AI 标记**: GPU 上每张图片约 100-200ms，CPU 上约 500ms-1s
- **人脸检测**: GPU 上每张图片约 50-100ms
- **人脸嵌入**: GPU 上每张人脸约 20-50ms
- **目标规模**: 高效处理 10,000+ 图片

## Important Constraints
- **零配置 AI**: 用户无需安装 Python、CUDA 或配置模型
- **非破坏性**: 应用程序绝不能修改或删除原始文件
- **隐私优先**: 所有数据在本地处理，无云服务
- **启动容忍度**: v1.0 MVP 接受启动时短暂白屏（Vite CSR）
- **内存预算**: AI 处理峰值使用量保持在 4GB 以下
- **磁盘空间**: v1.0 中缩略图的 WebView 缓存可能无限增长（手动清理）

## External Dependencies
- **ONNX 模型**:
  - SmilingWolf/swin-v2-tagger-v3 (~100MB)
  - SCRFD_10G_KPS (~20MB)
  - ArcFace iresnet100 (~100MB)
  - 来源: Hugging Face 或 GitHub releases
- **ONNX Runtime**: 由 `ort` crate 通过 `download-binaries` feature 自动下载
- **执行提供者**: CUDA (NVIDIA), CoreML (Apple), DirectML (Windows), CPU (后备)

## v1.0 MVP Scope
- **In Scope**:
  - 文件导入与哈希计算和去重
  - 自动 AI 标记和人脸检测
  - 浏览图像和标签的基础 UI
  - 缩略图缓存与即时加载
  - 7表架构的 SQLite 数据库
  - 路径变更时的文件重连

- **Out of Scope (Deferred to v1.1+)**:
  - 人脸聚类 UI 和手动分组
  - 全文搜索 (FTS5) 的高级搜索
  - NSFW 检测
  - 导出功能（ZIP/文件夹 + 元数据）
  - 启动优化（闪屏、SSR）
  - 缩略图缓存大小管理（LRU 淘汰）

```
