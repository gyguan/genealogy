# 07. 接口模型设计

## API 规范

```text
接口风格：RESTful API
数据格式：JSON
接口前缀：/api/v1
认证方式：JWT / Session Token
```

## 接口分组

```text
/api/v1/auth               认证登录
/api/v1/clans              宗族管理
/api/v1/branches           支派管理
/api/v1/generations        字辈管理
/api/v1/persons            人物档案
/api/v1/relationships      人物关系
/api/v1/sources            资料来源
/api/v1/source-bindings    来源绑定
/api/v1/source-attachments 来源附件
/api/v1/reviews            审核中心
/api/v1/workbench          修谱工作台
/api/v1/tree               世系图
/api/v1/imports            导入管理
/api/v1/exports            导出管理
/api/v1/members            成员权限
/api/v1/logs               操作日志
/api/v1/culture-items      文化资料
/api/v1/migration-events   迁徙事件
/api/v1/culture-sites      文化场所
```

## 通用响应

```json
{
  "success": true,
  "code": "SUCCESS",
  "message": "操作成功",
  "data": {},
  "traceId": "20260625153000001"
}
```

分页列表统一返回：

```json
{
  "items": [],
  "page": {
    "pageNo": 1,
    "pageSize": 20,
    "totalElements": 100,
    "totalPages": 5
  }
}
```

## 核心接口

### 宗族

```text
POST /api/v1/clans
GET  /api/v1/clans/{clanId}
PUT  /api/v1/clans/{clanId}
GET  /api/v1/clans/{clanId}/statistics
```

### 支派

```text
POST   /api/v1/clans/{clanId}/branches
GET    /api/v1/clans/{clanId}/branches/tree
GET    /api/v1/branches/{branchId}
PUT    /api/v1/branches/{branchId}
DELETE /api/v1/branches/{branchId}
```

### 字辈

```text
POST /api/v1/clans/{clanId}/generation-schemes
PUT  /api/v1/generation-schemes/{schemeId}/words
GET  /api/v1/clans/{clanId}/generation-schemes
POST /api/v1/generations/validate
```

### 人物

```text
POST   /api/v1/clans/{clanId}/persons
GET    /api/v1/clans/{clanId}/persons
GET    /api/v1/persons/{personId}
PUT    /api/v1/persons/{personId}
DELETE /api/v1/persons/{personId}
POST   /api/v1/persons/{personId}/submit-review
POST   /api/v1/persons/check-duplicate
```

### 关系

```text
POST   /api/v1/relationships
GET    /api/v1/persons/{personId}/relationships
PUT    /api/v1/relationships/{relationshipId}
DELETE /api/v1/relationships/{relationshipId}
POST   /api/v1/relationships/validate
```

## 来源资料库接口

来源资料库是独立业务模块，接口必须支持搜索、维护、查看详情、附件管理、引用情况和审核接入。

### 来源列表与搜索

```text
GET /api/v1/clans/{clanId}/sources
```

查询参数：

| 参数 | 说明 |
|---|---|
| keyword | 搜索来源名称、提供者、书名、卷号、页码、摘录、说明 |
| sourceType | 来源类型 |
| verificationStatus | 来源状态 |
| privacyLevel | 隐私级别 |
| targetType | 引用对象类型 |
| hasAttachment | 是否有附件 |
| hasBinding | 是否已被引用 |
| pageNo | 页码 |
| pageSize | 每页数量 |
| sort | 排序，例如 `updatedAt,desc` |

响应字段必须包含：

```json
{
  "id": 1,
  "sourceName": "张氏族谱卷一",
  "sourceType": "genealogy_book",
  "providerName": "修谱委员会",
  "bookTitle": "张氏族谱",
  "volumeNo": "卷一",
  "pageNo": "12",
  "excerpt": "原文摘录",
  "verificationStatus": "official",
  "privacyLevel": "clan_only",
  "sensitiveLevel": "normal",
  "confidenceLevel": "high",
  "bindingCount": 86,
  "attachmentCount": 2,
  "createdAt": "2026-07-10T10:00:00",
  "updatedAt": "2026-07-10T10:00:00"
}
```

### 新增来源

```text
POST /api/v1/clans/{clanId}/sources
```

请求：

