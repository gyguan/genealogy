import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Select, Space, Tag, Typography } from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { EmptyState, PageFeedback } from '../../../../shared/ui/Feedback';
import { Field } from '../../../../shared/ui/Form';
import { feedback } from '../../../../shared/ui/OperationFeedback';
import { Panel } from '../../../../shared/ui/Panel';
import { ResultListCard } from '../../../../shared/ui/ResultListCard';
import { relationshipName, relationTypeText } from '../../domain/relationship';
import {
  SOURCE_BINDING_PAGE_SIZE,
  deriveSourceStageState,
  paginateSourceBindings,
  resetSourceBindingSelection
} from '../../domain/sourceStageModel';
import { isOfficial } from '../../domain/status';
import { loadBranches, type BranchLike } from '../../services/branchService';
import { loadClans, type ClanLike } from '../../services/clanService';
import { loadPersons, type PersonLike } from '../../services/personService';
import { loadRelationships, type RelationshipLike } from '../../services/relationshipService';
import { submitReviewTask } from '../../services/reviewTaskService';
import { bindSourceApi, createSourceApi, loadSourceLinks, loadSources, type SourceLike, type SourceLinkLike } from '../../services/sourceService';
import './source-stage-step.css';

type TargetType = 'person' | 'relationship' | 'branch' | 'clan';
type Props = {  onSubmittedReview?: (taskId: string) => void };
const sourceTypes = [
  ['genealogy_book', '族谱'], ['local_chronicle', '地方志'], ['oral_history', '口述'], ['tombstone', '墓碑'], ['photo', '照片'], ['archive', '档案'], ['other', '其他']
].map(([value, label]) => ({ value, label }));

function sourceName(row?: SourceLike) { return row?.sourceName || row?.name || `来源#${row?.id || '-'}`; }
function clanName(row?: ClanLike) { return row?.clanName || row?.surname || `宗族#${row?.id || '-'}`; }
function targetTypeText(value?: string) { return ({ person: '人物', relationship: '关系', branch: '支派', clan: '宗族' } as Record<string, string>)[String(value)] || '对象'; }

