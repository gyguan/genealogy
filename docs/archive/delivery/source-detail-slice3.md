# Slice 3 来源详情聚合 API 契约补充

本文件补充 `docs/api/openapi.json` 中来源详情接口的聚合响应语义，后续执行 `npm run api:generate` 前，需要将以下字段同步到 OpenAPI schema。

## 接口

```text
GET /api/v1/sources/{sourceId}
```

## 响应 data 结构

```json
{
  "source": {},
  "permissions": {},
  "bindingSummaries": [],
  "attachmentSummaries": []
}
```

## source

复用 `SourceResponse`，包含来源基础信息与聚合计数：

```text
id
clanId
sourceName
sourceType
providerName
bookTitle
volumeNo
pageNo
sourceDate
excerpt
description
verificationStatus
confidenceLevel
privacyLevel
sensitiveLevel
bindingCount
attachmentCount
createdAt
updatedAt
```

## permissions

```text
canEdit
canDelete
canBind
canSubmitReview
canUploadAttachment
canPreviewAttachment
canDownloadAttachment
```

权限必须由后端根据当前用户、来源状态和绑定情况计算，前端只负责展示按钮。

## bindingSummaries

最多返回最近 5 条来源引用摘要：

```text
id
targetType
targetId
targetDisplayName
targetBranchName
targetSummary
bindingReason
excerpt
confidenceLevel
bindingStatus
createdBy
createdAt
```

Slice 4 已补齐 `targetDisplayName / targetBranchName / targetSummary` 的真实业务对象解析能力。若目标对象不存在、已删除或不属于当前宗族，后端返回 `targetType:targetId` 作为兜底展示名。

## attachmentSummaries

最多返回最近 5 条有效附件摘要：

```text
id
fileName
fileType
fileSize
uploadStatus
previewAllowed
downloadAllowed
uploadedBy
uploadedAt
```

不得返回 `storagePath`、`checksum`、`storedFilename` 等技术字段。

## 状态与按钮规则

| 按钮 | 后端计算规则 |
|---|---|
| canEdit | 有 `source:update` 权限，且来源为 `draft/rejected` |
| canDelete | 有 `source:delete` 权限，且来源为 `draft/rejected`，且无绑定 |
| canBind | 有 `source:bind` 权限，且来源为 `official` |
| canSubmitReview | 有 `source:submit_review` 或 `source:update` 权限，且来源为 `draft/rejected` |
| canUploadAttachment | 有 `attachment:upload` 权限 |
| canPreviewAttachment | 有 `attachment:preview/view/download` 任一权限 |
| canDownloadAttachment | 有 `attachment:download` 权限 |