```json
{
  "sourceName": "张氏族谱卷一",
  "sourceType": "genealogy_book",
  "providerName": "修谱委员会",
  "bookTitle": "张氏族谱",
  "volumeNo": "卷一",
  "pageNo": "12",
  "sourceDate": "清光绪年间",
  "excerpt": "原文摘录",
  "description": "资料说明",
  "confidenceLevel": "high",
  "privacyLevel": "clan_only",
  "sensitiveLevel": "normal",
  "submitReview": false
}
```

规则：

1. 新增默认状态为 `draft`。
2. `submitReview=true` 时保存后创建审核任务。
3. 前端不得要求用户填写来源 ID、宗族 ID 等技术字段。

### 来源详情

```text
GET /api/v1/sources/{sourceId}
```

详情响应需要聚合返回当前用户权限，避免前端自行判断关键操作：

```json
{
  "id": 1,
  "sourceName": "张氏族谱卷一",
  "sourceType": "genealogy_book",
  "verificationStatus": "official",
  "privacyLevel": "clan_only",
  "sensitiveLevel": "normal",
  "confidenceLevel": "high",
  "bindingCount": 86,
  "attachmentCount": 2,
  "permissions": {
    "canEdit": true,
    "canDelete": false,
    "canBind": true,
    "canSubmitReview": false,
    "canUploadAttachment": true,
    "canPreviewAttachment": true,
    "canDownloadAttachment": false
  }
}
```

### 编辑与删除来源

```text
PUT    /api/v1/sources/{sourceId}
DELETE /api/v1/sources/{sourceId}
POST   /api/v1/sources/{sourceId}/submit-review
```

规则：

1. `draft` 和 `rejected` 来源可由有权限用户直接编辑。
2. `official` 来源关键字段修改必须走审核。
3. `official` 来源不建议物理删除，应走归档或审核流。
4. 删除有绑定关系的来源必须拒绝或进入解绑审核流程。

### 来源附件

```text
GET    /api/v1/sources/{sourceId}/attachments
POST   /api/v1/sources/{sourceId}/attachments
GET    /api/v1/source-attachments/{attachmentId}/content?mode=preview
GET    /api/v1/source-attachments/{attachmentId}/content?mode=download
DELETE /api/v1/source-attachments/{attachmentId}
```

规则：

1. 附件预览和下载必须由后端鉴权。
2. 敏感附件下载必须写操作日志。
3. 附件列表不返回 `storagePath`、`checksum` 等普通用户不需要的技术字段。
4. 删除附件优先软删除。

### 来源引用情况

```text
GET /api/v1/sources/{sourceId}/bindings
```

查询参数：

| 参数 | 说明 |
|---|---|
| targetType | person / relationship / branch / clan / generation_word / culture_item / migration_event / culture_site |
| pageNo | 页码 |
| pageSize | 每页数量 |

响应：

```json
{
  "id": 1,
  "sourceId": 100,
  "sourceName": "张氏族谱卷一",
  "sourceType": "genealogy_book",
  "targetType": "person",
  "targetId": 200,
  "targetDisplayName": "张某某",
  "targetBranchName": "长沙支",
  "targetSummary": "第 20 世，字家某",
  "bindingReason": "老谱第3卷第12页记载",
  "excerpt": "谱文摘录",
  "confidenceLevel": "high",
  "bindingStatus": "official",
  "createdByName": "主编",
  "createdAt": "2026-07-10T10:00:00"
}
```

### 来源绑定

```text
POST   /api/v1/clans/{clanId}/source-bindings
DELETE /api/v1/source-bindings/{bindingId}
POST   /api/v1/source-bindings/{bindingId}/submit-review
GET    /api/v1/source-bindings/target/{targetType}/{targetId}?clanId={clanId}
```

`/api/v1/clans/{clanId}/source-links` 为历史兼容入口，新代码统一使用 `/api/v1/clans/{clanId}/source-bindings`。

创建来源绑定请求：

```json
{
  "sourceId": 1,
  "targetType": "culture_item",
  "targetId": 1001,
  "bindingReason": "老谱第3卷第12页记载",
  "excerpt": "谱文摘录",
  "confidenceLevel": "high",
  "submitReview": true
}
```

规则：

