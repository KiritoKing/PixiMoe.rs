# Change: Add Settings Panel with AI Configuration and Model Debugging

## Why
当前应用缺少统一的设置界面，AI 模型管理机制不够灵活。用户无法：
- 自定义上传和管理 AI 模型文件
- 验证模型文件的完整性和安全性
- 调试和测试模型运行过程
- 直观地了解模型推理的每个步骤

参考示例图片，需要创建一个 Notion 风格的分栏设置面板，提供统一的配置入口，并支持 AI 功能的完整配置和调试能力。

## What Changes
- **BREAKING**: 将模型加载机制从内置模型改为用户手动上传模式
- **新增**: Notion 风格的分栏设置面板 UI（左侧导航 + 右侧内容区）
- **新增**: AI 功能配置页面，支持上传标签模型（一个 ONNX 文件和一个 CSV 标签列表文件）
- **新增**: SHA256 校验机制，确保模型文件完整性（hash值内置在应用中，当前可留空，后续补充）
- **新增**: 模型状态管理，未加载模型时前端置灰、后端返回错误
- **新增**: 模型文件存储到应用数据目录（区分开发/生产环境）
- **新增**: 模型调试功能，支持分步展示推理过程
- **新增**: 调试 UI，可调整模型参数并观察结果（dry-run 模式）
- **新增**: 推理参数配置功能，支持在设置面板中调整模型运行参数
- **修复**: 修正预处理流程（添加正方形填充和 BGR 转换）
- **修复**: 修正后处理流程（区分通用标签和角色标签，支持不同阈值和 MCut 算法）

## Impact
- Affected specs:
  - `ui-layout`: ADDED - 设置面板布局和导航结构
  - `ai-runtime-core`: MODIFIED - 模型加载机制改为用户上传模式
  - `ai-tagging`: MODIFIED - 模型可用性检查和错误处理

- Affected code:
  - `src/App.tsx` - 添加设置面板路由/导航
  - `src/components/settings/` - 新建设置相关组件目录
  - `src-tauri/src/commands/settings.rs` - 新建设置相关 Tauri 命令
  - `src-tauri/src/ai/tagger.rs` - 修改模型加载逻辑，支持从应用数据目录加载；修复预处理和后处理流程；添加推理参数支持
  - `src-tauri/src/ai/mod.rs` - 添加模型上传、校验、调试相关函数
  - `src/lib/hooks/useSettings.ts` - 新建设置相关 hooks
  - `src/lib/stores/useInferenceConfig.ts` - 新建推理配置状态管理

