# Slice 4 来源引用情况 API 契约补充

本文件补充来源引用情况分页接口的响应语义。后续执行 `npm run api:generate` 前，需要将本文件中的字段同步到 `docs/api/openapi.json`。

## 接口

```text
GET /api/v1/sources/{sourceId}/bindings
```

## 查询参数

| 参数 | 类型 | 说明 |
|---|---|---|
| targetType | string | 可选。按引用对象类型过滤，取值：`person / relationship / branch / clan / generation_word` |
| pageNo | integer | 页码，从 1 开始 |
| pageSize | integer | 每页条数 |

## 响应结构

统一响应结构：

```json
{
  "success": true,
  "data": {
    "records": [],
    "total": 0,
    "pageNo": 1,
    "pageSize": 20,
    "totalPages": 0
  }
}
```

`records` 元素为 `SourceBindingSummaryResponse`：

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

## 目标对象名称解析

后端必须解析业务名称，前端不得直接展示技术 ID。

| targetType | targetDisplayName | targetBranchName | targetSummary |
|---|---|---|---|
| person | 人物姓名，优先谱名/姓名，可附人物编码 | 人物所属支派名称 | 人物摘要，如字辈、排行 |
| relationship | `fromPerson -[关系名]-> toPerson` | 起点人物所属支派名称 | 关系摘要，如双方姓名、关系类型、说明 |
| branch | 支派名称 | 支派名称 | 支派摘要，如支派路径 |
| clan | 宗族名称 | 空 | 宗族摘要，如姓氏、堂号 |
| generation_word | 字辈字 | 字辈方案所属支派名称 | 字辈摘要，如方案名、世次、说明 |

若目标对象不存在、已删除或不属于当前宗族，后端返回 `targetType:targetId` 作为兜底展示名。

## 兼容接口

```text
GET /api/v1/source-bindings/sources/{sourceId}
```

该接口继续保留，返回旧版 `SourceBindingResponse` 列表；新页面应优先使用 `/api/v1/sources/{sourceId}/bindings`。
