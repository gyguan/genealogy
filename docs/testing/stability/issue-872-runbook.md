# Issue #872 长稳与灾备恢复手册

## 目标与指标

- PR 准出：持续负载 3 分钟，完成后端重启和数据库破坏性恢复；
- 24/48/72 小时长稳：在生产等价自托管 Runner 上执行同一脚本；
- 后端重启 RTO：默认不超过 60 秒；
- PostgreSQL 恢复 RTO：默认不超过 120 秒；
- 隔离测试数据 RPO：默认不超过 10 秒；
- 恢复前后正式人物、关系和 Flyway 历史数量必须一致；
- RSS、线程、文件句柄和数据库连接的后段中位数不得超过前段约定比例。

## PR 准出演练

1. 打开 PR 的 **Capacity Load Test**；
2. 确认 `PostgreSQL backup restore and stability drill` Job 已执行；
3. 作业结束后下载 `stability-dr-evidence-*`；
4. 打开 `stability-dr-report.md` 查看结论；
5. 检查 `summary.json`、`resource-growth.json`、备份 SHA-256、恢复前后计数文件；
6. 若任一步骤失败，不得删除 Artifact，应将报告和日志附到整改 Issue；
7. 仅在所有阈值通过、数据计数一致且备份实际恢复成功后给出发布通过结论。

## 24/48/72 小时长稳执行

在安装了 Java 17、PostgreSQL 客户端、jq，并可访问隔离 PostgreSQL 的自托管 Runner 上执行：

```bash
export BASE_URL=http://127.0.0.1:8080
export SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/genealogy
export SPRING_DATASOURCE_USERNAME=genealogy
export SPRING_DATASOURCE_PASSWORD=genealogy
export SPRING_PROFILES_ACTIVE=functional-test
export PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=genealogy PGUSER=genealogy PGPASSWORD=genealogy
export STABILITY_RESULTS_DIR=stability-results
export STABILITY_DURATION_SECONDS=$((24 * 3600)) # 48h/72h 按需调整
export BACKEND_RTO_MS=60000 DATABASE_RTO_MS=120000 RPO_SECONDS=10

mvn -f backend/genealogy-backend/pom.xml -B -DskipTests package
bash scripts/stability/issue-872-drill.sh
```

建议按 24 小时、48 小时、72 小时逐级执行，每次保留完整 Artifact。GitHub-hosted Runner 受单任务时长限制，不用于宣称已完成 24/48/72 小时演练。

## 自动故障演练

演练脚本会自动完成：

- 创建隔离宗族、支派、正式人物和正式关系；
- 持续执行认证后的人物列表与世系查询；
- 采集 CPU、RSS、线程、文件句柄和 PostgreSQL 连接数；
- 停止并重新启动后端；
- 使用重启前的访问令牌验证会话连续性；
- 使用 `pg_dump` 生成自定义格式备份并计算 SHA-256；
- 删除整个 `public` Schema，模拟数据库业务数据完全丢失；
- 使用 `pg_restore` 实际恢复；
- 再次启动应用并验证登录、Flyway、正式人物、关系和世系查询；
- 比较恢复前后数据数量并计算 RTO/RPO。

## 失败处置

- 后端无法启动：保留 `backend.log`，核对端口、数据库连接和 Flyway；
- 资源增长超限：检查 `resource-samples.csv` 和 `resource-growth.json`；
- 备份无法恢复：禁止发布，创建最高优先级整改 Issue；
- 数据计数不一致：禁止发布，核对备份窗口和事务提交时间；
- RTO/RPO 超限：记录实际值、瓶颈和改进负责人后重新演练；
- 长稳任务被 Runner 中断：在生产等价自托管 Runner 重新执行，不将中断结果判为通过。

## 结论边界

CI 演练证明应用级备份能够实际恢复，并验证单 JVM 与单 PostgreSQL 实例的恢复流程。区域级灾备、云磁盘快照、对象存储复制、DNS/WAF/CDN、跨可用区网络和人工值守流程，需要在生产等价基础设施上执行同一检查原则。
