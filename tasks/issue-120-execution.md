# Issue #120 执行看板

- Issue：[#120 建设业务对象搜索与日志业务化展示能力](https://github.com/gyguan/genealogy/issues/120)
- 工作分支：`agent/issue-120-business-object-search`
- 目标：为追踪中心提供受权限和隐私约束的业务对象搜索，并让操作日志优先返回操作者、对象、支派、摘要和结果状态等业务信息。
- 最后更新时间：2026-07-14 09:20（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. Contract First 新增业务对象搜索接口，支持对象类型、关键词、支派、状态、最近变更时间和后端分页。
2. 支持人物、关系、来源、支派和审核事项五类对象；同名人物返回支派、世次、谱名/业务编码等辅助识别信息。
3. 查询在服务端完成当前宗族、可见支派和隐私条件过滤，无权数据不进入响应和总数。
4. 扩展操作日志响应，批量补充 `actorDisplayName`、`targetDisplayName`、`targetBranchName`、`targetSummary`、`resultStatus`。
5. 前端追踪页增加业务对象搜索入口，并使用业务名称填充追踪对象，不要求用户输入技术 ID。
6. 增加 OpenAPI、生成类型、后端权限/分页/隐私/批量聚合测试及前端模型测试。

### 非目标

- 不建设完整追踪聚合时间线；由 #121（S05）负责。
- 不重构追踪中心最终双页签布局；由 #122（S06）负责。
- 不新增 `trace_id`。
- 不修改人物、关系、来源、支派或审核数据的写入、审核和正式生效流程。
- 不新增数据库表或迁移；优先复用现有索引和查询能力。

### 方案、兼容与回滚

- 新增只读接口 `GET /api/v1/tracking/objects`，由独立追踪查询应用服务编排多领域查询。
- 操作日志现有字段保持兼容，仅新增可选业务展示字段；技术字段权限边界沿用 #117。
- 权限以后端为准：先校验登录、宗族成员和 `operation_log.view`，再应用支派范围和对象隐私过滤。
- 搜索分页、主要过滤和总数在数据库查询层完成；当前页批量加载关联对象，禁止逐行查询。
- 如需回滚，可撤销新增接口、DTO、查询服务、日志聚合字段和前端入口；无数据库和数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、前置实现和现有领域聚合模式 | ✅ 已完成 | 约 12 分钟 | 已确认 #117-#119 合入；复用来源绑定业务名称解析模式 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | 🔄 进行中 | 已累计约 3 分钟 | 分支和看板已建立，待创建 PR 与回写 Issue |
| 3 | Contract First 定义对象搜索与日志业务字段 | ⏳ 待处理 | — | OpenAPI Overlay、生成 DTO、契约检查 |
| 4 | 实现数据库分页、权限范围与隐私过滤的对象搜索 | ⏳ 待处理 | — | 人物、关系、来源、支派、审核事项 |
| 5 | 实现操作日志当前页批量业务信息聚合 | ⏳ 待处理 | — | 禁止 N+1，未知操作者显式降级 |
| 6 | 前端接入业务对象搜索和业务化日志展示 | ⏳ 待处理 | — | 保持当前页面布局，不要求输入技术 ID |
| 7 | 补充后端、契约、前端测试并执行完整验证 | ⏳ 待处理 | — | 聚焦测试、API Check、TypeScript、Build |
| 8 | 五轴 Review、处理反馈、同步 main 并自动合入 | ⏳ 待处理 | — | 满足门禁后 squash merge |

## 影响模块

- `docs/api/`：追踪搜索和日志业务字段契约分片。
- `backend/genealogy-backend/src/main/java/com/genealogy/operationlog/`：日志响应业务化聚合。
- `backend/genealogy-backend/src/main/java/com/genealogy/tracking/`：业务对象搜索 Controller、Application Service、DTO、Repository 查询。
- 人物、关系、来源、支派、审核及授权模块：只读 Repository/范围策略复用或最小扩展。
- `frontend/genealogy-web/src/features/logs/`：搜索、对象选择和业务化展示。
- `scripts/api/` 与生成类型：契约生成和一致性检查。

## 验证方案

```bash
cd backend/genealogy-backend
mvn -Dtest=TrackingObjectSearchApplicationServiceTest,TrackingControllerTest,OperationLogApplicationServiceTest test

cd frontend/genealogy-web
npm run api:generate
npm run api:check
npm run test:logs
npm run typecheck
npm run build
```

定向验证：

- 无权限、跨宗族和超支派范围对象不进入结果及总数；
- 在世人物的隐私受限信息不进入搜索结果；
- 同名人物能通过支派、世次和谱名/业务编码区分；
- 五类业务对象按关键词、状态、支派和更新时间分页查询；
- 操作日志当前页批量补充业务名称，不执行逐行 Repository 查询；
- 操作者缺失时返回“未知操作者”，不把用户 ID 作为最终展示文本；
- 前端不手写重复 DTO，不依赖技术 ID 输入。

## 已知风险

- 多领域统一分页容易退化为内存合并；实现必须由数据库查询层提供分页和 count 语义，或明确按单对象类型查询并禁止跨类型伪分页。
- 当前权限模型包含全宗族、精确支派和支派子树范围，需复用既有授权策略，不复制简化判断。
- 人物在世状态、来源隐私级别和审核任务可见性来自不同模块，响应必须最小披露。
- 当前仓库仍有并行 PR；合入前必须重新同步最新 `main` 并复核冲突和契约生成结果。

## 当前恢复检查点

- 当前 Issue：#120
- 当前分支：`agent/issue-120-business-object-search`
- 当前 Draft PR：待创建
- 最后完成任务：读取最新规则、Issue、#117-#119 实现及来源对象名称解析模式
- 当前进行中：建立治理现场
- 当前任务累计耗时：已累计约 3 分钟
- 最新 Commit：由本执行检查点提交生成
- CI 状态：尚未触发
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR、回写 Issue，然后先更新 OpenAPI 契约
- 最后更新时间：2026-07-14 09:20（Asia/Shanghai）

## 耗时汇总

- 已完成任务活跃耗时：约 12 分钟
- 当前进行中累计耗时：已累计约 3 分钟
- 外部等待：GitHub Actions 排队与运行时间不计入活跃耗时
