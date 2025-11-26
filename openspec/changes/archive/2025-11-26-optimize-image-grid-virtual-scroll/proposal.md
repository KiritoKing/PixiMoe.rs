# Change: 优化图像瀑布流性能（虚拟滚动）

## Why
当前图像瀑布流存在性能问题：
1. 首屏只能显示部分图片，点击标签后才会全部显示，导致一次性渲染大量 DOM 节点
2. 当图片数量较多时（如 1000+），全部渲染到 DOM 会造成严重的滚动卡顿
3. 当前实现使用分页（limit=100），但用户期望能够一次性看到所有图片，同时保持流畅的滚动体验

通过引入虚拟滚动技术，可以只渲染可见区域的图片，大幅减少 DOM 节点数量，从而解决滚动卡顿问题。

## What Changes
- **移除分页限制**：修改 `useFiles` hook 和 `get_all_files` 命令，支持一次性获取所有文件（不设 limit）
- **集成 TanStack Virtual**：使用 `@tanstack/react-virtual` 实现虚拟滚动
- **优化 ImageGrid 组件**：重构为使用虚拟滚动，只渲染可见区域的图片卡片
- **保持现有功能**：选择、点击、缩略图加载等所有功能保持不变
- **滚动加载优化**：虽然一次性获取所有数据，但通过虚拟滚动实现按需渲染

## Impact
- **Affected specs**: `ui-framework` (Image Grid Display Component requirement)
- **Affected code**:
  - `src/components/gallery/ImageGrid.tsx` - 重构为虚拟滚动实现
  - `src/lib/hooks/useFiles.ts` - 移除分页参数，支持获取全部文件
  - `src-tauri/src/commands/files.rs` - `get_all_files` 命令支持无限制查询
  - `src/App.tsx` - 更新 `useFiles` 调用，移除 limit 参数
- **Breaking changes**: 无（向后兼容，只是移除分页限制）

