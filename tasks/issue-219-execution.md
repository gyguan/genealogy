# Issue #219 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/219
- 目标：补齐后端 API 请求日志与异常堆栈日志。
- 工作分支：`agent/issue-219-api-logging`
- Draft PR：https://github.com/gyguan/genealogy/pull/222
- 最后更新时间：2026-07-15（北京时间）

## 任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、Issue 和现有日志实现现场 | ✅ 已完成 | 约 4 分钟 | 已读取需求、规则、异常处理和审计日志实现 |
| 2 | 建立分支、执行看板和 Draft PR | ✅ 已完成 | 约 4 分钟 | `8a7d038` 建立看板，PR #222 已创建并回写 Issue |
| 3 | 新增统一 API 请求日志 Filter | ✅ 已完成 | 约 8 分钟 | `84c6440`、`508140d`，新增轻量 API 请求日志 Filter，修复异常捕获编译风险 |
| 4 | 补齐全局异常日志与审计失败 warn | ✅ 已完成 | 约 10 分钟 | `85f3dc3`、`61ee9bc`，未知异常输出堆栈，业务/校验异常输出摘要，审计写入失败 warn |
| 5 | 补充轻量测试或最小验证说明 | ✅ 已完成 | 约 4 分钟 | `0ab08c4`，新增 Filter 作用范围与链路透传测试 |
| 6 | 检查 diff、更新 PR 和 Issue 收尾 | 🔄 进行中 | 已累计约 2 分钟 | 正在核对 diff 与自动门禁状态 |

## 实现内容

- 新增 `ApiRequestLoggingFilter`，仅对 `/api/**` 请求输出轻量访问日志；
- 访问日志包含 method、path、status、costMs、requestId、clientIpMasked、exceptionType；
- `GlobalExceptionHandler` 增加 BusinessException、参数校验异常和未知异常日志；
- 未知异常使用 `log.error(..., exception)` 输出堆栈；
- `OperationLogApplicationService.record(...)` 审计日志写入失败时输出 warn，但不阻塞主业务链路；
- 新增 `ApiRequestLoggingFilterTest` 覆盖过滤范围和请求链路透传。

## 非目标

- 不开启 SQL 全量日志；
- 不引入重型可观测平台；
- 不改变 API 响应结构；
- 不记录完整请求体或响应体。

## 验证结果

- 本次未执行本地命令；
- 已通过远程 GitHub diff 进行静态检查；
- 待 Backend CI 自动门禁反馈。

## 当前进行中

核对 PR diff、自动门禁和最终收尾状态。

## 下一步最小任务

确认 Backend CI 状态；如自动门禁通过，则转 Ready 并合入 main。

## 恢复检查点

- 当前 Issue：#219
- 当前 PR：#222
- 当前分支：`agent/issue-219-api-logging`
- 最新完成任务：API 请求日志、异常日志、审计失败 warn 和聚焦测试已提交
- 当前进行中：diff 与自动门禁核对
- 未解决阻塞：无
