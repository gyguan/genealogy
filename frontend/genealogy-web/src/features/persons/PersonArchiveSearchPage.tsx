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
  gender: string;
  generationWord: string;
  generationNo: string;
  branchId: string;
  dataStatus: string;
};

function text(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function includes(rowValue: unknown, query: string) {
  if (!query.trim()) return true;
  return text(rowValue).includes(text(query));
}

function equalsIfPresent(rowValue: unknown, query: string) {
  if (!query.trim()) return true;
  return text(rowValue) === text(query);
}

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

export function PersonArchiveSearchPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [form, setForm] = useState<SearchForm>({ keyword: '', gender: '', generationWord: '', generationNo: '', branchId: '', dataStatus: '' });
  const [rawData, setRawData] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [relationships, setRelationships] = useState<unknown>();
  const [sources, setSources] = useState<unknown>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>();

  function patch(key: keyof SearchForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
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

  async function search() {
    await run(async () => {
      if (!workspace.clanId) throw new Error('请先选择或输入宗族ID');
      const path = form.branchId
        ? `/clans/${workspace.clanId}/branches/${form.branchId}/persons`
        : `/clans/${workspace.clanId}/persons`;
      const data = await apiClient.get(path);
      setRawData(data);
      setSelected(undefined);
      setRelationships(undefined);
      setSources(undefined);
      const total = toRecordList(data).length;
      const notice = { message: `已加载 ${total} 条人物记录，可继续按条件过滤` };
      setResult(notice);
      notify(notice);
    });
  }

  async function openDetail(row: any) {
    await run(async () => {
      const id = row.id || row.personId;
      if (!id) throw new Error('人物记录缺少ID');
      const detail = await apiClient.get(`/persons/${id}`);
      workspace.setPersonId(String(id));
      setSelected(detail);
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

  function reset() {
    setForm({ keyword: '', gender: '', generationWord: '', generationNo: '', branchId: '', dataStatus: '' });
    setSelected(undefined);
    setRelationships(undefined);
    setSources(undefined);
  }

  const rows = useMemo(() => {
    return toRecordList<any>(rawData).filter(row => {
      const keywordHit = !form.keyword.trim()
        || includes(personName(row), form.keyword)
        || includes(row.aliasName || row.alias || row.nickName, form.keyword)
        || includes(row.birthPlace || row.nativePlace || row.residencePlace, form.keyword)
        || includes(row.biography || row.description, form.keyword);
      return keywordHit
        && equalsIfPresent(personGender(row), form.gender)
        && equalsIfPresent(personGenerationWord(row), form.generationWord)
        && equalsIfPresent(personGenerationNo(row), form.generationNo)
        && equalsIfPresent(personBranchId(row), form.branchId)
        && equalsIfPresent(personStatus(row), form.dataStatus);
    });
  }, [rawData, form]);

  const completeness = selected ? Math.min(100, [
    selected.name,
    selected.gender,
    selected.branchId,
    selected.generationNo,
    selected.generationWord,
    selected.birthDate || selected.birthYear,
    selected.deathDate || selected.deathYear,
    selected.birthPlace || selected.nativePlace,
    selected.biography || selected.description,
    toRecordList(relationships).length,
    toRecordList(sources).length
  ].filter(Boolean).length * 9) : 0;

  return (
    <div className="person-archive-search">
      <Panel title="人物档案检索" description="先按姓名、字辈、性别、代次、支派等条件搜索人物；点击搜索结果后查看人物详情、亲属关系和来源证据。">
        <div className="archive-search-grid">
          <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} placeholder="必填" /></Field>
          <Field label="关键词"><input value={form.keyword} onChange={e => patch('keyword', e.target.value)} placeholder="姓名、别名、籍贯、传记关键词" /></Field>
          <Field label="性别"><select value={form.gender} onChange={e => patch('gender', e.target.value)}><option value="">全部</option><option value="male">男</option><option value="female">女</option><option value="unknown">未知</option></select></Field>
          <Field label="字辈"><input value={form.generationWord} onChange={e => patch('generationWord', e.target.value)} placeholder="例如：德" /></Field>
          <Field label="代次"><input value={form.generationNo} onChange={e => patch('generationNo', e.target.value)} placeholder="例如：20" /></Field>
          <Field label="支派ID"><input value={form.branchId} onChange={e => patch('branchId', e.target.value)} placeholder="可空；填写后按支派加载" /></Field>
          <Field label="入谱状态"><input value={form.dataStatus} onChange={e => patch('dataStatus', e.target.value)} placeholder="例如：approved / draft" /></Field>
        </div>
        <Actions>
          <button disabled={loading} onClick={search}>{loading ? '查询中...' : '搜索人物'}</button>
          <button className="secondary" onClick={reset}>重置条件</button>
          <button className="secondary" disabled={!selected?.id} onClick={() => selected?.id && workspace.setPersonId(String(selected.id))}>设为当前人物</button>
        </Actions>
        <div className="archive-search-summary">
          <span>已加载：{toRecordList(rawData).length} 条</span>
          <span>当前命中：{rows.length} 条</span>
          <span>当前人物：{workspace.personId || '-'}</span>
        </div>
        <DataTable
          data={rows}
          empty="暂无人物记录，请先点击搜索或调整筛选条件。"
          columns={[
            { key: 'id', title: 'ID', render: row => row.id || row.personId },
            { key: 'name', title: '姓名', render: row => personName(row) },
            { key: 'gender', title: '性别', render: row => personGender(row) },
            { key: 'branchId', title: '支派ID', render: row => personBranchId(row) },
            { key: 'generationNo', title: '代次', render: row => personGenerationNo(row) },
            { key: 'generationWord', title: '字辈', render: row => personGenerationWord(row) },
            { key: 'dataStatus', title: '状态', render: row => personStatus(row) }
          ]}
          onSelect={openDetail}
        />
        <ResultNotice result={result} />
      </Panel>

      <div className="archive-detail-layout">
        <Panel title="人物详情" description="点击上方搜索结果后展示完整档案摘要。">
          {selected ? (
            <>
              <div className="archive-profile-head">
                <span className="archive-avatar">{String(selected.name || '谱').slice(0, 1)}</span>
                <div>
                  <h2>{selected.name || selected.personName || `人物 #${selected.id}`}</h2>
                  <p>{selected.gender || '未知'} · {selected.generationNo ? `${selected.generationNo}世` : '世次未维护'} · {selected.generationWord || '-'}字辈</p>
                </div>
              </div>
              <div className="archive-completion"><span>资料完整度</span><strong>{completeness}%</strong><div><i style={{ width: `${completeness}%` }} /></div></div>
              <DetailCard
                title="基础信息"
                data={selected}
                fields={[
                  { label: '人物ID', value: row => row.id },
                  { label: '姓名', value: row => row.name || row.personName },
                  { label: '性别', value: row => row.gender },
                  { label: '支派ID', value: row => row.branchId },
                  { label: '代次', value: row => row.generationNo },
                  { label: '字辈', value: row => row.generationWord },
                  { label: '生卒', value: row => `${row.birthDate || row.birthYear || '?'} - ${row.deathDate || row.deathYear || ''}` },
                  { label: '状态', value: row => row.dataStatus || row.status }
                ]}
              />
              <div className="archive-long-text">
                <strong>人物传记</strong>
                <p>{selected.biography || selected.description || '暂无人物传记，可在后续版本补充谱名、字号、排行、生卒、墓葬、传记等完整字段。'}</p>
              </div>
            </>
          ) : <div className="empty">请先在上方搜索并点击一条人物记录。</div>}
        </Panel>

        <Panel title="亲属关系与来源证据" description="辅助判断人物档案是否完整、是否具备可追溯来源。">
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
        </Panel>
      </div>
    </div>
  );
}
