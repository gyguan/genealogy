from pathlib import Path
import re

ROOT = Path('frontend/genealogy-web')
BRANCH = 'src/features/mvp1/steps/branch/BranchStep.tsx'
CLAN = 'src/features/mvp1/steps/clan/ClanStep.tsx'
GENERATION = 'src/features/mvp1/steps/generation/GenerationStep.tsx'
PERSON = 'src/features/mvp1/steps/person/PersonStep.tsx'
RELATIONSHIP = 'src/features/mvp1/steps/relationship/RelationshipStep.tsx'
SOURCE_STAGE = 'src/features/mvp1/steps/source/SourceStageStep.tsx'


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding='utf-8')


def write(relative: str, content: str) -> None:
    (ROOT / relative).write_text(content, encoding='utf-8')


def replace_once(text: str, pattern: str, replacement: str, label: str, flags: int = re.S) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f'{label}: expected one replacement, got {count}')
    return updated


def extract_card(text: str, generic: str) -> str:
    match = re.search(rf'<ResultListCard<{generic}>([\s\S]*?)\n\s*/>', text)
    if not match:
        raise RuntimeError(f'cannot find ResultListCard<{generic}>')
    return match.group(1).rstrip()


def clean_antd_imports(text: str, candidates: list[str]) -> str:
    match = re.search(r"import \{([^}]+)\} from 'antd';", text)
    if not match:
        return text
    names = [item.strip() for item in match.group(1).split(',') if item.strip()]
    body = text[:match.start()] + text[match.end():]
    kept = []
    for name in names:
        base_name = name.split(' as ')[-1].strip()
        if base_name in candidates and not re.search(rf'\b{re.escape(base_name)}\b', body):
            continue
        kept.append(name)
    replacement = "import { " + ', '.join(kept) + " } from 'antd';"
    return text[:match.start()] + replacement + text[match.end():]


