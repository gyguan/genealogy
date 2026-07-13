# Review: 导入失败行修正与单行重试

## Correctness

- 失败行默认按 `invalid + retry_failed` 服务端分页查询。
- 重试请求只允许人物业务字段，不接收支派、宗族或人物技术 ID。
- 目标宗族和支派始终从导入批次读取。
- 修正数据写入 `corrected_data`，原始 `raw_data` 保持不变。
- 成功重试生成一条人物草稿并关联导入行。
- 校验失败后仍保存修正内容、重试次数、错误码和错误信息。
- 成功行、版本冲突行、审核锁定批次均不能重复重试。
- 最后一个失败行修复后，批次自动进入 `ready_for_review`。
- 兼容 `import_job_error` 与新行状态保持同步。

## Readability

- 行查询、修正、重试和批次重算集中在 `ImportJobRowApplicationService`。
- Controller 只接收参数、鉴权入口和调用应用服务。
- 前端将失败行处理封装在现有导入任务面板内，没有新增重复页面或菜单。
- 业务状态和展示文本均使用“待修正、草稿、重试未通过”等业务语言。

## Architecture

- 本 PR 基于 #92 的 `import_job_row` 与批次状态机，是堆叠垂直切片。
- API 契约先于 Controller 和前端调用更新。
- 失败行使用服务端分页，没有重新依赖旧的全量 errors 数组。
- 审核任务创建和正式入谱仍留在下一切片，未把审核逻辑塞入行重试服务。
- 关系导入未进入本 PR。

## Security / Privacy

- 查询和修正均先校验宗族成员，再校验任务所属支派写范围。
- 审核中、已通过或已取消批次不可修改。
- API 不返回 `draft_person_id`，仅返回 `draftCreated`。
- 操作日志只记录批次、行号、结果和错误码，不复制人物原始行或修正字段。
- 前端不展示任务、人物或支派技术 ID；行 ID 仅用于内部接口定位。

## Performance

- 失败行查询使用服务端分页和 `(job_id, row_status, row_no)` 索引。
- 单行重试仅查询当前任务、当前行和重复人物计数。
- 批次重算使用数据库 count，不加载整个批次到内存。
- 当前每次重试执行三次计数查询，适合 P0 单行修正；后续批量重试需改为一次聚合统计。

## Verification

已通过临时定向 CI，工作流验证后已删除：

- 后端 `mvn -DskipTests package`。
- `ImportApplicationServiceRowStateTest`。
- `ImportJobRowApplicationServiceTest`。
- `npm run api:check`。
- `PersonImportWorkspace` 与 `ImportJobManagementPanel` 定向 TypeScript 检查。
- `npm run build`。

仓库全量检查仍可能受到历史 Java 测试、全局 TypeScript 错误和重复 Flyway `V3` 迁移影响；本次新增范围已通过定向验证。

## Remaining Work

下一切片 P0-3：

- 批次提交审核接口。
- `import_job` 作为审核对象接入通用审核中心。
- 批次审核摘要与审核中心业务标题。
- 禁止提交人自审。
- 审核通过后将批次关联人物草稿统一转为正式数据。
- 驳回后允许修正并创建新的审核轮次。
