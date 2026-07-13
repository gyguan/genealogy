# Review: 导入任务管理第一阶段

## Correctness

- 人物确认导入统一调用任务型 `/imports/persons.csv`，返回 `ImportJobResponse`。
- 任务列表使用服务端分页、状态和导入类型筛选。
- 错误明细仅在点击单个任务后加载。
- 切换支派会清空文件、预览和重复确认，避免上下文串用。

## Architecture

- Controller 仅处理 HTTP 参数、认证入口和服务调用。
- `ImportJobApplicationService` 负责查询编排。
- `PersonImportCommandApplicationService` 负责导入命令和审计编排。
- `PersonImportFilePolicyService` 负责文件边界策略。
- `PersonImportTemplateApplicationService` 负责模板产出。
- 旧 `/imports/persons` 兼容接口保留在 `CsvImportController`，新任务接口归 `ImportController`。

## Security / Privacy

- 列表按宗族或支派写范围校验。
- 详情先校验宗族成员，再按任务所属支派校验。
- 未选择支派时禁止预览和导入。
- 文件包含 `branchId`、支派 ID 或支派列时后端拒绝。
- 审计日志只记录批次摘要，不记录人物原始行。

## API Contract

- `openapi.imports.json` 覆盖导入领域路径和 Schema。
- 生成脚本合并基础契约与领域分片。
- 生成契约已同步任务导入、分页列表、详情和模板下载。
- 兼容接口已标记 deprecated。

## Performance

- 列表不再逐任务加载错误明细，消除页面链路中的 N+1 查询。
- 列表每页最多 200 条；前端默认 10 条。
- 错误明细按任务加载，客户端每页展示 20 行。

## Verification Status

已完成文件级静态复核及以下回归测试代码：

- 导入任务分页、权限与错误按需加载。
- 支派文件策略。
- 业务模板不含技术 ID。
- 导入成功审计记录。
- Controller Bean 名和路由唯一性。

当前执行环境无法拉取完整仓库，尚未实际执行 Maven、TypeScript、Vite 和 API check；PR 保持 Draft，待 CI 或本地验证通过后再合入。
