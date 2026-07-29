# 前端代码可理解性与可维护性经验规范

本规范面向 `frontend/genealogy-web` 的 React + TypeScript 代码，目标是让页面、组件、Hook、状态和 API 调用同时具备良好的人工可维护性与 AI 可理解性。

本文件解释经验和拆分信号；强制规则以根 `AGENTS.md`、`frontend/genealogy-web/AGENTS.md`、Issue/Spec 和现有前端设计规范为准。

## 1. 核心原则

前端代码应满足：

1. 一个组件只有一个主要变化原因。
2. 页面负责用例编排，展示组件负责渲染，Hook 负责可复用状态与副作用。
3. 服务端状态、页面状态、表单状态和派生状态明确区分。
4. 页面行为通过类型、命名和调用链即可理解，不依赖隐式 DOM、全局变量或跨组件副作用。
5. API 契约、权限、审核状态和隐私结果以后端为准。
6. 关键交互和业务不变量必须由测试、类型或文档固化。

## 2. 复杂度参考阈值

阈值用于触发 Review，不作为机械拆分标准。

| 对象 | 建议范围 | 超出后重点检查 |
|---|---:|---|
| 页面容器组件 | 150～350 行 | 是否同时包含请求、表单、表格、弹窗和大量映射 |
| 业务展示组件 | 50～250 行 | 是否存在多个独立展示区或交互流程 |
| 自定义 Hook | 40～180 行 | 是否混合多个无关副作用或状态域 |
| 工具/映射文件 | 30～200 行 | 是否应按业务字典或场景拆分 |
| 单个函数 | 10～50 行 | 是否混合查询、转换、校验和副作用 |
| Props 字段 | 建议不超过 8 个 | 是否需要 ViewModel、Action 对象或组件拆分 |
| 单组件 Effect | 建议不超过 3 个 | 是否存在职责混杂、依赖不清或状态重复同步 |

以下信号出现两个以上时，应优先拆分：

- 同一组件既发请求又维护复杂表单、表格列、弹窗和权限判断；
- JSX 主体需要长距离滚动才能理解；
- 存在大量布尔状态，如 `isXxxOpen`、`isXxxLoading`、`isXxxEditing`；
- 一个 `useEffect` 同时负责请求、状态同步、DOM 操作和消息提示；
- 修改一个字段需要同步修改多个 state；
- Props 逐层透传超过两级；
- 组件名称只能使用 `Page`、`Panel`、`Manager`、`Content` 等泛化词表达；
- 测试必须构造大量无关状态才能覆盖一个行为。

## 3. 页面与组件职责

### 3.1 页面容器

页面容器负责：

- 读取路由参数和 URL 查询条件；
- 调用 Feature Hook 或 Service；
- 组织加载、空、错、无权限状态；
- 协调表格、表单、Drawer、Modal 等业务组件；
- 将后端结果转换为页面 ViewModel。

页面容器不应：

- 直接维护大量原始 API 路径；
- 在 JSX 中实现复杂业务规则；
- 复制权限、状态或字典映射；
- 通过 DOM 查询判断业务状态。

### 3.2 展示组件

展示组件应：

- 通过明确 Props 接收数据和 Action；
- 尽量保持无副作用；
- 不直接调用业务 API；
- 不自行推断后端权限、审核状态或隐私结果；
- 对 loading、empty、disabled 等状态有明确表达。

### 3.3 Feature Hook

Feature Hook 适合承载：

- 可复用的请求流程；
- URL 与筛选状态同步；
- 表单提交和失败恢复；
- 复杂交互状态机；
- 订阅、定时器和事件监听的完整生命周期。

Hook 名称必须表达业务意图，例如：

- `usePersonArchiveQuery`
- `useReviewDecisionForm`
- `useSourceBindingActions`
- `useLineageViewport`

避免 `useData`、`useCommon`、`useManager` 等泛化名称。

## 4. 状态归属

状态分为四类：

1. **服务端状态**：接口返回的数据、分页、请求状态；由请求层或 Feature Hook 管理。
2. **URL 状态**：需要分享、刷新、返回恢复的筛选、分页、Tab 和查询范围。
3. **页面局部状态**：Drawer、Modal、当前选中项等短生命周期交互状态。
4. **派生状态**：可由 Props、接口结果或其他 state 计算得到的值。

规则：

- 不把派生状态重复保存到 `useState`；优先直接计算或使用 `useMemo`。
- 不为单一页面引入全局状态。
- 同一业务事实只能有一个权威状态源。
- 表单状态优先交给 Ant Design Form 管理，不同时维护一份镜像 state。
- 多个布尔值表达互斥流程时，优先使用枚举或显式状态对象。

示例：

```ts
// 不推荐
const [isCreating, setCreating] = useState(false)
const [isEditing, setEditing] = useState(false)
const [isReviewing, setReviewing] = useState(false)

// 推荐
type WorkspaceMode = 'idle' | 'creating' | 'editing' | 'reviewing'
const [mode, setMode] = useState<WorkspaceMode>('idle')
```

## 5. Effect 与副作用

`useEffect` 应只同步 React 与外部系统，不用于替代普通计算。

必须遵守：

- 一个 Effect 只负责一种外部副作用；
- 依赖数组必须完整，不通过禁用规则掩盖依赖问题；
- 订阅、定时器、监听器必须返回 cleanup；
- 请求竞争需支持取消、请求序号或丢弃过期结果；
- 不在 Effect 中循环同步多个可派生 state；
- 不通过 `document.querySelector`、DOM 文本或元素存在性推断业务状态；
- 消息提示应由明确的用户动作或请求结果触发，避免渲染抖动时重复提示。

