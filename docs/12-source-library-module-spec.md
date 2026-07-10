# 12. 来源资料库模块 Spec / Plan

## 1. 模块定位

来源资料库是族谱系统的证据中心，负责统一管理来源资料、附件、引用关系、复核状态、权限隐私和操作留痕。

它不是单纯的附件上传页，而是支撑“绑定来源 → 提交审核 → 正式入库”的独立业务模块。

## 2. 核心用户

| 用户 | 主要诉求 |
|---|---|
| 修谱主编 | 维护可信来源、核对资料、管理引用关系 |
| 支派负责人 | 维护本支派来源和附件，确认引用是否准确 |
| 采集员 | 提交老谱、照片、墓碑、口述等来源草稿 |
| 审核员 | 复核来源和来源绑定是否可入正式谱 |
| 普通族人 | 查看授权范围内的来源摘要和引用依据 |

## 3. 功能范围

### 3.1 范围内

| 能力 | 说明 |
|---|---|
| 来源搜索 | 按关键词、类型、状态、隐私、附件、引用对象筛选 |
| 来源维护 | 新增、编辑、删除草稿来源 |
| 来源详情 | 查看基础信息、原文摘录、附件、引用情况、审核日志 |
| 附件管理 | 上传、预览、下载、删除来源附件 |
| 来源绑定 | 绑定到人物、关系、支派、宗族、字辈 |
| 被引用情况 | 查看一条来源被哪些对象引用 |
| 审核流 | 来源复核、正式来源修改、绑定/解绑走审核 |
| 权限隐私 | 来源摘要、附件预览、附件下载分级控制 |
| 操作审计 | 创建、修改、删除、绑定、解绑、下载留痕 |

### 3.2 范围外

| 能力 | 说明 |
|---|---|
| OCR 自动识别 | MVP1 暂不做 |
| AI 自动抽取人物关系 | MVP1 暂不做 |
| 复杂全文检索引擎 | MVP1 先基于数据库搜索 |
| 谱书排版出版 | 不属于来源资料库模块职责 |

## 4. 业务对象

### 4.1 Source 来源资料

来源资料表示一份可被引用的证据资料。

必备字段：

```text
sourceName
sourceType
providerName
bookTitle
volumeNo
pageNo
sourceDate
excerpt
description
confidenceLevel
verificationStatus
privacyLevel
sensitiveLevel
bindingCount
attachmentCount
createdAt
updatedAt
```

### 4.2 SourceAttachment 来源附件

来源附件是来源资料下的文件，前端不得展示 `storagePath`、`checksum` 等技术字段。

必备字段：

```text
fileName
fileType
fileSize
privacyLevel
sensitiveLevel
uploadStatus
previewAllowed
downloadAllowed
uploadedAt
```

### 4.3 SourceBinding 来源引用

来源引用表示来源和业务对象之间的证据关系。

绑定对象类型：

```text
person
relationship
branch
clan
generation_word
```

前端展示绑定关系时必须展示业务名称，例如“张某某 / 长沙支 / 父子关系”，不得要求用户录入或识别技术 ID。

## 5. 统一状态

来源和来源绑定统一使用以下状态：

| 状态 | 展示文案 | 说明 |
|---|---|---|
| draft | 草稿 | 可编辑，可删除，不作为正式证据 |
| pending_review | 待审核 | 已提交审核，等待复核 |
| official | 正式 | 可作为正式证据 |
| rejected | 已驳回 | 可修改后重新提交 |
| archived | 已归档 | 历史可追溯，不再新增引用 |

历史状态兼容：

| 历史状态 | 目标状态 |
|---|---|
| unverified | draft |
| verified | official |
| reviewed | official |
| approved | official |

## 6. 审核规则

| 操作 | 规则 |
|---|---|
| 新增来源 | 默认保存为草稿 |
| 草稿来源修改 | 有权限即可直接修改 |
| 提交来源复核 | 创建 review_task |
| 正式来源修改 | 必须走 revision → review_task → apply |
| 正式来源删除 | 不直接删除，走归档或审核 |
| 绑定正式对象 | 建议进入审核 |
| 解绑正式证据 | 必须审核 |
| 上传普通附件 | 可直接上传，但要鉴权 |
| 上传敏感附件 | 必须审核或审批 |
| 下载敏感附件 | 必须鉴权并写操作日志 |

## 7. 权限动作

