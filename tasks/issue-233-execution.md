# Issue #233 执行看板：世系图谱可读性、路径定位与状态恢复

- Issue：https://github.com/gyguan/genealogy/issues/233
- 关联：#191、#200、PR #232
- 分支：`agent/issue-233-lineage-workbench`
- Draft PR：https://github.com/gyguan/genealogy/pull/235
- 目标：在不改变 Tree 权限、隐私和正式数据只读边界的前提下，修复最新搜索交互准出回归，统一业务口径，并将世系图谱建设为可定位、可恢复的单画布工作台。
- 最后更新时间：2026-07-15

## 方案与边界

- Issue 类型：世系图谱核心前端交互与状态恢复。
- 流程强度：重型前端流程；保留任务看板、Draft PR、Tree Release Gate 和五轴 Review。
- 契约强度：本次不修改 Tree 公共 API、数据库、权限和隐私契约；仅消费现有 `direction / relationScopes / dataView / includeSubBranches / meta` 能力。
- 验证强度：Tree 模型测试、TypeScript、生产构建、API 契约检查和真实 Tree Release Gate。
- 拆分信号：Issue 验收项较多，但主要集中在同一前端页面、画布组件和现有 E2E；为避免多个分支反复修改共享页面，本次采用一个 Issue、三个可独立提交的垂直切片，不扩展后端契约。
- 活跃耗时与外部等待分离：仅记录规则/代码/测试/Review 的活跃时间；CI 排队与运行单独记录。
- 复用：继续使用 `LineageRequestGate`、Tree 生成类型、现有图布局 fixture、语义模型 fixture 和 `tree-release-gate.spec.ts` 的 PostgreSQL 测试数据。

## 已实现

1. 查询输入与已提交条件拆分，分页始终沿用最近一次已提交搜索条件。
2. 人物搜索支持“全宗族 / 当前支派”，直接复用现有 `/persons/search?branchId=` 能力。
3. 搜索结果限高滚动、可折叠、当前中心置顶、命中词高亮。
4. “支派人物 / 支派关系 / 支派根人物”修正为当前展示口径，并展示实际深度和裁剪原因。
5. 状态、风险、隐私和关系端点使用统一中文业务表达；婚配关系使用无方向表达。
6. 支派全局与人物中心改为 `Segmented` 单画布切换。
7. 人物与关系详情改为右侧 `Drawer`，画布保持可见。
8. 支持当前选中人物、中心人物和可见关系路径高亮。
9. 支持自动适配、自动居中、重置视图、全屏查看和图内人物定位。
10. 支持方向、关系范围、正式/修谱视图、下级支派范围查询。
11. URL 保存并恢复宗族、支派、人物、模式、深度、方向、关系范围和数据视图。
12. 图谱警告提供最高等级摘要和全部明细；大图低缩放隐藏次要文字与边标签。
13. 风险标识按严重度排序，节点和关系使用不同业务字形徽标。
14. Tree Release Gate 已适配搜索列表、稳定语义定位、单画布、Drawer 和 URL 恢复。

## 非目标

- 不新增人物或关系正式编辑能力。
- 不修改数据库 schema、权限、隐私或审核流程。
- 不引入图数据库、新 UI 框架或全局状态库。
- 不新增 `siblingOrder / spouseOrder / familyUnitId` 等后端字段；仅在现有数据能力内优化布局与交互。

## 执行任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、现有页面和 Tree Release Gate，建立分支/看板/Draft PR | ✅ 完成 | 约 10 分钟 | `a59ff110` / PR #235 |
| 2 | 修复搜索状态、业务口径、中文字典及最新交互 E2E | ✅ 完成 | 约 20 分钟 | 搜索范围、裁剪口径、中文字典、E2E 已更新 |
| 3 | 实现单画布、Drawer、自动适配和路径高亮 | ✅ 完成 | 约 25 分钟 | 单画布工作台与画布交互已实现 |
| 4 | 实现查询模式、URL 恢复、警告汇总和大图降级 | ✅ 完成 | 约 20 分钟 | 查询模式、深链接和 SVG LOD 已实现 |
| 5 | 执行验证、五轴 Review、同步看板并合入 main | 🔄 进行中 | 已累计约 10 分钟 | 第一轮 Frontend CI 暴露 ESM 扩展名问题，已修复 |

## 影响范围

- `frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`
- `frontend/genealogy-web/src/features/tree/LineageGraphCanvas.tsx`
- `frontend/genealogy-web/src/features/tree/treeService.ts`
- `frontend/genealogy-web/src/features/tree/treeDisplayModel.ts`
- `frontend/genealogy-web/src/features/tree/lineageUrlState.ts`
- `frontend/genealogy-web/src/features/tree/lineagePathModel.ts`
- `frontend/genealogy-web/src/lineage-tree.css`
- `frontend/genealogy-web/src/lineage-graph.css`
- `frontend/genealogy-web/e2e/tree-release-gate.spec.ts`
- Tree 单元测试、`package.json` 和任务记录

## 验证状态

- 第一轮 Frontend CI：Tree 新增模型测试 13/15 通过；失败原因为 Node ESM 不解析扩展名省略的内部引用。
- ESM 引用已改为显式 `.js`，等待最新 head 全量门禁。
- 待验证：`npm run test:tree`、`npm run typecheck`、`npm run build`、`npm run api:check`、Tree Release Gate。

## 五轴 Review 检查点

- Correctness：搜索条件、支派范围、路径计算和 URL 状态均基于后端已授权返回的数据。
- Readability：单画布、业务口径、中文状态、Drawer 和路径高亮替代原双画布长页面。
- Architecture：API 请求下沉到 `treeService`，显示字典和 URL 状态独立建模。
- Security：未放宽后端权限；路径只在可见节点与边中计算；不恢复被脱敏或过滤的数据。
- Performance：搜索结果内部滚动；大图采用自动适配和低缩放 LOD，不增加渲染依赖。

## 已知限制

- 同胞排行、配偶顺序和家庭单元仍缺少后端业务排序字段，本 Issue 不补造排序数据。
- 500 节点仍由 SVG 渲染，本次采用 LOD 和交互降级，未引入 Canvas/Web Worker。
- “修谱视图”是否可用仍由后端权限决定；无权限时页面显示真实接口错误，不进行前端放宽。

## 恢复检查点

- 当前 Issue：#233
- 当前分支：`agent/issue-233-lineage-workbench`
- 当前 Draft PR：#235
- 最后完成任务：修复 Tree 单测 ESM 内部引用
- 当前进行中：等待最新 head 的 Frontend CI、API Contract 与 Tree Release Gate
- 最新 Commit：`7fce499e59465c4279c62188755b6ca5b8264cee`
- 第一轮失败证据：Frontend CI run `29394908085`，`ERR_MODULE_NOT_FOUND`，已修复
- 未解决 Review：等待门禁反馈
- 阻塞：无
- 下一步最小任务：读取最新门禁结果并修复真实类型或 E2E 失败
- 最后更新时间：2026-07-15
