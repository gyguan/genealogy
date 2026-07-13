# Implementation Plan: 人物导入严格模板模式

## Dependency Order

1. 建立唯一模板字段和值域定义。
2. 更新 OpenAPI 契约，删除映射参数并新增 XLSX 模板接口。
3. 严格校验 CSV/XLSX 表头。
4. 删除后端自动识别、别名和列号回退。
5. 简化 Controller。
6. 简化人物导入前端交互并增加双模板下载。
7. 更新生成契约。
8. 补充严格表头和值域测试。
9. 执行后端编译、聚焦测试、API 检查、前端类型检查和构建。
10. 完成五轴 Review，创建 PR 并合入 main。

## Task 1: 唯一模板定义

新增 `PersonImportTemplateDefinition`：

- 固定六列表头及索引。
- 定义性别和值域映射。
- 定义是否在世值域映射。
- CSV 与 XLSX 模板共用该定义。

验收：模板生成、表头校验和数据解析不再分别硬编码字段顺序。

## Task 2: Contract First

- 删除人物预览和任务创建接口的自动映射及列号参数。
- 新增 XLSX 模板下载接口。
- 删除无实现的废弃人物导入路径。
- 重新生成前端操作表。

验收：生成契约中不再存在人物导入映射参数。

## Task 3: 严格文件策略

- 文件只允许 `.csv` 和 `.xlsx`。
- 第一行表头必须存在。
- 去除 BOM 和首尾空格后，字段数量、名称和顺序必须完全一致。
- 结构错误在进入预览/创建批次前拒绝。

验收：缺列、增列、换序、英文、别名、空表头、无表头全部失败。

## Task 4: 固定解析和值域

- 第一行固定作为标准表头跳过。
- 删除表头识别、字段别名、动态 FieldMapping 和 fallback。
- 固定列索引解析。
- 性别只接受男/女/未知并转换为内部枚举。
- 是否在世只接受是/否。
- 代次只接受空值或正整数。

验收：任何调用方都不能影响字段映射；非法业务值进入行级错误。

## Task 5: 前端简化

- 删除自动识别开关、六个列号输入和恢复按钮。
- 预览请求仅传 `branchId`。
- 创建批次仅传 `branchId` 和 `confirmDuplicates`。
- 增加 CSV 和 XLSX 两个模板下载按钮。
- 明确提示禁止修改模板表头。

验收：页面不出现任何技术映射概念。

## Task 6: Tests and Verify

后端聚焦测试：

- 标准 CSV/XLSX 表头通过。
- 缺列、增列、换序、英文、别名、空表头、无表头失败。
- CSV/XLSX 模板表头和值一致。
- 中文性别、在世值转换正确。
- 非法性别、在世值和非正代次产生行级错误。

验证：

```bash
cd backend/genealogy-backend
mvn -Dtest=PersonImportTemplateApplicationServiceTest,PersonImportFilePolicyServiceTest,ImportApplicationServiceRowStateTest test
mvn -DskipTests package

cd frontend/genealogy-web
npm run api:generate
npm run api:check
npm run typecheck
npm run build
```

## Risks

- 删除兼容参数会影响仍在使用旧调用方式的客户端；正式前端和 OpenAPI 将同步升级。
- 严格中文值域会拒绝历史英文值文件，这是本次“无兜底”要求的预期行为。
- XLSX 模板下载必须使用正确媒体类型和 Content-Disposition，避免浏览器保存为损坏文件。
- CSV 仍需正确处理 BOM、引号和空单元格，不能用简单字符串切割破坏模板校验。
