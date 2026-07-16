# Issue #476 执行看板

## Issue 与目标

- Issue：#476 `[宗族文化 P1-01] 收敛宗族文化查询与新增操作布局`
- 目标：删除重复页面头，将宗族条件与新增操作下沉至三个业务 Tab，统一查询列表页面结构。
- 工作分支：`agent/issue-476-culture-layout`
- Draft PR：#477

## 范围

- `frontend/genealogy-web/src/features/culture/CultureProductPage.tsx`
- `CultureItemMaintenanceTab.tsx`
- `CultureItemStandardTab.tsx`
- `MigrationEventStandardTab.tsx`
- `CultureSiteStandardTab.tsx`
- 必要的样式和定向测试

## 非目标

- 不修改 API、OpenAPI、数据库、权限或审核语义。
- 不重构详情 Drawer 和编辑表单字段。

## 交付分级

- Issue 类型：单页面前端调整
- 流程强度：标准
- 契约强度：不涉及
- 验证强度：聚焦测试 + `typecheck` + `build` + `api:check`
- 拆分信号：未命中；改动集中于同一页面模块，保留单 Issue 单 PR。

## 原子任务看板

| 任务 | 状态 | 产物/验证 | 活跃耗时 |
|---|---|---|---|
| T1 删除重复页头并拆出顶层 Tab | 已完成 | `CultureProductPage.tsx`，commit `5b973f1` | 未单独计时 |
| T2 将宗族选择与新增入口下沉至三个 Tab | 阻塞 | 连接器仅支持整文件替换，无法安全补丁修改 200～500 行业务组件 | 未单独计时 |
| T3 更新定向测试与样式 | 待开始 | 依赖 T2 | 待记录 |
| T4 执行前端门禁并 Review diff | 待开始 | 依赖 T2/T3 | 待记录 |

## 已完成变更

- 删除页面内重复的“宗族文化”标题和概述文案。
- 将三个业务 Tab 独立为页面顶层导航。
- 将宗族上下文与当前 Tab 新增动作从旧页面头中拆出为紧凑上下文 Card。
- 保持现有 `WorkspaceContext`、URL Tab 状态和三类编辑器创建入口不变。

## 当前阻塞

当前 GitHub 连接器仅提供整文件读取/替换，不提供行级 patch；运行环境也无法解析 `github.com` 完成本地 clone。三个待改子组件分别约 262、262、540 行，直接依据截断内容整文件重写存在覆盖业务逻辑、权限状态和编辑器恢复逻辑的高风险，因此未冒险提交。

解除阻塞后应继续：

1. 将宗族 Select 放入三个查询 Card 首行。
2. 将对应新增按钮放入三个列表 Card `extra`。
3. 删除父页面紧凑上下文 Card及 `openPrimaryAction`。
4. 统一迁徙空态的新增按钮为次要入口或移除重复入口。
5. 更新测试并执行前端门禁。

## 复用策略

- 复用 `WorkspaceContext` 保存跨 Tab 宗族上下文。
- 复用现有编辑器状态和 URL 状态，不新增全局状态。
- 复用 Ant Design `Card`、`Form`、`Select`、`Button`、`Tabs`。

## 验证方案

1. 定向执行 culture 相关测试。
2. 执行 `npm run typecheck`。
3. 执行 `npm run build`。
4. 执行 `npm run api:check`。
5. 检查 PR diff 无 API、权限和审核语义变化。

## 已知风险

- 当前 PR 仅完成父页面结构第一步，尚未满足 Issue 全部验收标准，不得合入。
- 创建入口最终下沉后，需要确保三类编辑器的 URL 恢复和未保存确认保持有效。
- 宗族切换需要继续清理支派筛选、已选详情和编辑器状态。

## 耗时口径

- 活跃耗时仅记录实际分析、修改、验证和 Review 时间。
- CI、网络和外部工具等待单独记录，不计入活跃耗时。

## 恢复检查点

- Issue #476、分支和 Draft PR #477 已建立。
- T1 已提交，commit：`5b973f16ce3891e212ea4fc5cb9378b8d09726fd`。
- PR 保持 Draft，不满足合入条件。
- 下一步最小任务：在具备行级 patch 或可 clone 环境后修改 `CultureItemStandardTab.tsx`，先完成文化资料 Tab 的宗族选择和列表新增入口。

最后更新时间：2026-07-16 19:12（北京时间）
