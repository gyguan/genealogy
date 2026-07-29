# Issue #961 样式债清退说明

## 完成态

- A 类系统样式债为 0。
- C 类临时兼容样式债为 0。
- `!important`、固定 Ant Design 系统色、原生控件平行选择器、无作用域 `.ant-*`、全局业务选择器和 Legacy/Prototype 活动引用均已清退。
- `temporaryCompatibility` 已从治理台账移除。

## 稳定作用域

全局加载的共享样式必须以 `[data-genealogy-app]` 为应用责任根；Feature 视觉继续使用稳定 Feature 根。逗号分隔的每个选择器分支都必须显式包含责任根，禁止依赖首个分支或选择器解析推断作用域。

## 回归保障

Style Debt Audit 同时阻断 A 类和 C 类条目。Frontend CI、Visual Release Gate、Functional E2E 及 Chrome、Edge、Firefox、WebKit、高 DPI 矩阵共同验证构建、交互和响应式兼容性。
