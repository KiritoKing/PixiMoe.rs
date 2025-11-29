# Design: Settings Panel with AI Configuration

## Context
当前应用缺少统一的设置界面，AI 模型管理采用内置模型方式，不够灵活。用户需要能够：
1. 自定义上传和管理 AI 模型文件
2. 验证模型文件的完整性和安全性（SHA256）
3. 调试和测试模型运行过程
4. 直观地了解模型推理的每个步骤

参考示例图片，需要创建一个 Notion 风格的分栏设置面板，提供统一的配置入口。

## Goals / Non-Goals

### Goals
- 提供 Notion 风格的分栏设置面板 UI
- 支持用户上传标签模型（一个 ONNX 文件和一个 CSV 标签列表文件）
- 实现 SHA256 校验机制确保文件完整性（哈希值内置在应用中）
- 将模型文件存储到应用数据目录（区分开发/生产环境）
- 实现模型状态管理，未加载时前端置灰、后端返回错误
- 提供模型调试功能，支持分步展示和参数调整

### Non-Goals
- 不支持模型版本管理（v1.0 只支持单个模型）
- 不支持模型自动更新
- 不支持多个模型同时加载
- 不支持人脸模型（仅支持标签模型）
- 不支持模型性能基准测试（仅调试功能）

## Decisions

### Decision: Settings Panel UI Architecture
**What**: 使用 Dialog/Sheet 组件实现设置面板，左侧导航使用 List 组件，右侧内容使用动态组件渲染。

**Why**: 
- shadcn/ui 的 Sheet 组件提供侧边栏效果，适合 Notion 风格
- 可以复用现有的 Dialog 组件模式
- 支持响应式设计（移动端可折叠）

**Alternatives considered**:
- 全屏路由页面：需要路由系统，增加复杂度
- 独立窗口：Tauri 多窗口管理复杂，不符合桌面应用习惯

### Decision: Model Storage Location
**What**: 模型文件存储在 `{app_data_dir}/models/` 目录，使用 Tauri 的 `app.path().app_data_dir()` 获取路径。

**Why**:
- 应用数据目录是用户数据的标准位置
- 开发环境：`~/.local/share/com.chlorinec.piximoe.rs/models/` (Linux), `~/Library/Application Support/com.chlorinec.piximoe.rs/models/` (macOS)
- 生产环境：同样的位置，但通过 Tauri 自动管理
- 与数据库和缩略图存储位置一致

**Alternatives considered**:
- 存储在可执行文件目录：需要写权限，可能被系统保护
- 存储在用户选择的目录：增加复杂度，用户可能选择不合适的位置

### Decision: SHA256 Verification
**What**: 上传模型文件时计算 SHA256 哈希，与内置的预期值进行比较（如果已配置）。

**Why**:
- SHA256 是标准哈希算法，Rust 标准库支持
- 可以验证文件完整性，防止文件损坏
- 可以验证文件来源，防止恶意文件
- 哈希值内置在应用中，由开发者配置，用户无需手动输入
- 如果应用中没有配置预期哈希值，则跳过验证（允许上传）

**Implementation**:
- SHA256 哈希值存储在应用配置中（可以是常量或配置文件）
- 当前版本可以先留空，后续补充
- 如果配置了哈希值，上传时进行验证；如果未配置，则允许上传

**Alternatives considered**:
- MD5：已过时，不安全
- BLAKE3：项目已使用，但 SHA256 更通用，用户可能更容易获取
- 用户输入哈希值：增加用户负担，不如内置在应用中
- 不验证：安全性不足

### Decision: Model State Management
**What**: 使用静态 `Lazy` 变量存储模型会话，通过 `is_model_available()` 函数检查状态。

**Why**:
- 保持与现有代码结构一致
- `Lazy` 提供线程安全的懒加载
- 状态检查快速，不阻塞

**Alternatives considered**:
- 全局状态管理：增加复杂度，当前方案已足够
- 每次检查文件存在性：性能较差，当前方案缓存状态更好

### Decision: Model Debugging Architecture
**What**: 调试功能作为设置页面的子功能，使用独立的调试组件，支持分步执行和参数调整。

**Why**:
- 调试是配置的一部分，放在设置页面合理
- 分步执行帮助用户理解模型工作流程
- 参数调整帮助用户优化模型使用

**Alternatives considered**:
- 独立的调试工具：增加导航复杂度
- 命令行调试：不够直观，不符合桌面应用体验

