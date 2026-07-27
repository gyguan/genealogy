# Issue #820 执行记录

## 目标

汇总 #813～#819 的测试建设、实际执行、失败归因、业务缺陷整改与最终准出边界，形成可审计的功能测试报告和遗留问题清单。

## 输入

- 覆盖盘点：`docs/testing/functional-test-inventory.md`、`functional-test-coverage.md`；
- 用例与数据：`functional-test-cases.md`、`functional-test-data.md`；
- 首轮结果：`functional-test-first-run.md`；
- 整改记录：`tasks/issue-819-execution.md`；
- 最终有效提交：`678a1d72bb67266d17a4b2b33b6cb478cecbae6f`；
- 最终 Functional E2E Run：`30239097030`；
- 最终 Artifact：`functional-test-evidence-30239097030-1`。

## 输出

- [x] `docs/testing/functional-test-report.md`；
- [x] `docs/testing/functional-test-issues.md`；
- [x] 本执行记录；
- [x] 明确测试环境、覆盖范围、用例结果和证据；
- [x] 区分测试体系问题与业务缺陷；
- [x] 记录 #828 自审治理缺陷及整改；
- [x] 明确准出范围与未覆盖风险。

## 最终执行结果

| 门禁 | 结果 |
|---|---|
| PostgreSQL Integration | 通过，6 个专项场景 |
| Real Playwright | 通过，7 个测试块、8 个用例编号 |
| Backend CI | 通过 |
| Frontend CI | 通过 |
| API Contract | 通过 |
| Culture Page Gate | 通过 |
| Artifact 上传 | 通过 |
| 服务清理 | 通过 |

## 关键结论

1. 已建立从 PostgreSQL 16、Flyway、Spring Boot、动态测试账号、React/Vite 到 Chromium/Playwright 的真实功能测试闭环；
2. 最终有效 Run 中所有关键步骤通过，未使用 Mock 核心 API、跳过测试或放宽业务约束；
3. 已覆盖登录、首次建谱、刷新持久化、深链接、自审阻断、独立审核、三代世系及两类跨宗族权限；
4. 测试建设过程中发现 1 个真实业务缺陷 #828，并完成后端、单元、PostgreSQL 与真实浏览器四层整改验证；
5. 当前结论为“测试体系建设验收通过，具体业务模块发布仍需按遗留清单补充模块级测试”。

## 准出建议

- #812 功能测试体系建设可以关闭；
- #813～#820 在最终代码与报告合入 `main` 后关闭；
- #828 在自审防护合入 `main` 且最终门禁通过后关闭；
- 后续新增 P0 真实 E2E 应复用 `.github/workflows/functional-e2e.yml`、Run 级隔离账号与 Artifact 规范。

## 合并检查

- [ ] 累计实现 PR 合入 `main`；
- [ ] 报告 PR 在最新 `main` 上通过门禁；
- [ ] 关闭被累计 PR 替代的 Draft PR；
- [ ] 关闭 #812～#820 和 #828；
- [ ] 在 EPIC 中回填最终 PR、Run 和 Artifact。