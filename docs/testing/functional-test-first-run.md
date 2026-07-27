# 首轮真实功能测试执行报告

> Issue：#818  
> 执行日期：2026-07-27  
> 目标提交：`6ab29acb38f93d357af5e012fc8ace69b4d26925`  
> Functional E2E Run：`30235865817`，Run #1

## 1. 执行范围

本次 GitHub Actions 同时触发：

| 工作流 | 结果 |
|---|---|
| Backend CI #2851 | 通过 |
| Frontend CI #1800 | 通过 |
| API Contract #1861 | 通过 |
| Culture Page Gate #454 | 通过 |
| Functional E2E #1 | 失败 |

Functional E2E 执行到 `Run PostgreSQL integration tests` 后失败，后续后端启动、账号初始化、前端启动和真实 Playwright 被正确阻断，没有产生假通过。

## 2. 已验证成功的基础能力

- GitHub Actions PostgreSQL 16 Service 成功启动并通过健康检查；
- Docker Runtime 可用，Testcontainers 可以启动真实 PostgreSQL；
- 空数据库完成 40 个 Flyway 迁移；
- Schema 最终到达 `v20260724220000`；
- Hibernate `ddl-auto=validate` 成功；
- Spring Boot 集成测试上下文启动成功；
- 5 条 PostgreSQL 集成测试中 3 条通过；
- 失败日志和 Artifact 正常上传。

## 3. 失败清单

### FR-001：测试人物 Fixture 缺少必填字段

- 分类：测试数据缺陷；
- 严重级别：P0（阻断真实功能测试继续执行）；
- 影响用例：
  - `FT-PERM-001`；
  - `FT-REL-002`；
- 失败位置：`PostgreSqlCoreIT.savePerson`；
- 数据库错误：PostgreSQL SQLState `23502`；
- 具体原因：`person.lineage_status` 为数据库非空字段，测试 Fixture 创建人物时未设置该字段；
- 结果：人物写入提前失败，两个用例尚未到达各自的权限隔离和自关系断言；
- 是否业务缺陷：否。正式业务创建流程会设置领域默认值，本次问题发生在测试直接构造实体的 Fixture；
- 修复建议：在 `savePerson` 中显式设置 `lineageStatus = normal`，并补齐其他数据库必填默认值，防止测试依赖数据库默认与 JPA Insert 行为差异。

## 4. 归因统计

| 分类 | 数量 | 说明 |
|---|---:|---|
| 环境问题 | 0 | Runner、Docker、PostgreSQL Service 和 Testcontainers 均正常 |
| 工作流脚本问题 | 0 | 步骤阻断、日志和 Artifact 行为符合预期 |
| 测试数据问题 | 1 | FR-001，影响两条测试 |
| 测试断言问题 | 0 | 尚未执行到目标断言 |
| 业务缺陷 | 0 | 当前没有证据支持业务缺陷结论 |
| 性能问题 | 0 | 未进入性能测试 |
| 偶发不稳定 | 0 | 失败稳定且原因明确 |

## 5. 整改顺序

1. 在 #819 修复人物 Fixture 必填字段；
2. 重新触发完整 Functional E2E；
3. 若 PostgreSQL 集成测试通过，再继续分析后端启动、账号初始化和真实 Playwright；
4. 后续新失败继续按环境、脚本、数据、业务和不稳定分类；
5. 不跳过 `FT-PERM-001` 或 `FT-REL-002`，不降低数据库约束。

## 6. 首轮结论

首轮执行证明了真实 PostgreSQL、Flyway、Hibernate 校验和测试 Artifact 链路已经可运行，但由于 Fixture 缺陷，尚未完成真实浏览器 E2E。当前状态为：

```text
测试基础设施可用
+ 数据库初始化通过
+ 测试数据缺陷阻断
= 不满足功能测试准出
```
