# 11. ID 字段治理规则

本文定义族谱系统中 `id` 字段的产品与技术治理规则，后续新增页面、接口和导入模板必须遵循。

## 1. 基本原则

`id` 是系统生成的 IT 字段，不是用户业务字段。

因此：

- 用户不需要输入 `id`。
- 用户不能修改 `id`。
- `id` 不作为页面搜索条件展示。
- 列表、详情页默认不展示主键 `id`。
- 业务对象之间的关联应通过列表选择、上下文选择、业务编码或名称选择完成，不应要求用户手工输入数据库主键。

## 2. 前端约束

已在共享组件层做统一防护：

### 2.1 DataTable

文件：

```text
frontend/genealogy-web/src/shared/ui/DataTable.tsx
```

规则：

- `key === 'id'` 的列自动隐藏。
- `key` 以 `Id` 结尾的列自动隐藏。
- 标题包含 `ID`、`主键`、`技术标识`、`系统标识` 的列自动隐藏。

这样即使业务页面继续声明 `id` / `xxxId` 列，也不会在表格中展示。

### 2.2 DetailCard

文件：

```text
frontend/genealogy-web/src/shared/ui/DetailCard.tsx
```

规则：

- 详情字段 label 包含 `ID`、`主键`、`技术标识`、`系统标识` 时自动隐藏。

### 2.3 Field

文件：

```text
frontend/genealogy-web/src/shared/ui/Form.tsx
```

规则：

- 表单字段 label 包含 `ID`、`主键`、`技术标识`、`系统标识` 时不渲染。

用于阻断页面继续把 `宗族ID`、`人物ID`、`来源ID`、`任务ID` 等字段作为输入项或搜索条件。

## 3. 已调整页面

### 3.1 导入导出页面

文件：

```text
frontend/genealogy-web/src/features/imports/ImportPage.tsx
```

调整：

- 删除 `当前宗族ID` 输入。
- 删除 `默认支派ID` 输入。
- 删除 `导出支派ID` 输入。
- 导入模板删除 `支派ID` 字段。
- 支派导出改为按“当前已选支派”导出。
- 导入文件不再要求用户在 Excel/CSV 中填写支派主键。

### 3.2 来源附件页面

文件：

```text
frontend/genealogy-web/src/features/sources/SourceAttachmentPage.tsx
```

调整：

- 删除 `来源ID` 输入。
- 附件上传改为上传到“当前已选来源”。
- 提示用户先在来源资料库选择来源资料。
- 附件列表不展示附件主键。

### 3.3 审核中心

文件：

```text
frontend/genealogy-web/src/features/reviews/ReviewCenterPage.tsx
```

调整：

- 删除 `当前宗族ID` 输入。
- 审核任务列表不展示任务 ID。
- 审核对象不展示对象 ID。
- Diff 弹框只展示对象类型、变更类型、摘要和字段级差异。
- 点击任务行操作按钮查看 Diff，不再要求输入任务 ID。

### 3.4 基础数据管理入口

文件：

```text
frontend/genealogy-web/src/app/App.tsx
```

调整：

- 删除 `审核Diff` 手工查询 Tab。
- 字段级 Diff 统一从 `审核中心` 列表内嵌查看。

## 4. 后端约束

数据库层：

- 所有主表 `id` 均使用 `bigserial primary key`，由数据库生成。
- 创建请求 DTO 不应包含主键 `id`。
- 修改请求 DTO 不应包含主键 `id`。

接口层：

- 路径中的 `{id}` 可作为系统内部定位资源使用。
- 页面上不应让用户手工输入 `{id}`。
- 前端应通过列表选择、上下文选择、操作按钮自动带出资源标识。

## 5. 例外说明

以下字段不属于数据库主键 ID，可以继续展示或输入：

- `clanCode`：宗族业务编码。
- `personCode`：人物业务编码。
- `sourceName`：来源名称。
- `branchName`：支派名称。
- `generationNo`：代次，不是主键。

## 6. 后续建议

P1 建议继续补充：

- 宗族/支派/来源选择器组件，彻底替代页面内隐藏的 `workspace.xxxId` 依赖。
- 后端搜索接口逐步从 `xxxId` 查询扩展为业务编码、名称、关键词查询。
- 导入模板支持支派名称自动匹配，替代支派主键匹配。
