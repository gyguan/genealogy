# Frontend AI Engineering Rules

本文件适用于 `frontend/genealogy-web/` 及其子目录，继承仓库根 `AGENTS.md`。

根文件中的 P0、P1 优先级高于本文件；本文件只细化前端 P2 工程规则。发生冲突时，以根规则、Issue 验收标准和已批准 Spec 为准。

详细经验与示例见 `docs/ai/frontend-code-understanding-and-maintainability-standard.md`。

---

## 1. 技术基线

- React
- TypeScript
- Vite
- Ant Design 5.x
- OpenAPI 生成类型与请求能力

新增 UI 框架、状态管理库、请求库或重复基础组件前，必须先说明现有能力为何无法满足，以及对包体积、维护成本和迁移路径的影响。

---

## 2. 组件与设计体系

1. 基础 UI 优先使用 Ant Design：`Layout`、`Menu`、`Tabs`、`Card`、`Form`、`Input`、`Select`、`Button`、`Table`、`Descriptions`、`Alert`、`Empty` 等。
2. `shared/ui` 只做薄封装，不建立第二套 Button、Table、Form、Modal 等基础设计体系。
3. 自定义组件只用于世系图谱、关系连线、树谱画布等 Ant Design 无法覆盖的业务可视化。
4. 页面应复用现有布局、间距、表格、表单和反馈模式，避免单页另起视觉规范。
5. 前端展示业务名称，不要求最终用户识别或手工填写技术 ID。
6. 页面容器负责用例编排；展示组件负责渲染；Feature Hook 负责可复用状态与副作用；Service/API 层负责请求。
7. UI 组件不得直接调用业务 API，业务页面不得承担通用基础组件职责。
8. 组件、Hook 和 Service 名称必须表达业务意图，禁止新增含义模糊的 `Common`、`Manager`、`Data`、`Helper`、`Content`。

详细视觉规则见 `docs/10-frontend-design-guidelines.md`。

---

## 3. 页面状态与交互

每个异步页面必须处理：

- 加载态；
- 空态；
- 错误态；
- 无权限态；
- 提交中和重复提交保护；
- 成功或失败反馈。

筛选、分页、排序、Tab 和搜索条件应进入明确状态模型；需要分享、刷新或返回恢复时，优先同步到 URL。

高风险操作必须：

- 明确影响对象；
- 要求必要的原因或二次确认；
- 展示后端返回的真实不可操作原因；
- 不用隐藏按钮代替后端安全校验。

互斥流程不得通过多个松散布尔值表达，优先使用联合类型、枚举或显式状态对象。

---

## 4. API 与类型

1. API 变更先更新 `docs/api/openapi.json`，再执行：

```bash
cd frontend/genealogy-web
npm run api:generate
```

2. 优先使用生成的请求与类型，不手工复制后端 DTO。
3. 不通过 `any`、重复接口定义、类型断言或宽松类型掩盖契约不一致。
4. 前端兼容旧字段时，必须与后端兼容窗口一致，并标明移除条件。
5. 页面不能自行推断审核结果、权限范围或正式数据状态，应使用后端明确返回值。
6. 错误处理应区分业务错误、无权限、网络失败和系统异常。
7. API DTO、表单值和页面 ViewModel 必须边界清晰；复杂展示不长期直接依赖原始 DTO。
8. 页面不得散落拼接 API 路径；请求能力按 Feature 收敛到 `api/` 或 `services/`。
9. 搜索请求必须考虑防抖、取消过期请求和最小触发条件。
10. 新增展示字段前必须确认 OpenAPI 中存在该字段，不得在前端补造真实业务数据。

---

## 5. 权限与隐私展示

- 前端只负责减少误操作和改善体验，后端负责最终授权。
- 按目标对象使用后端返回的 `allowedActions`，不得将一份通用权限套用到所有行。
- 无权访问的数据不应先加载再隐藏。
- 在世人员、联系方式、附件和来源材料按后端脱敏结果展示，不尝试在前端恢复完整值。
- 导出、下载和附件预览入口必须结合真实权限和审计要求。
- 不通过角色名自行推断对象级权限、宗族范围或支派范围。
- 权限、状态、错误码和业务字典映射应集中维护，不在页面内重复定义。

---