result_list_card = '''import type { Key, ReactNode } from 'react';
import { Alert, Button, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import { WIZARD_RESULT_PAGE_SIZE, wizardBatchToolbarVisible, wizardSelectionLabel } from '../../features/mvp1/domain/wizardResultListModel';
import { QueryResultCard } from './QueryResultCards';
import './result-list-card.css';

type ResultListCardProps<RecordType extends object> = TableProps<RecordType> & {
  description?: ReactNode;
  notice?: ReactNode;
  initialError?: string;
  refreshError?: string;
  stale?: boolean;
  onRetry?: () => void;
  selectedKey?: Key;
  selectionLabel?: (record: RecordType) => string;
  extra?: ReactNode;
  resultExtra?: ReactNode;
  resultTotal?: number;
  totalSuffix?: string;
  cardClassName?: string;
};

function rowKeyValue<RecordType extends object>(props: ResultListCardProps<RecordType>, record: RecordType, index: number): Key {
  if (typeof props.rowKey === 'function') return props.rowKey(record);
  if (typeof props.rowKey === 'string') return (record as any)[props.rowKey] as Key;
  return (record as any).key ?? (record as any).id ?? index;
}

export function ResultListCard<RecordType extends object>(props: ResultListCardProps<RecordType>) {
  const {
    description,
    notice,
    initialError,
    refreshError,
    stale,
    onRetry,
    selectedKey,
    selectionLabel,
    extra,
    resultExtra,
    resultTotal,
    totalSuffix = '条',
    cardClassName = '',
    dataSource = [],
    columns = [],
    pagination,
    scroll,
    rowSelection,
    onRow,
    ...tableProps
  } = props;
  const rows = Array.from(dataSource as readonly RecordType[]);
  const selectedRowKeys = rowSelection?.selectedRowKeys || [];
  const selectedCount = selectedRowKeys.length;
  const firstColumnIndex = columns.findIndex(column => String((column as any).key || '') !== 'actions');
  const accessibleColumns = columns.map((column, columnIndex) => {
    if (columnIndex !== firstColumnIndex || !onRow) return column;
    const originalRender = (column as any).render;
    return {
      ...column,
      render: (value: unknown, record: RecordType, index: number) => {
        const content = originalRender ? originalRender(value, record, index) : value as ReactNode;
        const key = rowKeyValue(props, record, index);
        const selected = selectedKey !== undefined
          ? String(selectedKey) === String(key)
          : selectedRowKeys.some(item => String(item) === String(key));
        const label = selectionLabel?.(record) || String((record as any).name || (record as any).branchName || (record as any).sourceName || content || '当前记录');
        return (
          <Button
            type="link"
            className="result-list-card__selection"
            aria-label={wizardSelectionLabel(label, selected)}
            onClick={event => {
              event.stopPropagation();
              onRow(record, index)?.onClick?.(event as any);
            }}
          >
            {content}
          </Button>
        );
      }
    };
  });
  const resolvedPagination = pagination === false
    ? rows.length > WIZARD_RESULT_PAGE_SIZE
      ? { pageSize: WIZARD_RESULT_PAGE_SIZE, showSizeChanger: false, showTotal: (total: number) => `共 ${total} 条` }
      : false
    : pagination;
  const summaryExtra = resultExtra || stale || wizardBatchToolbarVisible(selectedCount)
    ? (
      <Space size={8} wrap>
        {resultExtra}
        {stale ? <Tag color="warning">数据可能已过期</Tag> : null}
        {wizardBatchToolbarVisible(selectedCount) ? <Tag color="processing">已选择 {selectedCount} 项</Tag> : null}
      </Space>
    )
    : undefined;

  return (
    <QueryResultCard
      className={`result-list-card wizard-query-result-card ${cardClassName}`.trim()}
      total={resultTotal ?? rows.length}
      totalSuffix={totalSuffix}
      extra={extra}
      resultExtra={summaryExtra}
    >
      {notice ? <div className="result-list-card__notice">{notice}</div> : null}
      {description ? <Typography.Paragraph className="result-list-card__description" type="secondary">{description}</Typography.Paragraph> : null}
      {initialError && !rows.length ? (
        <Alert type="error" showIcon message={initialError} action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined} />
      ) : null}
      {refreshError && rows.length ? (
        <Alert className="result-list-card__refresh-error" type="warning" showIcon message={refreshError} action={onRetry ? <Button onClick={onRetry}>重试</Button> : undefined} />
      ) : null}
      <Table<RecordType>
        {...tableProps}
        rowKey={props.rowKey}
        dataSource={rows}
        columns={accessibleColumns}
        rowSelection={rowSelection}
        onRow={onRow}
        pagination={resolvedPagination}
        scroll={{ x: 760, ...scroll }}
      />
    </QueryResultCard>
  );
}
'''
write('src/shared/ui/ResultListCard.tsx', result_list_card)

write('src/shared/ui/result-list-card.css', '''.result-list-card {
  margin-top: 12px;
}

.result-list-card__selection {
  height: auto;
  min-width: 0;
  padding-inline: 0;
  text-align: left;
  white-space: normal;
}

.result-list-card__notice,
.result-list-card__description,
.result-list-card__refresh-error {
  margin-bottom: 12px;
}

.result-list-card > .ant-table-wrapper {
  overflow-x: auto;
}

.result-list-card .ant-pagination {
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .result-list-card .ant-table {
    min-width: 760px;
  }

  .result-list-card .ant-btn,
  .result-list-card .ant-pagination-item,
  .result-list-card .ant-pagination-prev,
  .result-list-card .ant-pagination-next {
    min-height: 44px;
    min-width: 44px;
  }
}
''')

# 宗族节点：普通 Card + Table 改为 ResultListCard（内部固定 QueryResultCard + Table）。
text = read(CLAN)
text = text.replace("import { Panel } from '../../../../shared/ui/Panel';", "import { Panel } from '../../../../shared/ui/Panel';\nimport { ResultListCard } from '../../../../shared/ui/ResultListCard';")
text = replace_once(
    text,
    r'''\n      <Card\n        size="small"\n        title=\{`我的宗族（共\$\{clans\.length\}个）`\}\n        extra=\{<Button loading=\{clanListLoading\} onClick=\{\(\) => void loadClans\(\)\}>刷新</Button>\}\n      >[\s\S]*?\n      </Card>''',
    '''
      <ResultListCard<ClanRecord>
        cardClassName="clan-step-query-results"
        totalSuffix="个宗族"
        extra={<Button loading={clanListLoading} onClick={() => void loadClans()}>刷新</Button>}
        notice={clanListError ? (
          <Alert
            type="error"
            showIcon
            message="宗族列表加载失败"
            description={clanListError}
            action={<Button type="link" onClick={() => void loadClans()}>重新加载</Button>}
          />
        ) : null}
        rowKey={clan => String(clan.id)}
        size="small"
        bordered
        loading={clanListLoading}
        columns={columns}
        dataSource={clans}
        locale={{ emptyText: '当前账号暂无宗族，可在上方创建' }}
        pagination={{
          current: clanPageNo,
          pageSize: clanPageSize,
          total: clans.length,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
          showTotal: total => `共 ${total} 个宗族`,
          onChange: (pageNo, pageSize) => {
            setClanPageNo(pageNo);
            setClanPageSize(pageSize);
          }
        }}
      />''',
    'clan result card'
)
text = clean_antd_imports(text, ['Card', 'Table', 'Typography'])
write(CLAN, text)

