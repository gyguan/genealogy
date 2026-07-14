# Issue #123 执行看板

- Issue：[#123 增加跨模块查看追踪入口与可恢复深链接](https://github.com/gyguan/genealogy/issues/123)
- 工作分支：`agent/issue-123-tracking-deep-links`
- 目标：在五类核心业务页面增加统一“查看追踪”入口，并通过可复制 URL 恢复宗族、对象、页签和详情状态。
- 基线：`main` commit `492a6a32f578787d0fe90482029d9861b23f3de6`，已包含 #122 双页签追踪中心。
- 最后更新时间：2026-07-14 20:05（Asia/Shanghai）

## DEFINE：范围与成功标准

### 实现范围

1. 建立统一追踪深链接协议：`view=auditTrace&tab=object&clanId=<id>&targetType=<type>&targetId=<id>`，审核入口可附带 `reviewTaskId`，但业务对象类型与 ID 必须同时存在。
2. 追踪中心兼容 #122 既有参数，并优先读取统一参数；刷新、复制链接、前进/后退均可恢复。
3. 在人物档案详情、关系记录、来源详情及引用关系、支派记录、审核详情中增加“查看追踪”入口。
4. 入口仅在对象已经由后端成功返回时展示，不基于前端角色常量判断权限。
5. 审核详情跳转使用审核对象的 `targetType + targetId`，不以审核任务 ID 作为唯一追踪对象。
6. 深链接访问无权对象时仅展示统一无权限/不可用状态，不显示来自来源页面的对象摘要。
7. 补充统一深链接与追踪中心状态恢复测试。

### 非目标

- 不新增或修改后端 API、数据库字段、Flyway、审核流程或正式数据写入逻辑。
- 不在来源资料库重复实现追踪时间线。
- 不在审核中心增加操作审计列表。
- 不为单一页面新增全局状态管理库。

### 兼容与回滚

- 保留 `trackingTab/traceType/traceId` 旧参数读取兼容，统一新入口写入 `tab/targetType/targetId`。
- 继续复用 #121 的统一追踪详情接口及其后端权限、支派和隐私校验。
- 回滚只需移除共享深链接工具和各页面入口，并恢复追踪中心参数模型；无数据回滚。

## PLAN：原子任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 刷新规则、Issue、已有现场和五类页面影响范围 | ✅ 已完成 | 约 14 分钟 | 已确认首次启动、无已有分支/PR，不需要 API 变更 |
| 2 | 建立分支、执行看板、Draft PR 和 Issue 启动记录 | 🔄 进行中 | 已累计约 3 分钟 | 分支与初始看板已建立 |
| 3 | 实现统一深链接协议与追踪中心兼容恢复 | ⏳ 待处理 | — | 包含宗族、页签、业务对象和可选审核上下文 |
| 4 | 增加人物、关系、来源/引用、支派、审核详情入口 | ⏳ 待处理 | — | 入口仅基于后端已返回对象展示 |
| 5 | 完善无权限状态与浏览器导航恢复 | ⏳ 待处理 | — | 不泄露对象摘要，支持复制、刷新和前进/后退 |
| 6 | 补充模型测试并执行 typecheck、build、api:check | ⏳ 待处理 | — | 前端定向与组合态验证 |
| 7 | 五轴 Review、处理反馈并合入 main | ⏳ 待处理 | — | Correctness / Readability / Architecture / Security / Performance |

## 影响模块

- `frontend/genealogy-web/src/shared/navigation/`：统一追踪深链接工具与按钮。
- `frontend/genealogy-web/src/features/logs/`：参数兼容、宗族恢复和无权限详情。
- `frontend/genealogy-web/src/features/persons/`：人物详情入口。
- `frontend/genealogy-web/src/features/mvp1/steps/relationship/`：关系记录入口。
- `frontend/genealogy-web/src/features/mvp1/steps/branch/`：支派记录入口。
- `frontend/genealogy-web/src/features/sources/`：来源详情和引用对象入口。
- `frontend/genealogy-web/src/features/reviews/`：审核对象入口。

## 验证计划

```bash
cd frontend/genealogy-web
npm run test:tracking-center
npm run test:logs
npm run typecheck
npm run build
npm run api:check
```

同时核对 Frontend CI、API Contract、Auth Commercial E2E 和 Issue Delivery Governance。

## 已知风险

- 深链接必须携带 `clanId`，否则新浏览器上下文无法确定追踪权限范围。
- 审核中心存在 `import_job/source_binding/generation_scheme/clan` 等当前追踪接口不支持的对象类型；这些任务不展示错误入口。
- 关系与支派页面目前以列表为详情载体，入口应避免触发整表预加载追踪数据或 N+1 请求。

## 当前恢复检查点

- 当前 Issue：#123
- 当前分支：`agent/issue-123-tracking-deep-links`
- 当前 Draft PR：待创建
- 最后完成任务：完成规则、需求、页面和权限边界分析
- 当前进行中：创建 Draft PR 并回写 Issue 启动记录
- 当前任务累计耗时：已累计约 3 分钟
- 最新 Commit：本次初始化看板提交
- CI 状态：未运行
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：创建 Draft PR，并实现统一深链接纯函数及测试
- 最后更新时间：2026-07-14 20:05（Asia/Shanghai）

### 耗时汇总

- 已完成任务活跃耗时：约 14 分钟
- 当前进行中累计耗时：已累计约 3 分钟
- 外部等待：无
