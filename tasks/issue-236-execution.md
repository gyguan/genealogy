# Issue #236 执行看板：压缩世系图谱人物查询结果区域

- Issue：https://github.com/gyguan/genealogy/issues/236
- 分支：`agent/issue-236-compact-tree-search-results`
- Draft PR：#237
- 目标：在不改变接口、分页和图谱数据结构的前提下，将人物查询结果改为可折叠、限高滚动的紧凑交互，选择中心人物后自动收起，突出图谱主体。
- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：自动门禁 + 页面交互复核
- 拆分结论：未命中拆分信号，单 Issue 完成
- 最后更新时间：2026-07-15 14:24（北京时间）

## 范围与非目标

- 范围：查询结果展开/收起、用户主动搜索后展开、初始加载保持收起、列表限高滚动、选择人物后自动收起、分页与状态保持可用。
- 非目标：不修改后端、OpenAPI、pageSize、节点/边数据结构、图谱布局算法，不新增依赖。
- 影响模块：`frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`。
- 复用：复用现有 Ant Design `Button`、`List`、`Pagination` 和既有 Tree 请求状态模型，不新增重复基础组件。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue 和现有页面实现，建立分支、看板与 Draft PR | ✅ 已完成 | 约 6 分钟 | 检查点 `4aad0d6`，Draft PR #237 已建立并回写 Issue |
| 2 | 实现结果区折叠、限高滚动和选择后自动收起 | ✅ 已完成 | 约 6 分钟 | `392c226`；初始收起、主动搜索展开、288px 内部滚动、选中后收起 |
| 3 | 检查 diff，执行前端门禁并完成 Review、PR 与 Issue 收尾 | 🔄 进行中 | 已累计约 2 分钟 | diff 已确认仅涉及目标页面；Frontend CI #383 通过，Tree Release Gate #51 运行中 |

## 验证结果

- Frontend CI #383：通过。
- Tree graph model：通过。
- Typecheck frontend：通过。
- Build frontend：通过。
- API 契约：未修改；由 Tree Release Gate 的综合检查继续覆盖。
- 页面交互静态复核：初始收起、主动搜索展开、列表内部滚动、选择人物后收起、分页保持展开并可用。

## 风险与回滚

- 风险：默认收起可能降低结果发现性；已通过结果数量、当前中心人物和明确的展开/收起按钮补偿。
- 回滚：回退本 Issue 的前端页面提交即可，不涉及接口或数据回滚。

## 恢复检查点

- 当前 Issue：#236
- 当前分支：`agent/issue-236-compact-tree-search-results`
- Draft PR：#237
- 当前进行中：等待 Tree Release Gate，完成最终 Review 与合入
- CI：Frontend CI #383 通过；Tree Release Gate #51 运行中
- 阻塞：无
- 下一步：确认 Tree Release Gate 结果，更新 PR 看板并合入 `main`