1. 不允许跨宗族绑定。
2. 不允许重复绑定。
3. 正式人物、关系、支派、字辈和文化对象的来源绑定应进入审核。
4. 只有 `official` 来源可以成为正式证据。
5. 查询绑定对象时返回业务名称，前端不得直接展示技术 ID。
6. `culture_item`、`migration_event`、`culture_site` 的运行时绑定校验由后续文化实现 Issue 完成。

### 审核

```text
GET  /api/v1/reviews/tasks
GET  /api/v1/reviews/tasks/{reviewTaskId}
POST /api/v1/reviews/tasks/{reviewTaskId}/approve
POST /api/v1/reviews/tasks/{reviewTaskId}/reject
GET  /api/v1/reviews/my-submissions
```

审核对象类型包含：

```text
source
source_binding
source_attachment
culture_item
migration_event
culture_site
```

### 修谱工作台

修谱工作台用于组织“导入异常、审核退回、资料缺失、字辈/代次不一致、关系冲突、疑似重复”等修谱问题。工作台只负责发现、分派、处理和提交审核，不直接执行审核通过/驳回。

```text
GET  /api/v1/workbench/summary?clanId={clanId}&branchId={branchId}
GET  /api/v1/workbench/tasks?clanId={clanId}&type={type}&status={status}&risk={risk}&assignee={assignee}&pageNo={pageNo}&pageSize={pageSize}
GET  /api/v1/workbench/tasks/{taskId}
POST /api/v1/workbench/tasks/{taskId}/assign
POST /api/v1/workbench/tasks/{taskId}/resolve
POST /api/v1/workbench/tasks/{taskId}/ignore
POST /api/v1/workbench/tasks/{taskId}/submit-review
GET  /api/v1/workbench/checks/duplicates?clanId={clanId}&branchId={branchId}
GET  /api/v1/workbench/checks/relationship-conflicts?clanId={clanId}&branchId={branchId}
GET  /api/v1/workbench/checks/source-missing?clanId={clanId}&branchId={branchId}
GET  /api/v1/workbench/checks/generation-mismatch?clanId={clanId}&branchId={branchId}
```

当前 P1/P2 阶段只实现只读 `summary` 和 `tasks`。`tasks` 列表需要同时满足列表展示和详情抽屉展示，返回字段建议包括：

```json
{
  "records": [
    {
      "key": "missing-source-all",
      "type": "missing_source",
      "typeText": "来源证据缺失",
      "objectName": "当前宗族人物档案",
      "branchName": "全宗族",
      "risk": "high",
      "status": "blocked",
      "statusText": "阻塞入谱",
      "suggestion": "进入来源资料库维护老谱、口述、照片等证据后再绑定对象",
      "problemDescription": "当前宗族已有入谱人物，但尚未维护来源资料，正式提交审核前缺少证据支撑。",
      "involvedObject": "当前宗族人物档案",
      "riskReason": "来源证据缺失会降低谱牒可信度，也会阻塞正式入谱审核。",
      "reviewBlocked": true,
      "relatedEntryType": "sourceLibrary",
      "relatedEntryId": null,
      "relatedEntryText": "进入来源资料库",
      "updatedAt": "2026-07-10T10:00:00"
    }
  ],
  "total": 1,
  "pageNo": 1,
  "pageSize": 20
}
```

### 世系图

```text
GET /api/v1/tree/person/{personId}/family
GET /api/v1/tree/descendants
GET /api/v1/tree/ancestors
GET /api/v1/tree/branches/{branchId}
```

世系图建议返回：

```json
{
  "nodes": [],
  "edges": []
}
```

## 宗族文化接口

宗族文化接口由 `docs/api/openapi.culture.json` 定义。#166 建立契约与模型，完整运行时分别由 #167～#172 实现。

### 文化总览

```text
GET /api/v1/clans/{clanId}/culture-overview
```

只聚合当前用户可见且 `official` 的精选文化资料、迁徙事件和文化场所。每类结果必须有数量上限，不得全量加载后由前端过滤。

### 文化资料

