# Issue #198 执行看板：宗法关系、证据审核与修谱异常摘要

- Issue：https://github.com/gyguan/genealogy/issues/198
- EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置：#197 / PR #212 / `787fa5a73498efe85d2b5d06eaf0d2b7b6f8d229`
- 分支：`agent/issue-198-tree-summary`
- PR：https://github.com/gyguan/genealogy/pull/213
- 目标：在 Tree 只读与最小披露前提下，为可见人物和关系边批量聚合宗法语义、来源证据、审核状态及修谱异常摘要。
- 最后更新时间：2026-07-15 08:40（北京时间）

## 方案与边界

- 使用 #192 已预留字段，不扩大公共 API 枚举或路径。
- 新增 Tree 只读聚合服务，输入仅为 #193 安全投影且 #194/#195 已选入图的可见人物与关系。
- 来源：批量查询 `source_binding` 与 `source`，聚合绑定数、正式绑定数、综合可信度和缺少正式证据。
- 审核：批量查询 `revision` 与 `review_task`，按人物/关系目标聚合 none/pending/approved/rejected/mixed 和待审/驳回数量。
- 异常：复用只读质量规则，聚合世次缺失/冲突、重复关系、来源缺失和孤立人物。
- 摘要按 `source:view`、`review_task:view`、`workbench:view` 独立授权；无权字段保持 `null`，不返回零计数侧信道。
- masked 节点和边不聚合摘要；异常只基于最终安全图计算。
- 不修改来源绑定、审核任务或工作台任务，不新增数据库迁移。
- 回滚：恢复 Tree Controller/DTO/聚合服务和 Repository 批量方法即可，无数据影响。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 与 Source/Review/Workbench 事实源，建立分支/看板/PR | ✅ 完成 | 已记录约 6 分钟 | PR #213，Issue 已回写 |
| 2 | 建立批量来源与审核查询及稳定空摘要 DTO | ✅ 完成 | 跨会话完成 | 每类事实固定批次查询，无逐节点/逐边查询 |
| 3 | 抽取质量规则并实现批量异常聚合 | ✅ 完成 | 跨会话完成 | 世次、重复、关系冲突、缺来源、孤立摘要 |
| 4 | 将可见节点/边接入摘要并规范宗法展示码 | ✅ 完成 | 本次恢复活跃约 12 分钟 | 五类 Tree 入口均接入；修复实体字段不一致和 masked 摘要侧信道 |
| 5 | 执行领域测试、全量 Backend Verify、API Contract 和 Review 后合入 | ✅ 验证完成 | 外部 CI 等待不计 | Backend CI #2280、API Contract #989 通过，待执行最终合入 |

## 验证结果

- 聚焦测试覆盖批量调用次数、空摘要、无权限省略、证据/审核状态、重复关系、世次异常和继配婚配语义。
- 全量 Backend CI：#2280，`mvn verify` 通过。
- API Contract：#989 通过。
- Review：摘要仅处理最终安全图对象；masked 对象不返回摘要；无数据库/API/依赖扩展。

## 风险与已知限制

- 历史 targetType/状态值采用大小写归一化；未知关系语义降级为 `other`。
- “疑似重复”只标记同端点同关系语义的多条可见边，不替代人工判定。
- 人物入口为解析宗族增加一次固定查询，不随节点或边数量增长。
- 证据和审核数量本身属于敏感信息，因此普通浏览角色可能仅看到基础图谱，不看到内部摘要。

## 恢复检查点

- 当前 Issue：#198
- 当前分支：`agent/issue-198-tree-summary`
- PR：#213
- 当前状态：实现与验证完成，等待 Ready 与 squash merge
- CI：Backend CI #2280、API Contract #989 均通过
- 阻塞：无
- 下一步：合入后启动 #199
