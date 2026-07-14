# Issue #196 执行看板：关系边驱动的真实世系拓扑布局

- Issue：https://github.com/gyguan/genealogy/issues/196
- EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置：#195 / PR #208 / `7a57c8a8dcd7b03ed419cba0b22fdbb6b540d524`
- 分支：`agent/issue-196-edge-driven-topology`
- Draft PR：https://github.com/gyguan/genealogy/pull/210
- 目标：使用生成 Tree 类型和真实关系边构建唯一人物节点的 DAG 拓扑，支持多父/承嗣、婚配、多个根、孤立节点、缩放平移、适配画布和折叠展开。
- 最后更新时间：2026-07-14 22:02（北京时间）

## 主要交付

- `lineageGraphModel.ts`：节点/边去重、父子与宗法层级、婚配同层、环降级、多个根、孤立节点和多路径折叠。
- `LineageGraphCanvas.tsx`：原生 SVG 画布，支持滚轮缩放、拖拽平移、适配、人物居中、折叠/展开、键盘选择和双击设为中心。
- 页面统一消费生成的 `TreeGraphResponse/TreeNodeResponse/TreeEdgeResponse`，删除世次分列、假箭头和 Tree 核心 `any` 猜测。
- 支派图与中心人物图使用同一拓扑模型，展示后端 `warnings/meta`、多个根、孤立和截断提示。
- 前端 CI 新增 Tree 模型测试和显式 TypeScript 检查。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、页面和契约，建立分支、看板与 Draft PR | ✅ 已完成 | 约 6 分钟 | 分支、检查点、PR #210 和 Issue 回写已建立 |
| 2 | 建立纯函数 DAG 图模型及普通树、多父、环、孤立测试 | ✅ 已完成 | 约 8 分钟 | 纯函数模型和 6 类测试已提交 |
| 3 | 实现可缩放、平移、适配和折叠的 SVG 拓扑画布 | ✅ 已完成 | 约 7 分钟 | 无第三方图库，支持画布交互与可访问节点 |
| 4 | 页面改用生成 Tree 类型并保留详情/设为中心交互 | ✅ 已完成 | 约 7 分钟 | 旧世次分列与假箭头已移除，详情与中心切换保留 |
| 5 | 执行模型测试、TypeScript、构建、API 检查和 Review 后合入 | ✅ 已完成 | 约 7 分钟 | Frontend CI #227、API Contract #969 通过 |

## 验证结果

- Tree 模型测试：✅ 6 类，覆盖关系层级、多父、婚配、环、折叠多路径、孤立和截断。
- TypeScript：✅。
- Vite 生产构建：✅。
- Frontend CI #227：✅。
- API Contract #969：✅。
- PR diff：9 个相关文件，无后端、数据库或公共 API 变更。

## 验收核对

- [x] 每条可见边连接实际端点，节点在画布中唯一。
- [x] 同世次无关系人物不会被画成亲属。
- [x] 多父、多承嗣和多路径关系边完整保留。
- [x] 婚配边与父子/承嗣边采用不同语义。
- [x] 支持多个根、孤立节点、环与截断提示。
- [x] 点击人物查看详情，双击或详情按钮设为中心。
- [x] 支持缩放、平移、适配、居中和折叠/展开。

## 五轴 Review

- Correctness：✅ 布局仅由真实边驱动，节点去重不删除合法边。
- Readability：✅ 模型、画布和页面职责分离。
- Architecture：✅ 无第三方图依赖，生成类型为契约来源。
- Security：✅ 只消费后端安全投影，不自行恢复隐藏关系。
- Performance：✅ 纯函数有限迭代，输入受后端 2000/4000 容量上限约束。

## 当前恢复检查点

- 当前 Issue：#196
- 当前分支：`agent/issue-196-edge-driven-topology`
- Draft PR：#210
- 最新 Commit：本次最终执行记录
- 当前进行中：等待最后必需检查后转 Ready 并 squash 合入
- CI：Frontend CI、API Contract 通过；Culture Library UI CI 运行中
- Review：无未解决线程
- 阻塞：无
- 下一步：合入 #210，回写 Issue/EPIC，启动 #197
