# Genealogy AI Engineering Rules

本文件是全仓最高级规则入口。开始任务前先读取本文件，再按任务范围读取 `docs/standards/README.md`、当前目录最近的 `AGENTS.md`、模块 README 与 Issue/Spec。

## 1. 优先级与维护原则

```text
P0 全仓安全与业务红线
  > 已批准的 Issue 验收标准 / Spec
  > P1 交付与质量门禁
  > 当前目录最近的 AGENTS.md
  > 专项规范中的 P2 工程规则
  > P3 经验与推荐实践
```

- 同一强制规则只能有一个权威定义。
- `AGENTS.md` 承载强制规则；专项规范承载领域规则；经验文档承载原因、阈值和示例；README 承载导航。
- 新增或修改规则前先查 `docs/standards/README.md`。

## 2. P0：安全与业务红线

1. 人物和关系分离，不得用简单 `parentId` / `spouseId` 替代关系模型。
2. 人物、关系、来源绑定等正式数据必须走 `revision → review_task → approve/reject → apply`。
3. 提交人与审核人必须隔离。
4. 权限以后端鉴权和数据范围为准。
5. 支派负责人只能管理授权支派及允许的下级范围。
6. 在世人员、联系方式、附件和证件材料默认最小披露。
7. 人物、关系、支派、字辈等关键对象应支持来源追溯。
8. 导入数据先进入草稿或批次，不能直接进入正式库。
9. Tree 模块只负责查询，不承载正式数据修改。
10. 禁止提交密钥、Token、真实隐私数据或生产敏感数据。
11. 禁止删除、弱化或跳过测试来通过构建。
12. 禁止直接向 `main` 写入业务变更。

## 3. P1：交付与质量门禁

非平凡变更遵循：

```text
DEFINE → PLAN → BUILD → VERIFY → REVIEW
```

- Issue 创建与拆分：`docs/governance/issue-creation.md`
- Issue 实现、恢复与收尾：`docs/governance/issue-execution.md`
- 流程和验证强度判断：`docs/experience/issue-delivery-sizing.md`
- 聊天式长任务：`docs/governance/chat-driven-development.md`
- 看板与耗时：`docs/governance/task-time-tracking.md`

最低门禁：从 `main` 最新现场开始；使用独立分支和 PR；保留恢复检查点；完成相关验证；满足门禁后合入 `main`；回写 Issue 和最终结论。

API 变更必须 Contract First：先更新 `docs/api/openapi.json`，生成并校验前端契约，再实现后端与前端。

任务完成必须同时满足：目标产物已提交、Diff 无无关修改、测试和文档已同步、相关验证通过、满足验收标准、风险与恢复点已记录、实现型 PR 已合入或存在真实阻塞。

## 4. P2：全仓默认规则

1. 模块化单体优先，遵守现有模块边界。
2. 修改前读取目标文件；新增前查找同类模式。
3. 领域规则变化必须同步测试。
4. 列表和大集合查询必须考虑分页、范围、稳定排序、N+1 与硬上限。
5. 正式数据变更、审核、导入、导出和权限调整必须留痕。
6. 前端不向普通用户暴露不必要的技术字段和敏感数据。
7. Schema、依赖、认证权限、审核流程、公共 API、附件或导出变更前必须说明兼容与回滚或补偿策略。
8. 面向用户的时间统一使用 `Asia/Shanghai`（UTC+8），详见 `docs/governance/time-and-timezone.md`。

专项入口：

- 后端：`backend/genealogy-backend/AGENTS.md`
- 前端：`frontend/genealogy-web/AGENTS.md`
- 数据库：`docs/backend/database-and-flyway.md`
- 规范索引：`docs/standards/README.md`

## 5. Ask First

数据库迁移、依赖升级、认证权限、隐私、附件、导入导出、公共 API、审核生效路径、Tree 核心数据结构或删除兼容路径前，必须先说明方案、影响和回滚或补偿方式。

## 6. Never Do

禁止不读现有代码直接重写、静默扩大范围、绕过 OpenAPI、仅在前端鉴权、绕过审核、创建无顺序依赖的零散 Issue、缺少分支/PR/恢复点、把未验证修改标记完成、隐藏风险或补造耗时。

## 7. 基础验证

后端：

```bash
cd backend/genealogy-backend
mvn test
```

前端：

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

只执行专项验证时，必须说明未执行全量验证的原因、覆盖范围和已知基线问题。