## 6. 状态管理与代码组织

状态必须明确归属：

1. 服务端状态：接口数据、分页、请求状态，由请求层或 Feature Hook 管理。
2. URL 状态：可分享、刷新和返回恢复的筛选、分页、Tab 和范围。
3. 页面局部状态：Drawer、Modal、选中项等短生命周期交互。
4. 表单状态：优先由 Ant Design Form 管理。
5. 派生状态：从 Props、接口结果或其他 state 计算，不重复保存。

必须遵守：

- 页面局部状态保持局部化；确需跨页面共享时使用现有 `shared/context` 或项目已有模式。
- 不为单一页面引入全局状态。
- 同一业务事实只能有一个权威状态源。
- 不同时维护 Form 值和一份镜像 `useState`。
- 请求、展示、领域转换和副作用职责分离，避免超大页面组件。
- 公共组件应有明确复用场景，不为一次使用提前抽象。
- 修改前先查找同类页面、表单、列表和 API 调用模式。
- 不静默吞掉异常，不在控制台保留敏感数据或调试输出。
- Props 逐层透传超过两级时，应评估组件边界、组合模式或已有 Context。

推荐 Feature 结构：

```text
features/<module>/
  api/ 或 services/
  hooks/
  components/
  pages/
  model/
  README.md
```

---

## 7. Hook 与副作用

1. `useEffect` 只用于同步 React 与外部系统，不替代普通计算或事件处理。
2. 一个 Effect 只负责一种外部副作用。
3. 依赖数组必须完整，不通过禁用 ESLint 规则掩盖依赖问题。
4. 订阅、定时器和事件监听必须提供 cleanup。
5. 请求竞争必须取消、使用请求序号或丢弃过期结果。
6. 不在 Effect 中循环同步多个可派生 state。
7. 不通过 `document.querySelector`、DOM 文本或元素存在性推断业务状态。
8. 自定义 Hook 必须以 `use` 开头并表达业务意图，如 `useReviewDecisionForm`，禁止 `useData`、`useCommon`。
9. Hook 不应混合多个无关状态域；超过三个独立副作用时应评估拆分。
10. 消息提示应由明确用户动作或请求结果触发，避免因重复渲染反复弹出。

---

## 8. Props、事件与 ViewModel

- Props 应使用明确类型，不使用无语义的 `data`、`info`、`options` 承载复杂对象。
- 数据字段使用名词，事件使用业务动作，如 `onReviewApprove`、`onBranchChange`。
- 多个相关事件可以归并为类型化 `actions` 对象。
- Props 字段超过 8 个时，应评估 ViewModel、Action 对象或组件拆分。
- 列表 `key` 必须使用稳定业务标识，不使用数组下标。
- API DTO 到 ViewModel、FormValues 和提交 Command 的转换必须显式、可测试。
- 展示组件原则上无副作用，不直接读取路由、全局对象或业务 API。

---

## 9. 表格、表单与弹窗

### 表格

- 列定义按 Feature 集中维护，避免页面内超长内联数组。
- 行操作必须基于每行 `allowedActions`。
- 排序、分页和筛选必须与后端契约一致。
- 大数据量使用后端分页，不在前端截取无界结果模拟分页。
- 复杂单元格提取为命名明确的渲染组件。
- render 函数中禁止发起请求或执行昂贵排序、分组和转换。

### 表单

- 使用 Ant Design Form 作为单一表单状态源。
- 校验规则集中、可复用，并与后端约束一致。
- DTO → FormValues → Command 转换显式分离。
- 提交中必须防止重复提交。
- 请求失败后保留用户输入，并展示可操作错误。
- 大表单按业务段落拆分，不按任意行数机械拆分。

### Drawer / Modal

- 打开对象、模式和动作必须显式。
- 关闭时清理短生命周期状态。
- 不在多个弹窗间共享含义模糊的 `currentRecord`。
- 高风险操作明确对象、影响和原因。

---

## 10. 代码复杂度与拆分信号

以下为 Review 参考，不是机械限制：

| 对象 | 建议范围 |
|---|---:|
| 页面容器组件 | 150～350 行 |
| 业务展示组件 | 50～250 行 |
| 自定义 Hook | 40～180 行 |
| 单个函数 | 10～50 行 |
| Props 字段 | 建议不超过 8 个 |
| 单组件 Effect | 建议不超过 3 个 |

