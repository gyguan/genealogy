# 功能测试数据规范

> Issue：#814  
> 原则：不使用生产数据，不依赖固定数据库 ID，可重复初始化、隔离和清理。

## 1. 账号矩阵

| 账号别名 | 角色 | 授权范围 | 主要用途 |
|---|---|---|---|
| `ft_clan_admin` | `clan_admin` | 宗族 A | 创建宗族、成员与权限、最后管理员保护 |
| `ft_branch_admin` | `branch_admin` | 宗族 A / 长沙支子树 | 支派范围正向与兄弟支派拒绝 |
| `ft_editor` | `editor` | 宗族 A | 建谱、人物、关系、来源、提交审核 |
| `ft_reviewer` | `reviewer` | 宗族 A | 审核通过、驳回、批量审核 |
| `ft_viewer` | `viewer` | 宗族 A | 只读和隐私最小披露 |
| `ft_other_clan_admin` | `clan_admin` | 宗族 B | 跨宗族隔离 |

测试密码由 CI 环境变量提供，仓库只保存账号别名和初始化规则，不保存生产凭据。

## 2. 宗族与支派

每次执行生成唯一运行标识：

```text
runId = ft-<UTC日期时间>-<短随机值>
```

测试数据业务名称均带 `runId`，例如：

- 宗族 A：`黄氏功能测试宗族-${runId}`；
- 宗族 B：`周氏隔离测试宗族-${runId}`；
- 一级支派：`长沙支-${runId}`、`岳阳支-${runId}`；
- 二级支派：`长沙东房-${runId}`。

固定结构：

```text
宗族 A
├─ 长沙支
│  └─ 长沙东房
└─ 岳阳支

宗族 B
└─ 隔离支派
```

用于验证：

- 下级支派可访问；
- 兄弟支派不可访问；
- 跨宗族不可访问；
- 递归深度和路径查询。

## 3. 人物与关系

建议基线人物：

| 别名 | 姓名 | 代次 | 支派 | 用途 |
|---|---|---:|---|---|
| `ancestor` | 黄测试始祖 | 1 | 长沙支 | 世系根节点 |
| `father` | 黄承测 | 2 | 长沙支 | 父代 |
| `mother` | 李功能 | 2 | 长沙支 | 母代/配偶 |
| `child` | 黄验收 | 3 | 长沙东房 | 子代和人物编辑 |
| `sibling_branch_person` | 黄隔支 | 3 | 岳阳支 | 兄弟支派权限拒绝 |
| `living_person` | 黄在世 | 4 | 长沙东房 | 隐私字段隐藏 |
| `other_clan_person` | 周跨域 | 1 | 宗族 B | 跨宗族拒绝 |

关系基线：

- `ancestor father_of father`；
- `father spouse_of mother`；
- `father father_of child`；
- `mother mother_of child`；
- `child father_of living_person`。

异常关系由用例动态创建，测试结束后清理。

## 4. 字辈方案

字辈方案：`敦本堂测试字辈-${runId}`。

明细示例：

| 世次 | 字辈 |
|---:|---|
| 1 | 敦 |
| 2 | 本 |
| 3 | 承 |
| 4 | 先 |

用于验证：

- 方案与明细聚合保存；
- 审核快照包含明细；
- 提交后不可未审修改；
- 审核通过原子生效。

## 5. 来源资料

来源：`黄氏族谱功能测试卷-${runId}`。

建议字段：

- 类型：`genealogy_book`；
- 卷号：`卷一`；
- 页码：`12`；
- 摘录：`黄验收，承测公之子。`；
- 可信度：`high`；
- 隐私：`clan_only`。

附件使用仓库内生成的小型文本或 PNG Fixture，不使用真实个人资料。

## 6. 测试数据生命周期

### 初始化

优先通过专用测试初始化器或 SQL Fixture 创建账号和基础权限；业务对象由真实 API 创建，以验证业务流程。

### 隔离

- 每次执行使用唯一 `runId`；
- Playwright worker 固定为 1，首期避免同一数据并行写；
- 后端集成测试使用独立数据库或独立 Schema；
- 不依赖自增 ID 的固定值。

### 清理

推荐两级策略：

1. 集成测试：事务回滚或测试容器销毁；
2. 真实 E2E：按 `runId` 调用测试清理入口，或销毁整个临时数据库。

CI 默认销毁 PostgreSQL Service，不需要逐行删除；本地运行必须提供清理脚本。

## 7. CI 环境变量

建议统一：

```text
FUNCTIONAL_TEST_RUN_ID
FUNCTIONAL_TEST_ADMIN_USERNAME
FUNCTIONAL_TEST_ADMIN_PASSWORD
FUNCTIONAL_TEST_EDITOR_USERNAME
FUNCTIONAL_TEST_EDITOR_PASSWORD
FUNCTIONAL_TEST_REVIEWER_USERNAME
FUNCTIONAL_TEST_REVIEWER_PASSWORD
FUNCTIONAL_TEST_VIEWER_USERNAME
FUNCTIONAL_TEST_VIEWER_PASSWORD
E2E_BASE_URL
E2E_API_BASE_URL
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
```

所有默认值仅适用于临时 CI 数据库，不得复用于共享环境。

## 8. 可重复性要求

- 用例不得依赖上一条用例遗留状态；
- 时间相关断言使用范围或业务状态，不硬编码当前日期；
- 文件名、宗族名和人物名使用 `runId`；
- 不通过数据库直接修改正式业务对象来替代 UI/API 流程；
- 只有账号、权限和必要基线可由 Fixture 初始化；
- 清理失败必须记录日志，但不能掩盖主测试失败。
