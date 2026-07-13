# Issue #102 执行看板

## Issue

- 链接：https://github.com/gyguan/genealogy/issues/102
- 标题：成员权限体验、契约与治理能力完善
- 工作分支：`agent/issue-102-member-permission-p1`
- Draft PR：https://github.com/gyguan/genealogy/pull/115

## 目标

在 Issue #101 的权限安全闭环基础上，完成查询状态、错误契约、权限审计、目标级数据最小化、高风险交互和文档测试一致性。

## 非目标

对象级临时授权、权限有效期、自定义角色、双人复核和全局权限架构重构不在本 Issue 范围。

## 方案与回滚

- Contract First：OpenAPI 先于后端和前端实现更新。
- 审计查询复用 `operation_log` 的结构化字段和数据库分页，不新增数据库表。
- 审计接口强制校验 `operation_log.view` 和目标可见范围。
- 聚合响应只披露操作者可见授权；最后管理员、成员停用等安全判断继续使用全部有效授权。
- 前端状态、审计接口和授权明细裁剪均可按原子提交回滚，不影响已有授权数据。

## 原子任务看板

| 序号 | 原子任务 | 状态 | 验收结果 |
|---|---|---|---|
| 1 | 建立 Issue 执行现场、Draft PR 和恢复检查点 | ✅ 已完成 | 分支、任务文件、Draft PR #115 和 Issue 评论已建立 |
| 2 | 更新 OpenAPI 错误契约和审计查询契约 | ✅ 已完成 | 全部成员权限接口声明 400/401/403/404/409，新增审计分页契约 |
| 3 | 实现成员权限审计查询和后端权限校验 | ✅ 已完成 | 支持成员、授权、操作者、动作和时间筛选，数据库分页，后端强制权限检查 |
| 4 | 裁剪不可见授权并保持全量安全校验 | ✅ 已完成 | 响应按目标范围裁剪，最后管理员与成员状态判断仍使用全部有效授权 |
| 5 | 重构前端查询状态和写后刷新 | ✅ 已完成 | 草稿筛选与已生效查询分离，重置、切族、翻页和刷新显式传参 |
| 6 | 完善能力说明、范围预览、高风险确认和错误提示 | ✅ 已完成 | 统一客户端保留业务错误码，高风险角色二次确认 |
| 7 | 在成员 Drawer 接入权限变更历史 | ✅ 已完成 | 展示操作者、前后值、原因和时间，不展示技术 ID |
| 8 | 统一权限文档和角色范围矩阵 | ✅ 已完成 | docs/09、docs/11、OpenAPI 与代码术语一致 |
| 9 | 补充测试、执行验证和五轴 Review | 🔄 进行中 | 最终验证工作流已启动；治理门禁因 PR 描述结构未更新而失败，正在修复 |
| 10 | 更新 PR/Issue、清理临时资产并完成合入 | ⏳ 待处理 | 待验证通过后删除临时脚本/工作流、转 Ready 并合入 |

## 验证范围

### 后端

- Java 17 编译。
- `GlobalExceptionHandlerTest`
- `MemberGrantVisibilityPolicyTest`
- `MemberPermissionAuditControllerTest`
- `MemberPermissionAuditApplicationServiceTest`
- 原有成员权限、范围和分页测试。

### 前端与契约

- `npm run test:members`
- `npm run api:check`
- `npm run typecheck`
- `npm run build`
- OpenAPI 和文档契约检查。

## 五轴 Review

- Correctness：查询条件、审计筛选、分页和前后值展示使用明确契约。
- Architecture：复用统一 API 客户端、`operation_log` 和现有成员权限策略服务。
- Security：HTTP 状态与错误码一致，审计和授权明细均执行范围控制。
- Performance：成员和审计均数据库分页，关联对象批量加载。
- Documentation consistency：状态、角色、范围、权限码、接口和 P2 边界已统一。

## 恢复检查点

- 当前 Issue：#102
- 当前分支：`agent/issue-102-member-permission-p1`
- 当前 Draft PR：#115
- 最后完成任务：代码、OpenAPI、前端页面、聚焦测试和文档实现完成
- 当前进行中：修复 PR 治理描述并等待最终验证结果
- 最新 Commit：`8846063c500e5d33c7d15e6a03fbf06560cee9a5`
- CI 状态：Issue Delivery Governance 因 PR 必填章节缺失失败；API Contract、Backend CI 和专项验证正在运行
- 未解决 Review：无
- 已知阻塞：无业务阻塞；需完成最终验证和临时资产清理
- 下一步最小任务：更新 PR 描述满足治理模板，读取各验证 Job 结果并修复回归
- 最后更新时间：2026-07-13 20:30 CST
