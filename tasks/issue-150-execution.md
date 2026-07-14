# Issue #150 执行看板

## Issue 与目标

- Issue：#150 `[数据库] 修复重复 Flyway V3 导致后端无法启动`
- 工作分支：`agent/issue-150-fix-duplicate-flyway-v3`
- Draft PR：#151
- 目标：消除重复 Flyway V3，恢复 PostgreSQL 空库迁移、JPA `entityManagerFactory` 创建和后端健康检查，并提升启动失败诊断能力。

## 本次实现范围

- 核对重复 V3 的具体文件、内容与历史风险。
- 修复重复版本，不通过修改认证 Bean、关闭 JPA 或 `flyway repair` 绕过问题。
- 在后端启动检查前执行迁移文件唯一性校验。
- 对齐本地默认 Flyway 配置、README 与 CI 启动语义。
- 使用 PostgreSQL 16 空库验证完整启动链路。

## 非目标

- 不修改认证、权限、隐私或审核业务逻辑。
- 不变更公共 API。
- 不进行无关数据库重构。

## 影响模块

- `backend/genealogy-backend/src/main/resources/db/migration`
- `backend/genealogy-backend/src/main/resources/application.yml`
- `.github/scripts/backend-startup-check.sh`
- `backend/genealogy-backend/README.md`

## 执行任务看板

| 序号 | 任务 | 状态 | 耗时 | Commit / 结果或说明 |
|---|---|---|---|---|
| 1 | 读取规则、配置、迁移历史和失败日志并确认根因 | ✅ 已完成 | 约 20 分钟 | 最深层异常为重复 Flyway V3；认证 Bean 为连带失败 |
| 2 | 建立 Issue、分支、执行看板、Draft PR 和 Issue 启动记录 | ✅ 已完成 | 约 2 分钟 | Issue #150、分支、PR #151 和启动评论已建立 |
| 3 | 增加迁移唯一性前置诊断并定位重复文件 | 🔄 进行中 | 已累计约 1 分钟 | Commit `103a7353` 已让 Startup Check 在启动前执行迁移校验；等待 CI 输出具体文件名 |
| 4 | 修复重复 V3 并处理历史兼容风险 | ⏳ 待处理 | — |  |
| 5 | 对齐默认 Flyway 配置和本地启动文档 | ⏳ 待处理 | — |  |
| 6 | 执行迁移检查、后端测试和 PostgreSQL 16 启动验证 | ⏳ 待处理 | — |  |
| 7 | 完成五轴 Review、更新看板并满足合入门禁 | ⏳ 待处理 | — |  |

## 验证方案

- `cd backend/genealogy-backend && ./scripts/check-flyway-migrations.sh`
- `cd backend/genealogy-backend && mvn test`
- PostgreSQL 16 空库启动检查，确认 Flyway、Hibernate schema validation、Tomcat 和 `/api/v1/health`。
- 检查 GitHub Actions 中 Backend CI 与数据库迁移治理结果。

## 已知风险

- 历史 Flyway 文件原则上不可修改；若重复脚本含有效内容，必须通过高版本幂等前向迁移补偿。
- 旧本地数据库可能与当前迁移历史不一致，必要时需清理 Docker volume 后重建。
- 全仓测试可能存在与本 Issue 无关的历史基线失败，需与本次启动验证分开记录。

## 当前进行中

读取 Backend CI 的迁移唯一性检查结果，确认两份 V3 的准确文件名。

## 下一步最小任务

根据 CI 输出读取两份 V3 内容与提交历史，决定删除误留文件还是增加高版本幂等前向补偿。

## 未完成项

任务 4～7 尚待执行。

## 耗时汇总

- 已完成任务活跃耗时：约 22 分钟
- 当前进行中累计耗时：已累计约 1 分钟
- 外部等待：Backend CI 运行中，不计入活跃耗时
- 未记录历史任务：0 项

## 恢复检查点

- 当前 Issue：#150
- 当前分支：`agent/issue-150-fix-duplicate-flyway-v3`
- 当前 PR：#151（Draft）
- 最新 Commit：`103a735322ebfc055a3eba5b5100841396befbe7`
- 最后完成任务：建立治理现场并增加迁移唯一性前置诊断
- 当前进行中：读取 CI 的重复 V3 文件名
- 当前任务累计耗时：已累计约 1 分钟
- CI 状态：Backend CI 运行中；Issue Delivery Governance 因旧耗时格式失败，已修正看板
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：读取 CI 输出并核对两份 V3 内容
- 最后更新时间：2026-07-14 10:52（Asia/Shanghai）
