# Issue #198 执行看板：宗法关系、证据审核与修谱异常摘要

- Issue：https://github.com/gyguan/genealogy/issues/198
- EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置：#197 / PR #212 / `787fa5a73498efe85d2b5d06eaf0d2b7b6f8d229`
- 分支：`agent/issue-198-tree-summary`
- Draft PR：待创建
- 目标：在 Tree 只读与最小披露前提下，为可见人物和关系边批量聚合宗法语义、来源证据、审核状态及修谱异常摘要。
- 最后更新时间：2026-07-14 22:22（北京时间）

## 方案与边界

- 使用 #192 已预留字段，不扩大公共 API 枚举或路径。
- 新增 Tree 只读聚合服务，输入仅为 #193 安全投影且 #194/#195 已选入图的可见人物与关系。
- 来源：批量查询 `source_binding` 与正式 `source`，聚合绑定数、正式绑定数、综合可信度和缺少正式证据。
- 审核：批量查询 `revision` 与 `review_task`，按人物/关系目标聚合 none/pending/approved/rejected/mixed 和待审/驳回数量。
- 异常：抽取修谱工作台可复用质量规则，聚合世次缺失/冲突、重复关系、来源缺失和孤立人物。
- 不通过摘要数量泄露隐藏节点或边；masked/hidden 对象不参与聚合。
- 不修改来源绑定、审核任务或工作台任务，不新增数据库迁移。
- 回滚：恢复 Tree DTO/组装、Repository 批量方法和共享质量规则即可，无数据影响。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 与 Source/Review/Workbench 事实源，建立分支/看板/PR | 🔄 进行中 | 已累计约 6 分钟 | 分支和检查点已建立，待创建 PR/回写 Issue |
| 2 | 建立批量来源与审核查询及稳定空摘要 DTO | ⏳ 待处理 | — |  |
| 3 | 抽取工作台质量规则并实现批量异常聚合 | ⏳ 待处理 | — |  |
| 4 | 将可见节点/边接入摘要并规范宗法展示码 | ⏳ 待处理 | — |  |
| 5 | 执行领域测试、全量 Backend Verify、API Contract 和 Review 后合入 | ⏳ 待处理 | — |  |

## 验证

- 血缘、婚配、入继/出继/承祧/兼祧/嗣子/无嗣语义测试。
- 人物与关系证据、审核、缺失、混合状态、异常和空摘要测试。
- Repository 调用次数测试，禁止节点/边逐条聚合查询。
- `mvn verify`、API Contract、五轴 Review。

## 风险

- 证据和审核数量本身属于敏感信息，只对已经进入安全图的对象聚合。
- 历史 targetType/状态值可能大小写不一致，聚合需要稳定归一化。
- “疑似重复”只标记同端点同关系语义的多条可见边，不替代人工判定。

## 恢复检查点

- 当前 Issue：#198
- 当前分支：`agent/issue-198-tree-summary`
- Draft PR：待创建
- 当前进行中：创建 PR 并回写 Issue
- CI：未运行
- 阻塞：无
- 下一步：新增批量 Repository 查询与摘要 DTO