出现以下情况时必须评估拆分：

- 同一组件同时维护请求、复杂表单、表格、弹窗、权限和大量字典映射；
- JSX 主体需要长距离滚动才能理解；
- 多个布尔状态共同表达一个互斥流程；
- 一个 Effect 同时处理请求、DOM、状态同步和消息提示；
- 修改一个字段需要同步多个 state；
- 测试一个行为需要构造大量无关状态；
- 类似页面重复实现请求、错误处理、状态字典或权限映射。

拆分按职责和变化原因进行，不为了满足行数制造碎片组件。

---

## 11. 世系图谱与性能

世系图谱和关系可视化必须考虑：

- 查询深度和节点数量上限；
- 懒加载、分页、虚拟化或节点裁剪；
- 大对象渲染和重复计算；
- 循环关系、缺失关系和异常数据；
- 交互降级与空态；
- 不在前端一次性拉取无边界全宗族数据。

性能规则：

- 优先通过职责拆分减少重渲染，不盲目增加 `memo`、`useMemo`、`useCallback`。
- 昂贵图计算、树布局和大列表转换必须有明确缓存边界。
- 不在渲染期间重复排序或创建大型临时对象。
- 频繁输入、Resize、Scroll 和拖拽事件应合理防抖或节流。
- 图片、附件和详情按需加载。
- 组件卸载后不得继续写入状态。
- 性能优化应提供可复现问题或测量证据。

---

## 12. 测试要求

测试名称必须描述业务条件和期望结果，例如：

- `showsForbiddenStateWhenUserCannotViewSource`
- `keepsFormValuesWhenReviewSubmissionFails`
- `restoresFiltersFromUrlAfterRefresh`
- `disablesDuplicateSubmitWhileRequestIsPending`

测试分层：

1. 纯函数、ViewModel 和字典映射：单元测试。
2. Feature Hook 和显式状态模型：Hook/组件测试。
3. 页面关键交互：组件集成测试。
4. 主流程、权限和真实契约：Playwright E2E。

优先覆盖：

- loading、empty、error、forbidden；
- 分页、筛选、排序和 URL 恢复；
- 提交成功、业务失败、网络失败和重复提交；
- 每行权限、跨宗族和支派范围；
- 审核、自审、正式数据和脱敏展示；
- 图谱节点、边和截断提示。

禁止通过删除断言、弱化类型、跳过用例或扩大等待时间掩盖失败。

---

## 13. 模块 README

Tree、Persons、Sources、Reviews、Members、Import 等复杂 Feature 应维护简短 README，至少说明：

1. 模块目标和用户场景；
2. 页面入口和路由；
3. 页面 → Hook → Service → API 调用链；
4. 服务端、URL、页面和表单状态归属；
5. 权限、隐私和审核规则来源；
6. 关键 ViewModel、字典和错误码；
7. 性能边界；
8. 必跑测试和关键不变量。

---

## 14. 验证命令

默认执行：

```bash
cd frontend/genealogy-web
npm run typecheck
npm run build
npm run api:check
```

涉及 OpenAPI 时增加：

```bash
npm run api:generate
```

涉及关键页面、权限或主流程时，执行对应组件测试和 Playwright E2E。

只执行页面定向验证时，必须说明未执行全量检查的原因、覆盖范围和已知基线问题。

---

## 15. 前端完成检查

前端任务标记完成前确认：

- 使用统一设计体系，没有重复基础组件；
- 页面、展示组件、Hook、Service 和 ViewModel 职责清晰；
- 没有重复保存派生状态或维护 Form 镜像 state；
- Effect 职责单一、依赖完整并正确清理；
- 加载、空、错、无权限和提交状态完整；
- API 生成类型、FormValues、ViewModel 和实际调用一致；
- 权限展示与目标对象一致，但未替代后端鉴权；
- 不暴露技术 ID、原始枚举或隐私数据；
- 列表、筛选和图谱具备合理性能边界和稳定 key；
- 关键业务行为具有对应层级测试；
- 复杂 Feature README 和关键不变量已同步；
- TypeScript、构建、API 检查和相关 E2E 结果已写入 PR。
