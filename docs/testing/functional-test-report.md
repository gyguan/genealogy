# Genealogy 功能测试报告

> 所属 EPIC：#812  
> 报告 Issue：#820  
> 报告日期：2026-07-27  
> 自动化基线提交：`678a1d72bb67266d17a4b2b33b6cb478cecbae6f`  
> 最终有效 Functional E2E Run：`30239097030`

## 1. 测试目标

建立并验证可重复执行的真实功能测试闭环：

```text
GitHub Actions
→ PostgreSQL 16
→ Flyway
→ Spring Boot
→ 临时账号与隔离测试数据
→ React/Vite
→ Chromium/Playwright
→ 日志、Trace、截图、视频和报告
```

本报告区分代码级测试、Mock 页面测试、真实 PostgreSQL 集成测试和真实浏览器端到端测试，不以单元测试通过替代功能准出。

## 2. 测试环境

| 项目 | 配置 |
|---|---|
| CI | GitHub Actions Ubuntu Runner |
| Java | Java 17 / Temurin |
| Backend | Spring Boot 3.3.5 |
| Database | PostgreSQL 16 Alpine |
| Migration | Flyway，空库全量迁移 |
| Frontend | React + TypeScript + Vite |
| Browser | Playwright Chromium |
| Node.js | Node.js 20 |
| 测试数据 | 每次 Run 动态账号、随机密码、唯一 `runId`、临时数据库 |
| 证据保存 | Actions Artifact 14 天 |

测试不连接生产、共享开发或共享测试数据库，不使用真实个人信息。

## 3. 建设结果

### 3.1 测试覆盖基线

已形成：

- `docs/testing/functional-test-inventory.md`；
- `docs/testing/functional-test-coverage.md`；
- 按功能域区分 UNIT、MODEL、CONTRACT、UI_MOCK_E2E、DB_INTEGRATION、REAL_E2E 和 MANUAL；
- 明确 P0/P1/P2 风险及自动化优先级。

### 3.2 测试用例与数据

已形成：

- `docs/testing/functional-test-cases.md`；
- `docs/testing/functional-test-data.md`；
- 统一 `FT-<领域>-<序号>` 用例编号；
- 管理员、编辑者、审核员、查看者和跨宗族受限账号；
- 宗族、支派、三代人物、父子关系和审核任务数据；
- Run 级隔离、清理和凭据安全规则。

### 3.3 真实 PostgreSQL Integration

通过 Testcontainers 和 Maven Failsafe 建立独立命令：

```bash
cd backend/genealogy-backend
mvn -B -DskipITs=false verify
```

专门的 PostgreSQL 场景共 6 个：

| 用例/专项 | 结果 | 验证内容 |
|---|---|---|
| FT-FAIL-003 | 通过 | 空库全量 Flyway、Hibernate Schema 校验、核心表存在 |
| FT-PERM-001 | 通过 | 不同宗族人物数据不混合 |
| FT-REL-002 | 通过 | 数据库拒绝人物自关系 |
| FT-STATE-004 | 通过 | 并发唯一键仅允许一个事务提交 |
| 事务回滚专项 | 通过 | 异常后不保留部分业务写入 |
| FT-PERM-004 | 通过 | 自审失败后 Review Task、Revision 保持 pending |

### 3.4 真实 Playwright

真实测试不 Mock 核心 `/api/v1/**`，共执行 7 个浏览器测试块，覆盖 8 个功能用例编号：

| 用例 | 结果 | 验证内容 |
|---|---|---|
| FT-AUTH-001 | 通过 | 真实 UI 登录和 `/auth/me` |
| FT-CLAN-001 | 通过 | UI 创建宗族、自动进入支派步骤、刷新后数据库持久化 |
| FT-NAV-001 | 通过 | 建谱深链接刷新恢复 |
| FT-PERM-001 | 通过 | 已归属其他宗族的账号不能创建第二宗族 |
| FT-PERM-004 | 通过 | 提交人不能批准自己的变更 |
| FT-REVIEW-002 | 通过 | 独立审核员批准，宗族变为 official |
| FT-TREE-001 | 通过 | 真实三代人物和父子关系可查询下延世系 |
| FT-PERM-007 | 通过 | 其他宗族账号读取核心宗族支派返回 403 |

失败时配置保留：

- Playwright Trace；
- 截图；
- 视频；
- HTML/JSON 报告；
- 后端、前端、种子和 PostgreSQL 日志；
- Surefire/Failsafe 报告。

### 3.5 GitHub Actions

