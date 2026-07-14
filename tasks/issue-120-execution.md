# Issue #120 执行看板

- Issue：[#120 建设业务对象搜索与日志业务化展示能力](https://github.com/gyguan/genealogy/issues/120)
- 原交付：PR #144，Squash commit `3a00544ea0186b788c43a89aa1ca692148e233d8`
- 热修分支：`agent/issue-120-review-sql-hotfix`
- 目标：修复已合入 `main` 的审核事项可见性 SQL 括号错误，确保真实 PostgreSQL 查询可执行，同时保留 sealed/跨范围目标不可见及来源支派标签不越权的安全语义。
- 最后更新时间：2026-07-14 10:31（Asia/Shanghai）

## DEFINE：热修范围

### 问题

PR #144 合入后进行最终一致性核验时，真实 PostgreSQL 16 回归发现 `reviewTaskSql()` 的 `reviewTargetVisible` 存在三层未闭合括号，查询在 `ORDER BY` 前报语法错误。原 PR 的 SQL 结构单测未能覆盖真实解析，Issue #120 因此重新打开。

### 实现范围

1. 将审核目标可见性条件改写为 `CASE rev.target_type WHEN ... THEN EXISTS(...) ELSE false END`，降低括号复杂度。
2. 保留人物、关系、来源、支派四类目标的宗族、删除状态、sealed 隐私和支派范围校验。
3. 保留来源支派标签只从可见且符合显式 `branchId` 的绑定中选择。
4. 使用真实 PostgreSQL 16 数据验证：
   - sealed 人物对应审核事项不进入结果和 count；
   - 可见审核事项可正常返回业务名称与摘要；
   - 来源多支派绑定只展示可见支派名称。
5. 删除所有临时诊断/补丁工作流，不新增数据库迁移。

### 非目标

- 不改变 #120 已交付的 API、DTO、前端页面、权限模型和分页参数。
- 不扩大到 #121 聚合接口或 #122 页面重构。
- 不修改数据库 schema。

### 回滚

仅回滚 `TrackingObjectQueryRepository.reviewTaskSql()` 与回归测试即可；无数据回滚。

## PLAN：热修任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 复现并定位 main 中 PostgreSQL SQL 语法错误 | ✅ 已完成 | 约 8 分钟 | Surefire 报告确认 `ORDER BY` 前仍有 3 个未闭合括号 |
| 2 | 重新打开 Issue、建立热修分支和执行检查点 | 🔄 进行中 | 已累计约 3 分钟 | 分支和看板已建立，待创建 Draft PR |
| 3 | 使用 CASE/EXISTS 重写审核目标可见性 SQL | ⏳ 待处理 | — | 保留原安全语义，降低括号复杂度 |
| 4 | 增加并运行 PostgreSQL 16 数据回归 | ⏳ 待处理 | — | sealed 审核目标、可见目标、来源双支派绑定 |
| 5 | 清理临时资产、Review、同步 main 并合入 | ⏳ 待处理 | — | 满足门禁后 squash merge |

## 验证方案

```bash
cd backend/genealogy-backend
mvn -q -DskipTests compile
mvn -q -Dtest=TrackingObjectQueryRepositoryTest,TrackingObjectQueryRepositoryReviewPostgresTest test
```

真实 PostgreSQL 16 环境变量：

```text
TEST_POSTGRES_URL=jdbc:postgresql://localhost:5432/genealogy
TEST_POSTGRES_USERNAME=genealogy
TEST_POSTGRES_PASSWORD=genealogy
```

## 当前恢复检查点

- 当前 Issue：#120（已重新打开）
- 当前分支：`agent/issue-120-review-sql-hotfix`
- 当前 Draft PR：待创建
- 最后完成任务：定位 main 中审核事项 SQL 真实 PostgreSQL 语法错误
- 当前进行中：建立热修治理现场
- 当前任务累计耗时：已累计约 3 分钟
- 最新 Commit：由本检查点提交生成
- CI 状态：尚未触发热修验证
- 未解决 Review：原 PR 两条安全 Review 语义必须保留
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，回写 Issue，再重写 SQL
- 最后更新时间：2026-07-14 10:31（Asia/Shanghai）

## 耗时汇总

- 原交付活跃耗时：约 1 小时 12 分钟
- 热修已完成活跃耗时：约 8 分钟
- 热修当前进行中累计耗时：已累计约 3 分钟
- 外部等待：GitHub Actions 排队、容器拉取和自动运行时间不计入活跃耗时
