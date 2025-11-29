# 推理参数分析和实现问题总结

## 从官方代码提取的参数

### 1. 预处理参数

#### 当前实现问题
- ❌ **缺少正方形填充**：直接 `resize_exact`，没有先填充到正方形
- ❌ **缺少 BGR 转换**：只做了 RGB，没有转换为 BGR 格式（`[:, :, ::-1]`）
- ❌ **插值方法不一致**：使用 Lanczos3，官方使用 BICUBIC

#### 官方实现流程
1. 图像转换为 RGBA（如果需要）
2. 合成到白色背景 (255, 255, 255)
3. 转换为 RGB
4. **填充到正方形**（居中，白色背景）
5. **Resize 到目标尺寸**（使用 BICUBIC 插值）
6. 转换为 numpy array (float32)
7. **RGB 转 BGR**（`image_array[:, :, ::-1]`）
8. 归一化到 [0.0, 1.0]

#### 需要修复的代码位置
- `src-tauri/src/ai/tagger.rs` 的 `preprocess_image()` 函数

### 2. 后处理参数

#### 当前实现问题
- ❌ **统一阈值**：使用 0.50 作为所有标签的阈值，没有区分类型
- ❌ **缺少标签分类**：没有区分 rating、general、character 标签
- ❌ **缺少 MCut 算法**：没有实现 MCut 阈值算法
- ❌ **标签类型处理不完整**：只排除了 category 9，没有分别处理 category 0 和 4

#### 官方实现参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `general_threshold` | 0.35 | 通用标签（category 0）的置信度阈值 |
| `character_threshold` | 0.85 | 角色标签（category 4）的置信度阈值 |
| `general_mcut_enabled` | false | 是否对通用标签使用 MCut 算法 |
| `character_mcut_enabled` | false | 是否对角色标签使用 MCut 算法 |
| `max_tags` | 50 | 最大返回标签数量 |

#### 标签分类规则
- **Rating 标签** (category 9)：使用 argmax 选择置信度最高的一个
- **General 标签** (category 0)：使用 `general_threshold` 或 MCut 阈值过滤
- **Character 标签** (category 4)：使用 `character_threshold` 或 MCut 阈值过滤（MCut 结果最小 0.15）

#### MCut 算法说明
MCut (Maximum Cut Thresholding) 算法：
1. 对预测概率进行降序排序
2. 计算相邻概率的差值
3. 找到最大差值的位置
4. 阈值设为相邻两个概率的中点：`(sorted_probs[t] + sorted_probs[t + 1]) / 2`
5. 对于 character 标签，使用 `max(0.15, mcut_threshold)`

#### 需要修复的代码位置
- `src-tauri/src/ai/tagger.rs` 的 `classify_image()` 函数
- 需要添加 MCut 算法实现
- 需要分离标签分类逻辑

### 3. 配置参数结构

```rust
pub struct InferenceConfig {
    pub general_threshold: f32,        // 默认 0.35
    pub character_threshold: f32,      // 默认 0.85
    pub general_mcut_enabled: bool,    // 默认 false
    pub character_mcut_enabled: bool, // 默认 false
    pub max_tags: usize,               // 默认 50
}
```

## 实现优先级

### 高优先级（必须修复）
1. ✅ **预处理修复**：添加正方形填充和 BGR 转换
2. ✅ **后处理修复**：区分标签类型，使用不同阈值
3. ✅ **配置管理**：实现推理参数配置的存储和加载

### 中优先级（重要功能）
4. ✅ **MCut 算法**：实现 MCut 阈值算法
5. ✅ **配置 UI**：在设置面板中添加参数调整界面

### 低优先级（增强功能）
6. ✅ **调试功能**：在调试界面中支持参数调整

## 测试建议

### 预处理测试
- 测试不同宽高比的图像（横向、纵向、正方形）
- 验证填充是否正确（居中，白色背景）
- 验证 BGR 转换是否正确
- 对比修复前后的标签结果

### 后处理测试
- 测试不同阈值组合的效果
- 验证 MCut 算法是否正确计算阈值
- 验证标签分类是否正确（rating/general/character）
- 对比修复前后的标签结果

### 配置测试
- 测试配置的保存和加载
- 测试配置的持久化（应用重启后）
- 测试默认配置的应用
- 测试配置变更后的实时生效

## 参考代码

### 官方预处理代码（Python）
```python
def prepare_image(self, image):
    target_size = self.model_target_size
    
    canvas = Image.new("RGBA", image.size, (255, 255, 255))
    canvas.alpha_composite(image)
    image = canvas.convert("RGB")
    
    # Pad image to square
    image_shape = image.size
    max_dim = max(image_shape)
    pad_left = (max_dim - image_shape[0]) // 2
    pad_top = (max_dim - image_shape[1]) // 2
    
    padded_image = Image.new("RGB", (max_dim, max_dim), (255, 255, 255))
    padded_image.paste(image, (pad_left, pad_top))
    
    # Resize
    if max_dim != target_size:
        padded_image = padded_image.resize(
            (target_size, target_size),
            Image.BICUBIC,
        )
    
    # Convert to numpy array
    image_array = np.asarray(padded_image, dtype=np.float32)
    
    # Convert PIL-native RGB to BGR
    image_array = image_array[:, :, ::-1]
    
    return np.expand_dims(image_array, axis=0)
```

### 官方 MCut 算法（Python）
```python
def mcut_threshold(probs):
    sorted_probs = probs[probs.argsort()[::-1]]
    difs = sorted_probs[:-1] - sorted_probs[1:]
    t = difs.argmax()
    thresh = (sorted_probs[t] + sorted_probs[t + 1]) / 2
    return thresh
```

### 官方后处理代码（Python）
```python
# Rating tags: argmax
ratings_names = [labels[i] for i in self.rating_indexes]
rating = dict(ratings_names)

# General tags: threshold or MCut
general_names = [labels[i] for i in self.general_indexes]
if general_mcut_enabled:
    general_probs = np.array([x[1] for x in general_names])
    general_thresh = mcut_threshold(general_probs)
general_res = [x for x in general_names if x[1] > general_thresh]

# Character tags: threshold or MCut (min 0.15)
character_names = [labels[i] for i in self.character_indexes]
if character_mcut_enabled:
    character_probs = np.array([x[1] for x in character_names])
    character_thresh = mcut_threshold(character_probs)
    character_thresh = max(0.15, character_thresh)
character_res = [x for x in character_names if x[1] > character_thresh]
```

