# Issue #473 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/473
- 工作分支：`agent/issue-473-tree-query-layout`
- Draft PR：https://github.com/gyguan/genealogy/pull/474
- 目标：统一世系图谱查询区域，恢复“人物中心 / 支派全局”模式切换，并调整结果区操作布局。
- 最后更新时间：2026-07-16 16:45（北京时间）

## 范围

### 本次实现
- 复用现有 Segmented 双模式与查询状态模型。
- 将查询卡片视觉融合为统一“图谱查询”区域。
- 支派全局模式隐藏人物搜索与人物查询结果。
- 删除结果区“当前条件”重复展示。
- 将导出入口移动到图谱/列表结果工具栏。
- 保留图谱/列表切换和原有图谱生成流程。

### 非目标
- 不修改世系图谱后端核心数据结构或公共 API。
- 不调整权限、隐私和正式数据生效流程。
- 不重构图谱渲染算法。

## 交付强度

- Issue 类型：前端交互与布局优化。
- 流程强度：轻量标准流程。
- 契约强度：无 API 契约变更，复用现有查询能力。
- 验证强度：Frontend CI 的既有测试、TypeScript 检查和生产构建。
- 拆分结论：未命中跨模块或高风险拆分信号，单 Issue / 单 PR 完成。

## 原子任务

| 任务 | 状态 | 活跃耗时 | 验证 | Commit |
|---|---|---:|---|---|
| T1 定位页面组件、状态模型与现有测试 | 已完成 | 未可靠分段统计 | 代码检查完成 | `f80bc928` 前置分析 |
| T2 融合查询区域并按模式显示字段 | 已完成 | 未可靠分段统计 | CI typecheck/build 通过 | `d9bee919` |
| T3 调整结果工具栏并删除重复条件展示 | 已完成 | 未可靠分段统计 | CI typecheck/build 通过 | `f80bc928`、`d9bee919` |
| T4 完成静态检查 | 已完成 | 外部等待不计入 | Frontend CI 成功 | `d9bee919` |
| T5 Review、同步 PR 看板并完成合入 | 进行中 | 未可靠分段统计 | diff 已检查 | 本提交 |

> 本次执行未在每个原子任务开始/结束时形成可靠计时点，因此不补造分钟数；后续任务按规范实时记录。

## 修改文件

- `frontend/genealogy-web/src/features/booklets/BookletActions.tsx`
- `frontend/genealogy-web/src/features/booklets/booklet-actions-issue473.css`
- `tasks/issue-473-execution.md`

## 验证结果

GitHub Actions：Frontend CI / Frontend Typecheck and Build 成功。

- 依赖安装：通过
- 既有前端状态模型测试：通过
- TypeScript typecheck：通过
- 生产构建：通过
- Tree 模型测试：因本次未修改 Tree 模型文件，由 CI 变更检测按规则跳过
- OpenAPI：本次无契约变更

## Review 结论

- Correctness：保留原有查询请求、模式切换和导出 API，只调整显示与入口位置。
- Readability：新增样式限定在 `business-page--treeProduct`，避免影响其他页面。
- Architecture：未引入新依赖；导出组件通过 portal 进入结果工具栏，仍复用原有模块动作。
- Security：导出禁用条件和后端权限语义保持不变。
- Performance：MutationObserver 仅在该模块挂载期间工作，卸载时释放；未扩大图谱查询范围。

## 已知风险

- 使用 CSS `:has()` 实现支派模式字段隐藏，目标浏览器基线为当前现代浏览器；旧浏览器不在项目现有支持范围内。
- 导出入口通过 portal 挂载到结果工具栏，页面卸载时自动清理。
- 本次未增加 E2E 视觉回归用例，主要由现有 CI、DOM 结构和样式范围保证。

## 恢复检查点

- 当前 Issue：#473
- 当前分支：`agent/issue-473-tree-query-layout`
- 当前 PR：#474
- 最后完成任务：T4 静态检查与 CI 验证
- 当前进行中任务：T5 标记 Ready、合入并回写 Issue
- 最新业务 Commit：`d9bee9191558e5a961a00ce19881b31701769a5f`
- CI 状态：成功
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：将 PR 标记为 Ready，合入 `main`，回写最终完成摘要。

## 耗时口径

仅记录已经发生且有可靠起止点的实际活跃时间；CI、审核和其他外部等待单独说明，不计入活跃耗时。