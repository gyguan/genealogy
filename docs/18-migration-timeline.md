# 结构化迁徙脉络运行时设计

## 1. 目标

以 `migration_event` 作为迁徙事实的唯一新写入模型，支持一个宗族下多支派、多阶段、多节点的迁徙记录，并统一接入来源证据、审核发布、权限隐私、操作日志和 Tracking。

迁徙时间轴只展示后端返回的真实事件。时期、始迁祖、原因或来源缺失时显示完整度提示，不根据祖籍、支派地址、日志或其他字段补造路线。

## 2. 事实模型与不变量

每个事件至少包含：

```text
宗族 + 支派 + 顺序 + 迁出地 + 迁入地
```

可选字段包括迁徙时期文本、始迁祖、迁徙原因、说明、可信度、隐私和敏感级别。

核心不变量：

1. 支派必须属于事件宗族。
2. 始迁祖非空时必须属于同一宗族，并位于事件支派或其下级支派。
3. 同一宗族、同一支派的有效事件 `sequence_no` 唯一；软删除后顺序可复用。
4. 迁出地和迁入地均必填，规范化空白和大小写后不得相同。
5. 历史时期保持来源文本，不自动换算或推断公历年代。
6. 列表权限、支派子树和隐私过滤在数据库分页与总数统计之前完成。
7. 草稿与驳回事件可直接维护；正式事件修改、归档和删除必须审核通过后生效。

## 3. API 与查询

运行时契约由以下 OpenAPI 文件合并形成：

- `docs/api/openapi.culture.json`：文化领域基线；
- `docs/api/openapi.culture.migration-runtime.json`：迁徙运行时补全。

主要接口：

```text
GET    /api/v1/clans/{clanId}/migration-events
POST   /api/v1/clans/{clanId}/migration-events
GET    /api/v1/migration-events/{id}
PUT    /api/v1/migration-events/{id}
DELETE /api/v1/migration-events/{id}
POST   /api/v1/migration-events/{id}/submit-review
POST   /api/v1/migration-events/{id}/archive
```

列表支持关键词、支派、迁出地、迁入地、时期文本、始迁祖、状态、隐私、来源覆盖、分页和排序。默认按支派、迁徙顺序和对象标识稳定排序；未知排序字段回退到 `sequenceNo`。

## 4. 审核与来源

迁徙事件复用文化对象治理链路：

```text
migration_event
  → revision
  → review_task
  → approve / reject
  → apply
```

- 草稿发布前至少绑定一条有效来源。
- 正式事件更新只把请求载荷写入审核载荷表，不直接覆盖当前正式数据。
- 审批 apply 时重新校验版本、支派、始迁祖和顺序，避免审核等待期间发生数据漂移。
- 来源绑定禁止直写，必须通过来源绑定变更审核。
- 审核员仍受原有自审隔离和支派范围约束。

## 5. 权限与隐私

沿用文化对象权限：

```text
culture_item.view/create/update/delete/submit_review/archive/review/view_sensitive
```

这些权限按迁徙事件的 `branch_id` 解释数据范围；前端只消费对象返回的 `allowedActions`，后端在每次写操作中再次鉴权。

`private / sealed / sensitive / highly_sensitive` 事件不得通过列表、详情、来源反查、日志摘要或 Tracking 旁路泄露。无权对象统一表现为不存在或稳定的无权限状态。

## 6. Tracking

Tracking 对象类型为 `migration_event`，业务名称使用：

```text
迁出地 → 迁入地
```

Trace 聚合以下段落：

- 当前对象摘要；
- revision 与 review_task；
- 来源绑定；
- 操作日志；
- traceId 变更链与兼容覆盖说明。

每段最多返回最近 100 条，并在 `traceCoverage` 中标记截断或旧数据兼容状态。

## 7. 数据库与回滚

#166 已建立：

- 同支派有效顺序部分唯一索引；
- 宗族/状态/更新时间索引；
- 支派/顺序索引；
- 始迁祖索引。

#170 只补充时间轴稳定查询和迁徙版本历史索引：

- `idx_migration_event__clan_branch_status_sequence`
- `idx_revision__migration_event_history`

迁移：`V20260715091000__add_migration_event_runtime_indexes.sql`

回滚：`database/rollback/20260715_issue-170_drop_migration_runtime_indexes.sql`

回滚只删除本次新增索引，不删除迁徙数据，也不恢复或写入旧支派字段。

## 8. 旧字段兼容与退出条件

旧字段：

```text
branch.migration_from
branch.migration_to
```

兼容策略：

- 仅允许旧页面或导出在兼容窗口内读取；
- 禁止新功能写回；
- 禁止与 `migration_event` 双写；
- 不自动转换为迁徙事件，避免制造无来源、无时期、无始迁祖的历史事实。

退出条件：

1. 生产环境中需要保留的旧迁徙信息已由业务人员核对并人工录入 `migration_event`；
2. 新迁徙页面、首页摘要和导出均只消费结构化接口；
3. 连续一个发布周期没有旧字段读取；
4. 通过专项扫描确认应用代码不再依赖旧字段后，另行 Issue 删除兼容读取。

## 9. 验证矩阵

- 领域：空地点、同地迁徙、非法枚举、版本冲突、顺序冲突。
- 归属：跨宗族支派、跨宗族人物、非事件支派子树始迁祖。
- 数据范围：全宗族、支派子树、兄弟支派隔离、敏感事件。
- 审核：草稿发布、重复提交、自审拒绝、正式更新/归档/删除 apply。
- 来源：正式来源要求、绑定审核、来源反查隐私。
- Tracking：对象搜索、版本链、审核、来源和日志聚合。
- 前端：URL 恢复、筛选分页、真实时间轴、详情编辑、390px 响应式和 403 最小披露。