export function SourceStageStep({ onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [sources, setSources] = useState<SourceLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [relationships, setRelationships] = useState<RelationshipLike[]>([]);
  const [links, setLinks] = useState<SourceLinkLike[]>([]);
  const [linkPage, setLinkPage] = useState(1);
  const [sourceNameValue, setSourceNameValue] = useState('');
  const [sourceType, setSourceType] = useState('genealogy_book');
  const [targetType, setTargetType] = useState<TargetType>('person');
  const [targetId, setTargetId] = useState('');
  const [sourcesError, setSourcesError] = useState('');
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState('');
  const [saving, setSaving] = useState(false);
  const [binding, setBinding] = useState(false);

  const stage = useMemo(() => deriveSourceStageState(sources, workspace.sourceId), [sources, workspace.sourceId]);
  const selectedSource = stage.selectedSource;
  const officialSources = useMemo(() => sources.filter(isOfficial), [sources]);
  const pagedLinks = useMemo(() => paginateSourceBindings(links, linkPage), [links, linkPage]);

  async function refreshSources(keep = true) {
    if (!workspace.clanId) {
      setSources([]);
      setSourcesError('');
      return;
    }
    setSourcesError('');
    try {
      const rows = await loadSources(workspace.clanId);
      setSources(rows);
      if (keep && workspace.sourceId && !rows.some(row => String(row.id) === workspace.sourceId)) workspace.setSourceId('');
    } catch (error) {
      setSourcesError((error as Error).message || '查询来源失败，已保留上次成功结果');
    }
  }

  async function refreshCandidates() {
    if (!workspace.clanId) return;
    const [branchRows, personRows] = await Promise.all([loadBranches(workspace.clanId).catch(() => []), loadPersons(workspace.clanId).catch(() => [])]);
    setBranches(branchRows.filter(isOfficial));
    setPersons(personRows.filter(isOfficial));
    const settled = await Promise.allSettled(personRows.filter(isOfficial).map(row => loadRelationships(row.id)));
    const all = settled.filter((item): item is PromiseFulfilledResult<RelationshipLike[]> => item.status === 'fulfilled').flatMap(item => item.value).filter(isOfficial);
    setRelationships(Array.from(new Map(all.map(row => [String(row.id), row])).values()));
  }

  async function refreshLinks(sourceId = workspace.sourceId) {
    if (!sourceId) {
      setLinks([]);
      setLinksError('');
      setLinkPage(1);
      return;
    }
    setLinksLoading(true);
    setLinksError('');
    try { setLinks(await loadSourceLinks(sourceId)); }
    catch (error) { setLinksError((error as Error).message || '查询已绑定对象失败'); }
    finally { setLinksLoading(false); }
  }

  useEffect(() => { void loadClans().then(rows => { setClans(rows); if (!workspace.clanId && rows[0]?.id) workspace.setClanId(String(rows[0].id)); }); }, []);
  useEffect(() => {
    setTargetType('person');
    setTargetId('');
    setLinks([]);
    setSourcesError('');
    setLinkPage(1);
    void Promise.all([refreshSources(false), refreshCandidates()]);
  }, [workspace.clanId]);
  useEffect(() => {
    setTargetType('person');
    setTargetId('');
    setLinkPage(1);
    void refreshLinks();
  }, [workspace.sourceId]);
  useEffect(() => {
    setLinkPage(previous => Math.min(previous, pagedLinks.pageCount));
  }, [pagedLinks.pageCount]);

  async function createSource(submit: boolean) {
    if (!workspace.clanId || !sourceNameValue.trim()) {
      feedback.warning(!workspace.clanId ? '请选择宗族' : '请填写来源名称');
      return;
    }
    setSaving(true);
    try {
      const created = await createSourceApi(workspace.clanId, { sourceName: sourceNameValue.trim(), sourceType, description: null });
      setSourceNameValue('');
      if (created.id) workspace.setSourceId(String(created.id));
      if (submit && created.id) {
        const task: any = await submitReviewTask({ clanId: workspace.clanId, targetType: 'source', targetId: created.id, comment: '提交来源审核' });
        if (task?.id) onSubmittedReview?.(String(task.id));
        feedback.success('来源已保存并提交审核，审核通过后可在阶段二选择。');
      } else feedback.success('来源已保存为草稿，需审核通过后才能绑定对象。');
      await refreshSources(false);
    } catch (error) { feedback.error((error as Error).message || '保存来源失败'); }
    finally { setSaving(false); }
  }

  function chooseSource(row: SourceLike) {
    const next = String(row.id || '');
    const reset = resetSourceBindingSelection(workspace.sourceId, next);
    setLinkPage(1);
    workspace.setSourceId(next);
    if (reset) { setTargetType(reset.targetType); setTargetId(reset.targetId); }
  }

  const targetOptions = useMemo(() => {
    if (targetType === 'person') return persons.map(row => ({ value: String(row.id), label: row.name || `人物#${row.id}` }));
    if (targetType === 'relationship') return relationships.map(row => ({ value: String(row.id), label: `${relationshipName(row)} · ${relationTypeText(row)}` }));
    if (targetType === 'branch') return branches.map(row => ({ value: String(row.id), label: row.branchName || `支派#${row.id}` }));
    const clan = clans.find(row => String(row.id) === workspace.clanId);
    return workspace.clanId ? [{ value: workspace.clanId, label: clanName(clan) }] : [];
  }, [targetType, persons, relationships, branches, clans, workspace.clanId]);

  async function bind() {
    const actualTarget = targetId || (targetType === 'clan' ? workspace.clanId : '');
    if (!stage.bindingOpen || !workspace.sourceId || !actualTarget) {
      feedback.warning(stage.stageTwoReason || `请选择具体${targetTypeText(targetType)}`);
      return;
    }
    setBinding(true);
    try {
      await bindSourceApi(workspace.clanId, { sourceId: Number(workspace.sourceId), targetType, targetId: Number(actualTarget) });
      feedback.success('来源绑定成功，已刷新当前来源的绑定记录。');
      setTargetId('');
      setLinkPage(1);
      await refreshLinks();
    } catch (error) { feedback.error((error as Error).message || '绑定来源失败'); }
    finally { setBinding(false); }
  }

  return (
    <Panel title="来源证据" description="先创建并审核来源，再在绑定阶段选择已审核通过的来源。">
      <div className="source-stage-layout">
        <Card title={<Space><span>阶段一：创建来源</span><Tag color="processing">创建与审核</Tag></Space>}>
          <div className="wizard-form-grid">
            <Field label="适用宗族 *"><select value={workspace.clanId} onChange={event => workspace.patch({ clanId: event.target.value, sourceId: '' })}><option value="">请选择宗族</option>{clans.map(row => <option key={row.id} value={String(row.id)}>{clanName(row)}</option>)}</select></Field>
            <Field label="来源名称 *"><input value={sourceNameValue} onChange={event => setSourceNameValue(event.target.value)} placeholder="例如：民国二十年族谱" /></Field>
            <Field label="来源类型"><Select value={sourceType} onChange={setSourceType} options={sourceTypes} /></Field>
          </div>
          <Space className="source-stage-actions" wrap><Button type="primary" loading={saving} onClick={() => void createSource(false)}>保存来源草稿</Button><Button loading={saving} onClick={() => void createSource(true)}>保存并提交审核</Button></Space>
          {sourcesError ? <PageFeedback tone="error" title="来源列表加载失败" description={sourcesError} closable onClose={() => setSourcesError('')} action={<Button size="small" onClick={() => void refreshSources()}>重新加载</Button>} /> : null}
        </Card>

        <Card title={<Space><span>阶段二：选择正式来源并绑定对象</span><Tag color={stage.bindingOpen ? 'success' : 'default'}>{stage.bindingOpen ? '已开放' : '待选择'}</Tag></Space>}>
          <div className="wizard-form-grid source-stage-bind-grid">
            <Field label="正式来源"><Select value={workspace.sourceId || undefined} onChange={value => { const row = officialSources.find(item => String(item.id) === value); if (row) chooseSource(row); else { setLinkPage(1); workspace.setSourceId(''); } }} options={officialSources.map(row => ({ value: String(row.id), label: sourceName(row) }))} placeholder="请选择已审核通过的来源" allowClear /></Field>
          </div>
          {!officialSources.length ? <PageFeedback tone="warning" title="暂无已审核通过的来源" description="请先在阶段一创建来源并提交审核。" /> : !stage.bindingOpen ? <PageFeedback title="请选择正式来源后绑定对象" /> : <>
            <Typography.Paragraph>当前正式来源：<strong>{sourceName(selectedSource)}</strong></Typography.Paragraph>
            <div className="wizard-form-grid source-stage-bind-grid">
              <Field label="绑定对象类型"><Select value={targetType} onChange={value => { setTargetType(value); setTargetId(''); }} options={[["person","人物"],["relationship","关系"],["branch","支派"],["clan","宗族"]].map(([value,label]) => ({ value, label }))} /></Field>
              <Field label="绑定对象"><Select value={targetId || (targetType === 'clan' ? workspace.clanId : '')} onChange={setTargetId} options={targetOptions} placeholder={`请选择${targetTypeText(targetType)}`} /></Field>
            </div>
            <Space className="source-stage-actions" wrap><Button type="primary" loading={binding} disabled={!targetOptions.length} onClick={() => void bind()}>绑定来源</Button></Space>
          </>}
          <ResultListCard<SourceLinkLike>
            cardClassName="source-stage-links"
            totalSuffix="条绑定记录"
            resultTotal={links.length}
            extra={<Button loading={linksLoading} disabled={!workspace.sourceId} onClick={() => void refreshLinks()}>刷新已绑定对象</Button>}
            notice={linksError ? <PageFeedback tone="error" title="绑定记录加载失败" description={linksError} closable onClose={() => setLinksError('')} action={<Button size="small" onClick={() => void refreshLinks()}>重试</Button>} /> : null}
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
            locale={{ emptyText: <EmptyState compact title={stage.bindingOpen ? '当前来源暂无绑定记录' : '选择正式来源后显示绑定记录'} /> }}
            columns={[
              { key: 'targetType', title: '对象类型', width: 120, render: (_value, link) => <Tag>{targetTypeText(link.targetType)}</Tag> },
              { key: 'targetId', title: '绑定对象', render: (_value, link) => `对象 #${link.targetId}` },
              { key: 'createdAt', title: '绑定时间', width: 180, render: (_value, link) => link.createdAt || '-' }
            ]}
          />
        </Card>
      </div>
    </Panel>
  );
}
