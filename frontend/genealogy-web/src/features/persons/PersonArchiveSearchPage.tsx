import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Dropdown, Empty, Form, Input, Pagination, Result, Select, Space, Table, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';
import { navigateToPersonDetail } from './personDetailNavigation';
import { navigateToPersonEdit } from './personEditNavigation';
import {
  PERSON_SORT_OPTIONS, emptyPersonArchiveSearch, hasPersonArchiveQuery, readPersonArchiveSearch, writePersonArchiveUrl
} from './personArchiveUrlState';
import type { PersonArchiveSearchState } from './personArchiveUrlState';

type Props = { notify: (data: unknown, error?: boolean) => void };
type SearchForm = Omit<PersonArchiveSearchState, 'pageNo'>;
type NavigationAction = 'name' | 'view' | 'edit';

const PAGE_SIZE = 10;
const FOCUS_STORAGE_KEY = 'genealogyPersonArchiveFocusId';
const emptySearch = emptyPersonArchiveSearch();
const statusOptions = [
  { value: '', label: '全部' }, { value: 'draft', label: '草稿' }, { value: 'pending_review', label: '待审核' },
  { value: 'official', label: '正式' }, { value: 'rejected', label: '已驳回' }, { value: 'archived', label: '已归档' }
];
const genderOptions = [
  { value: '', label: '全部' }, { value: 'male', label: '男' }, { value: 'female', label: '女' }, { value: 'unknown', label: '未知' }
];

function display(value: unknown, fallback = '-') { const text = String(value ?? '').trim(); return text || fallback; }
function personId(row: any) { return row.id || row.personId || ''; }
function personName(row: any) { return row.name || row.personName || row.displayName || row.fullName || ''; }
function personGender(row: any) { return row.gender || row.sex || ''; }
function genderText(value: unknown) { const text = String(value || '').toLowerCase(); return text === 'male' ? '男' : text === 'female' ? '女' : text === 'unknown' ? '未知' : display(value); }
function personGenerationNo(row: any) { return row.generationNo || row.generation || row.generationNumber || ''; }
function generationText(row: any) { const no = personGenerationNo(row); return no ? `第${no}世` : '-'; }
function personGenerationWord(row: any) { return row.generationWord || row.word || ''; }
function personBranchId(row: any) { return row.branchId || row.branch?.id || ''; }
function personStatus(row: any) { return row.dataStatus || row.status || row.verificationStatus || row.reviewStatus || ''; }
function statusText(row: any) {
  const status = String(personStatus(row)).trim().toLowerCase();
  const labels: Record<string, string> = { draft: '草稿', pending: '待审核', pending_review: '待审核', official: '正式', active: '正式', approved: '已通过', rejected: '已驳回', archived: '已归档' };
  return labels[status] || (status ? '未知状态' : '-');
}
function statusColor(row: any) { const status = String(personStatus(row)).trim().toLowerCase(); if (['official', 'active', 'approved'].includes(status)) return 'success'; if (['pending', 'pending_review'].includes(status)) return 'processing'; if (status === 'rejected') return 'error'; return 'default'; }
function livingText(value: unknown) { return value === true ? '在世' : value === false ? '已故' : '未知'; }
function asDate(value: unknown) { return value === null || value === undefined ? '' : String(value).slice(0, 10); }
function lifeText(row: any) { const birth = asDate(row.birthDate); const death = asDate(row.deathDate); return !birth && !death ? '-' : `${birth || '?'} - ${death || (row.isLiving === true ? '今' : '?')}`; }
function spouseText(row: any) { if (Array.isArray(row.spouseNames) && row.spouseNames.length) return row.spouseNames.join('、'); return row.spouseName || row.spouseNames || '-'; }
function clanLabel(clan: any) { return clan.clanName || clan.name || clan.surname || '未命名宗族'; }
function branchLabel(branch: any) { return branch.branchName || branch.name || '未命名支派'; }
function generationNoLabel(value: string) { return value ? `${value} 世` : ''; }
function uniqueTexts(values: unknown[]) { return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean))); }
function sortGenerationNos(values: string[]) { return [...values].sort((left, right) => { const a = Number(left); const b = Number(right); return Number.isFinite(a) && Number.isFinite(b) ? a - b : left.localeCompare(right); }); }
function errorText(error: unknown, fallback: string) { return error instanceof Error && error.message ? error.message : fallback; }
function errorStatus(error: unknown) { return error instanceof ApiRequestError ? error.status : undefined; }
function formOf(state: PersonArchiveSearchState): SearchForm { const { pageNo: _pageNo, ...form } = state; return form; }
function focusId(row: any, action: NavigationAction) { return `person-archive-${action}-${String(personId(row)).replace(/[^a-zA-Z0-9_-]/g, '-')}`; }

