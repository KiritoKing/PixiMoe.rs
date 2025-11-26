# Design: 图像瀑布流虚拟滚动优化

## Context
当前图像瀑布流使用 CSS Grid 布局，一次性渲染所有图片到 DOM。当图片数量超过 100 时，会出现明显的滚动卡顿。用户期望能够一次性看到所有图片（不设分页限制），同时保持流畅的滚动体验。

## Goals / Non-Goals

### Goals
- 支持一次性获取和显示所有图片（移除分页限制）
- 使用虚拟滚动技术，只渲染可见区域的图片，减少 DOM 节点
- 保持现有的所有功能（选择、点击、缩略图加载等）
- 实现流畅的滚动体验（60fps），即使有 1000+ 图片

### Non-Goals
- 不实现真正的瀑布流布局（保持 CSS Grid 响应式布局）
- 不实现图片懒加载（虚拟滚动已经实现了按需渲染）
- 不改变现有的缩略图加载机制

## Decisions

### Decision 1: 使用 TanStack Virtual 而非其他虚拟滚动库
**Rationale**:
- TanStack Virtual 是 TanStack 生态的一部分，与项目已使用的 TanStack Query 保持一致
- 支持 React，API 简洁易用
- 性能优秀，支持动态尺寸测量
- 文档完善，社区活跃

**Alternatives considered**:
- `react-window`: 功能类似，但 TanStack Virtual 更新更活跃
- `react-virtualized`: 已停止维护
- 自定义虚拟滚动：开发成本高，容易出错

### Decision 2: 使用 `useVirtualizer` 而非 `useWindowVirtualizer`
**Rationale**:
- 滚动容器是 `div` 元素（`overflow-y-auto`），不是整个窗口
- `useVirtualizer` 更适合容器内滚动场景
- 可以更好地控制滚动区域和布局

**Alternatives considered**:
- `useWindowVirtualizer`: 适用于整个页面滚动，不符合当前布局

### Decision 3: 保持 CSS Grid 布局，使用绝对定位渲染虚拟项
**Rationale**:
- CSS Grid 提供响应式列数（2-6 列），用户体验好
- 虚拟滚动需要绝对定位来精确控制每个项的位置
- 可以通过计算每个虚拟项应该在哪一行哪一列来实现 Grid 布局

**Implementation approach**:
- 计算每行的列数（根据容器宽度和响应式断点）
- 对于每个虚拟项，计算其应该在第几行、第几列
- 使用绝对定位，设置 `top` 和 `left` 来定位每个图片卡片

### Decision 4: 移除分页限制，一次性获取所有文件
**Rationale**:
- 用户期望能够看到所有图片，而不是分页浏览
- 虚拟滚动可以处理大量数据，不需要分页
- 数据在内存中，虚拟滚动只渲染可见部分，内存占用可控

**Alternatives considered**:
- 保持分页，使用无限滚动：用户体验不如一次性显示所有图片
- 服务端分页：增加复杂度，不符合本地优先架构

### Decision 5: 使用动态尺寸测量
**Rationale**:
- 图片可能有不同的宽高比，导致卡片高度不同
- TanStack Virtual 支持 `measureElement` 来动态测量实际尺寸
- 需要为每个图片卡片设置 `ref={virtualizer.measureElement}`

**Implementation details**:
- 初始使用 `estimateSize` 估算高度（如 200px，考虑 aspect-square）
- 图片加载后，使用 `measureElement` 测量实际高度
- 虚拟滚动会自动调整布局

## Risks / Trade-offs

### Risk 1: 大量数据一次性加载可能导致内存占用高
**Mitigation**:
- 虚拟滚动只渲染可见项，DOM 节点数量有限（通常 < 50）
- 图片使用缩略图（WebP，约 400x400px），内存占用可控
- 如果内存成为问题，可以考虑数据分片加载（但先不实现）

### Risk 2: 初始加载时间可能较长（获取所有文件）
**Mitigation**:
- 使用 TanStack Query 缓存，后续访问更快
- 显示加载状态，用户知道正在加载
- 如果文件数量非常大（> 10000），可以考虑延迟加载或分片

### Risk 3: 虚拟滚动与 CSS Grid 结合可能复杂
**Mitigation**:
- 使用绝对定位，精确控制每个项的位置
- 计算每行的列数和每个项的行列位置
- 充分测试不同屏幕尺寸下的布局

### Risk 4: 动态尺寸测量可能导致滚动跳动
**Mitigation**:
- 使用合理的 `estimateSize`，尽量接近实际尺寸
- 使用 `overscan` 提前渲染，减少测量时的视觉跳动
- 考虑使用固定高度（aspect-square），简化实现

## Migration Plan

### Phase 1: 后端和 Hook 修改
1. 修改 `get_all_files` 命令，支持无 limit 查询
2. 修改 `useFiles` hook，移除 limit 参数
3. 测试数据获取功能

### Phase 2: 虚拟滚动集成
1. 安装 `@tanstack/react-virtual`
2. 重构 `ImageGrid` 组件，集成虚拟滚动
3. 保持现有功能（选择、点击等）

### Phase 3: 测试和优化
1. 测试各种场景（少量图片、大量图片、标签过滤）
2. 性能测试和优化
3. 修复可能的 bug

### Rollback Plan
如果虚拟滚动实现有问题，可以：
1. 恢复使用分页的 `useFiles(0, 100)`
2. 恢复原来的 `ImageGrid` 实现
3. 所有修改都是向后兼容的，可以安全回滚

## Open Questions
- [ ] 是否需要支持图片的固定高度（aspect-square），简化虚拟滚动实现？
- [ ] 如果文件数量超过 10000，是否需要考虑数据分片加载？
- [ ] 是否需要优化 `estimateSize` 的准确性，减少滚动时的重新计算？

