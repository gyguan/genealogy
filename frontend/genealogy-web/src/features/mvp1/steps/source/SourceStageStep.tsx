import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Empty, Select, Space, Tag, Typography, message } from 'antd';
import { useWorkspace } from '../../../../shared/context/WorkspaceContext';
import { Field } from '../../../../shared/ui/Form';
import { Panel } from '../../../../shared/ui/Panel';
import { relationshipName, relationTypeText } from '../../domain/relationship';
import { deriveSourceStageState, resetSourceBindingSelection } from '../../domain/sourceStageModel';
import { isOfficial } from '../../domain/status';
import { loadBranches, type BranchLike } from '../../services/branchService';
import { loadClans, type ClanLike } from '../../services/clanService';
import { loadPersons, type PersonLike } from '../../services/personService';
import { loadRelationships, type RelationshipLike } from '../../services/relationshipService';
import { submitReviewTask } from '../../services/reviewTaskService';
import { bindSourceApi, createSourceApi, loadSourceLinks, loadSources, type SourceLike, type SourceLinkLike } from '../../services/sourceService';
import './source-stage-step.css';

type TargetType = 'person' | 'relationship' | 'branch' | 'clan';
type Props = { notify?: (data: unknown, error?: boolean) => void; onSubmittedReview?: (taskId: string) => void };
const sourceTypes = [
  ['genealogy_book', '族谱'], ['local_chronicle', '地方志'], ['oral_history', '口述'], ['tombstone', '墓碑'], ['photo', '照片'], ['archive', '档案'], ['other', '其他']
].map(([value, label]) => ({ value, label }));

function sourceName(row?: SourceLike) { return row?.sourceName || row?.name || `来源#${row?.id || '-'}`; }
function clanName(row?: ClanLike) { return row?.clanName || row?.surname || `宗族#${row?.id || '-'}`; }
function targetTypeText(value?: string) { return ({ person: '人物', relationship: '关系', branch: '支派', clan: '宗族' } as Record<string, string>)[String(value)] || '对象'; }