# 支派节点。
text = read(BRANCH)
props = extract_card(text, 'BranchLike')
replacement = '''
      <ResultListCard<BranchLike>
        cardClassName="branch-step-query-results"
        totalSuffix="个支派"
        description="草稿/已驳回支派可勾选后提交审核；已通过支派可选中后进入后续步骤。"
        notice={!selectedClanId ? <Alert type="warning" showIcon message="请先选择宗族后查看支派" /> : null}
        extra={(
          <Space wrap>
            <Button type="primary" size="small" disabled={!selectedReviewableRows.length} loading={submitting} onClick={() => void submitSelected()}>
              批量提交审核（{selectedReviewableRows.length}）
            </Button>
            <Button size="small" loading={loading} disabled={!selectedClanId} onClick={() => void loadBranches(selectedClanId)}>刷新</Button>
          </Space>
        )}
''' + props + '''
      />'''
text = replace_once(text, r'\n      <section className="branch-step-list-panel">[\s\S]*?\n      </section>', replacement, 'branch result section')
text = clean_antd_imports(text, ['Typography'])
write(BRANCH, text)

# 字辈节点：方案列表及弹窗内字辈明细列表。
text = read(GENERATION)
scheme_props = extract_card(text, 'GenerationSchemeLike')
scheme_replacement = '''
      <ResultListCard<GenerationSchemeLike>
        cardClassName="generation-step-query-results"
        totalSuffix="个方案"
        notice={<Alert type="info" showIcon message="字辈方案与字辈明细作为一个整体提交审批：先保存草稿方案，再从列表点击“维护字辈”补充明细，最后勾选方案提交审批。" />}
        extra={(
          <Space wrap>
            <Button type="primary" size="small" disabled={!selectedReviewableSchemes.length} loading={submittingSchemes} onClick={() => void submitSelectedSchemes()}>
              批量提交审核（{selectedReviewableSchemes.length}）
            </Button>
            <Button size="small" loading={loadingSchemes} disabled={!workspace.clanId} onClick={() => void loadSchemes()}>刷新</Button>
          </Space>
        )}
''' + scheme_props + '''
      />'''
text = replace_once(text, r'\n      <section className="wizard-branch-list wizard-generation-inline-list">[\s\S]*?\n      </section>', scheme_replacement, 'generation scheme result section')
item_match = re.search(r'<ResultListCard<GenerationItemLike>([\s\S]*?)\n\s*/>', text)
if not item_match:
    raise RuntimeError('generation item ResultListCard missing')
item_props = item_match.group(1).rstrip()
item_replacement = '''<ResultListCard<GenerationItemLike>
            cardClassName="generation-item-query-results"
            totalSuffix="条字辈明细"
            description="字辈明细会随字辈方案整体提交审批；正式方案不可在此直接维护。"
            extra={<Button size="small" disabled={!selectedSchemeId} loading={loadingItems} onClick={() => void loadGenerationItems()}>刷新</Button>}
''' + item_props + '''
          />'''
text = replace_once(
    text,
    r'<div className="wizard-inline-list-header">\s*<h4>字辈明细查询列表</h4>\s*<Button[\s\S]*?</div>\s*<Typography\.Paragraph[\s\S]*?</Typography\.Paragraph>\s*<ResultListCard<GenerationItemLike>[\s\S]*?\n\s*/>',
    item_replacement,
    'generation item result section'
)
text = clean_antd_imports(text, ['Typography'])
write(GENERATION, text)

