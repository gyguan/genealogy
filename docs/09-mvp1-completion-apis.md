# 09. MVP1 补齐能力接口说明

本文件记录 MVP1 后续补齐的关键能力，覆盖导入草稿、来源附件和人物查重。

## 1. 来源附件上传

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

## 2. 人物 CSV 草稿导入

MVP1 当前先支持 CSV 导入，导入结果进入 `draft` 草稿状态，不直接进入正式谱库。

### CSV 字段顺序

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

file=<csv>
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

## 4. 仍需继续增强

- Excel `.xlsx` 解析：当前先支持 CSV，后续可引入 Apache POI 支持真正 Excel。
- 前端导入页面：当前已具备后端 API，前端可在“修谱工作台”或“建谱向导”新增上传入口。
- 审核字段级 Diff：当前审核链路仍需继续补字段级变更对比。
- 复杂关系 UI：后端已允许扩展关系类型，前端向导仍需进一步补继嗣、出嗣、养父母等快捷入口。
