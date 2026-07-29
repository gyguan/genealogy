# 后端架构、质量与可观测性治理

## 本地执行

```bash
cd backend/genealogy-backend
mvn verify
mvn -Pdependency-vulnerability-scan -DskipTests -Dspotbugs.skip=true -Djacoco.skip=true verify
```

`mvn verify` 会依次执行构建环境校验、单元测试、ArchUnit、JaCoCo 覆盖率门禁和 SpotBugs 高优先级缺陷检查。集成测试仍由现有 PostgreSQL 流水线执行。

## 架构门禁

`BackendArchitectureTest` 固化以下依赖方向：

- Controller 不得直接依赖 Repository。
- Repository 不得依赖 Application。
- Application 不得依赖 Controller。
- Domain 不得依赖 Controller 或 Repository。

现有精确例外只允许按全限定类名登记，不允许整包排除。规则失败时，ArchUnit 会在 Surefire 报告中列出具体非法依赖。

## 覆盖率

JaCoCo 在 `target/site/jacoco` 生成 HTML 与 XML 报告。当前全后端行覆盖率最低基线为 10%，用于防止重构后覆盖率无约束下降。阈值提升应以真实业务测试为依据，不允许仅为数字编写无价值测试。

## 静态扫描

SpotBugs 在 `verify` 阶段执行，`High` 优先级新增问题直接阻断。`config/spotbugs-exclude.xml` 是可审计历史基线；新增排除必须说明具体规则、原因、到期时间和跟踪 Issue，禁止使用整包排除。

## 依赖与构建环境

Maven Enforcer 要求：

- Java 17，且不接受其他主版本。
- Maven 3.9 及以上。
- POM 不得声明重复依赖版本。
- 依赖解析必须满足上界收敛要求。

PR 使用 GitHub Dependency Review 对新增和升级依赖执行增量扫描，`critical` 严重度问题直接阻断。例外登记在 `.github/dependency-review-config.yml` 的 `allow-ghsas` 中，每条例外必须关联跟踪 Issue，并定期复核。

OWASP Dependency-Check 保留为本地或专项深度扫描 Profile，CVSS 9.0 及以上问题阻断；例外登记在 `config/dependency-check-suppressions.xml`，每条例外必须包含 CVE、到期时间和跟踪 Issue。该深度扫描不放入每次 PR 的快速反馈链路，避免重复下载完整漏洞数据库。

## 图谱查询指标

Actuator 暴露 `health`、`info`、`metrics`、`prometheus`。图谱查询指标包括：

- `genealogy.tree.query.duration`：查询耗时 Timer。
- `genealogy.tree.query.nodes`：返回节点数量。
- `genealogy.tree.query.edges`：返回边数量。
- `genealogy.tree.query.truncated`：发生深度、节点或边截断的次数。
- `genealogy.tree.query.permission_filtered`：因权限、隐私或状态规则被过滤的数量。
- `genealogy.tree.query.errors`：查询异常次数。

指标只使用有限场景标签和异常类型，不记录人物 ID、宗族 ID、分支 ID、姓名、关系内容等敏感或高基数字段。

## 慢查询识别

`GENEALOGY_TREE_SLOW_QUERY_MS` 控制图谱慢查询阈值，默认 1000 毫秒。超过阈值时日志只记录场景、耗时、节点数、边数和是否截断，不记录查询参数或人物数据。

## CI 报告

Backend CI 无论成功或失败都会上传：

- Surefire 测试报告；
- JaCoCo HTML 报告；
- SpotBugs XML/HTML 报告。

依赖增量扫描结果直接写入 PR 检查与摘要。本地 OWASP 深度扫描会在 `target` 目录生成 HTML/JSON 报告。质量报告保留 7 天。
