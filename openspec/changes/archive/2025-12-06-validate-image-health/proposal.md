# Image Health Checking Proposal

## Why
当前系统只检查缩略图的完整性，但没有验证原图的健康状况。用户无法知道哪些原图已经丢失或损坏，也没有便捷的方式来管理和筛选这些有问题的图片。这会导致用户体验下降，特别是当用户整理或移动图片文件时，无法及时发现和管理问题文件。

## What Changes
- **Backend**: 新增 `health_check.rs` 模块和 `commands/health.rs` 命令
- **Database**: 添加 `thumbnail_health` 和 `last_health_check` 字段
- **Frontend**: 新增 `HealthStatusFilter.tsx` 组件和 `useImageHealth.ts` hooks
- **UI**: `ImageCard` 组件添加健康状态指示器和响应式设计
- **Events**: 新增 `health_check_progress` 和 `health_check_complete` 事件

## Impact
- Affected specs: image-health-validation (new)
- Affected code: `src-tauri/src/health_check.rs`, `src-tauri/src/commands/health.rs`, `src/components/gallery/ImageCard.tsx`, `src/components/gallery/HealthStatusFilter.tsx`

## Proposed Solution
1. **后台健康检查**: 在应用启动时异步检查所有图片的健康状况（缩略图+原图）
2. **智能错误处理**: 根据缩略图和原图的不同状态提供适当的显示方案
3. **UI错误指示**: 在图库中为有问题的图片添加视觉错误标识
4. **筛选功能**: 提供筛选条件快速定位原图丢失的图片

## Key Features
- ✅ 多线程后台健康检查，不阻塞UI启动
- ✅ 智能缩略图补全机制
- ✅ 原图丢失检测和错误标识显示
- ✅ 一键筛选丢失原图功能
- ✅ 错误图片的tooltip提示
- ✅ 错误兜底图显示

## Implementation Scope
该提案将实现以下核心能力：
- **image-health-validation**: 图片健康检查系统
- **ui-error-indicators**: 错误状态UI指示器
- **missing-image-filter**: 丢失图片筛选功能

## Architecture Impact
- **Backend**: 新增健康检查命令和事件系统
- **Frontend**: 扩展现有UI组件添加错误状态显示
- **Database**: 利用现有的`is_missing`字段，可能需要添加缩略图健康字段
- **Storage**: 无需修改现有存储架构

## Performance Considerations
- 健康检查使用后台线程池，不影响应用启动性能
- 增量检查机制，避免重复验证健康的图片
- 智能缓存和批量处理优化

## User Experience
- 用户可以清楚看到哪些图片有问题
- 提供便捷的问题图片管理功能
- 不影响正常浏览体验，错误标识优雅显示