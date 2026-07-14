# Issue #132 执行看板：认证测试、文档与生产准出

- Issue：https://github.com/gyguan/genealogy/issues/132
- 工作分支：`agent/issue-130-132-auth-security-closure`
- Pull Request：https://github.com/gyguan/genealogy/pull/143
- 状态：✅ 实现与专项验证完成，正在执行最新 HEAD 的默认准出门禁。

## 已完成

- 引入 Playwright Chromium 浏览器 E2E，不以 Node 模型测试替代真实页面行为。
- E2E 使用真实 PostgreSQL 16、真实 Spring Boot 后端和真实 Vite 前端。
- 测试运行时创建随机账号，不依赖演示账号、固定密码或生产数据。
- 覆盖错误登录、Cookie 会话恢复、设备列表、退出、邀请开通、密码重置、旧会话失效和重置凭据重放拒绝。
- 新增长期 CI：`.github/workflows/auth-commercial-e2e.yml`。
- 保留历史重复 Flyway 文件不变，运行包选择基准迁移并通过唯一高版本迁移前向补齐最终状态。
- 修复 PostgreSQL Startup Check，干净数据库可从 V1 完整迁移并启动。
- 修复新旧导入 Controller 的 `/imports/relationships*` 路由所有权重叠。
- 新增收口文档：`docs/16-auth-security-readiness-closure.md`。

## 验证证据

- 完整 Maven 测试套件通过。
- PostgreSQL 16 + Flyway 干净库启动通过。
- Database Migration Governance 通过。
- 前端认证/成员模型测试通过。
- TypeScript Typecheck、OpenAPI Contract、生产构建和敏感凭据扫描通过。
- Playwright 三条认证主链路全部通过。

## 数据库治理

- 不修改、删除或重命名历史迁移。
- 不使用 `flyway repair`。
- 唯一前向迁移：`V20260714070000__rebuild_legacy_duplicate_migrations.sql`。
- 回滚继续采用更高版本前向补偿，不恢复冲突迁移到运行包。

## 发布准出

PR 合入前必须满足：

- Backend CI 中完整测试、商用前端构建和 PostgreSQL 启动通过；
- API Contract、Database Migration Governance、Issue Delivery Governance 通过；
- Auth Commercial E2E 通过；
- 无临时脚本、诊断工作流或诊断文件残留；
- Review 无未解决线程。

## 当前检查点

- 最新 HEAD 已进入正式默认 CI、迁移治理和浏览器 E2E 准出。
