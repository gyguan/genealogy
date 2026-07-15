# Issue #233 执行看板：世系图谱可读性、路径定位与状态恢复

- Issue：https://github.com/gyguan/genealogy/issues/233
- 关联：#191、#200、PR #232
- 分支：`agent/issue-233-lineage-workbench`
- PR：https://github.com/gyguan/genealogy/pull/235
- 目标：在不改变 Tree 权限、隐私和正式数据只读边界的前提下，修复最新搜索交互准出回归，统一业务口径，并将世系图谱建设为可定位、可恢复的单画布工作台。
- 最后更新时间：2026-07-15

## 方案与边界

- Issue 类型：世系图谱核心前端交互与状态恢复。
- 流程强度：重型前端流程；保留任务看板、Draft PR、Tree Release Gate 和五轴 Review。
- 契约强度：未修改 Tree 公共 API、数据库、权限和隐私契约；仅消费既有 `direction / relationScopes / dataView / includeSubBranches / meta` 能力。
- 验证强度：Tree 模型测试、TypeScript、生产构建、API 契约检查和真实 Tree Release Gate。
- 拆分结论：共享页面、画布和 E2E 高度耦合，采用一个 Issue、多个垂直提交完成，不扩展后端字段。
- 复用：继续使用 `LineageRequestGate`、Tree 生成类型、现有布局与语义 fixture，以及真实 PostgreSQL Tree Release Gate 数据。

## 已实现

1. 查询输入与已提交条件拆分，分页始终沿用最近一次已提交搜索条件。
2. 人物搜索支持“全宗族 / 当前支派”，直接复用既有 `/persons/search?branchId=` 能力。
3. 搜索结果默认收起，搜索后展开，选中人物后收起；支持限高滚动、当前中心置顶和命中词高亮。
4. “支派人物 / 支派关系 / 支派根人物”修正为当前展示口径，并展示实际深度和裁剪原因。
5. 状态、风险、隐私和关系端点统一转换为中文业务表达；婚配关系使用无方向表达。
6. 支派全局与人物中心改为 `Segmented` 单画布切换。
7. 人物与关系详情改为右侧 `Drawer`，详情打开时画布保持可见。
8. 支持中心人物、当前选中人物和可见关系路径高亮。
9. 支持自动适配、自动居中、重置视图、全屏查看和图内人物定位。
10. 支持人物图方向、关系范围、正式/修谱视图、是否包含下级支派等查询控制。
11. URL 保存并恢复宗族、支派、人物、模式、深度、方向、关系范围、数据视图和搜索范围。
12. 图谱警告提供最高等级摘要和全部明细；大图低缩放自动隐藏次要文字与边标签。
13. 风险标识按 `danger > warning > info > neutral` 排序，节点和关系使用不同业务字形徽标。
14. Tree Release Gate 已适配搜索列表、稳定语义定位、单画布、Drawer、错误重试和 URL 恢复。
15. 修复历史 `guidance-cleanup.css` 隐藏整个工作台标题与视角切换的问题。

## 非目标

- 不新增人物或关系正式编辑能力。
- 不修改数据库 schema、权限、隐私或审核流程。
- 不引入图数据库、新 UI 框架或全局状态库。
- 不补造 `siblingOrder / spouseOrder / familyUnitId` 等后端尚未提供的谱牒排序字段。

## 执行任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、现有页面和 Tree Release Gate，建立分支/看板/Draft PR | ✅ 完成 | 约 10 分钟 | `a59ff110` / PR #235 |
| 2 | 修复搜索状态、业务口径、中文字典及最新交互 E2E | ✅ 完成 | 约 25 分钟 | 搜索范围、裁剪口径、中文字典和 E2E 已更新 |
| 3 | 实现单画布、Drawer、自动适配和路径高亮 | ✅ 完成 | 约 30 分钟 | 单画布工作台与画布交互完成 |
| 4 | 实现查询模式、URL 恢复、警告汇总和大图降级 | ✅ 完成 | 约 25 分钟 | 查询模式、深链接和 SVG LOD 完成 |
| 5 | 执行验证、五轴 Review、同步 main 和准出收敛 | ✅ 完成 | 约 35 分钟 | 最新 Tree Release Gate run `29397565482` 通过 |