```text
GET    /api/v1/clans/{clanId}/culture-items
POST   /api/v1/clans/{clanId}/culture-items
GET    /api/v1/culture-items/{cultureItemId}
PUT    /api/v1/culture-items/{cultureItemId}
DELETE /api/v1/culture-items/{cultureItemId}
POST   /api/v1/culture-items/{cultureItemId}/submit-review
POST   /api/v1/culture-items/{cultureItemId}/archive
```

列表查询支持：

| 参数 | 说明 |
|---|---|
| keyword | 标题、摘要、正文、时期和地点关键词；实现时需限制长度和查询范围 |
| category | 文化分类 |
| branchId | 支派范围 |
| dataStatus | 数据状态 |
| privacyLevel | 隐私级别 |
| hasSource | 是否具备来源证据 |
| featuredOnHome | 是否首页精选候选 |
| pageNo / pageSize | 后端分页 |
| sort | 允许的白名单排序字段 |

详情聚合宗族/支派名称、来源摘要、附件摘要、审核摘要和 `allowedActions`。列表默认不返回完整 `content`。

### 迁徙事件

```text
GET    /api/v1/clans/{clanId}/migration-events
POST   /api/v1/clans/{clanId}/migration-events
GET    /api/v1/migration-events/{migrationEventId}
PUT    /api/v1/migration-events/{migrationEventId}
DELETE /api/v1/migration-events/{migrationEventId}
POST   /api/v1/migration-events/{migrationEventId}/submit-review
```

迁徙事件必须属于明确支派，支持按支派、迁出地、迁入地、历史时期、始迁祖、状态和分页筛选。正式时间轴只展示审核通过且当前用户可见的数据。

### 文化场所

```text
GET    /api/v1/clans/{clanId}/culture-sites
POST   /api/v1/clans/{clanId}/culture-sites
GET    /api/v1/culture-sites/{cultureSiteId}
PUT    /api/v1/culture-sites/{cultureSiteId}
DELETE /api/v1/culture-sites/{cultureSiteId}
POST   /api/v1/culture-sites/{cultureSiteId}/submit-review
```

地址、坐标、图片和近现代维护信息按隐私级别最小披露。场所的 `currentStatus` 与资料的 `dataStatus` 必须分开表达。

### 状态与正式数据规则

- 新增对象默认 `draft`。
- `draft`、`rejected` 可由有权限用户继续编辑。
- `official` 关键字段修改、归档、删除和首页精选变更必须进入 `revision → review_task → approve/reject → apply`。
- 审核员不能审核自己提交的文化变更。
- 前端使用详情返回的 `allowedActions` 改善交互，但后端仍须重新鉴权。
- `private`、`sealed` 内容不得通过列表、详情、来源、附件或追踪接口旁路泄露。

### 兼容规则

- `clan.hall_name`、`clan.commandery`、`clan.origin_place` 仅只读兼容，不与 `culture_item` 双写。
- `branch.migration_from`、`branch.migration_to` 仅只读兼容，不再作为多事件迁徙事实源。
- 本阶段不自动迁移历史数据；旧字段收口需另行评审。

## 权限矩阵摘要

| 模块 | 宗族管理员 | 主编 | 支派负责人 | 采集员 | 普通族人 |
|---|---:|---:|---:|---:|---:|
| 宗族管理 | 是 | 查看 | 查看 | 查看 | 查看 |
| 支派管理 | 是 | 是 | 本支派 | 否 | 查看 |
| 人物新增 | 是 | 是 | 本支派 | 授权支派 | 申请 |
| 关系管理 | 是 | 是 | 本支派 | 授权支派 | 申请 |
| 来源资料库 | 是 | 是 | 本支派 | 新增草稿 | 查看授权范围 |
| 来源附件 | 是 | 是 | 本支派 | 上传普通附件 | 查看授权范围 |
| 来源绑定 | 是 | 是 | 本支派 | 提交绑定 | 查看 |
| 宗族文化 | 是 | 是 | 本支派 | 新增草稿 | 查看授权范围 |
| 迁徙与文化场所 | 是 | 是 | 本支派 | 新增草稿 | 查看授权范围 |
| 审核 | 是 | 是 | 本支派初审 | 否 | 否 |
| 导入导出 | 是 | 是 | 本支派 | 草稿导入 | 否 |
| 修谱工作台 | 是 | 是 | 本支派 | 授权支派 | 查看个人相关 |
