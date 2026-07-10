# Slice 8 来源资料库旧体验页清理说明

## 目标

在 Slice 7 已完成真实 `features/sources` 模块接入后，本 Slice 清理旧产品体验页中的来源资料库残留入口，避免用户在两个页面之间产生混淆。

## 清理范围

### 1. 旧来源资料库体验页

已从 `frontend/genealogy-web/src/features/experience/GenealogyExperiencePages.tsx` 中移除：

```text
SourceLibraryProductPage
CreateSourceModal
旧“新增来源资料”入口
旧“作为绑定候选”入口
体验页内置来源资料检索 UI
```

### 2. 导航入口

保留现有一级菜单，不新增菜单：

```text
sourceLibrary -> features/sources/SourceLibraryPage
sourceAttachments -> features/sources/SourceAttachmentPage
```

### 3. 过渡文案

已调整体验页中的来源资料提示：

- 首页：提示从左侧菜单进入独立“来源资料库”查看详情、附件和绑定审核。
- 修谱工作台：提示“来源资料库已独立”，不再引导使用旧体验页资料补齐入口。

## 保留能力

`features/experience` 仍保留以下产品化体验页：

```text
GenealogyHomePage
GenealogyTreeProductPage
PersonArchiveProductPage
EditingWorkspaceProductPage
ReviewCenterProductPage
CultureProductPage
```

这些页面继续用于产品演示和聚合信息展示，但不再内置来源资料库 CRUD 或绑定入口。

## 新接口残留核对

附件页已改为使用 Slice 5 新接口：

```text
GET    /api/v1/sources/{sourceId}/attachments
POST   /api/v1/sources/{sourceId}/attachments
GET    /api/v1/source-attachments/{attachmentId}/preview
GET    /api/v1/source-attachments/{attachmentId}/download
DELETE /api/v1/source-attachments/{attachmentId}
```

不再使用旧接口：

```text
/source-attachments/sources/{sourceId}
/source-attachments/{attachmentId}/content
```

## 验收标准

- `SourceLibraryProductPage` 不再被导出。
- `App.tsx` 不再从 `GenealogyExperiencePages` 引入旧来源资料库体验页。
- “来源资料库”菜单进入真实 `SourceLibraryPage`。
- “来源附件”菜单进入真实 `SourceAttachmentPage`。
- 体验页只保留来源数量提示，不再承载来源资料库操作。

## 后续建议

如果后续确定 `features/experience` 中其他产品体验页也不再使用，建议单独开清理 Slice 做整体退役，避免与来源资料库清理混在一起。
