import { useMemo, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

type Props = { notify: (data: unknown, error?: boolean) => void };

type SearchForm = {
  keyword: string;
  name: string;
  gender: string;
  generationWord: string;
  generationNo: string;
  branchId: string;
  dataStatus: string;
  pageNo: string;
  pageSize: string;
};

type EditForm = {
  branchId: string;
  personCode: string;
  name: string;
  genealogyName: string;
  courtesyName: string;
  aliasName: string;
  gender: string;
  generationNo: string;
  generationWord: string;
  rankInFamily: string;
  birthDate: string;
  birthDatePrecision: string;
  deathDate: string;
  deathDatePrecision: string;
  isLiving: string;
  birthPlace: string;
  residencePlace: string;
  occupation: string;
  education: string;
  titleOrHonor: string;
  biography: string;
  tombPlace: string;
  epitaph: string;
  hasDescendant: string;
  lineageStatus: string;
  privacyLevel: string;
  dataStatus: string;
};

const emptySearch: SearchForm = { keyword: '', name: '', gender: '', generationWord: '', generationNo: '', branchId: '', dataStatus: '', pageNo: '1', pageSize: '20' };

function personName(row: any) {
  return row.name || row.personName || row.displayName || row.fullName || '';
}

function personGender(row: any) {
  return row.gender || row.sex || '';
}

function personGenerationNo(row: any) {
  return row.generationNo || row.generation || row.generationNumber || '';
}

function personGenerationWord(row: any) {
  return row.generationWord || row.word || '';
}

function personBranchId(row: any) {
  return row.branchId || row.branch?.id || '';
}

function personStatus(row: any) {
  return row.dataStatus || row.status || row.verificationStatus || row.reviewStatus || '';
}

function asString(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function asDate(value: unknown) {
  return asString(value).slice(0, 10);
}

function toEditForm(person: any): EditForm {
  return {
    branchId: asString(person.branchId),
    personCode: asString(person.personCode),
    name: asString(person.name || person.personName),
    genealogyName: asString(person.genealogyName),
    courtesyName: asString(person.courtesyName),
    aliasName: asString(person.aliasName),
    gender: asString(person.gender || 'unknown'),
    generationNo: asString(person.generationNo),
    generationWord: asString(person.generationWord),
    rankInFamily: asString(person.rankInFamily),
    birthDate: asDate(person.birthDate),
    birthDatePrecision: asString(person.birthDatePrecision || 'day'),
    deathDate: asDate(person.deathDate),
    deathDatePrecision: asString(person.deathDatePrecision || 'day'),
    isLiving: person.isLiving === false ? 'false' : 'true',
    birthPlace: asString(person.birthPlace),
    residencePlace: asString(person.residencePlace),
    occupation: asString(person.occupation),
    education: asString(person.education),
    titleOrHonor: asString(person.titleOrHonor),
    biography: asString(person.biography),
    tombPlace: asString(person.tombPlace),
    epitaph: asString(person.epitaph),
    hasDescendant: person.hasDescendant === false ? 'false' : person.hasDescendant === true ? 'true' : '',
    lineageStatus: asString(person.lineageStatus || 'normal'),
    privacyLevel: asString(person.privacyLevel || 'clan_only'),
    dataStatus: asString(person.dataStatus || 'draft')
  };
}

function nullableString(value: string) {
  return value.trim() ? value.trim() : null;
}

function nullableNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

function nullableBoolean(value: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function toUpdatePayload(form: EditForm) {
  return {
    branchId: nullableNumber(form.branchId),
    personCode: nullableString(form.personCode),
    name: form.name.trim(),
    genealogyName: nullableString(form.genealogyName),
    courtesyName: nullableString(form.courtesyName),
    aliasName: nullableString(form.aliasName),
    gender: nullableString(form.gender) || 'unknown',
    generationNo: nullableNumber(form.generationNo),
    generationWord: nullableString(form.generationWord),
    rankInFamily: nullableString(form.rankInFamily),
    birthDate: nullableString(form.birthDate),
    birthDatePrecision: nullableString(form.birthDatePrecision),
    deathDate: nullableString(form.deathDate),
    deathDatePrecision: nullableString(form.deathDatePrecision),
    isLiving: nullableBoolean(form.isLiving),
    birthPlace: nullableString(form.birthPlace),
    residencePlace: nullableString(form.residencePlace),
    occupation: nullableString(form.occupation),
    education: nullableString(form.education),
    titleOrHonor: nullableString(form.titleOrHonor),
    biography: nullableString(form.biography),
    tombPlace: nullableString(form.tombPlace),
    epitaph: nullableString(form.epitaph),
    hasDescendant: nullableBoolean(form.hasDescendant),
    lineageStatus: nullableString(form.lineageStatus),
    privacyLevel: nullableString(form.privacyLevel),
    dataStatus: nullableString(form.dataStatus)
  };
}

export function PersonArchiveSearchPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [form, setForm] = useState<SearchForm>(emptySearch);
  const [rawData, setRawData] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [relationships, setRelationships] = useState<unknown>();
  const [sources, setSources] = useState<unknown>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>();

  function patch(key: keyof SearchForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function patchEdit(key: keyof EditForm, value: string) {
    setEditForm(prev => prev ? { ...prev, [key]: value } : prev);
  }

  async function run(action: () => Promise<void>) {
    if (loading) return;
    setLoading(true);
    try {
      await action();
    } catch (error) {
      const notice = { message: (error as Error).message || '操作失败' };
      setResult(notice);
      notify(notice, true);
    } finally {
      setLoading(false);
    }
  }

  function buildSearchPath(nextPageNo = form.pageNo) {
    if (!workspace.clanId) throw new Error('请先选择或输入宗族ID');
    const params = new URLSearchParams();
    params.set('clanId', workspace.clanId);
    params.set('pageNo', nextPageNo || '1');
    params.set('pageSize', form.pageSize || '20');
    if (form.branchId.trim()) params.set('branchId', form.branchId.trim());
    if (form.keyword.trim()) params.set('keyword', form.keyword.trim());
    if (form.name.trim()) params.set('name', form.name.trim());
    if (form.gender.trim()) params.set('gender', form.gender.trim());
    if (form.generationWord.trim()) params.set('generationWord', form.generationWord.trim());
    if (form.generationNo.trim()) params.set('generationNo', form.generationNo.trim());
    if (form.dataStatus.trim()) params.set('dataStatus', form.dataStatus.trim());
    return `/persons/search?${params.toString()}`;
  }

  async function search(nextPageNo = '1') {
    await run(async () => {
      const data = await apiClient.get(buildSearchPath(nextPageNo));
      setRawData(data);
      closeDetail();
      setForm(prev => ({ ...prev, pageNo: nextPageNo }));
      const total = (data as any)?.total ?? toRecordList(data).length;
      const notice = { message: `已搜索到 ${total} 条人物记录` };
      setResult(notice);
      notify(notice);
    });
  }

  async function openDetail(row: any) {
    await run(async () => {
      const id = row.id || row.personId;
      if (!id) throw new Error('人物记录缺少ID');
      const detail: any = await apiClient.get(`/persons/${id}`);
      workspace.setPersonId(String(id));
      setSelected(detail);
      setEditForm(toEditForm(detail));
      const [relationRes, sourceRes] = await Promise.all([
        apiClient.get(`/persons/${id}/relationships`).catch(() => []),
        apiClient.get(`/source-bindings?targetType=person&targetId=${id}`).catch(() => [])
      ]);
      setRelationships(relationRes);
      setSources(sourceRes);
      const notice = { message: '人物详情已打开', id };
      setResult(notice);
      notify(notice);
    });
  }

  async function saveDetail() {
    await run(async () => {
      if (!selected?.id || !editForm) throw new Error('请先选择人物');
      if (!editForm.name.trim()) throw new Error('姓名不能为空');
      const saved: any = await apiClient.put(`/persons/${selected.id}`, toUpdatePayload(editForm));
      const data = await apiClient.get(buildSearchPath(form.pageNo));
      setRawData(data);
      setSelected(saved);
      setEditForm(toEditForm(saved));
      const notice = { message: '人物档案已保存', id: saved?.id || selected.id };
      setResult(notice);
      notify(notice);
    });
  }

  function reset() {
    setForm(emptySearch);
    setRawData(undefined);
    closeDetail();
  }

  function closeDetail() {
    setSelected(undefined);
    setEditForm(null);
    setRelationships(undefined);
    setSources(undefined);
  }

  const rows = useMemo(() => toRecordList<any>(rawData), [rawData]);
  const total = (rawData as any)?.total ?? rows.length;
  const pageNo = Number((rawData as any)?.pageNo ?? form.pageNo ?? 1);
  const pageSize = Number((rawData as any)?.pageSize ?? form.pageSize ?? 20);
  const totalPages = Number((rawData as any)?.totalPages ?? Math.max(1, Math.ceil(total / pageSize)));

  const completeness = selected ? Math.min(100, [
    selected.name,
    selected.genealogyName,
    selected.courtesyName,
    selected.gender,
    selected.branchId,
    selected.generationNo,
    selected.generationWord,
    selected.rankInFamily,
    selected.birthDate,
    selected.deathDate,
    selected.birthPlace,
    selected.residencePlace,
    selected.biography,
    selected.tombPlace,
    selected.epitaph,
    selected.privacyLevel,
    toRecordList(relationships).length,
    toRecordList(sources).length
  ].filter(Boolean).length * 6) : 0;

  return (
    <div className="person-archive-search">
      <Panel title="人物档案检索" description="按姓名、字辈、性别、代次、支派等条件分页搜索人物；点击搜索结果后从右侧打开详情和编辑抽屉。">
        <div className="archive-search-grid">
          <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="必填" /></Field>
          <Field label="关键词"><input value={form.keyword} onChange={e => patch('keyword', e.target.value)} placeholder="姓名、谱名、字号、籍贯、传记、墓葬" /></Field>
          <Field label="姓名"><input value={form.name} onChange={e => patch('name', e.target.value)} placeholder="按姓名模糊查询" /></Field>
          <Field label="性别"><select value={form.gender} onChange={e => patch('gender', e.target.value)}><option value="">全部</option><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
          <Field label="字辈"><input value={form.generationWord} onChange={e => patch('generationWord', e.target.value)} placeholder="例如：德" /></Field>
          <Field label="代次"><input value={form.generationNo} onChange={e => patch('generationNo', e.target.value)} placeholder="例如：20" /></Field>
          <Field label="支派ID"><input value={form.branchId} onChange={e => patch('branchId', e.target.value)} placeholder="可空" /></Field>
          <Field label="入谱状态"><select value={form.dataStatus} onChange={e => patch('dataStatus', e.target.value)}><option value="">全部</option><option value="draft">草稿</option><option value="pending_review">待审核</option><option value="official">正式</option><option value="rejected">已驳回</option><option value="archived">已归档</option></select></Field>
          <Field label="页码"><input value={form.pageNo} onChange={e => patch('pageNo', e.target.value)} /></Field>
          <Field label="每页数量"><select value={form.pageSize} onChange={e => patch('pageSize', e.target.value)}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></Field>
        </div>
        <Actions>
          <button disabled={loading} onClick={() => search('1')}>{loading ? '查询中...' : '搜索人物'}</button>
          <button className="secondary" onClick={reset}>重置条件</button>
          <button className="secondary" disabled={!selected?.id} onClick={() => selected?.id && workspace.setPersonId(String(selected.id))}>设为当前人物</button>
        </Actions>
        <div className="archive-search-summary">
          <span>当前页：{pageNo} / {totalPages}</span>
          <span>本页记录：{rows.length} 条</span>
          <span>总记录：{total} 条</span>
          <span>当前人物：{workspace.personId || '-'}</span>
        </div>
        <DataTable
          data={rows}
          empty="暂无人物记录，请先点击搜索或调整筛选条件。"
          columns={[
            { key: 'id', title: 'ID', render: row => row.id || row.personId },
            { key: 'name', title: '姓名', render: row => personName(row) },
            { key: 'genealogyName', title: '谱名' },
            { key: 'courtesyName', title: '字号' },
            { key: 'gender', title: '性别', render: row => personGender(row) },
            { key: 'branchId', title: '支派ID', render: row => personBranchId(row) },
            { key: 'generationNo', title: '代次', render: row => personGenerationNo(row) },
            { key: 'generationWord', title: '字辈', render: row => personGenerationWord(row) },
            { key: 'dataStatus', title: '状态', render: row => personStatus(row) }
          ]}
          onSelect={openDetail}
        />
        <Actions>
          <button className="secondary" disabled={pageNo <= 1 || loading} onClick={() => search(String(pageNo - 1))}>上一页</button>
          <button className="secondary" disabled={pageNo >= totalPages || loading} onClick={() => search(String(pageNo + 1))}>下一页</button>
        </Actions>
        <ResultNotice result={result} />
      </Panel>

      {selected && editForm ? (
        <div className="archive-drawer-mask" onClick={closeDetail}>
          <aside className="archive-drawer" onClick={event => event.stopPropagation()}>
            <div className="archive-drawer-header">
              <div className="archive-profile-head">
                <span className="archive-avatar">{String(selected.name || '谱').slice(0, 1)}</span>
                <div>
                  <h2>{selected.name || selected.personName || `人物 #${selected.id}`}</h2>
                  <p>{selected.gender || '未知'} · {selected.generationNo ? `${selected.generationNo}世` : '世次未维护'} · {selected.generationWord || '-'}字辈</p>
                </div>
              </div>
              <button className="drawer-close" onClick={closeDetail} aria-label="关闭详情">×</button>
            </div>

            <div className="archive-drawer-body">
              <div className="archive-completion"><span>资料完整度</span><strong>{completeness}%</strong><div><i style={{ width: `${completeness}%` }} /></div></div>
              <DetailCard
                title="基础摘要"
                data={selected}
                fields={[
                  { label: '人物ID', value: row => row.id },
                  { label: '人物编码', value: row => row.personCode },
                  { label: '姓名', value: row => row.name || row.personName },
                  { label: '谱名', value: row => row.genealogyName },
                  { label: '字号', value: row => row.courtesyName },
                  { label: '排行', value: row => row.rankInFamily },
                  { label: '生卒', value: row => `${row.birthDate || '?'} - ${row.deathDate || ''}` },
                  { label: '隐私级别', value: row => row.privacyLevel }
                ]}
              />

              <section className="archive-drawer-section">
                <h3>编辑人物档案</h3>
                <div className="archive-edit-grid">
                  <Field label="支派ID"><input value={editForm.branchId} onChange={e => patchEdit('branchId', e.target.value)} /></Field>
                  <Field label="人物编码"><input value={editForm.personCode} onChange={e => patchEdit('personCode', e.target.value)} /></Field>
                  <Field label="姓名"><input value={editForm.name} onChange={e => patchEdit('name', e.target.value)} /></Field>
                  <Field label="谱名"><input value={editForm.genealogyName} onChange={e => patchEdit('genealogyName', e.target.value)} /></Field>
                  <Field label="字号"><input value={editForm.courtesyName} onChange={e => patchEdit('courtesyName', e.target.value)} /></Field>
                  <Field label="别名"><input value={editForm.aliasName} onChange={e => patchEdit('aliasName', e.target.value)} /></Field>
                  <Field label="性别"><select value={editForm.gender} onChange={e => patchEdit('gender', e.target.value)}><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
                  <Field label="代次"><input value={editForm.generationNo} onChange={e => patchEdit('generationNo', e.target.value)} /></Field>
                  <Field label="字辈"><input value={editForm.generationWord} onChange={e => patchEdit('generationWord', e.target.value)} /></Field>
                  <Field label="排行"><input value={editForm.rankInFamily} onChange={e => patchEdit('rankInFamily', e.target.value)} /></Field>
                  <Field label="出生日期"><input type="date" value={editForm.birthDate} onChange={e => patchEdit('birthDate', e.target.value)} /></Field>
                  <Field label="出生日期精度"><select value={editForm.birthDatePrecision} onChange={e => patchEdit('birthDatePrecision', e.target.value)}><option value="day">精确到日</option><option value="month">精确到月</option><option value="year">精确到年</option><option value="unknown">未知</option></select></Field>
                  <Field label="逝世日期"><input type="date" value={editForm.deathDate} onChange={e => patchEdit('deathDate', e.target.value)} /></Field>
                  <Field label="逝世日期精度"><select value={editForm.deathDatePrecision} onChange={e => patchEdit('deathDatePrecision', e.target.value)}><option value="day">精确到日</option><option value="month">精确到月</option><option value="year">精确到年</option><option value="unknown">未知</option></select></Field>
                  <Field label="是否在世"><select value={editForm.isLiving} onChange={e => patchEdit('isLiving', e.target.value)}><option value="true">在世</option><option value="false">已故</option></select></Field>
                  <Field label="是否有后裔"><select value={editForm.hasDescendant} onChange={e => patchEdit('hasDescendant', e.target.value)}><option value="">未知</option><option value="true">有</option><option value="false">无</option></select></Field>
                  <Field label="出生地"><input value={editForm.birthPlace} onChange={e => patchEdit('birthPlace', e.target.value)} /></Field>
                  <Field label="居住地"><input value={editForm.residencePlace} onChange={e => patchEdit('residencePlace', e.target.value)} /></Field>
                  <Field label="职业"><input value={editForm.occupation} onChange={e => patchEdit('occupation', e.target.value)} /></Field>
                  <Field label="教育程度"><input value={editForm.education} onChange={e => patchEdit('education', e.target.value)} /></Field>
                  <Field label="称号荣誉"><input value={editForm.titleOrHonor} onChange={e => patchEdit('titleOrHonor', e.target.value)} /></Field>
                  <Field label="墓葬地"><input value={editForm.tombPlace} onChange={e => patchEdit('tombPlace', e.target.value)} /></Field>
                  <Field label="世系状态"><select value={editForm.lineageStatus} onChange={e => patchEdit('lineageStatus', e.target.value)}><option value="normal">正常</option><option value="adopted_in">继入</option><option value="adopted_out">出嗣</option><option value="unknown">未知</option></select></Field>
                  <Field label="隐私级别"><select value={editForm.privacyLevel} onChange={e => patchEdit('privacyLevel', e.target.value)}><option value="public">公开</option><option value="clan_only">宗族内可见</option><option value="branch_only">支派内可见</option><option value="private">私密</option></select></Field>
                  <Field label="数据状态"><select value={editForm.dataStatus} onChange={e => patchEdit('dataStatus', e.target.value)}><option value="draft">草稿</option><option value="pending_review">待审核</option><option value="official">正式</option><option value="rejected">已驳回</option><option value="archived">已归档</option></select></Field>
                </div>
                <Field label="人物传记"><textarea value={editForm.biography} onChange={e => patchEdit('biography', e.target.value)} rows={5} placeholder="记录生平、迁徙、功名、事迹等" /></Field>
                <Field label="墓志铭"><textarea value={editForm.epitaph} onChange={e => patchEdit('epitaph', e.target.value)} rows={4} placeholder="记录墓志、碑文或相关摘录" /></Field>
                <Actions><button disabled={loading} onClick={saveDetail}>{loading ? '保存中...' : '保存人物档案'}</button></Actions>
              </section>

              <section className="archive-drawer-section">
                <h3>亲属关系</h3>
                <DataTable
                  data={relationships}
                  empty="暂无亲属关系，或尚未点击人物记录。"
                  columns={[
                    { key: 'id', title: '关系ID' },
                    { key: 'fromPersonId', title: '起点' },
                    { key: 'toPersonId', title: '终点' },
                    { key: 'relationType', title: '类型' },
                    { key: 'relationLabel', title: '标签' }
                  ]}
                />
              </section>

              <section className="archive-drawer-section">
                <h3>来源证据</h3>
                <DataTable
                  data={sources}
                  empty="暂无来源绑定，或尚未点击人物记录。"
                  columns={[
                    { key: 'id', title: '绑定ID' },
                    { key: 'sourceId', title: '来源ID' },
                    { key: 'targetType', title: '对象类型' },
                    { key: 'targetId', title: '对象ID' }
                  ]}
                />
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
