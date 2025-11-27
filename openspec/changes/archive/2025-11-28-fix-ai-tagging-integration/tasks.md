# Implementation Tasks

## Phase 1: 模型测试

### 1.1 创建测试命令
- [x] 在 `src-tauri/src/commands/files.rs` 中添加 `test_ai_model(image_path: String)` Tauri 命令
- [x] 命令应该：
  - 检查模型文件是否存在
  - 尝试加载模型和标签映射
  - 对提供的图片运行推理
  - 返回标签预测结果、推理时间、执行提供者信息
- [x] 在 `src-tauri/src/lib.rs` 中注册该命令

### 1.2 测试模型加载
- [ ] 运行 `pnpm tauri dev`
- [ ] 从前端调用测试命令，使用一个测试图片
- [ ] 验证模型能够成功加载
- [ ] 验证标签映射文件能够成功加载
- [ ] 记录任何错误信息

### 1.3 测试模型推理
- [ ] 使用测试命令对测试图片运行推理
- [ ] 验证推理能够返回有效的标签列表
- [ ] 验证标签置信度在合理范围内（0.35-1.0）
- [ ] 验证推理时间在预期范围内（GPU: 100-200ms, CPU: 500ms-1s）
- [ ] 记录使用的执行提供者（CUDA/CoreML/DirectML/CPU）

## Phase 2: 路径修复

### 2.1 改进路径解析逻辑
- [x] 修改 `src-tauri/src/ai/tagger.rs` 中的 `get_models_dir()` 函数
- [x] 优先使用 `CARGO_MANIFEST_DIR` 环境变量（开发环境）
- [x] 添加详细的 DEBUG 日志记录路径解析过程
- [x] 确保错误消息包含所有尝试的路径

### 2.2 验证路径解析
- [ ] 在开发环境中测试路径解析
- [ ] 验证能够正确找到 `src-tauri/models/` 目录
- [ ] 检查日志确认路径解析逻辑正确
- [ ] 如果可能，在构建后的应用中测试生产环境路径解析

## Phase 3: 集成验证

**状态**: 代码已实现，等待测试验证

### 3.1 验证导入流程中的 AI 标签
- [x] ✅ 代码已实现：`tag_file_automatically()` 函数已在 `src-tauri/src/commands/files.rs` 中实现
- [x] ✅ 代码已实现：模型推理逻辑已在 `src-tauri/src/ai/tagger.rs` 中实现
- [x] ✅ 代码已实现：标签保存逻辑已实现
- [ ] ⚠️ 需要测试：导入一个新图片文件（启用 AI 标签）并验证完整流程
- [ ] ⚠️ 需要测试：检查数据库确认标签已正确关联到文件

### 3.2 验证进度事件
- [x] ✅ 代码已实现：`ai_tagging_progress` 事件已在以下阶段发出（src-tauri/src/commands/files.rs）：
  - "classifying" - 推理开始 ✅
  - "saving_tags" - 保存标签 ✅
  - "complete" - 完成（包含标签数量）✅
  - "error" - 错误情况 ✅
- [x] ✅ 代码已实现：事件包含 `file_hash` 信息
- [ ] ⚠️ 需要测试：验证事件在实际运行中正确发出

### 3.3 验证错误处理
- [x] ✅ 代码已实现：错误处理逻辑已实现（模型文件缺失、无效图片等）
- [ ] ⚠️ 需要测试：测试模型文件缺失的情况
- [ ] ⚠️ 需要测试：测试无效图片文件的情况
- [ ] ⚠️ 需要测试：验证导入流程不会因为 AI 标签失败而中断

## Phase 4: 前端集成

**状态**: 代码已实现，等待测试验证

### 4.1 验证前端进度显示
- [x] ✅ 代码已实现：`ImportButton.tsx` 已监听 `ai_tagging_progress` 事件（src/components/import/ImportButton.tsx:71）
- [x] ✅ 代码已实现：进度指示器已实现（aiProgress状态管理）
- [ ] ⚠️ 需要测试：验证进度指示器能够正确显示 AI 标签状态
- [ ] ⚠️ 需要测试：验证完成和错误消息能够正确显示

### 4.2 验证标签显示
- [ ] ⚠️ 需要测试：导入图片后，等待 AI 标签完成
- [ ] ⚠️ 需要测试：验证标签能够出现在图片的标签列表中
- [ ] ⚠️ 需要测试：验证标签数量正确
- [ ] ⚠️ 需要测试：验证标签名称正确

### 4.3 测试手动触发 AI 标签
- [x] ✅ 代码已实现：`useRunAITagging()` hook 已实现（src/lib/hooks/useTagManagement.ts:122）
- [x] ✅ 代码已实现：`useBatchAITagging()` hook 已实现（src/lib/hooks/useTagManagement.ts:138）
- [x] ✅ 代码已实现：`tag_file_with_ai` 和 `tag_files_batch` 命令已实现（src-tauri/src/commands/files.rs:833, 880）
- [ ] ⚠️ 需要测试：验证手动触发能够正常工作
- [ ] ⚠️ 需要测试：验证进度事件能够正确显示

## Phase 5: 文档和清理

### 5.1 更新文档
- [x] 如果路径解析逻辑有变化，更新 `models/README.md`（路径解析已改进，但 README 不需要更新，因为路径逻辑是自动的）
- [ ] 添加测试命令的使用说明（如果需要）

### 5.2 代码清理
- [x] 改进错误处理和日志记录（添加了详细的日志，使用 `eprintln!` 用于调试，符合当前项目风格）
- [x] 确保所有错误消息都是用户友好的（错误消息已改进，包含详细信息）
- [x] 检查代码格式和注释（代码已通过 lint 检查）

