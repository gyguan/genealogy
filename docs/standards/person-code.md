# 人物谱号规则

## 目标

人物编码从旧的 `P000001` 升级为结构化谱号，默认格式：

```text
{clanCode}-{branchCode}-G{generationNo}-R{rank}-{seq}
```

示例：

```text
HUANG-B003-长房-G05-R长子-0128
```

## 规则字段

| 占位符 | 含义 | 来源 |
|---|---|---|
| clanCode | 宗族码 | 优先取 clan.clanCode，缺省取姓氏，再缺省取 CLAN{id} |
| branchCode | 支派码 | 当前版本根据 branch.id + branchName 生成，例如 B003-长房 |
| generationNo | 世次 | person.generationNo，不存在时使用 00 |
| rank | 排行 | person.rankInFamily，不存在时使用 00 |
| seq | 序号 | person.id 起步，冲突时递增 |

## 可配置项

后端通过 `genealogy.person-code` 配置项支持覆盖：

```yaml
genealogy:
  person-code:
    pattern: "{clanCode}-{branchCode}-G{generationNo}-R{rank}-{seq}"
    branch-width: 3
    generation-width: 2
    sequence-width: 4
    unknown-generation: "00"
    unknown-rank: "00"
```

## 前端策略

前端人物录入页面当前仍展示“保存后自动生成”，但 API client 已修复：当旧页面继续传 `personCode: null` 时，会在提交前移除该字段，避免显式置空干扰后端规则化谱号生成。

后续如果要支持人工指定谱号，只需要把页面字段改成可输入，并通过 `personCode` 传到后端。后端已经保留同宗族内唯一性校验。
