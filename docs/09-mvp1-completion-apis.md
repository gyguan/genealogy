# 09. MVP1 补齐能力接口说明

本文件记录 MVP1 P0 验收闭环能力，覆盖导入草稿、来源附件、人物查重、审核 Diff、复杂关系、隐私脱敏和正式入谱准入。

## 1. 来源附件上传、下载与删除

前端入口：`基础数据管理 → 来源附件`。

### 上传附件

```http
POST /api/v1/sources/{sourceId}/attachments
Content-Type: multipart/form-data
Authorization: Bearer <token>

file=<binary>
```

### 查询来源附件

```http
GET /api/v1/sources/{sourceId}/attachments
```

### 下载附件

```http
GET /api/v1/source-attachments/{attachmentId}/content
Authorization: Bearer <token>
```

### 删除附件

```http
DELETE /api/v1/source-attachments/{attachmentId}
Authorization: Bearer <token>
```

删除采用软删除，保留审计和记录一致性。

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

### 模板下载

前端导入页提供“下载模板”，直接生成 `person-import-template.csv`。

### 字段映射

前端导入页支持配置字段列号，列号从 1 开始：

- 姓名列
- 性别列
- 代次列
- 字辈列
- 支派ID列
- 出生日期列
- 是否在世列

后端会转换为从 0 开始的字段索引执行解析。

### 导入前预览与查重

```http
POST /api/v1/clans/{clanId}/imports/persons/preview?branchId={branchId}&nameIndex=0&genderIndex=1&generationNoIndex=2&generationWordIndex=3&branchIdIndex=4&birthDateIndex=5&isLivingIndex=6
Content-Type: multipart/form-data
Authorization: Bearer <token>

file=<csv-or-xlsx>
```

返回每行解析结果、错误原因、疑似重复标识和重复候选数量。

### 确认导入

```http
POST /api/v1/clans/{clanId}/imports/persons.csv?branchId={branchId}&confirmDuplicates=true
Content-Type: multipart/form-data
Authorization: Bearer <token>

file=<csv-or-xlsx>
```

如果存在疑似重复人物且未设置 `confirmDuplicates=true`，后端会拒绝导入，要求用户先确认。

### 查询导入任务

```http
GET /api/v1/clans/{clanId}/imports
```

## 3. 人物新增前查重确认

前端所有 `POST /clans/{clanId}/persons` 的人物新增请求已统一接入查重确认。

后端规则：

- 同宗族
- 同姓名
- 支派、代次、字辈、出生日期命中时判定为疑似重复
- 未携带 `confirmDuplicate=true` 时拒绝创建

前端行为：

- 首次创建命中重复时弹出确认框
- 用户确认后自动携带 `confirmDuplicate=true` 重试一次

## 4. 人物查重接口

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

## 5. 审核中心内嵌字段级 Diff

前端入口：`审核中心`。

审核列表每条任务支持：

- 查看 Diff
- 通过
- 驳回

Diff 弹框展示字段级差异。

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

## 6. 复杂关系快捷入口

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

## 7. 在世人员字段级隐私脱敏

人物查询已接入隐私感知返回：

- 在世人员
- `privacyLevel=clan_only/private`
- 非当前宗族有效成员查看时

会隐藏出生日期、出生地、居住地、传记、墓葬、墓志等敏感字段。

## 8. 正式入谱准入规则

`/persons/search` 默认只返回 `official` 人物记录。

这保证族谱首页、人物检索等正式展示类入口默认不展示草稿数据。基础管理和建谱向导仍可使用宗族人物列表查看草稿，支撑编辑和审核前维护。

## 9. 后续 P1 可增强

- 导入字段自动识别。
- 附件预览和版本管理。
- 审核中心支持批量 Diff 对比。
- 复杂关系在建谱向导中做一步式创建亲属 + 创建关系。
- 更细颗粒度的角色字段权限策略。
