# Backend Module Navigation

本目录是后端模块化单体的业务代码入口。开始修改前，先读取根 `AGENTS.md`、后端 `AGENTS.md`、当前模块代码与 Issue/Spec。

## 主调用链

```text
Controller
  → Application Service
  → Domain Policy / State Machine
  → Repository / QueryRepository
  → Assembler / DTO
```

跨模块调用通过 Application Service 或明确领域接口完成，不直接访问其他模块内部 Repository 或实现类。

## 模块索引

| 模块 | 主要职责 | 关键不变量 |
|---|---|---|
| `auth` | 登录、会话和 ActorContext | 身份不可伪造，敏感凭据不入日志 |
| `clan` | 宗族主数据 | 所有资源进行 clan 隔离 |
| `branch` | 支派结构和范围 | 支派管理员不能越权 |
| `generation` | 字辈方案 | 代次和顺序确定 |
| `person` | 人物档案与重复检测 | 正式变更走审核，在世人员默认保护 |
| `relationship` | 人物关系和分类 | 人物与关系分离，非法组合拒绝 |
| `source` | 来源资料和证据绑定 | 来源可追溯，访问策略集中 |
| `review` | Revision、审核与应用变更 | 不允许自审，批准后才应用正式数据 |
| `tree` | 人物和支派图谱查询 | 只读；权限、脱敏、截断和稳定排序不变 |
| `member` | 成员、角色和授权 | 保护最后管理员，功能与数据范围同时校验 |
| `importexport` | 导入、批次和导出 | 导入不直入正式库，行级错误和事务边界明确 |
| `attachment` | 附件上传、下载和存储 | 下载鉴权，存储路径不外泄 |
| `operationlog` | 审计查询和指标 | 审计失败不回滚主业务，日志不含敏感正文 |
| `culture` | 宗族文化资料 | 内容来自真实数据，不补造业务事实 |
| `common` | 统一响应和基础能力 | 不沉淀具体领域规则 |

## 阅读顺序

1. 模块 README（如存在）
2. Controller 或公开 Application Service
3. Query / Command / Context / DTO
4. Domain Policy、State Machine 和错误码
5. Repository / QueryRepository
6. 单元、集成和 E2E 测试

不要从超长实现类开始反向猜测整个模块。

## 查询和性能

高频读取必须明确：

- clan、branch 和对象数据范围；
- 分页、硬上限或批次限制；
- 唯一稳定排序键；
- DTO、Projection 或 Read Model；
- N+1、循环 Repository 调用和内存过滤风险。

详细规范见 `docs/backend/repository-query-performance.md`。

## 何时增加模块 README

出现复杂状态机、异步任务、独立权限语义、QueryRepository、特殊性能边界或主调用链难以通过文件名建立时，应增加或刷新局部 README。

局部 README 只记录稳定入口、调用链、不变量、状态、权限、事务、查询边界和必跑测试，不复制全仓通用规则。
