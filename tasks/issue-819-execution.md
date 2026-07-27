# Issue #819 执行记录

## 目标

根据 #818 首轮失败归因修复测试体系问题，重新执行完整功能测试，并将后续失败继续分类为测试或业务缺陷。

## 已完成整改

- [x] 修复 `PostgreSqlCoreIT.savePerson` 缺少数据库必填默认值；
- [x] 显式设置 `lineageStatus = normal`；
- [x] 显式设置 `hasDescendant = false`；
- [x] 保留 `FT-PERM-001` 与 `FT-REL-002` 原断言；
- [x] 未降低数据库非空约束；
- [x] 未跳过测试或增加 `continue-on-error`。

## 回归状态

新累计 Draft PR 创建后触发 Functional E2E 第二轮运行。实际 Run、失败日志和后续整改将在本文件继续回填。
