# Issue #132 执行看板：认证测试、文档与生产准出

- Issue：https://github.com/gyguan/genealogy/issues/132
- 工作分支：`agent/issue-130-132-auth-security-closure`
- 目标：将现有专项测试升级为真实 PostgreSQL 与浏览器 E2E 准出，并修复阻断启动验收的迁移基线。

## 方案与影响

- 引入 Playwright 作为浏览器 E2E 工具，仅用于认证主路径。
- E2E 使用真实 PostgreSQL、真实后端和真实前端，不以模型测试替代浏览器行为。
- 历史重复 `V3` 迁移不改名、不删除；通过更高版本前向治理或 Flyway 配置隔离解决启动阻断，方案必须符合数据库规范。
- 增加 CI Job，覆盖登录、退出、会话恢复、过期/撤销、密码重置与生产构建敏感信息扫描。

## 回滚

- 新增测试依赖和 CI 可独立回退，不影响运行时业务。
- 数据库只允许更高版本前向补偿，不执行 `flyway repair`，不修改已存在历史迁移。

## 任务

| 序号 | 任务 | 状态 |
|---|---|---|
| 1 | 核对现有测试、文档和 CI 缺口 | ✅ 已完成 |
| 2 | 建设真实 PostgreSQL + 浏览器 E2E | 🔄 进行中 |
| 3 | 修复启动验收阻断并补齐 CI | ⏳ 未开始 |
| 4 | 全量验证、Review、合入与 Issue 收口 | ⏳ 未开始 |

## 当前检查点

- 已确认现有前端仅有 Node 模型测试，尚无 Playwright/Cypress 浏览器 E2E。
- 已确认 PostgreSQL Startup Check 被历史重复 `V3` 迁移阻断。
- 下一步：建立 E2E 基础设施并确定不修改历史迁移的启动治理方案。
