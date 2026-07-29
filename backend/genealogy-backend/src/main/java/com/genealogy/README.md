# Backend Module Navigation

本目录是 Genealogy 后端模块化单体的业务代码入口。开始修改前，先读取仓库根 `AGENTS.md`、后端 `AGENTS.md` 和当前任务相关模块。

## 主调用链

```text
Controller
  → Application Service
  → Domain Policy / State Machine
  → Repository / QueryRepository
  → Assembler / DTO
```

跨模块调用应通过 Application Service 或明确的领域接口完成，不直接访问其他模块内部 Repository 或实现类。

## 模块索引

| 模块 | 主要入口与职责 | 关键不变量 |
|---|---|---|
| `auth` | 登录、会话、请求身份、ActorContext | 请求身份不可伪造；权限事实按请求缓存；敏感凭据不入日志 |
| `clan` | 宗族主数据与宗族生命周期 | 所有宗族资源必须进行 clan 隔离 |
| `branch` | 支派结构、子树和范围 | 支派管理员不能越权访问未授权范围 |
| `generation` | 字辈方案和字辈项 | 代次和字辈顺序保持确定性 |
| `person` | 人物档案、查询、重复检测 | 正式人物变更走审核；在世人员默认保护 |
| `relationship` | 人物关系和关系分类 | 人物与关系分离；分类由统一 Policy 决定；非法组合拒绝 |
| `source` | 来源资料、绑定和访问策略 | 来源可追溯；目标类型规范化；查看/编辑/删除/下载策略集中 |
| `review` | Revision、审核任务、应用变更 | 提交人不能自审；批准后才应用正式数据；状态迁移受控 |
| `tree` | 人物/分支世系图查询 | 只读；权限和脱敏先于输出；分批、截断、Warning、稳定排序不变 |
| `member` | 成员、角色、权限、支派授权 | 保护最后管理员；功能权限与数据范围同时校验 |
| `importexport` | 文件预览、导入任务、批次处理、导出 | 导入不直入正式库；行级错误可继续；基础设施失败遵循事务边界 |
| `attachment` | 附件元数据、上传、下载和存储 | 下载必须鉴权；路径和存储细节不对外泄露 |
| `operationlog` | 操作日志、审计查询、指标 | 审计 best-effort 不回滚主业务；日志不记录敏感正文 |
| `culture` | 宗族文化资料 | 内容来自真实数据，不补造业务事实 |
| `common` | 统一响应、异常、基础工具 | 不沉淀具体领域规则，不演变成通用业务杂物箱 |

## 进入模块后的阅读顺序

1. 模块 README（如存在）
2. Controller 或公开 Application Service
3. Command/Query/Context/DTO
4. Domain Policy、State Machine 和错误码
5. Repository/QueryRepository
6. 组件级、集成和 E2E 测试

不要从某个超长实现类开始反向猜测整个模块。

## 跨模块规则

- Controller 不直接访问 Repository。
- Domain 不依赖 Controller、Application 或 Repository 实现。
- Repository 不依赖 Application。
- 权限判断集中在 ActorContext 与领域 Access Policy，不散落复制。
- 状态机和核心 Policy 应能脱离 Spring 与数据库测试。
- 正式数据变更统一遵循审核闭环。
- 公共 API 变更先更新 OpenAPI。
- Schema 变更统一通过 Flyway 前向迁移。

## Query 与性能

高频读取必须明确：

- clan/branch/object 数据范围
- 分页、硬上限或批次限制
- 唯一稳定排序键
- DTO/Projection/Read Model，而不是无必要的完整 Entity
- N+1、循环 Repository 查询和内存过滤风险

Tree 等大集合查询遵循统一稳定分批策略，具体要求见 `docs/backend-repository-performance-governance.md`。

## README 升级条件

以下任一情况发生时，应在对应模块增加或刷新 README：

- 模块出现 3 个以上主要 Application Service
- 存在复杂状态机、异步任务或批处理
- 存在独立权限、隐私或审核语义
- 存在 QueryRepository、Projection 或特殊性能边界
- 主调用链仅靠代码搜索难以快速建立
- 新成员或 AI Agent 经常重复定位同一组入口文件

模块 README 应记录入口、调用链、不变量、错误/状态、查询边界和必跑测试，不复制全仓通用规则。
