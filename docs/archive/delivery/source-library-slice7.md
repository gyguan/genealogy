# Slice 7 前端独立 Sources 模块说明

## 目标

将来源资料库从产品体验页升级为真实业务页面，串联 Slice 2-6 已完成的后端能力：

```text
来源列表搜索 -> 来源详情 -> 引用情况 -> 附件管理 -> 绑定审核入口
```

本 Slice 不新增一级菜单，不改前端整体导航结构，仅将现有“来源资料库”菜单切换为真实 `features/sources` 页面。

## 页面入口

```text
frontend/genealogy-web/src/features/sources/SourceLibraryPage.tsx
```

`App.tsx` 中：

```text
sourceLibrary -> SourceLibraryPage
sourceAttachments -> SourceAttachmentPage
```

## 服务封装

```text
frontend/genealogy-web/src/features/sources/sourceLibraryService.ts
```

封装接口：

```text
GET    /api/v1/clans/{clanId}/sources
GET    /api/v1/sources/{sourceId}
GET    /api/v1/sources/{sourceId}/bindings
GET    /api/v1/sources/{sourceId}/attachments
POST   /api/v1/sources/{sourceId}/attachments
GET    /api/v1/source-attachments/{attachmentId}/preview
GET    /api/v1/source-attachments/{attachmentId}/download
DELETE /api/v1/source-attachments/{attachmentId}
POST   /api/v1/clans/{clanId}/source-bindings/revisions
POST   /api/v1/source-bindings/{bindingId}/replace-revision
POST   /api/v1/source-bindings/{bindingId}/delete-revision
```

## 页面能力

### 1. 来源列表

- 支持关键词、类型、状态、可见范围、是否有附件、是否有引用筛选
- 使用分页表格展示来源资料
- 不直接展示技术字段
- 点击来源名称进入详情 Drawer

### 2. 来源详情

详情 Drawer 使用 `Descriptions + Tabs`：

- 基础信息：来源类型、状态、可信度、可见范围、提供者、书名、卷册页码、摘录、说明
- 引用情况：展示后端解析后的 `targetDisplayName / targetBranchName / targetSummary`
- 附件：上传、预览、下载、删除
- 绑定审核入口：新增绑定审核，替换/删除从引用行内发起

### 3. 引用情况

引用对象展示业务名称，不展示裸 ID：

```text
人物姓名
关系摘要
支派名称
字辈名称
```

若后端返回为空，页面展示“待维护对象名称 / 暂无对象摘要”。

### 4. 附件管理

附件列表基于 Slice 5 新接口：

- 文件名
- 文件类型
- 文件大小
- 敏感级别
- 上传时间
- 预览/下载/删除操作

前端不展示：

```text
storedFilename
storagePath
checksum
```

### 5. 绑定审核入口

新增绑定审核使用 `source_binding_revision` 流程。

当前前端目标选择器支持：

```text
人物
支派
宗族
```

关系、字辈等对象的真实名称展示已由后端支持；前端选择器待后续对应对象检索接口完善后继续扩展。

## 后续待办

1. 同步 `docs/api/openapi.json` 并执行：

```bash
cd frontend/genealogy-web
npm run api:generate
npm run typecheck
```

2. 与审核中心打通：提交绑定审核后跳转/定位对应审核任务。
3. 补齐关系、字辈目标对象选择器。
4. 增加来源新增/编辑表单，将来源创建和状态审核也纳入页面闭环。
