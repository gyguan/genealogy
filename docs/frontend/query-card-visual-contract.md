# Genealogy 查询 Card 视觉契约

本文是标准查询 Card 在**标题、字段尺寸、栅格、展开区和查询动作视觉**方面的唯一权威规范。

- 查询条件、URL、分页、状态恢复和业务字段规则仍遵循 `docs/frontend/query-pages.md`。
- 当 `query-pages.md` 中历史示例与本文在查询 Card 标题、字段布局、动作位置或按钮样式上存在差异时，以本文为准。
- 页面实现必须复用 `StandardQueryPanel`、`StandardQueryGrid`、`StandardQueryField`、`StandardAdvancedFilters` 和 `StandardQueryActions`，不得建立第二套视觉骨架。

## 1. 标准结构

```text
StandardQueryPanel：查询条件
├─ StandardQueryGrid：基础查询字段
├─ StandardAdvancedFilters：低频查询字段（按需展开）
└─ StandardQueryActions
   ├─ 左侧：更多筛选（N）/ 收起筛选（N）
   └─ 右侧：重置 / 查询
```

规则：

- 查询 Card 标题统一为“查询条件”，业务模块名称只出现在页面头。
- 基础条件与展开条件复用相同 Grid 和列线。
- 展开区不使用 `Collapse` Header、嵌套 Card、灰色背景、阴影、额外边框或分割线。
- 查询动作固定在 Card 字段区下方，不与字段占用同一 Grid 单元。

## 2. 字段栅格

| 视口 | 标准列数 | 说明 |
|---|---:|---|
| `≥ 1200px` | 4 列 | 基础条件默认一行；字段不足四项时保留空列，不拉伸字段 |
| `768px ～ 1199px` | 2 列 | 按完整字段换行 |
| `< 768px` | 1 列 | 单列排列，禁止水平溢出 |

禁止：

- 标准查询 Card 自行使用 3 列或 5 列；
- 日期范围或普通字段跨两列；
- 基础与展开区采用不同列数；
- 使用固定字段像素宽度模拟等宽布局。

## 3. 查询字段

`StandardQueryField` 统一承载标签、控件与辅助说明：

```text
标签行
控件行
辅助说明行（默认保留稳定占位）
```

要求：

- `Input`、`Select`、`QueryMultiSelect`、`RangePicker` 和 Switch 字段容器宽度均为 `100%`。
- 桌面查询控件默认高度使用 Ant Design `controlHeight`，当前基线为 `32px`。
- 标签、控件和说明区域形成稳定纵向节奏；有无说明不得改变同行控件底边。
- Switch 等非输入型控件也必须放入标准 Field 容器。
- 多选控件默认保持单行高度；选中项过多时使用响应式省略或“已选 N 项”，不得撑高整行。
- 完整选择值必须通过下拉内容、Tooltip 或可访问名称发现，不能只为对齐而隐藏业务信息。

## 4. 展开筛选

- 默认收起低频条件。
- 展开后文案为“收起筛选”，收起后为“更多筛选”。
- 存在已生效的隐藏条件时展示数量，例如“更多筛选（2）”。
- 展开与收起不清空条件。
- 展开区使用与基础条件相同的 `StandardQueryGrid` 列宽和间距。
- 展开区仅通过 `16px` 左右的垂直间距表达分组，不使用背景、阴影、边框和分割线。

## 5. 查询动作

桌面动作顺序与位置：

```text
更多筛选（N）                          重置    查询
```

| 动作 | Ant Design 样式 | 图标 | 最小宽度 | 位置 |
|---|---|---|---:|---|
| 更多筛选 | `text` | 展开/收起箭头 | 112px | 左侧 |
| 重置 | `default` | 无 | 72px | 右侧，查询之前 |
| 查询 | `primary` | 无 | 72px | 最右侧 |

统一规则：

- 同组间距为 `8px`。
- 查询是动作组唯一主按钮。
- 页面不得为查询增加放大镜或其他专属图标。
- 查询 Loading 时，更多筛选和重置同步禁用，避免改变正在提交的条件。
- `StandardQueryActions` 决定按钮主次、图标和顺序；页面传入的差异化 `type` / `icon` 不得改变最终外观。

## 6. 移动端动作区

`< 768px` 时：

```text
更多筛选（N）
重置（50%）        查询（50%）
```

- 更多筛选独占第一行。
- 重置和查询等宽占第二行。
- 三个动作触控高度不低于 `44px`。
- 不允许各 Feature 分别采用换行、两列、全宽或不同顺序。

## 7. Card 间距

- Header、Body 和动作区使用 Ant Design Token。
- 字段横向间距统一使用 `16px`，纵向间距统一使用 `12px`。
- 动作区与字段区间距统一使用 `16px`。
- `Form.Item` 不保留页面默认的大块底部间距，由标准 Field 统一管理。
- 页面不得通过无作用域 `.ant-*` 选择器、`!important` 或零散内联样式调整标准查询 Card。

## 8. 共享组件 API

```tsx
<StandardQueryPanel
  actions={(
    <StandardQueryActions>
      <StandardMoreFiltersButton expanded={expanded} activeFilterCount={count} />
      <Button data-query-action="reset">重置</Button>
      <Button data-query-action="submit" loading={loading}>查询</Button>
    </StandardQueryActions>
  )}
>
  <StandardQueryGrid>
    <StandardQueryField label="宗族">...</StandardQueryField>
    <StandardQueryField label="支派">...</StandardQueryField>
  </StandardQueryGrid>
  <StandardAdvancedFilters expanded={expanded}>
    <StandardQueryField label="状态">...</StandardQueryField>
  </StandardAdvancedFilters>
</StandardQueryPanel>
```

业务页面负责：

- 字段值、选项和联动；
- 查询、重置和 URL 行为；
- `activeFilterCount` 的业务计算；
- Loading、Disabled 和权限条件。

共享组件负责：

- 标题、DOM 层级和 Card 间距；
- 4 → 2 → 1 栅格；
- 字段标签、控件与提示占位；
- 展开区视觉；
- 更多筛选、重置和查询的顺序、主次、图标、宽度与移动端排列。

## 9. 验收门禁

共享契约必须具备聚焦治理测试，能够在以下回退时失败：

- 标准 Grid 变为 3 列或 5 列；
- 基础与展开字段使用不同列线；
- 展开区增加背景、阴影或边框；
- 查询字段不再使用统一 control height；
- 重置或查询按钮出现页面特有图标；
- 查询不再是唯一 `primary`；
- 更多筛选缺少箭头、状态或数量能力；
- 移动端不再采用“一行更多筛选 + 一行双按钮”；
- 查询动作样式依赖 Ant Design 内部 DOM 类。
