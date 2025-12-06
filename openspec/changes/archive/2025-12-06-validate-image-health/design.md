# Image Health Checking Design

## System Architecture Overview

### Health Status Model
每个图片文件将有以下健康状态：
- **HEALTHY**: 原图和缩略图都存在且可读
- **THUMBNAIL_MISSING**: 缩略图丢失，原图存在
- **ORIGINAL_MISSING**: 原图丢失，缩略图存在
- **BOTH_MISSING**: 原图和缩略图都丢失
- **ORIGINAL_CORRUPTED**: 原图损坏，缩略图可能存在
- **THUMBNAIL_CORRUPTED**: 缩略图损坏，原图可能存在

### Backend Architecture

#### 1. Health Check Service
```rust
// 新增 health_check.rs 模块
pub struct ImageHealthChecker {
    thumbnail_dir: PathBuf,
    concurrent_limit: usize,
}

impl ImageHealthChecker {
    pub async fn check_all_files_health(&self) -> HealthCheckResult;
    pub async fn check_file_health(&self, file_hash: &str, original_path: &str) -> ImageHealthStatus;
    pub fn is_thumbnail_healthy(&self, file_hash: &str) -> bool;
    pub fn is_original_healthy(&self, original_path: &str) -> bool;
}
```

#### 2. Database Schema Changes
利用现有的 `is_missing` 字段，可能需要添加：
```sql
-- 可选：添加缩略图健康状态字段
ALTER TABLE Files ADD COLUMN thumbnail_health INTEGER DEFAULT 0;
-- 0 = healthy, 1 = missing, 2 = corrupted
```

#### 3. New Tauri Commands
```rust
#[tauri::command]
pub async fn check_all_images_health() -> HealthCheckResult;

#[tauri::command]
pub async fn get_files_by_health_status(health_status: ImageHealthStatus) -> Vec<FileRecord>;

#[tauri::command]
pub async fn regenerate_missing_thumbnails_health() -> ThumbnailRegenerationResult;
```

#### 4. Event System Extensions
```rust
// 新增健康检查事件
"health_check_progress" -> { current, total, file_hash, status }
"health_check_complete" -> { total_checked, issues_found }
"thumbnail_regeneration_complete" -> { regenerated_count }
```

### Frontend Architecture

#### 1. Health State Management
```typescript
// 新增健康状态类型
export type ImageHealthStatus =
  | "healthy"
  | "thumbnail_missing"
  | "original_missing"
  | "both_missing"
  | "original_corrupted"
  | "thumbnail_corrupted";

// 扩展 FileRecord 类型
export interface FileRecord {
  // ... 现有字段
  health_status?: ImageHealthStatus;
  thumbnail_health?: number; // 0=healthy, 1=missing, 2=corrupted
}
```

#### 2. New Hooks
```typescript
// src/lib/hooks/useImageHealth.ts
export function useImageHealth() {
  return useQuery({
    queryKey: ["image-health"],
    queryFn: () => invoke<HealthCheckResult>("check_all_images_health"),
  });
}

export function useHealthStatusFiles(healthStatus: ImageHealthStatus) {
  return useQuery({
    queryKey: ["files-by-health", healthStatus],
    queryFn: () => invoke<FileRecord[]>("get_files_by_health_status", { healthStatus }),
  });
}
```

#### 3. UI Components Enhancement

##### ImageCard Component Changes
```typescript
// 添加错误状态指示器
{health_status === 'original_missing' && (
  <div className="absolute top-2 right-2">
    <ErrorIcon tooltip="Original image is missing" />
  </div>
)}

// 错误兜底图显示
{(health_status === 'both_missing' || health_status === 'original_missing') && (
  <ErrorFallbackImage />
)}
```

##### ImageGrid Component Changes
- 支持显示错误状态标识
- 错误图片的特殊样式处理
- 保持现有的虚拟滚动性能

##### New Filter Component
```typescript
// src/components/gallery/HealthStatusFilter.tsx
export function HealthStatusFilter() {
  const { data: healthStats } = useImageHealth();

  // 只在有丢失原图时显示筛选器
  if (!healthStats?.has_missing_originals) {
    return null;
  }

  return (
    <FilterButton
      onClick={() => filterByHealthStatus('original_missing')}
      label="Missing Originals"
      count={healthStats.missing_original_count}
    />
  );
}
```

### Performance Considerations

#### 1. Incremental Health Checking
```rust
// 只检查最近修改或有问题的文件
pub async def incremental_health_check(last_check_time: i64) -> HealthCheckResult {
    let files_to_check = sqlx::query!(
        "SELECT * FROM Files WHERE date_imported > ? OR is_missing = 1",
        last_check_time
    )
    .fetch_all(&pool)
    .await?;

    // 批量检查这些文件
}
```

#### 2. Batch Processing
- 使用 Tokio 的 `FuturesUnordered` 进行并发处理
- 限制并发数量避免资源耗尽
- 进度报告每10个文件一次

#### 3. Caching Strategy
- 健康检查结果缓存1小时
- 增量检查只处理有变化的文件
- 文件修改时间比较避免重复检查

### Error Handling Strategy

#### 1. Graceful Degradation
```typescript
// 错误处理优先级
1. 显示缩略图（如果存在）
2. 显示原图（如果缩略图不存在但原图存在）
3. 显示错误兜底图（如果都不存在）
4. 显示错误标识（提供用户反馈）
```

#### 2. User Feedback
- Tooltip提示具体错误原因
- 非阻塞的错误通知
- 提供修复建议（如重新导入）

#### 3. Recovery Mechanisms
```rust
// 自动恢复机制
pub async fn attempt_recovery(file_hash: &str) -> RecoveryResult {
    // 1. 尝试重新生成缩略图
    // 2. 尝试查找原始文件在备份位置
    // 3. 更新数据库状态
}
```

### Integration with Existing Systems

#### 1. Thumbnail System Integration
- 复用现有的 `generate_thumbnail` 函数
- 扩展 `regenerate_missing_thumbnails` 功能
- 集成健康检查到现有的缩略图生成流程

#### 2. File Management Integration
- 利用现有的 `is_missing` 字段
- 扩展文件导入流程进行健康检查
- 集成到现有的搜索和筛选系统

#### 3. Event System Integration
- 复用现有的进度事件格式
- 保持UI进度显示的一致性
- 利用现有的错误处理机制

### Security and Privacy

#### 1. Local-First Approach
- 所有健康检查在本地进行
- 不上传任何文件信息到云端
- 完全符合项目的隐私优先理念

#### 2. File Safety
- 只读取文件元数据进行健康检查
- 不修改原始文件内容
- 安全的错误处理避免文件损坏

#### 3. Performance Isolation
- 健康检查在独立线程池中执行
- 不影响主要的文件操作性能
- 可取消的长时间运行操作