# Issue #795 执行记录

## 状态

已完成。

## 实现

- 新增页面无关的质量检查对象、结果、范围和适配器契约；
- 统一定义 `REVIEW_TASK / WORKBENCH_SESSION / DRAFT_IDS / QUERY` 范围，并保留 `TASK_IDS` 兼容别名；
- 抽取规则注册表和共享规则执行引擎；
- 将审核任务及审核快照读取迁移到 `ReviewTaskQualityScopeAdapter`；
- `ReviewQualityCheckApplicationService` 仅负责流程、持久化、并发保护、状态流转和审计；
- 保持审核质量检查 API、数据库字段和审核通过门禁兼容；
- 为后续修谱工作台适配器提供 `QualityCheckScopeAdapter` 明确接口；
- 增加共享内核和范围兼容单元测试。

## 验证

- 后端单元测试；
- API Contract；
- 前端及页面回归门禁。
