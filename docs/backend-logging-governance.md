# 后端日志与审计治理规范

## 1. 职责边界

- **运行日志**：用于故障定位、性能分析、状态迁移和安全异常识别，输出到应用日志平台。
- **操作审计**：用于回答“谁在何时对什么对象做了什么”，写入 `operation_log`，不得仅用运行日志替代。
- 审计写入采用 best-effort 语义：审计库异常不得回滚主业务，但必须产生 WARN、失败指标和健康状态。

## 2. 事件命名与固定字段

新增关键日志统一使用小写下划线事件名，并采用键值格式：

```text
event=review_apply_failed requestId=... traceId=... actorId=... clanId=... targetType=person targetId=123 result=failed errorCode=REVIEW_APPLY_FAILED costMs=42
```

关键事件至少保留以下字段；无值时输出空字符串，不临时更换键名：

- `event`
- `requestId`
- `traceId`
- `actorId`
- `clanId`
- `targetType`
- `targetId`
- `result`
- `errorCode`
- `costMs`

## 3. 日志级别

- `DEBUG`：检查点、内部决策、普通允许访问、快速查询细节。
- `INFO`：正常状态迁移、任务开始/完成、普通参数错误、对象不存在、业务冲突。
- `WARN`：安全拒绝、越权尝试、可恢复失败、重试、审计写入失败。
- `ERROR`：未知系统异常、不可恢复终态失败、数据不一致，必须携带异常堆栈。

普通 400/404 不应无差别输出 WARN。`AUTH_CSRF_INVALID`、登录限流、越权和高风险拒绝仍使用 WARN。

## 4. 敏感信息禁止项

运行日志禁止直接输出：

- 密码、密码哈希
- Authorization、Cookie
- Session Token、CSRF Token、重置 Token
- 完整手机号、邮箱和在世人员敏感资料
- CSV/XLSX 原始行、文件正文
- 附件物理路径或临时签名地址
- SQL 全量参数

仅允许记录稳定标识、脱敏摘要、Hash 前缀、行号和错误码。`SensitiveLoggingArchitectureTest` 会扫描生产代码中的 logger 调用，并在发现典型敏感参数时使 `mvn verify` 失败。

## 5. 操作审计监控

Prometheus/Actuator 暴露：

- `genealogy_operation_log_write_total{result="success"}`
- `genealogy_operation_log_write_total{result="failure"}`
- `genealogy_operation_log_write_failure_ratio`
- `genealogy_operation_log_write_consecutive_failures`

`operationLogWrite` 健康组件在连续失败达到阈值后返回 `DEGRADED`，不会主动改变业务事务。阈值通过以下配置调整：

```yaml
genealogy:
  operation-log:
    health:
      consecutive-failure-threshold: 3
```

建议告警：

- 连续失败数达到阈值；
- 5 分钟窗口失败率持续高于 5%；
- 失败计数持续增长但业务请求仍成功。

## 6. 慢查询

树查询、批量导入等复杂操作超过模块阈值时记录 WARN/INFO 汇总，字段包括查询模式、规模、耗时和限制值。普通快速查询只使用指标或 DEBUG，不记录完整 SQL 参数和 ID 集合。

## 7. 示例

普通业务拒绝：

```text
event=api_business_exception requestId=... result=rejected errorCode=MEMBER_NOT_FOUND status=404 path=/api/v1/members/1 costMs=0
```

安全拒绝：

```text
event=api_business_exception requestId=... result=rejected errorCode=AUTH_CSRF_INVALID status=403 path=/api/v1/review/1 costMs=0
```

未知异常：

```text
event=api_unexpected_exception requestId=... result=failed errorCode=COMMON_SYSTEM_ERROR status=500 path=/api/v1/... costMs=0 exceptionType=...
```
