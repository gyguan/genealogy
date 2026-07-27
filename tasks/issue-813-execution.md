# Issue #813 执行记录

## 目标

盘点现有功能和自动化测试覆盖，建立真实功能测试建设基线。

## 已完成

- [x] 盘点正式功能入口；
- [x] 盘点后端模块及高风险路径；
- [x] 区分单元、模型、契约、Mock E2E、数据库集成和真实 E2E；
- [x] 分析 Backend CI、Frontend CI 与 Playwright 现状；
- [x] 输出功能覆盖矩阵；
- [x] 输出 P0/P1/P2 风险与后续优先级。

## 产物

- `docs/testing/functional-test-inventory.md`
- `docs/testing/functional-test-coverage.md`

## 验证

本 Issue 仅新增 Markdown 文档，不修改业务代码、API、数据库和工作流。已检查文档中的功能入口、测试命令和 CI 结论与仓库当前配置一致。

## 后续

由 #814 将覆盖基线转化为具备唯一编号的测试用例和测试数据方案。
