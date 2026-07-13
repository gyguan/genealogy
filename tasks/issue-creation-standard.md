# Issue 创建规范任务看板

## 目标

补充 Issue 创建规范，要求同一功能点拆分多个 Issue 时使用统一前缀，并明确组内执行顺序、前置依赖和是否可并行。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 理解 Issue 创建规范诉求 | ✅ 已完成 | 约 2 分钟 | 将“执行熟悉”按语义理解为“执行顺序” |
| 2 | 制定 Issue 创建与分组规范 | ✅ 已完成 | 约 6 分钟 | 新增 `docs/ai/issue-creation-standard.md` |
| 3 | 更新根规则和 README 入口 | ✅ 已完成 | 约 4 分钟 | 新规范已纳入任务路由和专项索引 |
| 4 | 增加功能组 Issue 模板 | ✅ 已完成 | 约 2 分钟 | 新增 `.github/ISSUE_TEMPLATE/feature-task.md` |
| 5 | 创建 PR 并验证 | 🔄 进行中 | 已累计约 1 分钟 | 等待分支差异和 GitHub Actions 结果 |

## 恢复检查点

- 当前分支：`agent/issue-creation-standard`
- 最后完成任务：增加功能组 Issue 模板
- 当前进行中：创建 PR 并验证
- 当前任务累计耗时：已累计约 1 分钟
- CI 状态：尚未创建 PR
- 下一步最小任务：比较 `main...agent/issue-creation-standard` 并创建 PR
- 最后更新时间：2026-07-13 20:45:00，北京时间