- 累计活跃耗时：约 2 小时 5 分钟。
- 外部等待：GitHub Actions 排队、依赖安装、PostgreSQL 和 Chromium 运行，未计入活跃耗时。

## 影响范围

- `frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`
- `frontend/genealogy-web/src/features/tree/LineageGraphCanvas.tsx`
- `frontend/genealogy-web/src/features/tree/treeService.ts`
- `frontend/genealogy-web/src/features/tree/treeDisplayModel.ts`
- `frontend/genealogy-web/src/features/tree/lineageUrlState.ts`
- `frontend/genealogy-web/src/features/tree/lineagePathModel.ts`
- `frontend/genealogy-web/src/lineage-tree.css`
- `frontend/genealogy-web/src/lineage-graph.css`
- `frontend/genealogy-web/src/guidance-cleanup.css`
- `frontend/genealogy-web/e2e/tree-release-gate.spec.ts`
- Tree 单元测试、`package.json` 和任务记录

## 最终验证

基于功能代码 head `ac17e7fe59cfc069792d4230880117827ba6d6c5`：

- ✅ Tree 模型测试：24/24
- ✅ TypeScript：Frontend CI run `29397565514`
- ✅ 生产构建：Frontend CI run `29397565514`
- ✅ API Contract：run `29397565509`
- ✅ 真实 PostgreSQL、权限、安全投影、120+ 人物搜索和浏览器交互：Tree Release Gate run `29397565482`
- ✅ PR 当前 `mergeable=true`

Culture Library UI CI 在 Culture 页面初始化时读取未定义的 `officialCount`，与 Tree 逻辑无关，已独立创建 #244 管理，不混入本 Issue 扩大范围。

## 五轴 Review 结论

- Correctness：搜索条件、支派范围、路径计算和 URL 状态均基于后端已授权返回的数据；裁剪统计不再冒充全量数据。
- Readability：单画布、中文业务口径、Drawer 和路径高亮替代原双画布长页面；搜索区不再持续挤压画布。
- Architecture：API 请求下沉到 `treeService`，显示字典、URL 状态和路径算法独立建模并具备单元测试。
- Security：未放宽后端权限；路径仅在可见节点与边中计算；不会恢复或推断被脱敏、过滤的数据。
- Performance：搜索结果内部滚动；自动适配和低缩放 LOD 降低大图视觉与渲染负担；未新增运行时依赖。

## 已知限制

- 同胞排行、配偶顺序和家庭单元仍缺少后端业务排序字段，本 Issue 不补造排序数据。
- 500 节点仍由 SVG 渲染，本次采用 LOD 和交互降级，未引入 Canvas/Web Worker。
- “修谱视图”是否可用仍由后端权限决定；无权限时展示真实接口错误，不进行前端放宽。
- 宗族文化 E2E 契约漂移由 #244 独立处理。

## 回滚

- 回滚 PR #235 的 squash merge commit 可恢复原搜索列表、双画布和弹窗详情。
- 本次无数据库迁移、后端契约、权限种子或生产依赖变更。
- URL 新参数均为可选，回滚后旧页面会忽略这些参数。

## 恢复检查点

- 当前 Issue：#233
- 当前分支：`agent/issue-233-lineage-workbench`
- 当前 PR：#235
- 当前状态：实现与 Tree 准出完成，准备 Ready for review 和 squash merge
- 最新功能 Commit：`ac17e7fe59cfc069792d4230880117827ba6d6c5`
- Tree Release Gate：run `29397565482` 成功
- 独立基线问题：#244
- 未解决 Tree Review：无
- 阻塞：无
- 下一步最小任务：更新 PR 摘要、标记 Ready 并合入 main
- 最后更新时间：2026-07-15