# 人物节点。
text = read(PERSON)
props = extract_card(text, 'PersonLike')
replacement = '''
      <ResultListCard<PersonLike>
        cardClassName="person-step-query-results"
        totalSuffix="个人物"
        description="草稿/已驳回人物可勾选后批量提交审批；已通过人物可选中后用于建立关系。"
        notice={!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        extra={(
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewablePersons.length} loading={submittingPersons} onClick={() => void submitSelectedPersons()}>
              批量提交审核（{selectedReviewablePersons.length}）
            </Button>
            <Button loading={loadingPersons} disabled={!workspace.clanId} onClick={() => void loadPersons()}>刷新</Button>
          </Space>
        )}
''' + props + '''
      />'''
text = replace_once(text, r'\n      <section className="person-step-list-panel step-object-result-panel">[\s\S]*?\n      </section>', replacement, 'person result section')
write(PERSON, text)

# 关系节点。
text = read(RELATIONSHIP)
props = extract_card(text, 'RelationshipLike')
replacement = '''
      <ResultListCard<RelationshipLike>
        cardClassName="relationship-step-query-results"
        totalSuffix="条关系"
        description="草稿/已驳回关系可勾选后批量提交审批。"
        notice={!centerPersonId ? <Alert type="info" showIcon message="关系按当前中心人物加载，请先选择中心人物。" /> : null}
        extra={(
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewableRelationships.length} loading={submittingRelationships} onClick={() => void submitSelectedRelationships()}>
              批量提交审核（{selectedReviewableRelationships.length}）
            </Button>
            <Button loading={loadingRelationships} disabled={!centerPersonId} onClick={() => void loadRelationships(centerPersonId)}>刷新</Button>
          </Space>
        )}
''' + props + '''
      />'''
text = replace_once(text, r'\n      <section className="relationship-step-list-panel step-object-result-panel">[\s\S]*?\n      </section>', replacement, 'relationship result section')
text = clean_antd_imports(text, ['Typography'])
write(RELATIONSHIP, text)

# 来源节点：已绑定对象由卡片列表改为严格两层 QueryResultCard + Table。
text = read(SOURCE_STAGE)
text = text.replace("import { Panel } from '../../../../shared/ui/Panel';", "import { Panel } from '../../../../shared/ui/Panel';\nimport { ResultListCard } from '../../../../shared/ui/ResultListCard';")
text = text.replace(
    '<Space className="source-stage-actions" wrap><Button type="primary" loading={binding} disabled={!targetOptions.length} onClick={() => void bind()}>绑定来源</Button><Button loading={linksLoading} onClick={() => void refreshLinks()}>刷新已绑定对象</Button></Space>',
    '<Space className="source-stage-actions" wrap><Button type="primary" loading={binding} disabled={!targetOptions.length} onClick={() => void bind()}>绑定来源</Button></Space>'
)
source_replacement = '''<ResultListCard<SourceLinkLike>
            cardClassName="source-stage-links"
            totalSuffix="条绑定记录"
            resultTotal={links.length}
            extra={<Button loading={linksLoading} disabled={!workspace.sourceId} onClick={() => void refreshLinks()}>刷新已绑定对象</Button>}
            notice={linksError ? <Alert type="error" showIcon message={linksError} action={<Button size="small" onClick={() => void refreshLinks()}>重试</Button>} /> : null}
            size="small"
            bordered
            rowKey={link => String(link.id || `${link.targetType}-${link.targetId}`)}
            loading={linksLoading}
            dataSource={pagedLinks.rows}
            pagination={pagedLinks.total > SOURCE_BINDING_PAGE_SIZE ? {
              current: pagedLinks.page,
              pageSize: SOURCE_BINDING_PAGE_SIZE,
              total: pagedLinks.total,
              showSizeChanger: false,
              showTotal: total => `共 ${total} 条`,
              onChange: setLinkPage
            } : false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={stage.bindingOpen ? '当前来源暂无绑定记录' : '选择正式来源后显示绑定记录'} /> }}
            columns={[
              { key: 'targetType', title: '对象类型', width: 120, render: (_value, link) => <Tag>{targetTypeText(link.targetType)}</Tag> },
              { key: 'targetId', title: '绑定对象', render: (_value, link) => `对象 #${link.targetId}` },
              { key: 'createdAt', title: '绑定时间', width: 180, render: (_value, link) => link.createdAt || '-' }
            ]}
          />'''