| 权限动作 | 说明 |
|---|---|
| source:view | 查看来源摘要 |
| source:create | 新增来源 |
| source:update | 编辑草稿或发起正式来源变更 |
| source:delete | 删除草稿来源 |
| source:submit_review | 提交来源复核 |
| source:bind | 绑定来源 |
| source:unbind | 解绑来源 |
| attachment:view | 查看附件列表 |
| attachment:upload | 上传附件 |
| attachment:preview | 预览附件 |
| attachment:download | 下载附件 |
| attachment:delete | 删除附件 |

权限判断必须以后端为准，前端只根据后端返回的 `permissions` 控制按钮展示。

## 8. 页面结构

### 8.1 来源资料库首页

```text
来源资料库
  ├── 统计卡片：全部 / 待审核 / 正式 / 敏感附件 / 未绑定
  ├── 搜索区：关键词 / 类型 / 状态 / 隐私 / 引用对象 / 附件
  └── 来源列表：来源资料 / 类型 / 状态 / 隐私 / 引用次数 / 附件数 / 更新时间 / 操作
```

### 8.2 来源详情 Drawer

```text
来源详情
  ├── 基础信息
  ├── 附件
  ├── 引用情况
  └── 审核与日志
```

### 8.3 新增 / 编辑来源 Drawer

```text
新增来源
  ├── 基础信息
  ├── 内容信息
  ├── 权限与审核
  └── 附件
```

### 8.4 绑定来源 Drawer

```text
绑定来源
  ├── 来源资料
  ├── 绑定对象类型
  ├── 搜索并选择对象
  ├── 绑定原因
  ├── 引用摘录
  └── 保存草稿 / 提交审核
```

## 9. 前端实现约束

1. 来源资料库必须作为独立 `features/sources` 模块，不再放在 `features/experience` 大文件中。
2. 搜索区使用 Ant Design `Form / Input / Select / Button`。
3. 列表使用 `Table`，分页、筛选、排序走后端 API。
4. 详情使用 `Drawer + Descriptions + Tabs + Tag`。
5. 附件使用 `Upload + Table`。
6. 风险操作使用 `Popconfirm` 或 `Modal.confirm`。
7. 搜索、分页、筛选条件应进入 URL 或明确状态模型。
8. 不新增裸 `button/input/select/textarea` 作为正式页面控件。
9. 不展示技术主键、存储路径、校验值、接口字段名。
10. 不由前端构造引用次数、附件数、审核结论等业务数据。

## 10. API 契约边界

Slice 0 已定义来源资料库契约边界。后续编码必须遵循 Contract First，并基于当前主干重新同步 `docs/api/openapi.json`，避免用旧契约覆盖主干已新增接口：

```text
docs/api/openapi.json
  ↓
npm run api:generate
  ↓
后端 Controller / Application Service
  ↓
前端 sourceApi.ts / 页面
```

核心接口：

```text
GET    /api/v1/clans/{clanId}/sources
POST   /api/v1/clans/{clanId}/sources
GET    /api/v1/sources/{sourceId}
PUT    /api/v1/sources/{sourceId}
DELETE /api/v1/sources/{sourceId}
POST   /api/v1/sources/{sourceId}/submit-review
GET    /api/v1/sources/{sourceId}/bindings
GET    /api/v1/sources/{sourceId}/attachments
POST   /api/v1/sources/{sourceId}/attachments
GET    /api/v1/source-attachments/{attachmentId}/content
DELETE /api/v1/source-attachments/{attachmentId}
POST   /api/v1/clans/{clanId}/source-bindings
DELETE /api/v1/source-bindings/{bindingId}
POST   /api/v1/source-bindings/{bindingId}/submit-review
```

## 11. 后续编码切片

| 切片 | 目标 |
|---|---|
| Slice 1 | 来源状态统一与数据模型补齐 |
| Slice 2 | 来源列表搜索 API |
| Slice 3 | 来源详情聚合 API |
| Slice 4 | 来源引用情况 API |
| Slice 5 | 来源附件 API |
| Slice 6 | 来源绑定 API 与审核接入 |
| Slice 7 | 前端独立 sources 模块 |
| Slice 8 | 替换导航入口与清理体验页 |

## 12. Slice 0 验收标准

| 编号 | 验收项 |
|---|---|
| S0-1 | 来源资料库独立模块边界已定义 |
| S0-2 | 来源状态、隐私、敏感级别、可信度已统一 |
| S0-3 | 来源搜索、详情、引用、附件、绑定接口已形成设计说明 |
| S0-4 | 文档明确前端不得展示技术字段 |
| S0-5 | 文档明确正式来源和来源绑定关键变更需要审核 |
| S0-6 | 后续编码可以按小切片推进 |
