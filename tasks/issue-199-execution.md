# Issue #199 执行看板：中国式宗法语义与修谱风险标识

- Issue：https://github.com/gyguan/genealogy/issues/199
- EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置：#198 / PR #213 / `1bc3afeb11ef2c968a8ce1db047490c8a1d65662`
- 分支：`agent/issue-199-tree-semantics-ui`
- Draft PR：待创建
- 目标：在 #196 真实拓扑上消费 #198 摘要，以可访问的线型、文字、徽标和详情展示血缘、婚配、宗法承嗣、证据、审核和修谱风险，并保持 Tree 只读边界。
- 最后更新时间：2026-07-15 08:45（北京时间）

## 方案与边界

- 不改后端/API/数据库/依赖，仅消费生成的 `TreeGraphResponse` 类型。
- 关系视觉采用“颜色 + 线型 + 文字标签”三重语义；颜色不是唯一识别方式。
- 风险仅展示后端返回摘要，前端不重新计算业务风险。
- masked 节点继续使用隐私占位，不渲染内部摘要或业务跳转。
- 详情跳转复用 WorkspaceContext，保留宗族、支派、人物或关系上下文。
- 不在图谱中提供来源绑定、审核处理或异常修复写操作。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新前端规则、Issue、图模型/画布/页面，建立分支、看板和 Draft PR | 🔄 进行中 | 已累计约 3 分钟 | 分支与检查点已建立 |
| 2 | 建立关系语义与摘要展示纯模型及测试 | ⏳ 待处理 | — |  |
| 3 | 改造 SVG 边线型、端点、标签、节点徽标与图例 | ⏳ 待处理 | — |  |
| 4 | 改造详情摘要与只读业务跳转，验证权限省略 | ⏳ 待处理 | — |  |
| 5 | 执行前端测试、TypeScript、构建、API Contract 和 Review 后合入 | ⏳ 待处理 | — |  |

## 验证

- 血缘、婚配、入继、出继、承祧、兼祧、嗣子、无嗣语义矩阵。
- 证据缺失、低可信、待审核、驳回、世次/关系冲突、疑似重复标识。
- 无摘要/无权限/masked 对象不展示内部状态。
- `npm run test:tree`、`npm run typecheck`、`npm run build`、API Contract、前端 CI。

## 恢复检查点

- 当前 Issue：#199
- 当前分支：`agent/issue-199-tree-semantics-ui`
- Draft PR：待创建
- 当前进行中：创建 PR 并回写 Issue
- CI：未运行
- 阻塞：无
- 下一步：读取最新 Tree 页面、图模型和画布实现
