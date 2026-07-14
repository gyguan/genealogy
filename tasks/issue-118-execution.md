# Issue #118 执行看板

- Issue：[#118 补齐操作日志与追踪能力 OpenAPI 契约](https://github.com/gyguan/genealogy/issues/118)
- PR：[#138](https://github.com/gyguan/genealogy/pull/138)
- 工作分支：`agent/issue-118-openapi-contract`
- 目标：以有效 OpenAPI 为唯一事实来源，生成追踪中心 DTO，并移除页面内重复、宽松的手写类型。

## 范围

1. 补齐日志查询、统计、CSV 导出以及审核详情、审核 Diff 的有效 OpenAPI Schema。
2. 生成追踪中心命名 TypeScript DTO，并保留既有 operation metadata 兼容性。
3. 使用生成 DTO 替换 `LogPage.tsx` 中的手写日志、审核任务和 Diff 类型。
4. 增加后端 Java record、OpenAPI、生成文件之间的一致性检查。
5. nullable 字段按后端 `NON_NULL` 序列化行为定义为可省略，防止运行期 `undefined` 被误当业务值。

## 非目标

- 不重构追踪中心页面信息架构和视觉样式。
- 不建设统一对象追踪聚合接口。
- 不修复 S03 范围内的审核任务详情获取和状态拼装逻辑。
- 不新增数据库字段或改变 #117 权限语义。

## 任务看板

| 编号 | 任务 | 状态 | 验证方式 |
|---|---|---|---|
| 1 | 对齐后端 DTO、OpenAPI 与页面手写类型 | ✅ | 字段清单核对 |
| 2 | 增加有效 OpenAPI Overlay | ✅ | API Contract 检查 |
| 3 | 扩展生成器输出追踪 DTO | ✅ | `tracking-types.ts` 可重复生成 |
| 4 | 替换页面手写类型和契约外字段 | ✅ | TypeScript typecheck |
| 5 | 修复 nullable 字段 optionality | ✅ | Review P2 场景覆盖 |
| 6 | 处理 `targetId` 缺失值 | ✅ | nullish 判断，不生成 `targetId=undefined` |
| 7 | 同步最新 `main` 并保留认证商业化改动 | ✅ | 组合态 diff 核对 |
| 8 | 最终 CI 与合入 | 🔄 | API Contract、Frontend Build、PR merge |

## 验证命令

```bash
cd frontend/genealogy-web
npm run api:generate
npm run api:check
npm run typecheck
npm run build
```

## 兼容与回滚

- 公共 HTTP 路径和后端响应行为不变。
- `detail`、`requestId`、`clientIp` 等 nullable 字段在 TypeScript 中为可选且可空。
- 回滚只涉及 Overlay、生成器、生成文件与页面类型接入，不涉及数据回滚。

## 恢复检查点

- 当前阶段：最新 `main` 基线上完成冲突消解，等待最终 CI。
- 已解决 Review：nullable 字段不再强制 required；缺失 `targetId` 不再转成字符串 `undefined`。
- 下一步最小任务：确认 API Contract 与前端构建通过，随后 squash 合入并关闭 #118。
- 已知非本 Issue 阻塞：仓库历史 Backend CI / Flyway 基线问题按独立任务治理。
