# Issue #816 执行记录

## 目标

增加基于真实 PostgreSQL 的后端集成测试，覆盖 Flyway、JPA 校验、数据隔离、关系约束、事务回滚和并发唯一性。

## 已完成

- [x] 引入 Testcontainers PostgreSQL 与 JUnit Jupiter；
- [x] 配置 Maven Failsafe `integration-test/verify`；
- [x] 新增 `integration-test` Spring Profile；
- [x] 空库执行完整 Flyway 并验证核心表；
- [x] 验证不同宗族人物查询不混合；
- [x] 验证数据库拒绝人物自关系；
- [x] 验证并发唯一键仅允许一个事务提交；
- [x] 验证异常导致业务事务整体回滚；
- [x] 输出独立执行命令和失败报告位置。

## 用例

- `FT-FAIL-003`
- `FT-PERM-001`
- `FT-REL-002`
- `FT-STATE-004`
- 事务回滚专项

## 验证边界

代码和 Maven 生命周期配置已完成。当前 ChatGPT 执行环境无法连接 Docker，因此未在本地声称 Testcontainers 已运行；由 #817 的 GitHub Actions 在具备 Docker 的 runner 上执行真实验证。

## 后续

#817 将 `mvn -B -DskipITs=false verify` 与真实 Playwright 一并接入功能测试流水线。
