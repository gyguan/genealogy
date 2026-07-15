# Issue #273 执行看板：世系图谱查询、布局与定位交互收敛

- Issue：https://github.com/gyguan/genealogy/issues/273
- 子 Issue：#261、#262、#263、#264、#265、#266、#267、#268、#269、#270、#271
- 分支：`agent/issue-273-lineage-interactions`
- 目标：收敛图谱查询触发、人物搜索区视觉、工作台布局以及图内定位/详情交互，同时保持 Tree 只读、安全投影和后端契约不变。
- 最后更新时间：2026-07-15（北京时间）

## 流程与边界

- Issue 类型：Tree 核心前端交互与布局优化。
- 流程强度：重型前端流程；保留 Draft PR、Tree Release Gate、任务看板和五轴 Review。
- 契约强度：不修改数据库、后端 API、权限、隐私、审核或 Tree 核心数据结构。
- 验证强度：Tree 模型测试、TypeScript、生产构建、API Contract、真实 PostgreSQL Tree Release Gate。
- 拆分结论：#273 已拆为 11 个原子子 Issue；本次按四个垂直切片形成独立提交，但共享页面状态和 E2E，采用一个集成 PR 避免反复冲突。
- 活跃耗时与外部等待分离：代码分析、实现、Review 计入活跃耗时；Actions 排队、依赖安装、PostgreSQL 与 Chromium 运行单独记录。
- 复用：现有 `LineageRequestGate`、Tree 生成类型、URL 状态测试、真实 PostgreSQL Tree Release Gate fixture。

## 实现范围

1. 查询状态：移除人物搜索范围和数据视图，新增待提交/已应用条件，点击“查询图谱”后统一生效。
2. 搜索区：收窄人物输入框，统一输入、placeholder、清除图标和搜索按钮高度与对齐。
3. 页面布局：移除工作台统计卡片，将人物中心/支派全局切换移动至画布标题上方。
4. 定位与详情：独立 `locatedNodeId`，定位仅聚焦/高亮并在框内显示姓名；点击人物卡片打开 Drawer。
5. 状态恢复：URL 仅保存成功应用的正式谱查询条件，不再输出 `searchScope` 和 `dataView`。
6. 测试：更新 URL 模型、查询状态模型和 Tree Release Gate。

## 非目标

- 不修改 Tree 后端 API 或 OpenAPI。
- 不新增数据库迁移、依赖或状态管理库。
- 不调整图谱布局算法、节点上限或隐私投影。
- 不重构人物/关系 Drawer 的业务内容。
- 不把修谱数据入口重新放回普通图谱页面。

## 任务看板

| 序号 | 任务 | 状态 | 活跃耗时 | Commit / 结果 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、代码现场，建立分支/看板/Draft PR | 🔄 进行中 | 已累计约 10 分钟 | 检查点提交 |
| 2 | 查询条件显式提交，移除人物搜索范围和数据视图 | ⏳ 待处理 | — | #261 #262 #271 |
| 3 | 搜索框宽度、placeholder 与搜索按钮对齐 | ⏳ 待处理 | — | #263 #264 #265 |
| 4 | 移除统计卡片并移动图谱视角切换 | ⏳ 待处理 | — | #266 #267 |
| 5 | 定位与详情解耦、定位姓名回显、卡片详情 | ⏳ 待处理 | — | #268 #269 #270 |
| 6 | 更新测试、执行准出、Review、合入 main | ⏳ 待处理 | — |  |

## 影响范围

- `frontend/genealogy-web/src/features/tree/LineageTreeProductPage.tsx`
- `frontend/genealogy-web/src/features/tree/lineageUrlState.ts`
- 可新增 Tree 查询状态模型及测试
- `frontend/genealogy-web/src/lineage-tree.css`
- `frontend/genealogy-web/e2e/tree-release-gate.spec.ts`
- `frontend/genealogy-web/package.json`（仅在新增模型测试时调整脚本）

## 验证方案

- `npm run test:tree`
- `npm run typecheck`
- `npm run build`
- `npm run api:check`
- Tree Release Gate：验证控件变更不请求、点击查询才请求、定位不打开 Drawer、卡片点击打开 Drawer、正式谱与安全投影。

## 已知风险

- 待提交条件与 URL 已应用条件必须严格分离，避免刷新恢复未查询状态。
- 切换人物/支派视角不应意外发请求，也不能丢失已加载画布。
- `Input.Search` 与项目全局 compact CSS 可能共同影响按钮高度，需要以浏览器门禁验证。
- 定位与详情解耦后，路径高亮应绑定定位状态，而详情关闭不应清除定位。

## 恢复检查点

- 当前 Issue：#273
- 当前分支：`agent/issue-273-lineage-interactions`
- 当前 Draft PR：待创建
- 当前进行中：治理检查点
- 最新 Commit：本文件提交
- CI：尚未运行
- 未解决 Review：无
- 阻塞：无
- 下一步最小任务：创建 Draft PR 并回写 Issue
- 最后更新时间：2026-07-15（北京时间）
