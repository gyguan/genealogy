# API 契约维护说明

`docs/api/openapi.json` 是基础契约。为避免不同领域同时修改同一个大文件，允许使用领域分片：

- 文件名：`openapi.<domain>.json`
- 内容：仅声明该领域需要新增或覆盖的 `paths` 与 `components.schemas`
- 合并规则：按文件名排序加载；领域分片中的同名路径或 Schema 覆盖基础契约

当前导入管理使用 `openapi.imports.json`。

## 生成与校验

```bash
cd frontend/genealogy-web
npm run api:generate
npm run api:check
```

生成脚本会合并基础契约和所有领域分片，再更新：

```text
frontend/genealogy-web/src/shared/api/generated/api-contract.ts
```

## 约束

- Controller 路由、请求参数和响应 DTO 变化时，必须先更新对应契约。
- 分片只覆盖所属领域，禁止复制无关路径。
- 同一路径只能有一个明确的领域所有者；兼容接口必须标记为 `deprecated`。
- 业务接口不得通过契约暴露仅供数据库或内部实现使用的技术 ID。
