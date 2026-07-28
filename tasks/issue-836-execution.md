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
6. 验证真实 UI 导出入口及下载失败后的 loading 恢复。
7. 执行 CI、修复问题、归档 Artifact、合并并关闭 Issue。

## BUILD

- [x] 创建执行分支。
- [x] 建立执行检查点。
- [ ] 新增真实 Playwright 文件闭环测试。
- [ ] 创建 Draft PR。
- [ ] 根据 CI 修复测试或业务缺陷。

## VERIFY

- [ ] Frontend CI。
- [ ] Functional E2E。
- [ ] Artifact、Trace、截图、视频和服务日志。

## REVIEW

- [ ] 权限、敏感数据、文件字节和导出内容复核。
- [ ] 更新 PR、Issue #836 和父 Issue #830。
