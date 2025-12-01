# 翻译字典创建指南 (Translation Dictionary Guide)

本文档面向社区贡献者，介绍如何为 Piximoe 创建标签翻译字典文件。

## 概述

Piximoe 使用 AI 模型生成英文标签（如 `long_hair`, `blue_eyes`）。通过上传翻译字典，用户可以将这些标签显示为其他语言。

## 字典文件格式

### 基本格式

翻译字典使用 CSV 格式，包含三列：

```csv
name,translated_name,language_code
```

| 列名 | 说明 | 示例 |
|------|------|------|
| `name` | 原始英文标签名称 | `long_hair` |
| `translated_name` | 翻译后的名称 | `长发` |
| `language_code` | ISO 639-1 语言代码 | `zh` |

### 示例文件

```csv
name,translated_name,language_code
1girl,1女孩,zh
1boy,1男孩,zh
long_hair,长发,zh
short_hair,短发,zh
blue_eyes,蓝眼睛,zh
smile,微笑,zh
blush,脸红,zh
dress,连衣裙,zh
skirt,裙子,zh
1girl,1人の女の子,ja
1boy,1人の男の子,ja
long_hair,ロングヘア,ja
short_hair,ショートヘア,ja
smile,笑顔,ja
```

### 多语言支持

**一个 CSV 文件可以包含多种语言的翻译**。用户上传后可以在应用中选择要显示的语言。

## 语言代码

使用 [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) 两字母语言代码：

| 代码 | 语言 |
|------|------|
| `zh` | 中文 (Chinese) |
| `ja` | 日本語 (Japanese) |
| `ko` | 한국어 (Korean) |
| `es` | Español (Spanish) |
| `fr` | Français (French) |
| `de` | Deutsch (German) |
| `ru` | Русский (Russian) |
| `pt` | Português (Portuguese) |
| `it` | Italiano (Italian) |
| `vi` | Tiếng Việt (Vietnamese) |
| `th` | ไทย (Thai) |
| `ar` | العربية (Arabic) |

## 标签来源

标签名称来自 [Danbooru](https://danbooru.donmai.us/tags) 标签系统。常见标签类型：

### 通用标签 (General)
- 外观：`long_hair`, `short_hair`, `blonde_hair`, `blue_eyes`, `red_eyes`
- 表情：`smile`, `blush`, `open_mouth`, `closed_eyes`
- 服装：`dress`, `skirt`, `shirt`, `hat`, `gloves`
- 姿势：`sitting`, `standing`, `looking_at_viewer`

### 评级标签 (Rating)
- `general` - 一般
- `sensitive` - 敏感
- `questionable` - 可疑
- `explicit` - 限制级

### 人物数量
- `solo` - 单人
- `1girl` - 1女孩
- `1boy` - 1男孩
- `2girls` - 2女孩
- `multiple_girls` - 多女孩

## 创建字典的建议

### 1. 获取标签列表

可以从以下来源获取完整标签列表：
- Danbooru 标签数据库导出
- 模型配套的 `selected_tags.csv` 文件

### 2. 优先翻译高频标签

建议按标签使用频率排序，优先翻译最常用的标签。

### 3. 保持翻译一致性

- 同类标签使用一致的翻译风格
- 颜色类：`blue_eyes` → `蓝眼睛`，`red_eyes` → `红眼睛`
- 发型类：`long_hair` → `长发`，`short_hair` → `短发`

### 4. 处理特殊标签

- **角色名**：保留原名或使用官方译名
- **作品名**：使用官方中文名
- **专有名词**：根据上下文决定是否翻译

## 验证字典

上传前请确保：

1. **文件编码**：UTF-8（支持中文、日文等字符）
2. **列名正确**：第一行必须是 `name,translated_name,language_code`
3. **无空行**：避免文件中有空行
4. **语言代码有效**：使用两字母 ISO 639-1 代码

### 验证脚本示例

```python
import csv

def validate_dictionary(filepath):
    errors = []
    valid_count = 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        # 检查列名
        required = {'name', 'translated_name', 'language_code'}
        if not required.issubset(set(reader.fieldnames or [])):
            errors.append(f"Missing columns: {required - set(reader.fieldnames or [])}")
            return errors, 0
        
        for i, row in enumerate(reader, start=2):
            # 检查必填字段
            if not row['name'].strip():
                errors.append(f"Line {i}: Empty name")
                continue
            if not row['translated_name'].strip():
                errors.append(f"Line {i}: Empty translated_name")
                continue
            if len(row['language_code']) != 2:
                errors.append(f"Line {i}: Invalid language_code '{row['language_code']}'")
                continue
            
            valid_count += 1
    
    return errors, valid_count

# 使用
errors, count = validate_dictionary('my_translation.csv')
print(f"Valid entries: {count}")
if errors:
    print("Errors:")
    for e in errors[:10]:  # 只显示前10个错误
        print(f"  {e}")
```

## 使用翻译字典

1. 在 Piximoe 中打开 **设置 → 翻译设置**
2. 点击上传区域或拖拽 CSV 文件
3. 从可用语言中选择要显示的语言
4. 标签将显示为翻译后的名称

### 刷新翻译

如果导入新图片后添加了新标签，可以点击"刷新翻译"按钮来为新标签应用翻译。

## 贡献翻译

欢迎社区贡献翻译字典！你可以：

1. Fork 项目仓库
2. 在 `translations/` 目录下添加或更新翻译文件
3. 提交 Pull Request

### 命名建议

- `translations_zh.csv` - 中文翻译
- `translations_ja.csv` - 日文翻译
- `translations_multi.csv` - 多语言合集

## 常见问题

### Q: 为什么某些标签没有被翻译？

A: 可能的原因：
- 标签名称拼写与字典中的不匹配
- 该标签不在你的数据库中（只翻译已存在的标签）
- CSV 格式错误导致该行被跳过

### Q: 可以只翻译部分标签吗？

A: 可以。未翻译的标签会显示原始英文名称。

### Q: 如何更新翻译？

A: 重新上传更新后的 CSV 文件，然后重新选择语言即可。

### Q: 支持哪些字符？

A: 支持 UTF-8 编码的所有字符，包括中文、日文、韩文、emoji 等。

