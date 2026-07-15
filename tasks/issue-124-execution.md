# Issue #124 执行看板

- Issue：[#124 引入稳定 trace_id 贯通变更、审核与正式生效链路](https://github.com/gyguan/genealogy/issues/124)
- 工作分支：`agent/issue-124-stable-trace-id`
- 当前 PR：[#211](https://github.com/gyguan/genealogy/pull/211)
- 已关闭未合入 PR：[#206](https://github.com/gyguan/genealogy/pull/206)，因实施阶段临时 workflow 导致 PR 级 `action_required` 标记，已由干净单提交 PR #211 替代。
- 目标：为一次 revision 变更建立稳定 trace_id，并贯通 review_task、审核决策、正式生效与 operation_log。

## DEFINE：最终规则

1. 新 revision 通过 JPA `@PrePersist` 生成唯一 UUID `trace_id`。
2. review task 创建时复制 revision trace；同一生命周期不可更换。
3. approve/reject/apply/log 使用同一 trace，并同时记录 revision、review task 和真实业务对象。
4. 驳回后重提创建新 revision 和新 trace，不复用旧链路。
5. 历史 revision 不随机回填；接口使用 `legacy-revision:<id>` 独立展示并标记 `legacy_partial`。
6. trace 只用于关联和取证，不作为权限凭证，不改变审核和正式生效规则。
7. operation_log 不增加外键：其 `REQUIRES_NEW` 事务不能依赖父事务尚未提交的 revision/task。
8. 同一对象的不同 revision 永远按 revision/trace 分成独立链，不按对象 ID 粗粒度合并。

## PLAN：原子任务

| 序号 | 任务 | 状态 | 说明 |
|---|---|---|---|
| 1 | 盘点 revision/review_task/operation_log 和全部创建、生效入口 | ✅ 已完成 | 覆盖人物、关系、来源、来源绑定、导入、字辈、支派和文化资料 |
| 2 | 形成字段、索引、历史兼容、补偿与回滚方案 | ✅ 已完成 | 见 `docs/13-stable-revision-trace-id.md` |
| 3 | 增加 Flyway 与实体/DTO/仓储字段 | ✅ 已完成 | 新迁移保持历史 trace 为空，只确定性补 task trace |
| 4 | revision 创建生成 trace_id，并向 review_task 透传 | ✅ 已完成 | 两套 revision/review entity 映射均接入 |
| 5 | approve/reject/apply/operation_log 贯通 trace_id 与结果 | ✅ 已完成 | submitted/approved/rejected/applied 事件显式记录 |
| 6 | 统一追踪接口按 trace_id 聚合单次变更并标记历史覆盖 | ✅ 已完成 | complete/legacy_partial/inconsistent/orphan_partial |
| 7 | 补充并发、驳回重提、通过生效、实库迁移和索引测试 | ✅ 已完成 | PostgreSQL 16 全量 Flyway、Hibernate 校验及三表持久化均通过 |
| 8 | 五轴 Review、清理实施资产并建立干净 PR | ✅ 已完成 | 最终分支基于最新 main，仅保留一个产品提交 |
| 9 | 标准 CI、自动 Review 与 squash merge | 🔄 进行中 | PR #211 门禁通过后转 Ready |

## 数据模型

- `revision.trace_id UUID NULL` + 唯一部分索引。
- `review_task.trace_id UUID NULL` + `(trace_id, created_at, id)` 部分索引。
- `operation_log`：`trace_id`、`revision_id`、`review_task_id`、`business_target_type`、`business_target_id`、`event_result`。
- 日志索引匹配 trace、revision、review task 和业务对象的实际查询条件。
- 历史 revision 不做全表 UUID 回填，避免制造虚假链路。

## 追踪接口

- 时间线事件返回 trace/revision/review task/event result。
- 详情新增 `changeChains`，每个 revision 一条单次变更链。
- 历史无 trace 的多次 revision 通过 `legacy-revision:<id>` 保持独立。
- 孤立日志使用 `orphan_partial`，不会伪装成完整链。
- 前端新增“单次变更链路”页签，展示 trace、兼容状态、最终结果和事件数量。

## 验证结果

### 后端与领域规则

- ✅ Maven 编译。
- ✅ UUID 稳定性与 2000 并发生成唯一性。
- ✅ submit → approve → apply 复用同一 trace。
- ✅ reject 后重提生成新 trace。
- ✅ 自审禁止规则保持有效。
- ✅ 来源绑定与文化治理生命周期接入。
- ✅ 同一对象多 revision 分链。
- ✅ 历史无 trace 独立且标记 partial。

### PostgreSQL 16

- ✅ 开启 `SPRING_FLYWAY_ENABLED=true` 执行全量历史迁移。
- ✅ Hibernate schema validation。
- ✅ 新增字段类型、可空性和 revision 无数据库默认值。
- ✅ 六个新增索引真实存在。
- ✅ revision、review_task、operation_log 实际持久化同一 trace_id。

> 验证纠偏：早期组合任务只设置了 `RUN_POSTGRES_INTEGRATION_TESTS`，未开启 Flyway，相关 Spring 测试实际被跳过或在空库校验失败。已补充显式 Flyway 开关与独立实库断言，最终结果以上述真实 PostgreSQL 16 运行记录为准。

### 契约与前端

- ✅ API 生成与 Contract 检查无漂移。
- ✅ `npm run test:logs`。
- ✅ TypeScript typecheck。
- ✅ 生产构建。

## 五轴 Review

- **Correctness**：业务定位继续依赖 revision_id；trace_id 只做稳定关联；重提必换新 trace。
- **Readability**：使用统一 `OperationTraceContext`，服务不再散乱传递六个关联字段。
- **Architecture**：不引入新事实源，统一追踪仍是只读投影；历史缺口显式表达。
- **Security**：trace_id 不是权限凭证；追踪查询继续先执行宗族、支派和隐私过滤。
- **Performance**：单段最多 100 条；新增部分索引覆盖 trace、revision、task 和业务对象查询。

## 回滚与补偿

- 不修改历史 Flyway；需要回滚时新增前向补偿迁移。
- 先停写新 trace 字段，再删除新增索引和字段。
- operation_log 不设外键，父事务回滚产生的孤立日志由 `orphan_partial` 显式展示，可按 trace 做补偿清理。
- 业务对象、审核状态与正式生效结果不因移除追踪字段而回滚。

## 当前检查点

- 当前阶段：PR #211 标准 CI 与自动 Review。
- 分支状态：基于最新 `main`，单一产品提交，无临时 workflow、补丁分片或 package-lock。
- 已知阻塞：无产品代码阻塞。
