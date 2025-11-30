# Move Clear Database to Settings Panel

## Summary
将清空数据库功能从通知中心移动到设置面板，并简化确认交互，只需要输入英文确认文本即可。

## Why
清空数据库是一个重要的管理功能，更适合放在设置面板中而不是通知中心。通知中心主要用于显示系统通知，而设置面板是管理功能的集中位置。同时，简化确认文本（从包含中英文的长文本改为仅英文）可以提升用户体验，减少输入负担。

## What Changes
1. 从通知中心移除清空数据库按钮和相关代码
2. 在设置面板中创建新的数据库管理页面（Database Settings Page）
3. 简化确认文本为仅英文：`CLEAR_ALL_DATA_PERMANENTLY`（原为 `CLEAR_ALL_DATA_PERMANENTLY_清空所有数据_永久删除`）
4. 更新后端和前端代码以使用新的确认文本

