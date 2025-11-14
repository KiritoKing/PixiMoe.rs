# Components 组件结构

本目录采用功能分层的组织方式，按照业务功能对组件进行分类。

## 目录结构

```
components/
├── gallery/          # 图片展示相关组件
│   ├── ImageGrid.tsx       # 图片网格布局
│   ├── ImageCard.tsx       # 单个图片卡片
│   ├── ImageViewer.tsx     # 图片查看器
│   └── index.ts
├── tags/             # 标签管理相关组件
│   ├── TagInput.tsx        # 标签输入框
│   ├── TagFilterPanel.tsx  # 标签筛选面板
│   ├── BatchTagEditor.tsx  # 批量标签编辑器
│   └── index.ts
├── import/           # 导入相关组件
│   ├── ImportButton.tsx    # 导入按钮
│   └── index.ts
├── ui/               # 通用UI组件
│   └── button.tsx          # 按钮组件
└── index.ts          # 统一导出文件
```

## 导入方式

### 方式一：从子目录导入
```typescript
import { ImageGrid, ImageCard } from '@/components/gallery';
import { TagInput, TagFilterPanel } from '@/components/tags';
import { ImportButton } from '@/components/import';
```

### 方式二：从根目录统一导入
```typescript
import { ImageGrid, TagInput, ImportButton } from '@/components';
```

## 组件分类说明

### Gallery (图片展示)
负责图片的展示、浏览和交互功能。

### Tags (标签管理)
负责标签的输入、筛选、批量编辑等功能。

### Import (导入)
负责文件导入相关功能。

### UI (通用组件)
可复用的基础UI组件。
