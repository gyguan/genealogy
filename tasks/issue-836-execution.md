# Issue #836 执行看板

## DEFINE

- 目标：覆盖来源附件上传、预览、下载、谱册生成与权限隔离的真实文件业务链。
- 环境：PostgreSQL 16 + Spring Boot + React/Vite + Chromium/Playwright。
- 成功标准：真实文件非空、内容正确、跨宗族不泄漏、失败场景有自动化证据，CI 全部通过。

## PLAN

1. 创建来源并上传真实附件。
2. 校验空文件、非法类型及不存在文件下载失败语义。
3. 校验附件列表、预览、下载的字节与元数据一致。
4. 校验跨宗族预览/下载拒绝且不泄漏文件名和内容。
5. 导出全宗族与当前支派谱册，校验 HTML 非空并包含宗族、支派和人物信息。
6. 验证真实 UI 附件页签与导出入口。
7. 执行 CI、修复问题、归档 Artifact、合并并关闭 Issue。

## BUILD

- [x] 创建执行分支 `agent/issue-836-source-export-download-e2e`。
- [x] 建立执行检查点。
- [x] 新增真实 Playwright 文件闭环测试 `source-file-booklet-download.spec.ts`。
- [x] 创建 Draft PR #860。
- [x] 修复 multipart 请求头导致上传失败的问题。
- [x] 增加附件扩展名与 MIME 类型安全白名单，拒绝可执行文件及未知二进制。
- [x] 修复来源详情附件页签测试路径。
- [x] 修复谱册导出入口在画布工具栏缺失时不渲染的问题。
- [x] 将附件预览权限拒绝状态码统一为 HTTP 403，并增加异常映射单测。

## VERIFY

- [x] Backend CI：Run `30324779017`，success。
- [x] Frontend CI：Run `30324779043`，success。
- [x] Member Branch Scope E2E：Run `30324779042`，success。
- [x] Functional E2E：Run `30324779015`，success。
- [x] Artifact：`functional-test-evidence-30324779015-1`，ID `8675341864`。
- [x] Artifact digest：`sha256:2f5cd26c33cea92bca8548954aee474470efe99623c2df737591b4402707774a`。
- [x] 真实附件上传、列表、预览、下载及字节一致性通过。
- [x] 空文件、非法类型、不存在附件下载失败语义通过。
- [x] 全宗族与当前支派 HTML 谱册导出内容校验通过。
- [x] 跨宗族附件与谱册访问均返回拒绝，响应不泄漏文件名、来源名和文件内容。

## REVIEW

- [x] 权限、敏感数据、文件字节和导出内容复核。
- [x] 更新 PR #860、Issue #836 和父 Issue #830。
