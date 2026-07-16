# Issue #318 Execution · 族谱首页聚合统计接口

## 现场

- Issue: #318 `[族谱首页 P0-02] 建立首页聚合统计接口并消除 200 人分页口径偏差`
- Branch: `agent/issue-318-home-dashboard-aggregate`
- Scope:
  - 新增首页 Dashboard 聚合 API 契约和后端实现
  - 前端首页改用聚合统计结果展示全局 KPI 与代次分布
  - 补充后端聚合测试与前端契约/类型
- Non-scope:
  - 不做趋势分析
  - 不做最近活动
  - 不调整首屏 KPI 数量和视觉布局
  - 不把完整人物明细塞入聚合接口

## 计划

1. 更新 OpenAPI overlay 和生成类型入口。
2. 新增 Dashboard DTO / Service / Controller。
3. Repository 增加基于完整数据集的聚合查询。
4. 前端首页切换全局统计到 `/clans/{clanId}/dashboard`，人物明细仍保留分页搜索结果用于现有下钻过渡。
5. 补充后端聚合单元测试与前端 E2E 断言，验证 201 人以上不再受 pageSize=200 影响。
6. 跑 CI，合入后回写 #316。

## 风险与约束

- 当前远程协作环境无法本地执行 Maven / npm 命令，最终以 GitHub Actions 为准。
- `docs/api/openapi.json` 体积较大，本次优先使用 `docs/api/openapi.home-dashboard.json` overlay 降低冲突面。
- 权限范围沿用现有 `AuthorizationApplicationService.requirePermission(clanId, actorId, "person:view")`，不新增权限模型。

## 恢复检查点

- 2026-07-16：已读取仓库规则、后端/前端目录规则、Issue #318 和当前首页实现；创建分支与执行文件。