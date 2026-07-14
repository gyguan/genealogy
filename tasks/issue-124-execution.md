# Issue #124 执行看板

- Issue：[#124 引入稳定 trace_id 贯通变更、审核与正式生效链路](https://github.com/gyguan/genealogy/issues/124)
- 工作分支：`agent/issue-124-stable-trace-id`
- Draft PR：[#206](https://github.com/gyguan/genealogy/pull/206)
- 目标：为一次 revision 变更建立稳定 trace_id，并贯通 review_task、审核决策、正式生效与 operation_log。

## DEFINE：最终规则

1. 新 revision 通过 JPA `@PrePersist` 生成唯一 UUID `trace_id`。
2. review task 创建时复制 revision trace；同一生命周期不可更换。
3. approve/reject/apply/log 使用同一 trace，并同时记录 revision、review task 和真实业务对象。
4. 驳回后重提创建新 revision 和新 trace，不复用旧链路。
5. 历史 revision 不随机回填；接口使用 `legacy-revision:<id>` 独立展示并标记 `legacy_partial`。
6. trace 只用于关联和取证，不作为权限凭证，不改变审核和正式生效规则。
7. operation_log 不增加外键：其 `REQUIRES_NEW` 事务不能依赖父事务尚未提交的 revision/task。

## PLAN：原子任务

| 序号 | 任务 | 状态 | 说明 |
|---|---|---|---|
| 1 | 盘点 revision/review_task/operation_log 和全部创建、生效入口 | ✅ 已完成 | 覆盖人物、关系、来源、来源绑定、导入、字辈、支派和文化资料 |
| 2 | 形成字段、索引、历史兼容、补偿与回滚方案 | ✅ 已完成 | 见 `docs/13-stable-revision-trace-id.md` |
| 3 | 增加 Flyway 与实体/DTO/仓储字段 | ✅ 已完成 | 新迁移保持历史 trace 为空，只确定性补 task trace |
| 4 | revision 创建生成 trace_id，并向 review_task 透传 | ✅ 已完成 | 两套 revision/review entity 映射均接入 |
| 5 | approve/reject/apply/operation_log 贯通 trace_id 与结果 | ✅ 已完成 | submitted/approved/rejected/applied 事件显式记录 |
| 6 | 统一追踪接口按 trace_id 聚合单次变更并标记历史覆盖 | ✅ 已完成 | complete/legacy_partial/inconsistent/orphan_partial |
| 7 | 补充并发、重复链路、驳回重提、通过生效和迁移测试 | 🔄 进行中 | 等待组合态编译与测试 |
| 8 | 五轴 Review、处理反馈并合入 main | ⏳ 待处理 | 门禁通过后转 Ready |

## 数据模型

- `revision.trace_id UUID NULL` + 唯一部分索引。
- `review_task.trace_id UUID NULL` + `(trace_id, created_at, id)` 部分索引。
- `operation_log`：`trace_id`、`revision_id`、`review_task_id`、`business_target_type`、`business_target_id`、`event_result`。
- 日志索引匹配 trace、revision、review task 和业务对象的实际查询条件。

## 追踪接口

- 时间线事件返回 trace/revision/review task/event result。
- 详情新增 `changeChains`，每个 revision 一条单次变更链。
- 历史无 trace 的两次 revision 永不合并。
- 前端新增“单次变更链路”页签，展示 trace、兼容状态、最终结果和事件数量。

## 验证范围

- UUID 稳定性与 2000 并发生成唯一性。
- submit → approve → apply 三类日志复用同一 trace。
- reject 后重提生成新 trace。
- 同一对象多 revision 分链。
- 历史无 trace 明确标记并保持独立。
- Flyway 不伪造历史 trace，索引与查询匹配。
- PostgreSQL 16 migration、Maven compile/test、API Contract、前端 typecheck/build。

## 当前检查点

- 当前阶段：组合态编译与测试。
- 临时源码快照 workflow 将在应用补丁时删除。
- 已知阻塞：本地容器无 Maven，使用 GitHub Actions PostgreSQL 16 环境验证。
