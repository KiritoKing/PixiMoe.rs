# Components 组件结构

本目录采用功能分层的组织方式，按照业务功能对组件进行分类。

## 目录结构

```
components/
├── gallery/          # 图片展示相关组件
│   ├── ImageGrid.tsx       # 图片网格布局
│   ├── ImageCard.tsx       # 单个图片卡片
│   └── ImageViewer.tsx     # 图片查看器
├── tags/             # 标签管理相关组件
│   ├── TagInput.tsx        # 标签输入框
│   ├── TagFilterPanel.tsx  # 标签筛选面板
│   └── BatchTagEditor.tsx  # 批量标签编辑器
├── import/           # 导入相关组件
│   └── ImportButton.tsx    # 导入按钮
└── ui/               # 通用UI组件
    └── button.tsx          # 基础按钮组件
```

## 导入方式

### 直接导入组件
```typescript
import { ImageGrid, ImageCard } from '@/components/gallery/ImageGrid';
import { ImageViewer } from '@/components/gallery/ImageViewer';
import { TagInput, TagFilterPanel } from '@/components/tags/TagInput';
import { BatchTagEditor } from '@/components/tags/BatchTagEditor';
import { ImportButton } from '@/components/import/ImportButton';
import { Button } from '@/components/ui/button';
```

### 重要原则
- **禁止使用 barrel files (index.ts)**：不允许创建或使用 barrel 文件来重新导出组件
- **直接导入**：始终直接从组件文件导入，确保导入路径明确
- **一个组件一个文件**：每个组件都应该有自己的文件，并直接导出

## 组件分类说明

### Gallery (图片展示)
负责图片的展示、浏览和交互功能。

### Tags (标签管理)
负责标签的输入、筛选、批量编辑等功能。

### Import (导入)
负责文件导入相关功能。

### UI (通用组件)
可复用的基础UI组件。
