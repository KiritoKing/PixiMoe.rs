# Design: GitHub Actions CI/CD for Multi-Platform Builds

## Context
项目需要支持 3 个操作系统（Windows、Linux、macOS）和 2 个架构（x86_64、ARM64），共 6 种构建组合。Tauri v2 支持跨平台构建，但需要正确的工具链配置。

## Goals / Non-Goals

### Goals
- 自动化所有平台的构建流程
- 每次 push 到 main 分支自动运行构建和检查
- 支持手动触发构建
- 构建产物可下载和发布到 GitHub Releases
- 优化构建时间（通过缓存）

### Non-Goals
- 不实现自动版本号管理（保持手动）
- 不实现自动发布到应用商店（未来考虑）
- 不实现端到端测试（v1.0 MVP 范围外）

## Decisions

### Decision: 使用 GitHub Actions 矩阵策略
**Rationale**: GitHub Actions 的矩阵策略可以高效地并行构建多个平台和架构组合，减少配置重复。

**Alternatives considered**:
- 单独的工作流文件：维护成本高，配置重复
- 第三方 CI/CD 服务（如 CircleCI、GitLab CI）：需要额外配置，GitHub Actions 与 GitHub 集成更好

### Decision: 使用 pnpm 作为包管理器
**Rationale**: 项目已使用 pnpm，保持一致性。pnpm 的缓存机制可以加速依赖安装。

### Decision: 构建产物上传策略
**Rationale**: 
- 所有构建都上传到工作流 artifacts，方便下载测试
- 仅当创建 tag 时上传到 GitHub Releases，避免每次构建都创建 release

**Alternatives considered**:
- 每次构建都创建 release：会产生过多 release，不利于管理
- 仅上传到 artifacts：用户下载不方便，需要访问工作流页面

### Decision: 代码质量检查在构建前运行
**Rationale**: 如果代码质量检查失败，可以提前终止，节省构建时间。

**Alternatives considered**:
- 并行运行检查和构建：虽然更快，但如果检查失败，构建产物也不应该发布

### Decision: 使用 Rust 交叉编译工具链
**Rationale**: Tauri 需要为不同架构交叉编译 Rust 代码。需要安装对应的工具链。

**Implementation notes**:
- Windows ARM64: 需要验证 Tauri 是否支持，如果不支持则排除
- Linux ARM64: 使用 `aarch64-unknown-linux-gnu` 目标
- macOS ARM64: 使用 `aarch64-apple-darwin` 目标（Apple Silicon）

## Risks / Trade-offs

### Risk: 构建时间较长
**Mitigation**: 
- 使用构建缓存（Rust target 目录、pnpm store）
- 并行构建多个矩阵组合
- 仅在必要时运行完整构建（push 到 main 或手动触发）

### Risk: 某些平台/架构组合可能不支持
**Mitigation**: 
- 在矩阵中配置排除项
- 在 spec 中明确支持的平台和架构
- 如果某个组合失败，不影响其他组合

### Risk: 构建产物大小较大
**Mitigation**: 
- GitHub Actions artifacts 有大小限制（10GB），但单个应用包通常 < 100MB
- 如果超过限制，考虑压缩或使用外部存储

### Trade-off: 构建时间 vs 缓存大小
**Decision**: 优先考虑构建时间，缓存 Rust target 目录。虽然会增加存储使用，但可以显著加速后续构建。

## Migration Plan

### Phase 1: 创建工作流文件
1. 创建 `.github/workflows/ci.yml`
2. 配置基本的构建步骤（单一平台测试）
3. 验证工作流可以运行

### Phase 2: 扩展矩阵构建
1. 添加操作系统矩阵
2. 添加架构矩阵
3. 测试所有组合

### Phase 3: 优化和发布
1. 添加缓存配置
2. 配置 GitHub Releases 上传
3. 文档化使用流程

### Rollback Plan
如果工作流出现问题：
1. 可以暂时禁用工作流（在 GitHub 仓库设置中）
2. 回退到手动构建流程
3. 修复问题后重新启用

## Open Questions
- [ ] Tauri v2 是否完全支持 Windows ARM64？如果不支持，需要在矩阵中排除
- [ ] 是否需要为不同平台使用不同的构建配置（如不同的图标、应用名称）？
- [ ] 构建产物命名规范：`piximoe-rs-{version}-{platform}-{arch}.{ext}` 是否合适？

