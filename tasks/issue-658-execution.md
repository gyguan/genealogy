# Issue #658 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/658
- Draft PR：https://github.com/gyguan/genealogy/pull/659
- 分支：`agent/issue-658-member-list-actions`
- 目标：将成员总数与成员列表标题合并，并把“邀请新成员”“新增成员授权”统一放到结果 Card 标题行右侧。
- Issue 类型：单页面前端调整
- 流程强度：轻量
- 契约强度：不涉及
- 验证强度：自动门禁 + 聚焦 diff 检查
- 拆分结论：未命中拆分信号，单 Issue 完成
- 影响模块：`frontend/genealogy-web/src/main.tsx`、`frontend/genealogy-web/src/member-permission-page.css`
- 复用说明：复用现有 `MemberInvitationAction`、成员授权按钮和仓库已有的结果 Card Header DOM 归位机制，不新增组件体系

## 范围

- 成员总数移动到“成员列表”标题后；
- 邀请和授权按钮归位到成员列表 Card 右侧；
- 全局模块 Header 和查询 Card 不再视觉展示对应操作入口；
- 保持现有邀请、授权、权限校验和弹窗逻辑不变；
- 增加窄屏 Card Header 换行和右对齐样式。

## 非目标

- 不修改后端接口、OpenAPI、数据库或权限模型；
- 不调整邀请和授权业务流程；
- 不引入新依赖；
- 不重构成员权限页面的大型组件结构。

## 任务看板

| 序号 | 任务 | 状态 | 验证 |
|---:|---|---|---|
| 1 | 复核成员页、邀请操作与页面规范 | 已完成 | 已确认现有入口和目标布局 |
| 2 | 建立分支、任务看板与 Draft PR | 已完成 | Issue #658、PR #659 可恢复 |
| 3 | 调整成员列表标题与按钮布局 | 已完成 | 聚焦 diff 已检查，无接口和权限逻辑变更 |
| 4 | 执行前端自动门禁并修复问题 | 已完成 | Frontend CI #1200 全部通过 |
| 5 | 更新看板、完成 Review 并合入 main | 进行中 | 等待最新提交 CI 后合入 |

## 实现说明

- 在 `installMemberListHeaderPlacement` 中识别成员查询 Card 和成员列表 Card；
- 将现有动态总数节点追加到“成员列表”标题后，保留 React 对总数文本的更新；
- 将全局 Header 中的“邀请新成员”和查询 Card 中的“新增成员授权”归位到结果 Card extra；
- 复用现有 MutationObserver 归位模式，页面重渲染后自动恢复目标布局；
- 使用 `member-list-card` 页面级类控制桌面端右对齐与移动端换行。

## 验证结果

- PR diff 检查：仅修改 `main.tsx`、成员权限页面样式和任务看板，无无关业务变更；
- 交互保留：按钮继续使用原有 React 事件、加载态、禁用态和弹窗逻辑；
- 数据保留：总数继续使用原有 `total` 渲染节点，不复制或重新计算；
- Frontend CI #1200：成功；
- 既有前端模型与页面测试：成功；
- TypeScript：成功；
- 生产构建：成功；
- Tree 专项测试：按工作流变更检测结果跳过，与本次成员页调整无关。

## Review 检查

- Correctness：动态总数和两个现有按钮均移动原节点，不改变数据和事件；
- Readability：归位逻辑独立为页面级函数，选择器和目标文案明确；
- Architecture：沿用仓库已有结果 Header 归位方式，不新增框架或全局状态；
- Security：未修改权限判断、后端鉴权、邀请和授权请求；
- Performance：观察器含页面存在、父节点和顺序判断，稳定状态不重复移动节点。

## 已知风险

- Ant Design 或页面 DOM 层级若未来调整，页面级选择器需要同步维护；当前实现与仓库已有结果工具栏归位机制一致。

## 耗时与等待口径

- 活跃耗时：按实际 GitHub 操作阶段记录，不补算会话外时间；需求分析、现场建立、布局实现、diff Review 和验证检查均已完成。
- 外部等待：GitHub Actions 运行时间单独记录，不计入活跃耗时。

## 恢复检查点

- 当前阶段：最终 CI 与合入
- 最后完成：Frontend CI #1200 全部通过并完成五维 Review
- 当前任务：检查最新任务看板提交 CI，随后将 PR 标记 Ready 并合入 main
- 最新业务提交：`4a7c37b`
- 最新看板提交：待本次提交生成
- CI 状态：业务代码对应 Frontend CI #1200 成功；最新提交 CI 待触发
- 未解决 Review：无
- 下一步最小任务：确认最新 CI 成功并合入 PR #659
- 最后更新时间：2026-07-21 19:42（北京时间）
