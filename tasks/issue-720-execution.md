# Issue #720 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/720
- 目标：人物创建与编辑支持 0~N 条关键事件维护，并纳入人物审核快照与一致性生效链路。
- 当前分支：`agent/issue-720-person-events`
- Draft PR：#726
- 最后更新时间：2026-07-23（北京时间）

## 原子任务看板

| 任务 | 状态 | 验收条件 |
|---|---|---|
| T1 读取规则、现有模型与审核链路 | 已完成 | 已定位人物事件实体、人物 Revision 提交、审批 apply 与前端创建/编辑入口 |
| T2 更新 OpenAPI 与契约模型 | 已完成 | OpenAPI Overlay 和自动生成 operation 已包含事件列表、替换和复合 Revision |
| T3 后端事件批量替换与校验 | 已完成 | 支持 0~N 条替换、权限校验、字段校验、软删除和人工排序 |
| T4 审核快照与应用链路联动 | 已完成 | before/after 快照包含事件；审批原子生效；驳回不修改正式事件；兼容旧快照 |
| T5 前端事件编辑器与保存联动 | 已完成 | 创建页、草稿编辑页和正式 Revision 提交均已接入关键事件 |
| T6 回归测试与 CI 验证 | 进行中 | 最终四项 CI 正在验证人工排序修正和完整构建 |

## 已实现能力

- `GET /api/v1/persons/{personId}/events`：查询人物关键事件；
- `PUT /api/v1/persons/{personId}/events`：草稿人物批量替换 0~N 条事件；
- `PUT /api/v1/persons/{id}/revision`：正式或驳回人物一次提交资料与事件 Revision；
- 正式人物禁止通过独立事件接口直接覆盖，必须经过审核；
- 审批通过时人物资料与关键事件在同一事务内生效；
- 审批驳回时保留当前正式事件；
- 历史 `PersonEntity` Revision 快照继续兼容；
- `PersonEventEditor` 支持新增、删除、上移、下移、类型、标题、日期、地点和描述；
- 创建页执行“创建人物 → 保存事件 → 可选提交审核”；
- 事件保存失败时不提交审核，事件校验失败时不创建人物；
- 编辑页草稿直接保存，正式或驳回人物提交复合 Revision，待审核人物禁止重复提交；
- `sortOrder` 作为人工排序主依据，日期仅用于顺序相同时的稳定兜底；
- OpenAPI Overlay 与生成的 `api-contract.ts` 已同步。

## 回归覆盖

- 后端事件正式状态边界、未来日期校验、操作者与人工顺序；
- Revision 审批应用事件、驳回保持正式数据；
- 前端事件校验、保存顺序、事件失败边界、创建审核顺序；
- 创建页和编辑页源码契约；
- TypeScript 类型检查与生产构建；
- OpenAPI 自动生成一致性检查。

## 最终检查项

- 等待 Frontend CI、Backend CI、API Contract、Culture Page Gate 全部通过；
- 检查 PR changed files，确认无临时同步工作流、构建产物和锁文件；
- 全绿后更新 PR 状态并进入评审。
