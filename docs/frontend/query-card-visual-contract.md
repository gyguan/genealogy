# Genealogy 查询 Card 原型与视觉契约

本文是所有查询 Card 在结构、尺寸、栅格、字段、展开区和动作区方面的唯一权威规范。人物档案查询 Card 是参考基准，其他页面不得建立第二套查询骨架或页面级尺寸规则。

业务页面必须复用：

- `StandardQueryPanel`
- `StandardQueryGrid`
- `StandardQueryField`
- `StandardAdvancedFilters`
- `StandardQueryActions`
- `StandardMoreFiltersButton`

## 1. 标准结构

```text
StandardQueryPanel：查询条件
├─ StandardQueryGrid：基础查询字段
├─ StandardAdvancedFilters：低频查询字段（按需展开）
└─ StandardQueryActions：更多筛选 / 重置 / 查询
```

- Card 标题统一为“查询条件”，业务模块名称只出现在页面头。
- 基础条件与展开条件使用同一 Grid、同一列宽和同一字段组件。
- 展开区不使用 `Collapse` Header、嵌套 Card、灰色背景、阴影、边框或分割线。
- 动作区位于字段区下方，不占用字段 Grid 单元。
- Form 可以包裹 Card，也可以位于 Card 内；共享样式必须覆盖两种结构。

## 2. Card 规格

| 项目 | 规格 |
|---|---:|
| Card 圆角 | `8px` |
| Card 边框 | `1px solid colorBorderSecondary` |
| Card 阴影 | `0 1px 2px rgb(0 0 0 / 5%)` |
| Header 高度 | `48px` |
| Header / Body 桌面内边距 | `24px` |
| 移动端内边距 | `16px` |
| 标题字号 | `16px / 24px`，字重 `600` |
| 字段区与动作区间距 | `24px` |

不得通过页面级 `.ant-card-*`、内联 `padding` 或 `margin` 改写这些规格。

## 3. 字段栅格

| 视口 | 标准列数 | 说明 |
|---|---:|---|
| `≥ 1200px` | 4 列 | 字段不足四项时保留标准列宽，不拉伸为非标准宽度 |
| `768px ～ 1199px` | 2 列 | 按完整字段换行 |
| `< 768px` | 1 列 | 单列排列，禁止水平溢出 |

固定参数：

- 字段横向间距：`16px`
- 字段纵向间距：`4px`
- 基础区与展开区间距：`4px`
- 日期范围、普通输入和选择字段默认均占一列

禁止自行使用 3 列、5 列、跨两列字段或固定像素字段宽度。

## 4. 字段规格

`StandardQueryField` 统一承载标签、控件和可选辅助说明。

| 项目 | 规格 |
|---|---:|
| 标签字号 | `13px / 20px`，字重 `500` |
| 标签与控件间距 | `4px` |
| 控件高度 | `32px` |
| 控件圆角 | `8px` |
| 控件字号 | `13px` |
| Placeholder 字号 | `12px` |
| 辅助说明字号 | `12px / 20px` |

- `Input`、`Select`、`QueryMultiSelect`、`RangePicker`、`InputNumber` 和 Switch 字段容器宽度均为 `100%`。
- 多选控件保持单行 `32px` 高度，选中项过多时响应式省略，不得撑高整行。
- Placeholder 必须垂直居中。
- 无真实辅助说明时不产生空白高度；有说明时由共享 Field 统一展示。

## 5. 更多筛选

- 低频条件默认收起。
- 展开后文案为“收起筛选”，收起后为“更多筛选”。
- 隐藏条件已生效时显示数量，例如“更多筛选（2）”。
- 展开与收起不得清空字段值。
- 展开区使用与基础区相同的 4 列、`16px` 横向间距和 `4px` 纵向间距。

## 6. 查询动作

桌面端固定顺序并整体右对齐：

```text
更多筛选（N）    重置    查询
```

| 动作 | 样式 | 图标 | 最小宽度 | 高度 |
|---|---|---|---:|---:|
| 更多筛选 | `text` | 上/下箭头 | `112px` | `32px` |
| 重置 | `default` | 无 | `72px` | `32px` |
| 查询 | `primary` | 无 | `72px` | `32px` |

- 按钮间距统一为 `8px`。
- 更多筛选必须紧邻重置按钮左侧。
- 查询是唯一主按钮。
- 页面不得为查询增加放大镜或其他专属图标。
- 查询 Loading 时，更多筛选和重置同步禁用。
- 按钮圆角统一为 `6px`，字号为 `13px`。

## 7. 移动端动作区

`< 768px` 时：

```text
更多筛选（N）
重置（50%）        查询（50%）
```

- 更多筛选独占第一行。
- 重置和查询等宽占第二行。
- 三个动作触控高度为 `44px`。
- 页面不得自行改变移动端排列或顺序。

## 8. 共享实现边界

业务页面只负责：字段值与选项、联动、查询和重置逻辑、URL 状态、权限、Loading，以及 `activeFilterCount` 计算。

共享组件负责：Card 外观、标题、DOM 层级、内边距、4 → 2 → 1 栅格、字段尺寸、Placeholder、展开区、动作顺序、按钮主次、宽度、圆角和移动端布局。

权威样式文件：

```text
frontend/genealogy-web/src/styles/shared/standard-query-card.css
```

页面级 CSS 禁止重新定义以下选择器：

```text
.standard-query-panel
.standard-query-grid
.standard-query-field
.standard-query-advanced
.standard-query-actions
```

## 9. 全量页面清单

当前纳入契约的实际查询场景共 13 个：

1. 人物档案
2. 来源资料库
3. 修谱工作台
4. 世系图谱（人物中心 / 支派全局共用一个 Card）
5. 成员与权限
6. 审核中心（三个 Tab 共用一个 Card）
7. 追踪与审计·对象追踪
8. 追踪与审计·操作日志
9. 追踪与审计·风险事件
10. 宗族文化·文化资料
11. 宗族文化·文化场所
12. 宗族文化·迁徙脉络
13. 数据导入

新增查询页面必须加入全量覆盖测试，不允许仅依赖人工检查。

## 10. 验收门禁

治理测试必须在以下回退时失败：

- 任一查询场景不再使用 `StandardQueryPanel`；
- 标准 Grid 变为 3 列或 5 列；
- Card 内边距不是 `24px`；
- 控件高度不是 `32px`；
- 字段横向间距不是 `16px`，纵向间距不是 `4px`；
- 展开区增加背景、阴影或边框；
- 动作区与字段区间距不是 `24px`；
- 查询不再是唯一 `primary`；
- 更多筛选不再紧邻重置；
- 移动端不再采用“一行更多筛选 + 一行双按钮”；
- 页面使用 `!important`、硬编码颜色或页面级查询布局覆盖。