新增 `.github/workflows/functional-e2e.yml`，已验证：

- PostgreSQL Service 健康检查；
- 两组隔离 Testcontainers PostgreSQL；
- Spring Boot 启动探测；
- 临时账号动态注册；
- 受限宗族和审核/世系数据初始化；
- 审核员通过正式成员授权 API 加入核心宗族；
- Chromium 安装与 Vite 启动；
- 真实 Playwright；
- 失败诊断和 Artifact；
- 同一 PR 新提交取消旧 Run；
- 任一关键步骤失败均阻断，不使用 `continue-on-error`。

## 4. 最终执行结果

### 4.1 最终有效 Run

| 项目 | 结果 |
|---|---|
| Commit | `678a1d72bb67266d17a4b2b33b6cb478cecbae6f` |
| Functional E2E Run | `30239097030` |
| PostgreSQL Integration | 通过 |
| Spring Boot 启动 | 通过 |
| 临时账号注册 | 通过 |
| 受限宗族种子 | 通过 |
| 审核与三代世系种子 | 通过 |
| Frontend/Chromium | 通过 |
| Real Playwright | 7/7 通过 |
| Artifact 上传 | 通过 |
| 服务清理 | 通过 |

同一提交的 Backend CI、Frontend CI、API Contract 和 Culture Page Gate 均未出现功能测试变更引入的阻断性回归。

### 4.2 结果统计

| 测试层级 | 执行 | 通过 | 失败 | 阻断/未执行 |
|---|---:|---:|---:|---:|
| PostgreSQL 专项场景 | 6 | 6 | 0 | 0 |
| 真实 Playwright 测试块 | 7 | 7 | 0 | 0 |
| 真实 Playwright 用例编号 | 8 | 8 | 0 | 0 |
| 最终 Functional E2E Job | 1 | 1 | 0 | 0 |

说明：仓库原有单元、模型、契约和 Mock E2E 数量较多，本表只统计本 EPIC 新增的真实功能测试范围。

## 5. 发现与整改

测试建设过程中共识别：

- 9 类测试 Fixture、测试脚本或契约理解问题；
- 1 个真实业务治理缺陷：#828“提交人可审核自己的变更”。

#828 已完成后端强制隔离、单元测试、PostgreSQL 状态不变测试和真实浏览器回归。所有整改均未通过跳过用例、删除断言、降低权限或放宽数据库约束制造假通过。

详细记录见：

- `docs/testing/functional-test-first-run.md`；
- `tasks/issue-819-execution.md`；
- `docs/testing/functional-test-issues.md`。

## 6. 覆盖边界与遗留风险

本次完成的是“真实测试体系 + P0 代表性闭环”，不是对全部产品功能的穷尽测试。尚未形成完整真实 E2E 的范围包括：

1. 支派、字辈方案、人物事件、来源绑定的完整 UI 审核链；
2. 数据导入预览、失败行修正、重试和幂等；
3. 文件上传、附件预览、下载、对象存储和敏感附件权限；
4. 修谱工作台任务处理和批量操作；
5. 审核中心批量审批、冲突刷新和质量门禁 UI；
6. 谱册导出文件内容和权限；
7. 深层/大规模世系性能；
8. Firefox、WebKit 和移动真机；
9. 性能、安全、可访问性和视觉回归专项。

这些项目不影响本次测试基础设施验收，但在对应模块发布前仍需补充。

## 7. 准出结论

### 当前结论：有条件通过

以下范围满足准出：

- 真实 PostgreSQL/Flyway 测试基础设施；
- 真实前后端浏览器测试流水线；
- 登录、首次建谱、刷新持久化和深链接；
- 宗族隔离的两类反向权限场景；
- 提交人自审阻断、独立审核员审批和正式生效；
- 三代世系真实查询；
- CI 失败证据和缺陷整改闭环。

以下结论不应从本报告推导：

- “全部菜单和全部业务功能已完成测试”；
- “系统已完成性能、安全和生产容量准出”；
- “所有浏览器和移动设备均无兼容问题”。

因此，**#812 功能测试体系建设可以验收关闭；具体业务模块发布仍需依据遗留清单补充模块级功能测试。**

## 8. 后续建议

按优先级继续扩展：

1. P0：字辈、人物、关系、来源的完整审核闭环；
2. P0：导入批次事务与失败重试；
3. P1：附件权限、下载和谱册导出；
4. P1：修谱工作台与审核中心批量流程；
5. P1：深层世系和大数据性能；
6. P2：多浏览器、移动端、可访问性、安全和视觉回归。