## 6. Props、事件与 ViewModel

Props 应体现组件契约：

```ts
interface PersonTableProps {
  rows: PersonRowViewModel[]
  loading: boolean
  pagination: PaginationState
  actions: PersonTableActions
}
```

建议：

- 数据使用名词，如 `rows`、`detail`、`permissions`；
- 回调使用业务事件，如 `onReviewApprove`、`onBranchChange`；
- 避免 `onClick1`、`handleAction`、`data`、`info` 等模糊命名；
- 多个相关回调可归并为类型化 `actions` 对象；
- API DTO 不应直接成为复杂展示组件的长期 Props，优先转换为稳定 ViewModel；
- 列表 `key` 必须使用稳定业务标识，不使用数组下标。

## 7. API 与请求层

请求能力按 Feature 收敛：

```text
features/<module>/
  api/ 或 services/
  hooks/
  components/
  pages/
  model/
```

规则：

- 页面不散落拼接 API 路径；
- 优先使用 OpenAPI 生成类型和请求能力；
- 请求参数使用类型化 Query/Input；
- 统一处理业务错误、无权限、网络失败和系统异常；
- 不使用 `any` 或重复 DTO 掩盖契约不一致；
- 不在多个页面重复实现同一请求和错误映射；
- 搜索输入需考虑防抖、取消过期请求和最小触发条件；
- 分页、排序、筛选由后端执行，前端不得对无界结果模拟分页。

## 8. 权限、状态和业务字典

必须集中维护：

- `allowedActions` 到 UI 操作的映射；
- 审核、正式数据、导入、来源和关系状态的业务文案；
- 性别、在世状态、隐私级别、来源类型和关系类型字典；
- 错误码到用户提示的映射。

页面不得：

- 用角色名自行推断对象级权限；
- 用隐藏按钮替代后端鉴权；
- 展示原始枚举、技术 ID 或接口字段名；
- 根据前端状态自行判断正式数据是否已生效；
- 恢复后端已经脱敏的字段。

## 9. 表格、表单和弹窗

### 表格

- 列定义按 Feature 集中维护，避免页面内超长内联数组；
- 行操作基于每行 `allowedActions`；
- 排序必须与后端字段和稳定排序规则一致；
- 大数据量必须后端分页；
- 复杂单元格提取为命名明确的渲染组件；
- 不在 render 中执行昂贵转换或发起请求。

### 表单

- 使用 Ant Design Form 作为单一表单状态源；
- 校验规则集中、可复用，并与后端约束一致；
- 编辑表单的 DTO → FormValues → Command 转换显式分离；
- 提交中禁止重复提交；
- 失败后保留用户输入并展示可操作错误；
- 大表单按业务段落拆分子组件，而不是按任意行数拆分。

### Drawer / Modal

- 打开对象、模式和动作必须显式；
- 关闭时清理短生命周期状态；
- 不在多个弹窗之间共享模糊的 `currentRecord`；
- 高风险操作明确对象、影响和原因。

## 10. 性能与渲染

- 优先通过职责拆分减少重渲染，而不是盲目增加 `memo`、`useMemo`、`useCallback`；
- 昂贵图计算、树布局和大列表转换应有明确缓存边界；
- 不在渲染期间创建大型临时对象或重复排序；
- 图谱和大列表必须有节点、深度、分页或虚拟化边界；
- 对频繁输入、Resize、Scroll 和拖拽事件使用合理节流；
- 图片、附件和详情按需加载；
- 组件卸载后不得继续写入状态；
- 性能优化需提供可复现问题或测量证据。

## 11. 测试与可验证性

测试名称应描述业务条件和期望：

- `showsForbiddenStateWhenUserCannotViewSource`
- `keepsFormValuesWhenReviewSubmissionFails`
- `restoresFiltersFromUrlAfterRefresh`
- `disablesDuplicateSubmitWhileRequestIsPending`

测试分层：

1. 纯函数和字典映射：单元测试。
2. Feature Hook 和状态机：Hook/组件测试。
3. 页面关键交互：组件集成测试。
4. 用户主流程、权限和真实契约：Playwright E2E。

重点覆盖：

- loading、empty、error、forbidden；
- 分页、筛选、排序与 URL 恢复；
- 提交成功、业务失败、网络失败和重复提交；
- 每行权限和跨宗族/支派范围；
- 审核、自审、正式数据与脱敏展示；
- 图谱节点、边和截断提示。

## 12. 模块 README

Tree、Persons、Sources、Reviews、Members、Import 等复杂 Feature 应维护简短 README，至少说明：

1. 模块目标和用户场景；
2. 页面入口和路由；
3. 页面 → Hook → Service → API 调用链；
4. 服务端、URL、页面和表单状态归属；
5. 权限、隐私和审核规则来源；
6. 关键 ViewModel 和字典；
7. 性能边界；
8. 必跑测试和关键不变量。

## 13. Review 清单

提交前确认：

- 组件和 Hook 名称能直接表达职责；
- 页面没有混合过多请求、状态、映射和 JSX；
- 没有重复保存派生状态；
- Effect 职责单一并正确清理；
- API DTO、FormValues 和 ViewModel 边界明确；
- 权限和状态未由前端自行推断；
- 加载、空、错、无权限和重复提交状态完整；
- 列表具备后端分页、稳定 key 和性能边界；
- 关键业务行为具有测试；
- 复杂 Feature 的 README 和不变量已同步。
