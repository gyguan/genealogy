# Issue #196 执行看板：关系边驱动的真实世系拓扑布局

- Issue：https://github.com/gyguan/genealogy/issues/196
- EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置：#195 / PR #208 / `7a57c8a8dcd7b03ed419cba0b22fdbb6b540d524`
- 分支：`agent/issue-196-edge-driven-topology`
- Draft PR：待创建
- 目标：使用生成的 Tree 类型和真实关系边构建唯一人物节点的 DAG 拓扑，支持多父/承嗣、婚配、多个根、孤立节点、缩放平移、适配画布和折叠展开。
- 最后更新时间：2026-07-14 21:40（北京时间）

## 方案与边界

- 新增纯函数图模型：节点唯一，父子/宗法边决定层级，婚配边采用同层语义，合法多路径全部保留。
- 新增原生 SVG 画布，不引入第三方图库；Ant Design 提供控制、告警和空态。
- 中心人物与支派图统一消费 `TreeGraphResponse`，不再用 `any` 猜 Tree 字段。
- 折叠只停止从指定节点继续展开；同一后代若仍由其他未折叠路径可达，继续展示。
- 不修改后端/API/数据库，不展示 #198/#199 的证据、审核和异常叠加。
- 回滚：恢复页面/CSS并删除模型、画布和测试，无数据影响。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、页面和契约，建立分支、看板与 Draft PR | 🔄 进行中 | 已累计约 5 分钟 | 分支与检查点已建立，待创建 PR/回写 Issue |
| 2 | 建立纯函数 DAG 图模型及普通树、多父、环、孤立测试 | ⏳ 待处理 | — |  |
| 3 | 实现可缩放、平移、适配和折叠的 SVG 拓扑画布 | ⏳ 待处理 | — |  |
| 4 | 页面改用生成 Tree 类型并保留详情/设为中心交互 | ⏳ 待处理 | — |  |
| 5 | 执行模型测试、TypeScript、构建、API 检查和 Review 后合入 | ⏳ 待处理 | — |  |

## 验证

- `npm run test:tree`
- `npm run typecheck`
- `npm run build`
- `npm run api:check`
- Frontend CI、API Contract、五轴 Review。

## 风险

- DAG 不能降维为单父树；节点去重不等于边去重。
- 环数据必须可渲染降级且不得导致布局死循环。
- 大图只消费后端截断结果；前端不自动请求无上限数据。

## 恢复检查点

- 当前 Issue：#196
- 当前分支：`agent/issue-196-edge-driven-topology`
- Draft PR：待创建
- 当前进行中：创建 Draft PR 并回写 Issue
- CI：未运行
- 阻塞：无
- 下一步：创建 PR 后实现图模型
