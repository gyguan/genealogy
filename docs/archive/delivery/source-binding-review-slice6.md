# Slice 6 来源绑定 API 与审核接入契约补充

本文件补充来源绑定审核流程的 API 语义。后续执行 `npm run api:generate` 前，需要将本文件中的字段同步到 `docs/api/openapi.json`。

## 设计原则

正式来源绑定的新增、替换、删除属于证据链关键变更，必须走：

```text
revision -> review_task -> approve/reject -> apply
```

旧版直接绑定接口继续保留用于兼容，但新页面和新流程应优先使用审核型接口。

## 接口清单

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/v1/clans/{clanId}/source-bindings/revisions` | 提交新增绑定审核 |
| POST | `/api/v1/source-bindings/{bindingId}/replace-revision` | 提交替换绑定审核 |
| POST | `/api/v1/source-bindings/{bindingId}/delete-revision` | 提交删除绑定审核 |
| POST | `/api/v1/source-binding-revisions/{revisionId}/approve` | 审核通过并应用变更 |
| POST | `/api/v1/source-binding-revisions/{revisionId}/reject` | 审核拒绝 |

## 新增 / 替换请求

`SourceBindingRevisionSubmitRequest`：

```json
{
  "binding": {
    "sourceId": 10,
    "targetType": "person",
    "targetId": 100,
    "bindingReason": "族谱原文记录人物基础信息",
    "excerpt": "谱文摘录",
    "confidenceLevel": "high"
  },
  "changeReason": "补充证据"
}
```

## 删除请求

`SourceBindingRevisionDeleteRequest`：

```json
{
  "changeReason": "错误绑定"
}
```

## 审核请求

`SourceBindingReviewDecisionRequest`：

```json
{
  "reviewComment": "审核通过"
}
```

## 响应

`SourceBindingRevisionResponse`：

```text
revisionId
reviewTaskId
clanId
bindingId
changeType
status
diffSummary
submitterId
submitTime
approvedAt
rejectedReason
```

## 状态规则

| 对象 | 状态 |
|---|---|
| revision | `pending / approved / rejected` |
| review_task | `pending / approved / rejected` |
| source_binding | `official / archived` |

删除绑定时不物理删除 `source_binding`，审核通过后将 `bindingStatus` 更新为 `archived`，用于保留证据链历史。

## 权限规则

| 操作 | 权限 |
|---|---|
| 提交新增绑定审核 | `source:bind` |
| 提交替换绑定审核 | `source:bind` |
| 提交删除绑定审核 | `source:bind` |
| 审核通过/拒绝 | `source:review` |

审核员不能审核自己提交的来源绑定变更。

## 风险控制

1. 来源必须属于当前宗族，且状态为 `official`。
2. 同一来源和目标对象不能存在未归档的重复绑定。
3. 同一绑定存在 `pending` 变更时，禁止重复提交替换或删除。
4. 创建绑定审核使用来源 ID 作为 revision `targetId`，防止同一来源并发提交大量重复绑定审核。
5. 删除操作只归档，不物理删除，保证证据链可追溯。

## 审计动作

```text
source_binding_revision_submit
source_binding_revision_approve
source_binding_revision_reject
```