text = replace_once(
    text,
    r'\{linksError \? <Alert[\s\S]*?\}\s*<div className="source-stage-links">[\s\S]*?</div>',
    source_replacement,
    'source binding result section'
)
text = clean_antd_imports(text, ['Pagination'])
write(SOURCE_STAGE, text)

write('src/features/mvp1/steps/source/source-stage-step.css', '''.source-stage-layout { display: grid; gap: 16px; }
.source-stage-actions { margin-top: 12px; }
.source-stage-batch { margin: 12px 0; }
.source-stage-links { margin-top: 16px; }
.source-stage-bind-grid { margin-bottom: 8px; }
.source-stage-layout .ant-table-wrapper { overflow-x: auto; }
.source-stage-layout .ant-btn { min-height: 32px; }
@media (max-width: 767px) {
  .source-stage-layout { grid-template-columns: minmax(0, 1fr); }
  .source-stage-layout .ant-card-body { padding: 14px; }
  .source-stage-layout .ant-btn { min-height: 44px; }
  .source-stage-layout .ant-table { min-width: 620px; }
  .source-stage-actions { width: 100%; }
}
''')

# 静态结构门禁：六个实际节点必须通过 QueryResultCard -> Table 的共享实现。
structure_test = '''import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const stepFiles = [
  'steps/clan/ClanStep.tsx',
  'steps/branch/BranchStep.tsx',
  'steps/generation/GenerationStep.tsx',
  'steps/person/PersonStep.tsx',
  'steps/relationship/RelationshipStep.tsx',
  'steps/source/SourceStageStep.tsx'
];

test('wizard ResultListCard renders one query result card with a direct table and no nested card', () => {
  const source = readFileSync(new URL('../../../shared/ui/ResultListCard.tsx', import.meta.url), 'utf8');
  assert.match(source, /<QueryResultCard[\\s\\S]*<Table<RecordType>/);
  assert.doesNotMatch(source, /<Card\\b/);
  assert.doesNotMatch(source, /business-result-card/);
});

test('all active wizard nodes use the shared strict two-layer result implementation', () => {
  for (const relativePath of stepFiles) {
    const source = readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
    assert.match(source, /ResultListCard/, `${relativePath} must render ResultListCard`);
    assert.doesNotMatch(source, /step-draft-review-header/, `${relativePath} must not keep a separate result header`);
    assert.doesNotMatch(source, /business-result-card/, `${relativePath} must not render a nested business card`);
  }
});

test('source binding results are rendered as a table instead of record cards', () => {
  const source = readFileSync(new URL('../steps/source/SourceStageStep.tsx', import.meta.url), 'utf8');
  assert.match(source, /ResultListCard<SourceLinkLike>/);
  assert.doesNotMatch(source, /pagedLinks\\.rows\\.map\\([\\s\\S]*?<Card/);
});
'''
write('src/features/mvp1/domain/wizardQueryResultStructure.test.mjs', structure_test)

# 记录执行范围。
Path('tasks/issue-694-execution.md').write_text('''# Issue 694 执行记录

## 覆盖节点

- 宗族：宗族查询结果表格
- 支派：支派查询结果表格
- 字辈：字辈方案查询结果表格、字辈明细查询结果表格
- 人物：人物查询结果表格
- 关系：关系查询结果表格
- 来源：已绑定对象查询结果表格

## 固定结构

```text
QueryResultCard
├─ Header：查询结果（共 XX 条）+ 节点级操作
└─ Table
```

共享 `ResultListCard` 不再渲染 Ant Design Card，仅负责在 `QueryResultCard` 内直接渲染 Table、状态提示和分页。
''', encoding='utf-8')

# 最终保护性检查。
result_source = read('src/shared/ui/ResultListCard.tsx')
if '<Card' in result_source or 'business-result-card' in result_source:
    raise RuntimeError('ResultListCard still contains a nested card')
for relative in [CLAN, BRANCH, GENERATION, PERSON, RELATIONSHIP, SOURCE_STAGE]:
    source = read(relative)
    if 'ResultListCard' not in source:
        raise RuntimeError(f'{relative} is missing ResultListCard')
print('Issue 694 migration completed')
