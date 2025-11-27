# Change: Add GitHub Actions CI/CD for Multi-Platform Builds

## Why
目前项目缺少自动化构建和部署流程，每次发布都需要手动在不同平台上构建，这导致：
- 发布流程耗时且容易出错
- 无法保证所有平台的构建产物一致性
- 开发者需要本地拥有所有目标平台环境才能构建
- 缺少自动化测试和质量检查流程

通过 GitHub Actions CI/CD，可以实现：
- 每次 push 到主分支自动触发构建
- 自动构建 Windows、Linux、macOS 的 x86_64 和 ARM64 版本（共 6 种产物）
- 自动运行代码质量检查（TypeScript 类型检查、Biome lint、Rust clippy）
- 自动发布构建产物到 GitHub Releases

## What Changes
- 添加 `.github/workflows/ci.yml` GitHub Actions 工作流文件
- 配置矩阵构建策略，支持 3 个操作系统 × 2 个架构 = 6 种构建组合
- 集成代码质量检查步骤（类型检查、lint、格式化检查）
- 配置 Tauri 构建命令，针对不同平台和架构
- 自动上传构建产物到 GitHub Releases（仅限 tag 触发）
- 添加构建缓存优化，加速后续构建

## Impact
- Affected specs: `build-system` (ADDED: CI/CD Pipeline)
- Affected code:
  - `.github/workflows/ci.yml` - 新建 GitHub Actions 工作流
  - `package.json` - 可能需要添加构建脚本（如果需要）
  - `src-tauri/tauri.conf.json` - 可能需要调整构建配置（如果需要）

