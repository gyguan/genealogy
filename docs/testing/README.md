# 测试与发布验证

本目录只保留可重复执行、仍需持续维护的测试方法、数据、覆盖基线和准出规则。阶段报告、Issue 执行记录和一次性结论统一移入 `docs/archive/testing/`。

## 功能测试

- `functional-test-cases.md`：核心业务测试用例。
- `functional-test-coverage.md`：覆盖范围与基线。
- `functional-test-data.md`：测试数据构造和隔离规则。
- `functional-test-ci.md`：功能测试 CI 运行方式。

## 集成与验收

- `acceptance/mvp1-api.md`：MVP 1 API 验收。
- `acceptance/mvp1-integration.md`：MVP 1 前后端联调。
- `postgresql-integration-tests.md`：真实 PostgreSQL 集成测试。

## 前端与兼容性

- `visual-release.md`：视觉发布准出。
- `multi-browser-support-matrix.md`：浏览器支持矩阵。

## 专项验证

- `performance/capacity-testing.md`：容量与并发测试。
- `security/penetration-testing.md`：安全渗透验证。
- `stability/recovery-runbook.md`：长稳、灾备和恢复演练。
- `uat/uat-plan.md`：业务 UAT 方案。
- `uat/signoff-template.md`：UAT 签署模板。

## 维护规则

- 测试规则应对应可执行命令、脚本或 CI；
- 报告中的临时数量、日期和结论不得升级为长期规则；
- Issue 完成后的执行记录移入 Archive；
- 测试入口、命令、数据结构或准出门禁变化时同步更新本文件。