### Decision: Dry-Run Mode for Debugging
**What**: 调试功能完全独立，不写入数据库，不影响现有数据。

**Why**:
- 用户可能想测试不同参数，不应该污染数据库
- 调试是探索性的，不应该有副作用
- 简化实现，不需要回滚机制

**Alternatives considered**:
- 写入临时数据库：增加复杂度，需要清理机制
- 写入后自动删除：可能误操作，不够安全

## Risks / Trade-offs

### Risk: Model File Size
**Mitigation**: 
- 上传时显示文件大小和进度
- 使用流式上传（如果 Tauri 支持）
- 提供取消上传功能

### Risk: Model Loading Performance
**Mitigation**:
- 模型加载在后台进行，不阻塞 UI
- 显示加载进度和状态
- 提供加载超时机制

### Risk: SHA256 Verification Overhead
**Mitigation**:
- 哈希计算在后台进行，显示进度
- 对于大文件（>100MB），可能需要几秒钟，这是可接受的
- 可以考虑使用 BLAKE3（更快），但 SHA256 更通用

### Risk: Model Compatibility
**Mitigation**:
- 提供清晰的错误消息，说明模型要求
- 在调试功能中测试模型兼容性
- 文档说明支持的模型格式和版本

## Migration Plan

### Phase 1: Settings Panel UI
1. 创建设置面板组件和导航结构
2. 实现基础布局（左侧导航 + 右侧内容）
3. 添加路由/状态管理

### Phase 2: Model Upload and Verification
1. 实现文件上传 Tauri 命令
2. 实现 SHA256 哈希计算和验证
3. 实现文件复制到 app_data_dir
4. 更新模型加载逻辑使用新路径

### Phase 3: Model State Management
1. 实现模型状态查询命令
2. 更新前端 AI 功能禁用逻辑
3. 更新后端错误处理

### Phase 4: Model Debugging
1. 实现调试 UI 组件
2. 实现分步执行逻辑
3. 实现参数调整功能

### Rollback Plan
- 如果新模型系统有问题，可以回退到使用 `src-tauri/models/` 目录
- 保留原有的 `get_models_dir()` 函数作为后备
- 数据库不受影响，可以安全回退

## Open Questions
- 是否需要支持模型文件的自动备份？
- 是否需要支持多个模型文件的管理（当前只支持单个）？
- 调试功能是否需要保存调试历史记录？

## Additional Design Decisions: Inference Parameter Configuration

### Decision: Inference Configuration Storage
**What**: 使用 Tauri Store 插件持久化推理配置，存储为 JSON 格式。

**Why**:
- Tauri Store 提供简单的键值存储 API
- 与通知中心使用相同的存储机制，保持一致性
- JSON 格式易于序列化和反序列化
- 支持默认值处理

**Alternatives considered**:
- SQLite 数据库：过度设计，配置数据简单
- 配置文件：需要手动管理文件路径和解析

### Decision: Preprocessing Fixes
**What**: 修正预处理流程以匹配官方实现：添加正方形填充、BGR 转换、BICUBIC 插值。

**Why**:
- 官方实现经过充分测试，是标准做法
- 正方形填充确保模型输入一致性
- BGR 转换是模型期望的格式
- BICUBIC 插值提供更好的图像质量

**Impact**:
- 可能影响现有标签结果（需要重新运行 AI  tagging）
- 需要更新 spec 文档说明正确的预处理流程

### Decision: Postprocessing Category Separation
**What**: 区分 rating、general、character 标签，使用不同的阈值和 MCut 算法。

**Why**:
- 官方实现明确区分了三种标签类型
- 不同标签类型需要不同的阈值（general 0.35, character 0.85）
- MCut 算法可以提供更智能的阈值选择
- 提高标签质量，减少误标

**Impact**:
- 需要更新标签分类逻辑
- 可能需要调整数据库中的标签类型推断逻辑

### Decision: MCut Threshold Algorithm
**What**: 实现 MCut (Maximum Cut Thresholding) 算法作为可选的后处理选项。

**Why**:
- 官方代码提供了 MCut 实现
- MCut 可以根据预测分布自动选择最优阈值
- 对于 character 标签，MCut 结果需要限制在 0.15 以上

**Implementation**:
- 算法找到排序后概率的最大差值
- 阈值设为相邻概率的中点
- 对于 character，使用 `max(0.15, mcut_threshold)`

