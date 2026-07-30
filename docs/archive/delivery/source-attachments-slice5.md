# Slice 5 来源附件 API 契约补充

本文件补充来源附件 API 的响应语义。后续执行 `npm run api:generate` 前，需要将本文件中的字段同步到 `docs/api/openapi.json`。

## 接口清单

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/sources/{sourceId}/attachments` | 分页查询来源附件 |
| POST | `/api/v1/sources/{sourceId}/attachments` | 上传来源附件，`multipart/form-data` |
| GET | `/api/v1/source-attachments/{attachmentId}/preview` | 预览附件，返回文件流 |
| GET | `/api/v1/source-attachments/{attachmentId}/download` | 下载附件，返回文件流 |
| DELETE | `/api/v1/source-attachments/{attachmentId}` | 删除附件，软删除 |

## 上传参数

`POST /api/v1/sources/{sourceId}/attachments`

| 参数 | 类型 | 说明 |
|---|---|---|
| file | file | 必填，最大 20MB |
| privacyLevel | string | 可选，默认 `clan_only`。取值：`public / clan_only / branch_only / relatives_only / private / sealed` |
| sensitiveLevel | string | 可选，默认 `normal`。取值：`normal / sensitive / highly_sensitive` |

## 附件响应字段

`SourceAttachmentResponse`：

```text
id
sourceId
clanId
fileName
fileType
fileSize
privacyLevel
sensitiveLevel
uploadStatus
previewAllowed
downloadAllowed
uploadedBy
uploadedAt
```

不得返回以下技术字段：

```text
storedFilename
storagePath
checksum
```

## 权限规则

| 操作 | 权限 |
|---|---|
| 列表 | `source:view` |
| 上传 | `source:view` + `attachment:upload` |
| 预览 | `attachment:preview` 或 `attachment:view` 或 `attachment:download` |
| 高敏附件预览 | `attachment:download` |
| 下载 | `attachment:download` |
| 删除 | `attachment:delete` |

## 审计规则

以下动作必须写入 `operation_log`：

```text
source_attachment_upload
source_attachment_preview
source_attachment_download
source_attachment_delete
```

审计 detail 至少记录：

```text
sourceId
privacyLevel
sensitiveLevel
```

预览和下载不得把文件内容写入审计日志。

## 存储说明

当前 Slice 5 使用本地文件系统作为 MVP 存储实现，默认目录：

```text
data/source-attachments
```

可通过配置覆盖：

```properties
genealogy.source-attachment.storage-root=/data/genealogy/source-attachments
```

后续可替换为对象存储，但 API 不应变化。
