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
/api/v1/auth              认证登录
/api/v1/clans             宗族管理
/api/v1/branches          支派管理
/api/v1/generations       字辈管理
/api/v1/persons           人物档案
/api/v1/relationships     人物关系
/api/v1/sources           资料来源
/api/v1/source-bindings   来源绑定
/api/v1/reviews           审核中心
/api/v1/workbench         修谱工作台
/api/v1/tree              世系图
/api/v1/imports           导入管理
/api/v1/exports           导出管理
/api/v1/members           成员权限
/api/v1/logs              操作日志
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

### 来源

```text
POST   /api/v1/clans/{clanId}/sources
GET    /api/v1/clans/{clanId}/sources
GET    /api/v1/sources/{sourceId}
PUT    /api/v1/sources/{sourceId}
DELETE /api/v1/sources/{sourceId}
POST   /api/v1/sources/{sourceId}/attachments
```

### 来源绑定

```text
POST /api/v1/clans/{clanId}/source-bindings
GET  /api/v1/source-bindings/sources/{sourceId}
GET  /api/v1/source-bindings/target/{targetType}/{targetId}
GET  /api/v1/source-bindings/target/{targetType}/{targetId}?clanId={clanId}
```

`/api/v1/clans/{clanId}/source-links` 为历史兼容入口，新代码统一使用 `/api/v1/clans/{clanId}/source-bindings`。

创建来源绑定请求：

```json
{
  "sourceId": 1,
  "targetType": "person",
  "targetId": 1001,
  "bindingReason": "老谱第3卷第12页记载",
  "excerpt": "谱文摘录"
}
```

### 审核

```text
GET  /api/v1/reviews/tasks
GET  /api/v1/reviews/tasks/{reviewTaskId}
POST /api/v1/reviews/tasks/{reviewTaskId}/approve
POST /api/v1/reviews/tasks/{reviewTaskId}/reject
GET  /api/v1/reviews/my-submissions
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

工作台任务返回建议：

```json
{
  "records": [
    {
      "taskId": 1,
      "taskType": "missing_source",
      "targetType": "person",
      "targetName": "张三",
      "branchName": "长沙支",
      "riskLevel": "high",
      "status": "pending",
      "assigneeName": "支派负责人",
      "summary": "人物档案缺少来源证据",
      "suggestion": "请绑定族谱原文或口述材料后再提交审核",
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

## 权限矩阵摘要

| 模块 | 宗族管理员 | 主编 | 支派负责人 | 采集员 | 普通族人 |
|---|---:|---:|---:|---:|---:|
| 宗族管理 | 是 | 查看 | 查看 | 查看 | 查看 |
| 支派管理 | 是 | 是 | 本支派 | 否 | 查看 |
| 人物新增 | 是 | 是 | 本支派 | 授权支派 | 申请 |
| 关系管理 | 是 | 是 | 本支派 | 授权支派 | 申请 |
| 审核 | 是 | 是 | 本支派初审 | 否 | 否 |
| 导入导出 | 是 | 是 | 本支派 | 草稿导入 | 否 |
| 修谱工作台 | 是 | 是 | 本支派 | 授权支派 | 查看个人相关 |
