# Issue #170 执行看板：结构化迁徙脉络管理

- Issue：https://github.com/gyguan/genealogy/issues/170
- 原实现分支：`agent/issue-170-structured-migration`
- 原实现 PR：https://github.com/gyguan/genealogy/pull/221
- 主干实现 Commit：`646f398ba8476f59ebafc7c9e2c1e7593b2d1c6c`
- Review 修复分支：`agent/issue-170-review-fixes`
- 目标：完成迁徙事件来源审核、隐私最小披露和创建者可见性修复后，重新关闭 Issue #170。

## 已交付主体

- 迁徙事件分页、详情、草稿维护、提交审核、归档/删除。
- 支派、迁出地、迁入地、历史时期、始迁祖、状态、隐私和关键词筛选。
- 宗族、支派和始迁祖归属校验，顺序冲突及无效自迁徙校验。
- 正式事件通过 `revision → review_task → approve/reject → apply` 生效。
- 文化页真实迁徙时间轴、列表、详情与编辑体验。
- 旧 `branch.migration_from/migration_to` 不迁移、不双写。

## 合入后 Review 修复

| 序号 | 问题 | 优先级 | 状态 | 修复策略 |
|---|---|---|---|---|
| 1 | `migration_event` 来源绑定进入命令层后，被审核服务的目标类型白名单拒绝 | P1 | 🔄 进行中 | 将迁徙目标纳入文化来源审核服务，统一校验权限、支派和审核任务 |
| 2 | 迁徙详情未按来源隐私与管理权限脱敏 excerpt | P1 | 🔄 进行中 | 受限来源仅向具备来源管理权限的用户返回摘录 |
| 3 | 创建者自己的 private/sealed 迁徙事件未进入列表 | P2 | 🔄 进行中 | 数据库查询条件加入 `created_by = actorId`，与精确详情策略保持一致 |
| 4 | 补充定向测试、全量回归、PostgreSQL 与 CI | P0 | ⏳ 待执行 | 覆盖来源审核闭环、摘录脱敏和创建者列表可见性 |
| 5 | Review 清零并 squash 合入 main | P0 | ⏳ 待执行 | 全部门禁通过后合入并重新关闭 Issue |

## 当前状态

- Issue #170：因合入后发现 2 个 P1、1 个 P2 Review 问题，已重新打开。
- EPIC #165：任务勾选暂保留，最终完成状态以修复 PR 合入为准。
- 重复 PR #214：仅作为差异参考，不整体合入，避免重复迁移和双套实现。
- 下一步：建立 Draft 修复 PR，实施三项最小修复并验证。
