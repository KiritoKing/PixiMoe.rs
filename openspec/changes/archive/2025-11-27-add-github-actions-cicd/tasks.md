## 1. 创建 GitHub Actions 工作流文件
- [x] 1.1 创建 `.github/workflows/` 目录
- [x] 1.2 创建 `ci.yml` 工作流文件
- [x] 1.3 配置工作流触发器（push 到 main 分支，tag 触发发布）

## 2. 配置构建矩阵
- [x] 2.1 定义操作系统矩阵（windows-latest, ubuntu-latest, macos-latest）
- [x] 2.2 定义架构矩阵（x86_64, aarch64）
- [x] 2.3 配置矩阵排除项（Windows ARM64 如果 Tauri 不支持）- 已排除，只配置了 5 种组合

## 3. 设置构建环境
- [x] 3.1 配置 Node.js 环境（使用 pnpm）
- [x] 3.2 配置 Rust 工具链
- [x] 3.3 安装系统依赖（如果需要）- 已为 Linux ARM64 添加交叉编译依赖

## 4. 实现代码质量检查
- [x] 4.1 添加 TypeScript 类型检查步骤
- [x] 4.2 添加 Biome lint 检查步骤
- [x] 4.3 添加 Rust clippy 检查步骤
- [x] 4.4 添加 Rust 格式化检查步骤

## 5. 配置 Tauri 构建
- [x] 5.1 安装前端依赖（pnpm install）
- [x] 5.2 构建前端（pnpm build）- 由 `pnpm tauri build` 自动处理
- [x] 5.3 配置 Tauri 构建命令，指定目标架构
- [x] 5.4 处理不同平台的构建产物路径

## 6. 配置构建缓存
- [x] 6.1 缓存 pnpm 依赖
- [x] 6.2 缓存 Rust 编译产物（target 目录）
- [x] 6.3 配置缓存键和恢复策略

## 7. 配置产物上传
- [x] 7.1 上传构建产物作为工作流 artifacts（所有构建）
- [x] 7.2 配置 GitHub Releases 上传（仅限 tag 触发）
- [x] 7.3 设置产物命名规范（平台-架构-版本）

## 8. 测试和验证
- [ ] 8.1 在测试分支上验证工作流运行
- [ ] 8.2 验证所有 5 种构建组合都能成功（Windows ARM64 已排除）
- [ ] 8.3 验证代码质量检查步骤正常工作
- [ ] 8.4 验证构建产物可以正确下载和运行

