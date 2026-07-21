# Issue #661 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/661
- 分支：`agent/issue-661-member-title-count-format`
- 目标：将成员列表标题人数格式调整为“成员列表（共N名）”。
- Issue 类型：文案 / 样式
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：自动门禁 + 聚焦 diff 检查
- 拆分结论：未命中拆分信号，单 Issue 完成
- 影响模块：`frontend/genealogy-web/src/main.tsx`、`frontend/genealogy-web/src/member-permission-page.css`
- 复用说明：复用现有成员列表标题归位逻辑，不调整业务组件或接口

## 范围

- 将“共 N 名成员”格式化为“（共N名）”；
- 去除标题与人数之间的额外视觉间距；
- 保持动态人数更新、分页总数和操作按钮布局不变。

## 非目标

- 不修改分页底部总数文案；
- 不修改成员查询、邀请、授权和权限逻辑；
- 不新增依赖。

## 任务看板

| 序号 | 任务 | 状态 | 验证 |
|---:|---|---|---|
| 1 | 复核现有标题归位与人数更新逻辑 | 已完成 | 已确认 `installMemberListHeaderPlacement` |
| 2 | 建立 Issue、分支、任务看板与 Draft PR | 进行中 | GitHub 现场可恢复 |
| 3 | 调整人数格式和标题间距 | 待开始 | 聚焦 diff 检查 |
| 4 | 执行前端自动门禁 | 待开始 | TypeScript / build |
| 5 | 更新看板、Review 并合入 main | 待开始 | CI / merge |

## 验证方案

- 检查标题格式为“成员列表（共N名）”；
- 检查人数变化后仍能重新格式化；
- 检查分页底部仍保留原有“共 N 名成员”；
- 检查邀请和授权按钮布局不变；
- 由 Frontend CI 执行既有测试、TypeScript 和生产构建。

## 已知风险

- 标题人数节点由 DOM 归位逻辑维护，需要同时覆盖初次移动和 React 后续更新两种场景。

## 耗时与等待口径

- 活跃耗时：按实际 GitHub 操作阶段记录，不补算会话外时间。
- 外部等待：GitHub Actions 运行时间单独记录。

## 恢复检查点

- 当前阶段：启动门禁
- 最后完成：读取当前标题归位实现并创建 Issue #661 与任务分支
- 当前任务：建立 Draft PR
- 最新提交：任务看板检查点提交
- CI 状态：尚未触发
- 未解决 Review：无
- 下一步最小任务：创建 Draft PR 并回写 Issue
- 最后更新时间：2026-07-21 19:47（北京时间）