export function SourceStageStep({ notify, onSubmittedReview }: Props) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<ClanLike[]>([]);
  const [sources, setSources] = useState<SourceLike[]>([]);
  const [branches, setBranches] = useState<BranchLike[]>([]);
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [relationships, setRelationships] = useState<RelationshipLike[]>([]);
  const [links, setLinks] = useState<SourceLinkLike[]>([]);
  const [sourceNameValue, setSourceNameValue] = useState('');
  const [sourceType, setSourceType] = useState('genealogy_book');
  const [targetType, setTargetType] = useState<TargetType>('person');
  const [targetId, setTargetId] = useState('');
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState('');
  const [saving, setSaving] = useState(false);
  const [binding, setBinding] = useState(false);

  const stage = useMemo(() => deriveSourceStageState(sources, workspace.sourceId), [sources, workspace.sourceId]);
  const selectedSource = stage.selectedSource;
  const officialSources = useMemo(() => sources.filter(isOfficial), [sources]);

  function toast(text: string, error = false) {
    notify?.({ message: text }, error);
    if (error) message.error(text); else message.success(text);
  }

  async function refreshSources(keep = true) {
    if (!workspace.clanId) return;
    try {
      const rows = await loadSources(workspace.clanId);
      setSources(rows);
      if (keep && workspace.sourceId && !rows.some(row => String(row.id) === workspace.sourceId)) workspace.setSourceId('');
    } catch (error) {
      toast((error as Error).message || '查询来源失败，已保留上次成功结果', true);
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
    if (!sourceId) { setLinks([]); setLinksError(''); return; }
    setLinksLoading(true); setLinksError('');
    try { setLinks(await loadSourceLinks(sourceId)); }
    catch (error) { setLinksError((error as Error).message || '查询已绑定对象失败'); }
    finally { setLinksLoading(false); }
  }

  useEffect(() => { void loadClans().then(rows => { setClans(rows); if (!workspace.clanId && rows[0]?.id) workspace.setClanId(String(rows[0].id)); }); }, []);
  useEffect(() => { setTargetType('person'); setTargetId(''); setLinks([]); void Promise.all([refreshSources(false), refreshCandidates()]); }, [workspace.clanId]);
  useEffect(() => { setTargetType('person'); setTargetId(''); void refreshLinks(); }, [workspace.sourceId]);

  async function createSource(submit: boolean) {
    if (!workspace.clanId || !sourceNameValue.trim()) { toast(!workspace.clanId ? '请选择宗族' : '请填写来源名称', true); return; }
    setSaving(true);
    try {
      const created = await createSourceApi(workspace.clanId, { sourceName: sourceNameValue.trim(), sourceType, description: null });
      setSourceNameValue('');
      if (created.id) workspace.setSourceId(String(created.id));
      if (submit && created.id) {
        const task: any = await submitReviewTask({ clanId: workspace.clanId, targetType: 'source', targetId: created.id, comment: '提交来源审核' });
        if (task?.id) onSubmittedReview?.(String(task.id));
        toast('来源已保存并提交审核，审核通过后可在阶段二选择。');
      } else toast('来源已保存为草稿，需审核通过后才能绑定对象。');
      await refreshSources(false);
    } catch (error) { toast((error as Error).message || '保存来源失败', true); }
    finally { setSaving(false); }
  }

  function chooseSource(row: SourceLike) {
    const next = String(row.id || '');
    const reset = resetSourceBindingSelection(workspace.sourceId, next);
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
    if (!stage.bindingOpen || !workspace.sourceId || !actualTarget) { toast(stage.stageTwoReason || `请选择具体${targetTypeText(targetType)}`, true); return; }
    setBinding(true);
    try {
      await bindSourceApi(workspace.clanId, { sourceId: Number(workspace.sourceId), targetType, targetId: Number(actualTarget) });
      toast('来源绑定成功，已刷新当前来源的绑定记录。');
      setTargetId('');
      await refreshLinks();
    } catch (error) { toast((error as Error).message || '绑定来源失败', true); }
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
        </Card>

        <Card title={<Space><span>阶段二：选择正式来源并绑定对象</span><Tag color={stage.bindingOpen ? 'success' : 'default'}>{stage.bindingOpen ? '已开放' : '待选择'}</Tag></Space>}>
          <div className="wizard-form-grid source-stage-bind-grid">
            <Field label="正式来源"><Select value={workspace.sourceId || undefined} onChange={value => { const row = officialSources.find(item => String(item.id) === value); if (row) chooseSource(row); else workspace.setSourceId(''); }} options={officialSources.map(row => ({ value: String(row.id), label: sourceName(row) }))} placeholder="请选择已审核通过的来源" allowClear /></Field>
          </div>
          {!officialSources.length ? <Alert type="warning" showIcon message="暂无已审核通过的来源" description="请先在阶段一创建来源并提交审核。" /> : !stage.bindingOpen ? <Alert type="info" showIcon message="请选择正式来源后绑定对象" /> : <>
            <Typography.Paragraph>当前正式来源：<strong>{sourceName(selectedSource)}</strong></Typography.Paragraph>
            <div className="wizard-form-grid source-stage-bind-grid">
              <Field label="绑定对象类型"><Select value={targetType} onChange={value => { setTargetType(value); setTargetId(''); }} options={[["person","人物"],["relationship","关系"],["branch","支派"],["clan","宗族"]].map(([value,label]) => ({ value, label }))} /></Field>
              <Field label="绑定对象"><Select value={targetId || (targetType === 'clan' ? workspace.clanId : '')} onChange={setTargetId} options={targetOptions} placeholder={`请选择${targetTypeText(targetType)}`} /></Field>
            </div>
            <Space className="source-stage-actions" wrap><Button type="primary" loading={binding} disabled={!targetOptions.length} onClick={() => void bind()}>绑定来源</Button><Button loading={linksLoading} onClick={() => void refreshLinks()}>刷新已绑定对象</Button></Space>
          </>}
          {linksError ? <Alert type="error" showIcon message={linksError} action={<Button size="small" onClick={() => void refreshLinks()}>重试</Button>} /> : null}
          <div className="source-stage-links"><h4>已绑定对象（{links.length}）</h4>{links.length ? links.map(link => <Card size="small" key={String(link.id || `${link.targetType}-${link.targetId}`)}><Space wrap><Tag>{targetTypeText(link.targetType)}</Tag><span>对象 #{link.targetId}</span><Typography.Text type="secondary">{link.createdAt || ''}</Typography.Text></Space></Card>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={stage.bindingOpen ? '当前来源暂无绑定记录' : '选择正式来源后显示绑定记录'} />}</div>
        </Card>
      </div>
    </Panel>
  );
}
