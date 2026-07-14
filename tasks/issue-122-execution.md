# Issue #122 执行看板

- Issue：[#122 重构追踪中心为对象追踪与操作审计双页签](https://github.com/gyguan/genealogy/issues/122)
- 工作分支：`agent/issue-122-tracking-center-tabs-final`
- 目标：将追踪中心收敛为“对象追踪”和“操作审计”两个一级任务页签，统一 URL 状态、异步状态和权限展示。
- 当前基线：`main` commit `bb0ffe76750d170e401eb2f26deed1f79b8ae271`，已包含 #162 提前合入的状态模型、业务字典和详情 Drawer。
- 最后更新时间：2026-07-14 15:11（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. 页面只保留“对象追踪”和“操作审计”两个一级页签，默认进入对象追踪。
2. 对象追踪采用“筛选业务对象 → 点击行直接打开详情 Drawer”的单一步骤路径。
3. 对象筛选使用业务化 Select、关键词和 `DatePicker.RangePicker`，采用后端分页。
4. 详情完整展示时间线、字段差异/版本摘要、审核记录、来源绑定和受控原始日志。
5. 操作审计提供时间、操作者、动作分类、对象类型、结果和关键词筛选，采用后端分页。
6. CSV 导出仅在操作审计页签展示，并基于后端真实披露能力控制。
7. 一级模块、页签、筛选、分页和当前对象同步到 URL，可刷新和前进/后退恢复。
8. 完整覆盖加载、空态、错误态、无权限态和 1440 / 1366 / 1280 响应式布局。

### 非目标

- 不新增或修改后端 API、数据库字段和 Flyway。
- 不增加审核通过、驳回或正式数据修改操作。
- 不在前端推断审核结果、权限或业务状态。
- 不处理其他业务页面跳转入口；由后续 S07 负责。

### 兼容与回滚

- 继续使用 S04 对象搜索、S05 追踪详情和现有操作日志接口。
- URL 仅增加现有单页应用内的 `view` 与追踪中心局部查询参数，不改变后端路由。
- 回滚仅需恢复 `LogPage.tsx`、`App.tsx` 和 `audit-trace.css`；无数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和最新 main | ✅ 已完成 | 约 8 分钟 | 读取根规则、前端规则、设计规范和现有页面 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | ✅ 已完成 | 约 5 分钟 | 原分支、看板、PR #162 和 Issue 启动记录已建立 |
| 3 | 设计 URL 状态模型和页面组件边界 | ✅ 已完成 | 约 18 分钟 | 状态模型、类型、业务字典和纯函数测试已进入 main |
| 4 | 重构对象追踪页签和详情 Drawer | ✅ 已完成 | 约 26 分钟 | 点击对象直接加载统一聚合详情；无二次生成动作 |
| 5 | 重构操作审计页签和日志详情 Drawer | ✅ 已完成 | 约 22 分钟 | 标准筛选、后端分页、受控导出和技术信息折叠 |
| 6 | 补充 URL 恢复和响应式样式 | ✅ 已完成 | 约 14 分钟 | 一级模块、页签、筛选、分页、对象及日志详情同步 URL |
| 7 | 执行模型测试、typecheck、build、api:check 和组合态 CI | 🔄 进行中 | 已累计约 2 分钟 | 待在续接 PR 上验证 |
| 8 | 五轴 Review、处理反馈并合入 main | ⏳ 未开始 | — | Correctness / Readability / Architecture / Security / Performance |

## 提前合入事件与恢复

- Draft PR #162 被仓库自动化在页面主改造完成前提前 squash 合入，commit：`bb0ffe76750d170e401eb2f26deed1f79b8ae271`。
- 该提交仅包含执行看板、URL 状态模型、业务字典、详情 Drawer 和模型测试，不代表 Issue 完成。
- Issue #122 已重新打开。
- 续接分支从该合入提交创建，只携带尚未进入主干的 `LogPage.tsx`、`App.tsx` 和 `audit-trace.css`，避免重复提交或回滚已合入能力。

## 当前恢复检查点

- 当前 Issue：#122（已重新打开）
- 当前分支：`agent/issue-122-tracking-center-tabs-final`
- 原 PR：#162（提前合入，仅完成部分基础能力）
- 续接 PR：待创建
- 最后完成任务：完成页面双页签、URL 模块恢复和响应式样式的干净续接提交
- 当前进行中：创建续接 Draft PR 并运行验证
- 当前任务累计耗时：已累计约 2 分钟
- 最新续接实现 Commit：`a4345327fb489fe0aa4f2a0610b8f0e4609432b1`
- CI 状态：待运行
- 未解决 Review：无
- 已知阻塞：无 Issue 范围内阻塞
- 下一步最小任务：创建使用 `Refs #122` 的续接 Draft PR，运行前端与组合态验证
- 最后更新时间：2026-07-14 15:11（Asia/Shanghai）

## 验证计划

```bash
cd frontend/genealogy-web
npm install
npm run test:tracking-center
npm run typecheck
npm run build
npm run api:check
```

同时核对标准 GitHub Actions 的前端构建、API Contract、认证 E2E 和治理检查。