export function PersonArchiveSearchPage({ notify }: Props) {
  const workspace = useWorkspace();
  const initialState = useRef(readPersonArchiveSearch()).current;
  const initialHasQuery = useRef(hasPersonArchiveQuery()).current;
  const [form, setForm] = useState<SearchForm>(() => formOf(initialState));
  const [advancedOpen, setAdvancedOpen] = useState(() => Boolean(initialState.name || initialState.gender || initialState.generationWord || initialState.generationNo || initialState.sort !== emptySearch.sort));
  const [pageNo, setPageNo] = useState(initialState.pageNo);
  const [rawData, setRawData] = useState<unknown>();
  const [querying, setQuerying] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [clans, setClans] = useState<unknown>([]);
  const [branches, setBranches] = useState<unknown>([]);
  const [generationItems, setGenerationItems] = useState<any[]>([]);
  const [clansError, setClansError] = useState('');
  const [branchesError, setBranchesError] = useState('');
  const [generationError, setGenerationError] = useState('');
  const queryRequest = useRef(0);
  const filterRequest = useRef(0);
  const initialQueryDone = useRef(false);
  const restoreScroll = useRef<number | null>(Number(window.history.state?.genealogyPersonArchiveScrollY) || null);

  const clanOptions = useMemo(() => toRecordList<any>(clans), [clans]);
  const branchOptions = useMemo(() => toRecordList<any>(branches), [branches]);
  const generationWordOptions = useMemo(() => uniqueTexts(generationItems.map(item => item.word || item.generationWord)), [generationItems]);
  const generationNoOptions = useMemo(() => sortGenerationNos(uniqueTexts(generationItems.map(item => item.generationNo))), [generationItems]);

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => {
    void loadClanFilterOptions(workspace.clanId);
    if (workspace.clanId && initialHasQuery && !initialQueryDone.current) {
      initialQueryDone.current = true;
      workspace.setBranchId(initialState.branchId);
      void search(initialState.pageNo, formOf(initialState), false);
    }
  }, [workspace.clanId]);
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname !== '/') return;
      const state = readPersonArchiveSearch();
      const nextForm = formOf(state);
      queryRequest.current += 1;
      setForm(nextForm); setPageNo(state.pageNo);
      setAdvancedOpen(Boolean(state.name || state.gender || state.generationWord || state.generationNo || state.sort !== emptySearch.sort));
      workspace.setBranchId(state.branchId);
      restoreScroll.current = Number(window.history.state?.genealogyPersonArchiveScrollY) || 0;
      if (hasPersonArchiveQuery()) void search(state.pageNo, nextForm, false);
      else { setRawData(undefined); setQueryError(''); setRefreshError(''); setForbidden(false); }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [workspace]);
  useEffect(() => {
    if (rawData === undefined) return;
    const scrollY = restoreScroll.current;
    restoreScroll.current = null;
    const targetId = sessionStorage.getItem(FOCUS_STORAGE_KEY);
    window.requestAnimationFrame(() => {
      if (scrollY !== null) window.scrollTo({ top: scrollY, behavior: 'auto' });
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
        sessionStorage.removeItem(FOCUS_STORAGE_KEY);
      }
    });
  }, [rawData]);

  function patch(key: keyof SearchForm, value: string) { setForm(previous => ({ ...previous, [key]: value })); }
  async function loadClans() {
    setFilterLoading(true); setClansError('');
    try {
      const data = await apiClient.get('/clans'); setClans(data);
      const list = toRecordList<any>(data); if (!workspace.clanId && list[0]?.id) workspace.setClanId(String(list[0].id));
    } catch (error) { setClans([]); setClansError(errorText(error, '宗族列表加载失败')); }
    finally { setFilterLoading(false); }
  }
  async function loadClanFilterOptions(clanId: string) {
    const requestId = ++filterRequest.current; setBranchesError(''); setGenerationError('');
    if (!clanId) { setBranches([]); setGenerationItems([]); return; }
    setFilterLoading(true);
    const [branchResult, schemeResult] = await Promise.allSettled([apiClient.get(`/clans/${clanId}/branches`), apiClient.get(`/clans/${clanId}/generation-schemes`)]);
    if (requestId !== filterRequest.current) return;
    if (branchResult.status === 'fulfilled') setBranches(branchResult.value); else { setBranches([]); setBranchesError(errorText(branchResult.reason, '支派选项加载失败')); }
    if (schemeResult.status === 'rejected') { setGenerationItems([]); setGenerationError(errorText(schemeResult.reason, '字辈与代次选项加载失败')); setFilterLoading(false); return; }
    const schemes = toRecordList<any>(schemeResult.value).filter(item => item?.id);
    const itemResults = await Promise.allSettled(schemes.map(item => apiClient.get(`/generation-schemes/${item.id}/items`)));
    if (requestId !== filterRequest.current) return;
    const fulfilled = itemResults.filter((item): item is PromiseFulfilledResult<unknown> => item.status === 'fulfilled');
    setGenerationItems(fulfilled.flatMap(item => toRecordList<any>(item.value)));
    if (itemResults.some(item => item.status === 'rejected')) setGenerationError('部分字辈方案加载失败，可重试后补全筛选项。');
    setFilterLoading(false);
  }
  async function changeClan(nextClanId: string) {
    const changed = nextClanId !== workspace.clanId; queryRequest.current += 1;
    workspace.setClanId(nextClanId); workspace.setBranchId('');
    setForm(formOf(emptySearch)); setPageNo(1); setRawData(undefined); setQueryError(''); setRefreshError(''); setForbidden(false);
    writePersonArchiveUrl(emptySearch, 'replace');
    if (changed) notify({ message: '已切换宗族，查询条件和结果已清空。' });
  }
  function changeBranch(nextBranchId: string) { workspace.setBranchId(nextBranchId); patch('branchId', nextBranchId); }
  async function search(nextPage = 1, criteria: SearchForm = form, syncUrl = true) {
    if (!workspace.clanId) return;
    const requestId = ++queryRequest.current; const hadData = rawData !== undefined;
    const state: PersonArchiveSearchState = { ...criteria, pageNo: nextPage };
    setQuerying(true); setQueryError(''); setRefreshError(''); setForbidden(false);
    if (syncUrl) writePersonArchiveUrl(state, nextPage === pageNo ? 'replace' : 'push');
    try {
      const params = new URLSearchParams({ clanId: workspace.clanId, pageNo: String(nextPage), pageSize: String(PAGE_SIZE), sort: criteria.sort });
      if (criteria.branchId) params.set('branchId', criteria.branchId); if (criteria.keyword.trim()) params.set('keyword', criteria.keyword.trim());
      if (criteria.name.trim()) params.set('name', criteria.name.trim()); if (criteria.gender) params.set('gender', criteria.gender);
      if (criteria.generationNo) params.set('generationNo', criteria.generationNo); if (criteria.generationWord) params.set('generationWord', criteria.generationWord);
      if (criteria.dataStatus) params.set('dataStatus', criteria.dataStatus);
      const data = await apiClient.get(`/persons/search?${params.toString()}`);
      if (requestId !== queryRequest.current) return;
      setForm(criteria); setRawData(data); setPageNo(nextPage);
    } catch (error) {
      if (requestId !== queryRequest.current) return;
      const text = errorText(error, '人物档案查询失败');
      if (errorStatus(error) === 403) { setRawData(undefined); setForbidden(true); setQueryError(text); }
      else if (hadData) setRefreshError(text); else { setRawData(undefined); setQueryError(text); }
    } finally { if (requestId === queryRequest.current) setQuerying(false); }
  }
  function reset() {
    queryRequest.current += 1; workspace.setBranchId(''); setForm(formOf(emptySearch)); setPageNo(1); setRawData(undefined);
    setQueryError(''); setRefreshError(''); setForbidden(false); writePersonArchiveUrl(emptySearch, 'replace');
  }
  function rememberNavigation(triggerId?: string) {
    window.history.replaceState({ ...(window.history.state || {}), genealogyPersonArchiveScrollY: window.scrollY }, '', window.location.href);
    if (triggerId) sessionStorage.setItem(FOCUS_STORAGE_KEY, triggerId);
  }
  function openDetail(row: any, triggerId?: string) { const id = personId(row); if (!id) return; rememberNavigation(triggerId); workspace.setPersonId(String(id)); navigateToPersonDetail(id); }
  function openEditor(row: any, triggerId?: string) { const id = personId(row); if (!id) return; rememberNavigation(triggerId); workspace.setPersonId(String(id)); navigateToPersonEdit(id); }
  async function copyPersonId(row: any) {
    const id = personId(row);
    if (!id) { notify({ message: '该人物暂无可复制编号' }, true); return; }
    try { await navigator.clipboard.writeText(String(id)); notify({ message: '人物编号已复制' }); }
    catch { notify({ message: `人物编号：${id}` }); }
  }
  function moreMenu(row: any): MenuProps { return { items: [{ key: 'copy-id', label: '复制人物编号' }], onClick: info => { info.domEvent.stopPropagation(); if (info.key === 'copy-id') void copyPersonId(row); } }; }
  function branchText(row: any) { const branchId = String(personBranchId(row) || ''); const branch = branchOptions.find(item => String(item.id) === branchId); return row.branchName || row.branch?.branchName || branch?.branchName || '支派待维护'; }

  const rows = useMemo(() => toRecordList(rawData) as any[], [rawData]);
  const total = (rawData as any)?.total ?? rows.length; const currentPage = Number((rawData as any)?.pageNo ?? pageNo ?? 1); const hasQueried = rawData !== undefined;

  return <div className="person-archive-search person-archive-list-page">
    <Card className="person-archive-query-card" title="人物档案查询" loading={filterLoading}>
      {clansError ? <Alert type="error" showIcon message="宗族列表加载失败" description={clansError} action={<Button size="small" onClick={() => void loadClans()}>重试</Button>} /> : null}
      {branchesError ? <Alert type="warning" showIcon message="支派选项加载失败" description={branchesError} action={<Button size="small" onClick={() => void loadClanFilterOptions(workspace.clanId)}>重试</Button>} /> : null}
      {generationError ? <Alert type="warning" showIcon message="字辈与代次选项加载不完整" description={generationError} action={<Button size="small" onClick={() => void loadClanFilterOptions(workspace.clanId)}>重试</Button>} /> : null}
      <Form layout="vertical" onFinish={() => void search(1)}>
        <div className="person-archive-filter-grid">
          <Form.Item label="宗族"><Select aria-label="宗族" showSearch optionFilterProp="label" value={workspace.clanId} onChange={value => void changeClan(value)} options={[{ value: '', label: '请选择宗族' }, ...clanOptions.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))]} /></Form.Item>
          <Form.Item label="关键词"><Input value={form.keyword} onChange={event => patch('keyword', event.target.value)} placeholder="姓名 / 谱名 / 字号 / 籍贯 / 墓葬" allowClear /></Form.Item>
          <Form.Item label="支派"><Select showSearch optionFilterProp="label" value={form.branchId} disabled={!workspace.clanId || !!branchesError} onChange={changeBranch} options={[{ value: '', label: '全部' }, ...branchOptions.map(branch => ({ value: String(branch.id), label: branchLabel(branch) }))]} /></Form.Item>
          <Form.Item label="档案状态"><Select value={form.dataStatus} onChange={value => patch('dataStatus', value)} options={statusOptions} /></Form.Item>
        </div>
        <Button type="link" className="person-archive-more-filter" onClick={() => setAdvancedOpen(previous => !previous)}>{advancedOpen ? '收起更多筛选' : '更多筛选'}</Button>
        {advancedOpen ? <div className="person-archive-filter-grid person-archive-filter-grid--advanced"><Form.Item label="姓名"><Input value={form.name} onChange={event => patch('name', event.target.value)} placeholder="精确或模糊姓名" allowClear /></Form.Item><Form.Item label="性别"><Select value={form.gender} onChange={value => patch('gender', value)} options={genderOptions} /></Form.Item><Form.Item label="字辈"><Select value={form.generationWord} disabled={!workspace.clanId || !!generationError} onChange={value => patch('generationWord', value)} options={[{ value: '', label: '全部' }, ...generationWordOptions.map(word => ({ value: word, label: word }))]} /></Form.Item><Form.Item label="代次"><Select value={form.generationNo} disabled={!workspace.clanId || !!generationError} onChange={value => patch('generationNo', value)} options={[{ value: '', label: '全部' }, ...generationNoOptions.map(no => ({ value: no, label: generationNoLabel(no) }))]} /></Form.Item><Form.Item label="排序"><Select value={form.sort} onChange={value => patch('sort', value)} options={[...PERSON_SORT_OPTIONS]} /></Form.Item></div> : null}
        <div className="person-archive-query-actions"><Space><Button onClick={reset}>重置</Button><Button type="primary" htmlType="submit" loading={querying} disabled={!workspace.clanId}>查询</Button></Space></div>
      </Form>
    </Card>
    <Card className="person-archive-result-card" title={`人物档案（${hasQueried ? total : 0}）`}>
      {refreshError ? <Alert type="warning" showIcon message="刷新失败，当前仍展示上一次成功结果" description={refreshError} action={<Button size="small" onClick={() => void search(pageNo)}>重试</Button>} /> : null}
      {forbidden ? <Result status="403" title="无权查询人物档案" subTitle="当前账号没有查看该宗族人物档案的权限。受限人物名称、数量和摘要均未展示。" /> : queryError ? <Result status="error" title="人物档案查询失败" subTitle={queryError} extra={<Button type="primary" onClick={() => void search(pageNo)}>重新查询</Button>} /> : <>
        <div className="person-archive-result-toolbar"><Typography.Text type="secondary">{hasQueried ? `已按当前条件查询，共 ${total} 条记录` : '请设置查询条件后开始查询'}</Typography.Text></div>
        <div className="person-archive-desktop-list"><Table<any> size="small" bordered rowKey={(row, index) => String(personId(row) || index)} dataSource={rows} pagination={hasQueried ? { current: currentPage, pageSize: PAGE_SIZE, total, showSizeChanger: false, showTotal: value => `共 ${value} 条`, onChange: nextPage => void search(nextPage) } : false} loading={querying} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hasQueried ? '未找到符合当前条件的人物档案，请调整筛选条件。' : '尚未查询，请先选择宗族并设置查询条件。'} /> }} onRow={row => ({ onClick: () => openDetail(row), style: { cursor: 'pointer' }, title: '点击查看人物档案' })} columns={[
          { key: 'name', title: '姓名', render: (_value, row) => <Button id={focusId(row, 'name')} type="link" className="archive-person-name-link person-archive-text-action" onClick={event => { event.stopPropagation(); openDetail(row, focusId(row, 'name')); }}>{display(personName(row), '未命名人物')}</Button> },
          { key: 'aliasName', title: '别名', render: (_value, row) => display(row.aliasName) }, { key: 'gender', title: '性别', width: 90, render: (_value, row) => genderText(personGender(row)) }, { key: 'generationWord', title: '字辈', width: 90, render: (_value, row) => display(personGenerationWord(row)) }, { key: 'generationNo', title: '代次', width: 90, render: (_value, row) => generationText(row) }, { key: 'branchName', title: '支派', render: (_value, row) => branchText(row) }, { key: 'life', title: '生卒', render: (_value, row) => lifeText(row) }, { key: 'isLiving', title: '是否在世', width: 110, render: (_value, row) => livingText(row.isLiving) }, { key: 'spouseName', title: '配偶', render: (_value, row) => spouseText(row) }, { key: 'dataStatus', title: '档案状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
          { key: 'actions', title: '操作', width: 210, fixed: 'right', render: (_value, row) => <Space size={4} onClick={event => event.stopPropagation()}><Button id={focusId(row, 'view')} type="link" className="person-archive-text-action" onClick={() => openDetail(row, focusId(row, 'view'))}>查看</Button><Button id={focusId(row, 'edit')} type="link" className="person-archive-text-action" onClick={() => openEditor(row, focusId(row, 'edit'))}>编辑</Button><Dropdown menu={moreMenu(row)} trigger={['click']}><Button type="link" className="person-archive-text-action" aria-label={`更多操作：${display(personName(row), '未命名人物')}`}>更多</Button></Dropdown></Space> }
        ]} scroll={{ x: 'max-content' }} /></div>
        <div className="person-archive-mobile-list" aria-label="人物档案卡片列表">{querying ? <Card loading /> : rows.length ? rows.map(row => <Card key={String(personId(row))} className="person-archive-mobile-card" title={<Button id={focusId(row, 'name')} type="link" className="person-archive-mobile-name" onClick={() => openDetail(row, focusId(row, 'name'))}>{display(personName(row), '未命名人物')}</Button>} extra={<Tag color={statusColor(row)}>{statusText(row)}</Tag>}><div className="person-archive-mobile-subtitle">{display(row.genealogyName || row.aliasName, '谱名或别名待维护')}</div><dl className="person-archive-mobile-meta"><div><dt>字辈</dt><dd>{display(personGenerationWord(row))}</dd></div><div><dt>代次</dt><dd>{generationText(row)}</dd></div><div><dt>支派</dt><dd>{branchText(row)}</dd></div><div><dt>生卒</dt><dd>{lifeText(row)}</dd></div></dl><div className="person-archive-mobile-actions"><Button id={focusId(row, 'view')} onClick={() => openDetail(row, focusId(row, 'view'))}>查看</Button><Button id={focusId(row, 'edit')} onClick={() => openEditor(row, focusId(row, 'edit'))}>编辑</Button><Dropdown menu={moreMenu(row)} trigger={['click']}><Button aria-label={`更多操作：${display(personName(row), '未命名人物')}`}>更多</Button></Dropdown></div></Card>) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={hasQueried ? '未找到符合当前条件的人物档案，请调整筛选条件。' : '尚未查询，请先选择宗族并设置查询条件。'} />}{hasQueried && total > PAGE_SIZE ? <Pagination current={currentPage} pageSize={PAGE_SIZE} total={total} showSizeChanger={false} onChange={nextPage => void search(nextPage)} showTotal={value => `共 ${value} 条`} /> : null}</div>
      </>}
    </Card>
  </div>;
}
