# Issue #102 执行看板

## Issue

- 链接：https://github.com/gyguan/genealogy/issues/102
- 标题：成员权限体验、契约与治理能力完善
- 工作分支：`agent/issue-102-member-permission-p1`
- Draft PR：https://github.com/gyguan/genealogy/pull/115

## 目标

在 Issue #101 已完成的角色与范围安全闭环基础上，完善成员权限管理的交互状态、错误契约、审计查询、前端风险提示、数据最小化和测试一致性，使权限能力可理解、可追踪、可维护。

## 实现范围

1. 前端成员列表筛选、分页、宗族切换和写操作后的刷新状态统一。
2. `docs/09-permission-management.md`、`docs/11-member-permission-hardening.md`、OpenAPI 和代码术语对齐。
3. 成员权限接口补充统一错误响应与稳定业务错误码契约。
4. 提供成员权限变更审计查询接口，并在成员 Drawer 展示当前成员授权历史。
5. 授权表单补充能力说明、范围预览、高风险二次确认及可理解错误提示。
6. 支派管理员聚合响应仅返回其可见范围内的授权明细，但后端安全校验继续使用全部有效授权。
7. 补充前端交互、OpenAPI、审计权限和文档矩阵一致性测试。

## 非目标

- 对象级临时授权。
- 权限有效期和自动失效。
- 自定义角色。
- 双人复核。
- 重构全局权限架构或替换现有操作日志模块。

## 方案、影响与回滚

### 公共 API

- Contract First：先更新 `docs/api/openapi.json` 和成员权限契约片段，再生成前端类型，之后实现后端和前端。
- 新增成员权限审计查询接口，不修改现有成功响应字段语义；授权明细可见范围裁剪属于数据最小化增强。
- 错误响应统一复用现有 `ApiResponse` 错误结构，不引入第二套协议。

### 权限与隐私

- 审计接口要求 `operation_log.view` 或等价管理权限，并在后端强制校验。
- 支派管理员只能查看自身管理范围内的授权明细；成员停用、移除、最后管理员等安全判断仍基于全部有效授权，不使用裁剪后的响应数据。
- 前端错误提示基于稳定错误码映射，未知错误保留后端安全消息或统一兜底，不展示堆栈和内部信息。

### 数据库

- 优先复用现有 `operation_log` 表和索引，不新增 schema；只有现有字段无法支持成员/授权筛选时才追加 Flyway，并在 PR 中补充回滚方案。

### 回滚

- 前端状态与提示变更可独立回滚对应提交。
- 审计接口为新增只读能力，可通过回滚 Controller/Application/DTO/OpenAPI 提交撤销，不影响既有成员授权写路径。
- 授权明细裁剪可回滚为 Issue #101 的目标级操作权限返回方式，后端写操作安全规则保持不变。

## 原子任务看板

| 序号 | 原子任务 | 状态 | 验收结果 |
|---|---|---|---|
| 1 | 建立 Issue 执行现场、Draft PR 和恢复检查点 | ✅ 已完成 | 分支、任务文件、Draft PR #115 和 Issue 启动评论均已建立 |
| 2 | 更新 OpenAPI 错误契约和成员权限审计查询契约 | 🔄 进行中 | 正在读取现有契约、统一响应和操作日志模型 |
| 3 | 实现成员权限审计查询后端与权限校验 | ⏳ 待处理 | 可按成员、授权、操作者、动作和时间查询；普通成员被拒绝 |
| 4 | 裁剪支派管理员不可见授权明细并保持全量安全校验 | ⏳ 待处理 | 响应最小化，停用/移除/最后管理员校验不放宽 |
| 5 | 重构前端成员查询状态和写后刷新 | ⏳ 待处理 | 重置、切族、翻页和写后刷新使用显式查询状态 |
| 6 | 完善角色能力说明、范围预览、高风险确认和错误码提示 | ⏳ 待处理 | 页面不暴露技术 ID/原始异常，高风险操作可理解 |
| 7 | 在成员 Drawer 接入权限变更历史 | ⏳ 待处理 | 管理员可查看目标成员授权历史，普通成员不可访问 |
| 8 | 统一权限文档和角色范围矩阵 | ⏳ 待处理 | docs/09、docs/11、OpenAPI 与代码术语一致 |
| 9 | 补充测试、执行验证和五轴 Review | ⏳ 待处理 | 聚焦测试、API 检查、类型检查和构建有明确证据 |
| 10 | 更新 PR/Issue、清理临时资产并完成合入 | ⏳ 待处理 | PR Ready、合入 main、Issue 自动关闭 |

## 影响模块

- `docs/api/openapi.json`
- `docs/api/openapi.member-permission.json`
- `docs/09-permission-management.md`
- `docs/11-member-permission-hardening.md`
- `backend/genealogy-backend/.../member/**`
- `backend/genealogy-backend/.../operationlog/**`
- `frontend/genealogy-web/src/features/members/**`
- 相关后端、前端和契约测试

## 验证方案

### 后端

- Java 17 编译。
- 成员权限领域与应用服务聚焦单测。
- 审计接口 Controller 权限测试。
- 操作日志筛选 Repository 测试；如含 PostgreSQL 特有 SQL，增加 PostgreSQL 集成验证。

### 契约

- `npm run api:generate`
- `npm run api:check`
- OpenAPI 错误响应契约测试。

### 前端

- 成员查询状态纯函数/组件聚焦测试。
- 定向 TypeScript 检查。
- `npm run typecheck`
- `npm run build`

### Review

- Correctness：查询状态、错误码、审计筛选与响应裁剪正确。
- Architecture：复用现有 operation log 和 API 生成链路。
- Security：审计权限后端闭环，授权明细最小披露。
- Performance：审计查询数据库分页，无全表内存过滤和 N+1。
- Documentation consistency：角色、状态、范围、错误码和接口一致。

## 已知风险

1. 现有 `operation_log` 字段可能只保存文本详情，目标成员和授权筛选需要确定是否可可靠解析；若不可，应采用最小 schema 增强而不是模糊匹配。
2. 仓库全量 TypeScript、全量后端测试可能存在历史基线失败，需要区分本次回归与既有问题。
3. 授权明细裁剪不能参与成员停用、移除和最后管理员判断，避免数据最小化反向削弱安全。
4. OpenAPI 主文件与成员权限片段存在生成叠加关系，必须按仓库脚本维护，禁止手工复制生成文件。

## 恢复检查点

- 当前 Issue：#102
- 当前分支：`agent/issue-102-member-permission-p1`
- 当前 Draft PR：#115
- 最后完成任务：建立分支、执行看板、Draft PR 并回写 Issue
- 当前进行中：读取 OpenAPI、统一错误结构、operation_log 与成员页面现状
- 最新 Commit：`dba022c4538dee5b0a2b4c615b66b2afa979a209`
- CI 状态：未运行
- 未解决 Review：无
- 已知阻塞：无
- 下一步最小任务：确认现有操作日志字段能否支持结构化成员权限审计筛选，并先更新 OpenAPI 契约
- 最后更新时间：2026-07-13 18:57 CST
