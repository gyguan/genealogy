# Issue #976：人物导入异步执行、幂等与断点恢复

## 任务模型

人物文件上传只负责校验、持久化任务及文件载荷，并立即返回任务 ID。后台 Worker 通过数据库租约领取任务，按固定大小批次解析和写入。

执行状态：`queued → running → completed`，中间支持 `paused`、`retry_wait`；终态包含 `completed`、`partial_failed`、`failed`、`cancelled`、`partial_cancelled`、`dead_letter`。

## 幂等边界

- 提交级：以宗族、支派、重复确认参数和文件内容计算 SHA-256 幂等键；相同请求返回已有任务。
- 批次级：`job + stage + row range` 形成唯一批次键；已完成批次不会重复执行。
- 行级：`job + row_no` 形成检查点；应用重启或租约过期后跳过已持久化行。
- 业务数据仍以 `draft` 写入，不绕过重复检测、来源绑定和审核生效链路。

## 恢复与并发

Worker 使用 `FOR UPDATE SKIP LOCKED` 和 `lease_owner/lease_expires_at` 领取任务。租约过期后其他 Worker 可恢复任务；游标、行记录和完成批次确保恢复时不重复已提交结果。

失败采用指数退避进入 `retry_wait`。达到最大重试次数后，无成功结果进入 `dead_letter`，已有成功批次则进入 `partial_failed`，可从失败阶段继续重试。

## 取消

- 首个批次提交前取消：状态为 `cancelled`。
- 已有批次提交后取消：状态为 `partial_cancelled`，已提交草稿保持一致，不再启动新批次。
- 运行中取消通过 `requested_action` 在批次安全点生效。

## 有界内存

HTTP 路由阶段不创建 XLSX `Workbook`，只根据文件大小将 XLSX 路由到异步 Worker。CSV 使用逐行读取；Worker 每次只构造配置的行窗口并提交一个批次。原始文件以持久化载荷保存，任务完成或取消后清理。

## 运维处理

1. 查询 `execution_status`、`execution_stage`、`cursor_row_no`、`processed_count`、`success_count`、`failure_count` 和最近错误。
2. `retry_wait` 会自动重试；`partial_failed/dead_letter` 由有权限用户发起重试。
3. Worker 异常退出时等待租约过期即可恢复，不应人工修改游标。
4. 积压关注 queued/running 数量、最老任务等待时间、行吞吐、失败率、重试次数和租约过期恢复次数。
