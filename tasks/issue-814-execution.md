# Issue #814 执行记录

## 目标

将 #813 的覆盖基线转化为可执行、可复用、可追踪的功能测试用例和数据规范。

## 已完成

- [x] 定义统一测试用例编号；
- [x] 覆盖核心建谱、审核、权限、关系和一致性场景；
- [x] 区分真实 E2E、PostgreSQL 集成测试和人工测试；
- [x] 定义测试账号、宗族、支派、人物、关系、字辈和来源数据；
- [x] 定义 `runId` 隔离、初始化和清理策略；
- [x] 定义 CI 环境变量和可重复性要求。

## 产物

- `docs/testing/functional-test-cases.md`
- `docs/testing/functional-test-data.md`

## 后续

- #815 使用 `REAL_E2E` 用例编号实现真实 Playwright；
- #816 使用 `DB_INTEGRATION` 用例编号实现 PostgreSQL 集成测试；
- #817 统一执行两类测试。
