# API 契约维护说明

`docs/api/openapi.json` 是基础契约。为避免不同领域同时修改同一个大文件，允许使用领域分片：

- 文件名：`openapi.<domain>.json`
- 内容：声明该领域需要新增或覆盖的 `paths` 和 `components`
- 合并规则：按文件名排序加载；领域分片中的同名路径或组件覆盖基础契约

当前主要领域分片：

- 导入管理：`openapi.imports.json` 及导入执行/失败治理分片；
- 宗族文化：`openapi.culture.json`；
- 世系图谱：`openapi.tree.json`。

世系图谱的机器可执行契约以 `openapi.tree.json` 为准，领域、权限和兼容语义见 `docs/12-lineage-tree-contract.md`。历史概览文档与该分片不一致时，不得依据旧路径继续扩展接口。

## 生成与校验

```bash
cd frontend/genealogy-web
npm run api:generate
npm run api:check
```

统一生成入口会合并基础契约和领域分片，并更新通用及领域专属产物：

```text
frontend/genealogy-web/src/shared/api/generated/api-contract.ts
frontend/genealogy-web/src/shared/api/generated/culture-api-contract.ts
frontend/genealogy-web/src/shared/api/generated/tracking-types.ts
frontend/genealogy-web/src/shared/api/generated/culture-types.ts
frontend/genealogy-web/src/shared/api/generated/tree-api-contract.ts
frontend/genealogy-web/src/shared/api/generated/tree-types.ts
```

Tree 操作由专属生成器输出，避免同时进入通用 `API_OPERATIONS` 形成重复契约；effective OpenAPI 仍包含完整 Tree 路径和 Schema。

`api:check` 除生成文件漂移外，还执行 Tree 契约治理检查，包括：

- 主入口与兼容入口状态；
- 查询参数和容量硬上限；
- 正式/编辑视图；
- 节点、边、meta 和 warning 必需结构；
- 模糊旧支派路径不得重新出现。

## 约束

- Controller 路由、请求参数和响应 DTO 变化时，必须先更新对应契约。
- 分片只覆盖所属领域，禁止复制无关路径。
- 同一路径只能有一个明确的领域所有者。
- 兼容接口必须标记为 `deprecated`，并在领域文档中说明迁移条件和删除窗口。
- 公共 API 不得暴露仅供数据库或内部实现使用的技术字段。
- 权限、隐私、审核和数据状态必须由后端最终判断，不能依赖前端过滤。
- 世系图谱必须保留多父、多承嗣和兼祧关系，禁止退化为单一 `parentId` 树。