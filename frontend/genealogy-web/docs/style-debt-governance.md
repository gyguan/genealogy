# 全量样式债基线与只减不增门禁

## 目标

样式治理不再依赖 `!important <= 29` 等宽松数量阈值。Style Debt Audit 对 PR 的 base commit 与 HEAD 执行全量 CSS 扫描，并比较精确位置。

## 审计维度

- `!important`：文件、媒体上下文、selector、property。
- 固定系统色值：文件、selector、property、具体色值。
- 原生基础控件规则：button、input、select、textarea、table selector。
- 无作用域 Ant Design 内部类覆盖。
- 全局入口中的业务 selector。
- Legacy / Prototype selector。
- CSS 文件数、行数、字节数和全局 Bundle 字节数。

## 只减不增规则

普通 PR 以目标分支 commit 为精确基线：

1. HEAD 中的每个债务条目必须已经存在于 base，或存在于经批准的精确例外中。
2. selector、property、value 或媒体上下文发生位置偷换，会被识别为新增条目并阻塞。
3. 删除条目会在 Markdown 趋势报告中显示为负增量。
4. 全局 CSS Bundle 字节数不得增加。
5. CSS 总文件数、总行数和总字节数只用于趋势观察，不阻止正常 Feature CSS 增长。

## 例外登记

`style-debt-exceptions.json` 中每条例外必须包含：

- `id`
- `category`
- 精确 `entries`
- `owner`
- `reason`
- `trackingIssue`
- `reviewedAt`
- `exitCondition`

CI 会通过 GitHub API 验证 `trackingIssue` 为开放 Issue。关闭 tracking Issue 前必须先退出对应例外。

## 本地运行

```bash
cd frontend/genealogy-web
node scripts/audit-style-debt.mjs --base=<BASE_SHA>
```

输出：

- `style-debt-audit.json`：机器可读的 base/head 双快照与增减结果。
- `style-debt-audit.md`：供 PR 和人工评审使用的趋势摘要。

## CI

`.github/workflows/style-debt-audit.yml` 在 CSS 相关 PR、主干 Push、每周定时任务和手工触发时运行。报告会写入 Job Summary，并作为 Artifact 保留 30 天。
