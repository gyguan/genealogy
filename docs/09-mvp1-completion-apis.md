# 09. MVP1 补齐能力接口说明

本文件记录 MVP1 后续补齐的关键能力，覆盖导入草稿、来源附件、人物查重、审核 Diff 和复杂关系快捷入口。

## 1. 来源附件上传

前端入口：`基础数据管理 → 来源附件`。

### 上传附件

```http
POST /api/v1/sources/{sourceId}/attachments
Content-Type: multipart/form-data
Authorization: Bearer <token>

file=<binary>
```

返回字段：

| 字段 | 说明 |
|---|---|
| id | 附件ID |
| sourceId | 来源ID |
| clanId | 宗族ID |
| originalFilename | 原始文件名 |
| storedFilename | 系统存储文件名 |
| contentType | 文件类型 |
| fileSize | 文件大小 |
| storagePath | 本地存储路径 |
| checksum | SHA-256 校验值 |
| uploadStatus | 上传状态 |
| createdAt | 上传时间 |

### 查询来源附件

```http
GET /api/v1/sources/{sourceId}/attachments
```

## 2. 人物 CSV / XLSX 草稿导入

前端入口：`基础数据管理 → 导入管理`。

MVP1 支持 CSV 和 XLSX 导入，导入结果进入 `draft` 草稿状态，不直接进入正式谱库。后端根据上传文件名后缀自动识别 `.csv` 或 `.xlsx`。

### 字段顺序

```text
姓名,性别,代次,字辈,支派ID,出生日期,是否在世
```

示例：

```csv
姓名,性别,代次,字辈,支派ID,出生日期,是否在世
张明远,male,1,明,1001,1940-01-01,否
张承志,male,2,承,1001,1965-05-12,是
```

### 上传导入

```http
POST /api/v1/clans/{clanId}/imports/persons.csv?branchId={branchId}
Content-Type: multipart/form-data
Authorization: Bearer <token>

file=<csv-or-xlsx>
```

导入任务会记录：

| 字段 | 说明 |
|---|---|
| totalCount | 总行数，不含表头和空行 |
| successCount | 成功导入人数 |
| failureCount | 失败行数 |
| status | completed / partial_completed / failed |
| errors | 失败行明细 |

### 查询导入任务

```http
GET /api/v1/clans/{clanId}/imports
```

## 3. 人物查重

### 请求

```http
POST /api/v1/persons/check-duplicate
Content-Type: application/json
```

```json
{
  "clanId": 1,
  "branchId": 1001,
  "name": "张承志",
  "generationNo": 2,
  "generationWord": "承",
  "birthDate": "1965-05-12"
}
```

### 返回

```json
{
  "duplicated": true,
  "candidateCount": 1,
  "candidates": [],
  "message": "发现疑似重复人物，请确认后再入谱"
}
```

## 4. 审核字段级 Diff

前端入口：`基础数据管理 → 审核Diff`。

### 按审核任务查询

```http
GET /api/v1/review-tasks/{reviewTaskId}/diff
```

### 按修订记录查询

```http
GET /api/v1/revisions/{revisionId}/diff
```

返回字段：

| 字段 | 说明 |
|---|---|
| beforeData | 变更前 JSON |
| afterData | 变更后 JSON |
| fields | 字段级差异 |
| fields.changeType | added / removed / modified |

## 5. 复杂关系快捷入口

前端入口：`基础数据管理 → 关系 → 新建关系`。

已增加快捷模板：

- 亲生父亲
- 亲生母亲
- 配偶
- 养父
- 养母
- 养子女
- 继嗣
- 出嗣

模板会自动设置关系类型、关系标签、是否世系关系、是否血缘关系。保存前仍可点击“冲突预检”。

## 6. 后续可继续增强

- 导入模板下载。
- 导入前预览和字段映射。
- 附件下载和删除。
- 审核中心内嵌 Diff 弹框，而不是单独输入任务 ID 查询。
- 复杂关系在建谱向导中做一步式创建亲属 + 创建关系。
