# Issue #818 执行记录

## 目标

执行首轮真实功能测试，检查 Actions、PostgreSQL、Flyway、Spring、Playwright 和失败日志，并形成可复现归因。

## 执行证据

- 提交：`6ab29acb38f93d357af5e012fc8ace69b4d26925`
- Functional E2E Run ID：`30235865817`
- Job ID：`89883457068`
- Artifact：`functional-test-evidence-30235865817-1`

## 结果

- [x] Backend CI 通过；
- [x] Frontend CI 通过；
- [x] API Contract 通过；
- [x] Culture Page Gate 通过；
- [ ] Functional E2E 通过；
- [x] PostgreSQL Service、Testcontainers、40 个 Flyway 迁移和 Hibernate 校验成功；
- [x] 失败日志和 Artifact 可获取；
- [x] 失败归因为测试 Fixture 缺陷；
- [x] 当前未发现业务缺陷证据。

## 失败

`PostgreSqlCoreIT.savePerson` 未设置数据库必填字段 `person.lineage_status`，导致 `FT-PERM-001` 和 `FT-REL-002` 在前置数据创建时失败。

## 后续

由 #819 修复测试数据并重新执行完整 Functional E2E；不得跳过用例或降低数据库约束。
