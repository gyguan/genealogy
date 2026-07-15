# Issue #200 执行看板：世系图谱最终准出闭环

- Issue：https://github.com/gyguan/genealogy/issues/200
- EPIC：https://github.com/gyguan/genealogy/issues/191
- 前置：#199 / PR #215 / `4a6d67315ae434041c170c70f3698bb78522199a`
- 分支：`agent/issue-200-tree-release-gate`
- Draft PR：待创建
- 目标：建立覆盖真实 PostgreSQL、安全投影、拓扑正确性、120+ 人搜索、容量边界、请求状态和关键浏览器交互的最终准出闭环。
- 最后更新时间：2026-07-15 09:05（北京时间）

## 方案与边界

- 使用合成测试数据，不使用真实宗亲或生产隐私数据。
- 后端以真实 PostgreSQL 启动并执行 Flyway，禁止 H2/Mock 替代数据库关键链路。
- 安全矩阵覆盖普通成员、支派负责人和主编，以及跨支派、在世、private、relatives_only、sealed、正式/编辑视图。
- 拓扑矩阵覆盖普通父子、多父、入继、出继、承祧、兼祧、婚配、孤立、重复边、环和截断。
- 浏览器覆盖人物搜索、宗族/支派切换、设为中心、深度切换、缩放、平移、折叠、人物/关系详情、错误与重试。
- 不在准出 Issue 顺带重构业务；发现无关基线问题单独记录。
- 不新增生产依赖或数据库迁移；测试夹具和 CI 编排可独立回滚。

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、CI、PostgreSQL、认证与 Playwright 现场，建立分支/看板/PR | 🔄 进行中 | 已累计约 3 分钟 | 分支与检查点已建立 |
| 2 | 建立可重复的 120+ 人、角色、隐私和关系矩阵测试夹具 | ⏳ 待处理 | — |  |
| 3 | 建立真实 PostgreSQL 后端安全/拓扑/容量集成准出 | ⏳ 待处理 | — |  |
| 4 | 建立浏览器核心交互与摘要可见性 E2E | ⏳ 待处理 | — |  |
| 5 | 编排完整 CI、输出准出矩阵/限制/回滚并 Review 后合入 | ⏳ 待处理 | — |  |

## 验证

- OpenAPI Contract、全量 Backend Verify、真实 PostgreSQL 集成。
- Tree 模型/状态/语义测试、TypeScript、生产构建。
- Playwright 关键浏览器链路与失败证据上传。
- 五轴 Review：Correctness、Readability、Architecture、Security、Performance。

## 恢复检查点

- 当前 Issue：#200
- 当前分支：`agent/issue-200-tree-release-gate`
- Draft PR：待创建
- 当前进行中：创建 PR 并回写 Issue
- CI：未运行
- 阻塞：无
- 下一步：读取现有 PostgreSQL、认证、测试夹具和 Playwright 工作流
