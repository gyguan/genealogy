# Issue #1034 执行看板

- Issue：https://github.com/gyguan/genealogy/issues/1034
- 目标：将 Member、Review、Source 的关键仓储从 Spring Data JPA 迁移到 MyBatis-Plus/MyBatis，保持权限范围、审核并发、来源证据和错误码不变。
- 工作分支：`agent/issue-1034-member-review-source-mybatis`
- 开始时间：2026-07-30 21:12（北京时间）

## 依赖与边界

- #1032、#1033 已完成并合入 `main`。
- 本 Issue 不修改公共 API、数据库 Schema、角色模型、审核状态机和来源业务类型。
- Branch 递归、Relationship 与 Tree 留给 #1036。

## 任务看板

| 序号 | 任务 | 状态 | 结果 |
|---|---|---|---|
| 1 | 核对依赖、主干、分支和 Draft PR | ✅ 已完成 | 基于最新 `main` 建立独立分支 |
| 2 | 盘点 Member/Review/Source Entity、Repository、锁与调用面 | ✅ 已完成 | 已识别 JPA、JPQL、EntityManager、Dirty Checking、锁和跨模块依赖 |
| 3 | 迁移 Member 与权限范围查询 | ✅ 已完成 | 动态 SQL、count 共用筛选、空集合、显式更新与成员锁已切换 |
| 4 | 迁移 Review/Revision 与并发锁 | ✅ 已完成 | FOR UPDATE、JSONB 显式更新、审核查询与并发边界已切换 |
| 5 | 迁移 Source/Binding/Attachment | ✅ 已完成 | 来源、绑定、附件和聚合查询已切换，公共接口保持不变 |
| 6 | PostgreSQL 专项测试和全量 CI | 🔄 进行中 | 可信 Head 已形成，正在执行 Backend、Integration、Security、Member Scope、Functional E2E |
| 7 | 文档、Review 与 PR 收口 | ⏳ 待开始 | 迁移清单、风险、回滚和最终验收 |

## 风险控制

- `SELECT ... FOR UPDATE` 必须与状态判断和更新处于同一可写事务与连接。
- 成员主查询与 Count 查询共享同一权限和筛选条件，禁止应用层内存过滤。
- Nullable 字段清空继续使用明确 SQL，不依赖默认更新策略。
- 来源附件访问、隐私、操作日志和正式数据审核生效路径不得改变。
- 临时诊断文件或自动化工作流不得进入最终交付范围。

## 恢复检查点

- 当前阶段：80 个限定范围文件已通过 Base64/tar.gz 双重 SHA-256、文件数量校验并原子应用；所有 `.agent`、临时 Workflow 和触发文件均已清理。
- 当前可信 Head：本看板提交形成新的正常仓库身份 Head，以该 Head 的全量 CI 为最终验收基准。
- 下一步最小任务：读取 Backend CI 与 PostgreSQL Integration 首轮结果，修复编译、SQL 映射或事务语义问题。
