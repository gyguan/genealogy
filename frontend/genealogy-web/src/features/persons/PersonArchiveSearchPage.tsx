import { useEffect, useMemo, useRef, useState } from 'react';
import { ExportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Collapse, Dropdown, Form, Input, Pagination, Result, Select, Space, Table, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { ApiRequestError, apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { DraftDeleteButton } from '../../shared/ui/DraftDeleteButton';
import { PageFeedback } from '../../shared/ui/Feedback';
import { feedback } from '../../shared/ui/OperationFeedback';
import { QueryResultCard } from '../../shared/ui/QueryResultCards';
import { toRecordList } from '../../shared/utils/records';
import { navigateToPersonDetail } from './personDetailNavigation';
import { navigateToPersonEdit } from './personEditNavigation';
import { getPersonCreateEntryError } from './personCreateEntryModel';
import {
  PERSON_PAGE_SIZE_OPTIONS,
  emptyPersonArchiveSearch,
  hasPersonArchiveQuery,
  readPersonArchiveSearch,
  writePersonArchiveUrl
} from './personArchiveUrlState';
import type { PersonArchiveSearchState } from './personArchiveUrlState';

import { EmptyState } from '../../shared/ui/EmptyState';

type Props = {  };
type SearchForm = Omit<PersonArchiveSearchState, 'pageNo'>;
type NavigationAction = 'name' | 'view' | 'edit';
type MultiKey = 'genders' | 'generationWords' | 'generationNos' | 'dataStatuses';

const ALL_VALUE = '__all__';
const FOCUS_STORAGE_KEY = 'genealogyPersonArchiveFocusId';
const emptySearch = emptyPersonArchiveSearch();
const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'official', label: '正式' },
  { value: 'rejected', label: '已驳回' },
  { value: 'archived', label: '已归档' }
];
const genderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' }
];

function display(value: unknown, fallback = '-') { const text = String(value ?? '').trim(); return text || fallback; }
function personId(row: any) { return row.id || row.personId || ''; }
function personName(row: any) { return row.name || row.personName || row.displayName || row.fullName || ''; }
function personGender(row: any) { return row.gender || row.sex || ''; }
function genderText(value: unknown) { const text = String(value || '').toLowerCase(); return text === 'male' ? '男' : text === 'female' ? '女' : text === 'unknown' ? '未知' : display(value); }
function personGenerationNo(row: any) { return row.generationNo || row.generation || row.generationNumber || ''; }
function generationText(row: any) { const no = personGenerationNo(row); return no ? `${no} 世` : '-'; }
function personGenerationWord(row: any) { return row.generationWord || row.word || ''; }
function personBranchId(row: any) { return row.branchId || row.branch?.id || ''; }
function personStatus(row: any) { return row.dataStatus || row.status || row.verificationStatus || row.reviewStatus || ''; }
function statusText(row: any) {
  const status = String(personStatus(row)).trim().toLowerCase();
  const labels: Record<string, string> = { draft: '草稿', pending: '待审核', pending_review: '待审核', official: '正式', active: '正式', approved: '已通过', rejected: '已驳回', archived: '已归档' };
  return labels[status] || (status ? '未知状态' : '-');
}
function statusColor(row: any) { const status = String(personStatus(row)).trim().toLowerCase(); if (['official', 'active', 'approved'].includes(status)) return 'success'; if (['pending', 'pending_review'].includes(status)) return 'processing'; if (status === 'rejected') return 'error'; return 'default'; }
function livingText(value: unknown) { return value === true ? '是' : value === false ? '否' : '未知'; }
function asDate(value: unknown) { return value === null || value === undefined ? '' : String(value).slice(0, 10); }
function lifeText(row: any) { const birth = asDate(row.birthDate); const death = asDate(row.deathDate); if (!birth && !death) return '-'; return `${birth || '?'}-${death || (row.isLiving === true ? '' : '?')}`; }
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
function withSelectAll(options: { value: string; label: string }[]) { return [{ value: ALL_VALUE, label: '全选 / 取消全选' }, ...options]; }
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function PersonArchiveSearchPage({}: Props) {
  const workspace = useWorkspace();
  const initialState = useRef(readPersonArchiveSearch()).current;
  const initialHasQuery = useRef(hasPersonArchiveQuery()).current;
  const [form, setForm] = useState<SearchForm>(() => formOf(initialState));
  const [advancedOpen, setAdvancedOpen] = useState(() => Boolean(
    initialState.genders.length || initialState.generationWords.length || initialState.generationNos.length
    || initialState.dataStatuses.join(',') !== emptySearch.dataStatuses.join(',')
  ));
  const [pageNo, setPageNo] = useState(initialState.pageNo);
  const [rawData, setRawData] = useState<unknown>();
  const [querying, setQuerying] = useState(false);
  const [exporting, setExporting] = useState(false);
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
      setForm(nextForm);
      setPageNo(state.pageNo);
      setAdvancedOpen(Boolean(
        state.genders.length || state.generationWords.length || state.generationNos.length
        || state.dataStatuses.join(',') !== emptySearch.dataStatuses.join(',')
      ));
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

  function patch<K extends keyof SearchForm>(key: K, value: SearchForm[K]) { setForm(previous => ({ ...previous, [key]: value })); }
  function patchMulti(key: MultiKey, values: string[], allValues: string[]) {
    if (values.includes(ALL_VALUE)) {
      patch(key, (form[key].length === allValues.length ? [] : allValues) as SearchForm[typeof key]);
      return;
    }
    patch(key, values as SearchForm[typeof key]);
  }
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
    if (changed) feedback.from({ message: '已切换宗族，查询条件和结果已清空。' });
  }
  function changeBranch(nextBranchId: string) { workspace.setBranchId(nextBranchId); patch('branchId', nextBranchId); }
  function appendMulti(params: URLSearchParams, key: string, values: string[]) { values.forEach(value => params.append(key, value)); }
  function queryParams(criteria: SearchForm, includePaging: boolean, nextPage = 1) {
    const params = new URLSearchParams({ sort: criteria.sort });
    if (includePaging) { params.set('pageNo', String(nextPage)); params.set('pageSize', String(criteria.pageSize)); }
    if (criteria.branchId) params.set('branchId', criteria.branchId);
    if (criteria.keyword.trim()) params.set('keyword', criteria.keyword.trim());
    if (criteria.name.trim()) params.set('name', criteria.name.trim());
    appendMulti(params, 'gender', criteria.genders);
    appendMulti(params, 'generationNo', criteria.generationNos);
    appendMulti(params, 'generationWord', criteria.generationWords);
    appendMulti(params, 'dataStatus', criteria.dataStatuses);
    return params;
  }
  async function search(nextPage = 1, criteria: SearchForm = form, syncUrl = true) {
    if (!workspace.clanId) return;
    const requestId = ++queryRequest.current; const hadData = rawData !== undefined;
    const state: PersonArchiveSearchState = { ...criteria, pageNo: nextPage };
    setQuerying(true); setQueryError(''); setRefreshError(''); setForbidden(false);
    if (syncUrl) writePersonArchiveUrl(state, nextPage === pageNo ? 'replace' : 'push');
    try {
      const params = queryParams(criteria, true, nextPage);
      params.set('clanId', workspace.clanId);
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
    queryRequest.current += 1; workspace.setBranchId(''); setForm(formOf(emptySearch)); setAdvancedOpen(false); setPageNo(1); setRawData(undefined);
    setQueryError(''); setRefreshError(''); setForbidden(false); writePersonArchiveUrl(emptySearch, 'replace');
  }
  function rememberNavigation(triggerId?: string) {
    window.history.replaceState({ ...(window.history.state || {}), genealogyPersonArchiveScrollY: window.scrollY }, '', window.location.href);
    if (triggerId) sessionStorage.setItem(FOCUS_STORAGE_KEY, triggerId);
  }
  function openDetail(row: any, triggerId?: string) { const id = personId(row); if (!id) return; rememberNavigation(triggerId); workspace.setPersonId(String(id)); navigateToPersonDetail(id); }
  function openEditor(row: any, triggerId?: string) { const id = personId(row); if (!id) return; rememberNavigation(triggerId); workspace.setPersonId(String(id)); navigateToPersonEdit(id); }
  function createPerson() {
    const entryError = getPersonCreateEntryError({ clanId: workspace.clanId, branchId: form.branchId });
    if (entryError) { feedback.from({ message: entryError }, true); return; }
    workspace.setBranchId(form.branchId);
    rememberNavigation();
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'mvp1Wizard');
    url.searchParams.set('step', 'person');
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
  async function exportPersons() {
    if (!workspace.clanId || rawData === undefined || total === 0 || exporting) return;
    setExporting(true);
    try {
      const params = queryParams(form, false);
      const blob = await apiClient.download(`/clans/${workspace.clanId}/exports/persons/search.csv?${params.toString()}`);
      saveBlob(blob, 'persons-search.csv');
      feedback.from({ message: `已导出当前查询条件下的 ${total} 条人物档案。` });
    } catch (error) {
      feedback.from({ message: errorText(error, '导出人物失败，请稍后重试。') }, true);
    } finally {
      setExporting(false);
    }
  }
  async function copyPersonId(row: any) {
    const id = personId(row);
    if (!id) { feedback.from({ message: '该人物暂无可复制编号' }, true); return; }
    try { await navigator.clipboard.writeText(String(id)); feedback.from({ message: '人物编号已复制' }); }
    catch { feedback.from({ message: `人物编号：${id}` }); }
  }
  function moreMenu(row: any): MenuProps { return { items: [{ key: 'copy-id', label: '复制人物编号' }], onClick: info => { info.domEvent.stopPropagation(); if (info.key === 'copy-id') void copyPersonId(row); } }; }
  function branchText(row: any) { const branchId = String(personBranchId(row) || ''); const branch = branchOptions.find(item => String(item.id) === branchId); return row.branchName || row.branch?.branchName || branch?.branchName || '支派待维护'; }

  const rows = useMemo(() => toRecordList(rawData) as any[], [rawData]);
  const total = (rawData as any)?.total ?? rows.length;
  const currentPage = Number((rawData as any)?.pageNo ?? pageNo ?? 1);
  const hasQueried = rawData !== undefined;
  const generationWordSelectOptions = generationWordOptions.map(word => ({ value: word, label: word }));
  const generationNoSelectOptions = generationNoOptions.map(no => ({ value: no, label: generationNoLabel(no) }));
  const resultActions = <Space className="person-archive-result-actions">
    <Button type="primary" icon={<PlusOutlined />} onClick={createPerson}>创建人物</Button>
    <Button icon={<ExportOutlined />} loading={exporting} disabled={!hasQueried || total === 0 || querying} onClick={() => void exportPersons()}>导出人物</Button>
  </Space>;

  return <div className="person-archive-search person-archive-list-page">
    <Card className="person-archive-query-card" title="人物档案查询" loading={filterLoading}>
      {clansError ? <PageFeedback tone="error" title="宗族列表加载失败" description={clansError} action={<Button size="small" onClick={() => void loadClans()}>重试</Button>} /> : null}
      {branchesError ? <PageFeedback tone="warning" title="支派选项加载失败" description={branchesError} action={<Button size="small" onClick={() => void loadClanFilterOptions(workspace.clanId)}>重试</Button>} /> : null}
      {generationError ? <PageFeedback tone="warning" title="字辈与代次选项加载不完整" description={generationError} action={<Button size="small" onClick={() => void loadClanFilterOptions(workspace.clanId)}>重试</Button>} /> : null}
      <Form layout="vertical" onFinish={() => void search(1)}>
        <div className="person-archive-filter-grid person-archive-filter-grid--primary">
          <Form.Item label="宗族"><Select aria-label="宗族" showSearch optionFilterProp="label" value={workspace.clanId} onChange={value => void changeClan(value)} options={[{ value: '', label: '请选择宗族' }, ...clanOptions.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))]} /></Form.Item>
          <Form.Item label="支派"><Select aria-label="支派" showSearch optionFilterProp="label" value={form.branchId} disabled={!workspace.clanId || !!branchesError} onChange={changeBranch} options={[{ value: '', label: '全部支派' }, ...branchOptions.map(branch => ({ value: String(branch.id), label: branchLabel(branch) }))]} /></Form.Item>
          <Form.Item label="姓名"><Input value={form.name} onChange={event => patch('name', event.target.value)} placeholder="请输入姓名" allowClear /></Form.Item>
          <Form.Item label="关键词"><Input value={form.keyword} onChange={event => patch('keyword', event.target.value)} placeholder="姓名、别名、谱名、字号、籍贯等" allowClear /></Form.Item>
        </div>
        <Collapse
          className="person-archive-advanced-collapse"
          bordered={false}
          activeKey={advancedOpen ? ['advanced'] : []}
          items={[{
            key: 'advanced',
            label: null,
            showArrow: false,
            styles: { header: { display: 'none' }, body: { padding: 0 } },
            children: <div id="person-archive-advanced-filters" className="person-archive-filter-grid person-archive-filter-grid--advanced">
              <Form.Item label="档案状态"><Select mode="multiple" maxTagCount="responsive" value={form.dataStatuses} onChange={values => patchMulti('dataStatuses', values, statusOptions.map(item => item.value))} options={withSelectAll(statusOptions)} placeholder="请选择（多选）" allowClear /></Form.Item>
              <Form.Item label="性别"><Select mode="multiple" maxTagCount="responsive" value={form.genders} onChange={values => patchMulti('genders', values, genderOptions.map(item => item.value))} options={withSelectAll(genderOptions)} placeholder="请选择（多选）" allowClear /></Form.Item>
              <Form.Item label="字辈"><Select mode="multiple" showSearch optionFilterProp="label" maxTagCount="responsive" value={form.generationWords} disabled={!workspace.clanId || !!generationError} onChange={values => patchMulti('generationWords', values, generationWordOptions)} options={withSelectAll(generationWordSelectOptions)} placeholder="请选择（多选）" allowClear /></Form.Item>
              <Form.Item label="代次"><Select mode="multiple" maxTagCount="responsive" value={form.generationNos} disabled={!workspace.clanId || !!generationError} onChange={values => patchMulti('generationNos', values, generationNoOptions)} options={withSelectAll(generationNoSelectOptions)} placeholder="请选择（多选）" allowClear /></Form.Item>
            </div>
          }]}
        />
        <Space className="person-archive-query-actions">
          <Button type="link" className="person-archive-more-filter" aria-expanded={advancedOpen} aria-controls="person-archive-advanced-filters" onClick={() => setAdvancedOpen(previous => !previous)}>{advancedOpen ? '收起筛选' : '更多筛选'}</Button>
          <Button onClick={reset}>重置</Button>
          <Button type="primary" htmlType="submit" loading={querying} disabled={!workspace.clanId}>查询</Button>
        </Space>
      </Form>
    </Card>
    <QueryResultCard className="person-archive-result-card" extra={resultActions} total={total}>
      {refreshError ? <PageFeedback tone="warning" title="刷新失败，当前仍展示上一次成功结果" description={refreshError} action={<Button size="small" onClick={() => void search(pageNo)}>重试</Button>} /> : null}
      {forbidden ? <Result status="403" title="无权查询人物档案" subTitle="当前账号没有查看该宗族人物档案的权限。受限人物名称、数量和摘要均未展示。" /> : queryError ? <Result status="error" title="人物档案查询失败" subTitle={queryError} extra={<Button type="primary" onClick={() => void search(pageNo)}>重新查询</Button>} /> : <>
        <div className="person-archive-desktop-list"><Table<any> size="small" bordered rowKey={(row, index) => String(personId(row) || index)} dataSource={rows} pagination={hasQueried ? { current: currentPage, pageSize: form.pageSize, total, showSizeChanger: true, pageSizeOptions: PERSON_PAGE_SIZE_OPTIONS.map(String), showTotal: value => `共 ${value} 条`, onChange: (nextPage, nextSize) => { const criteria = nextSize === form.pageSize ? form : { ...form, pageSize: nextSize }; void search(nextSize === form.pageSize ? nextPage : 1, criteria); } } : false} loading={querying} locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description={hasQueried ? '未找到符合当前条件的人物档案，请调整筛选条件。' : '请设置查询条件后开始查询。'} /> }} onRow={row => ({ onClick: () => openDetail(row), style: { cursor: 'pointer' }, title: '点击查看人物档案' })} columns={[
          { key: 'name', title: '姓名', render: (_value, row) => <Button id={focusId(row, 'name')} type="link" className="archive-person-name-link person-archive-text-action" onClick={event => { event.stopPropagation(); openDetail(row, focusId(row, 'name')); }}>{display(personName(row), '未命名人物')}</Button> },
          { key: 'aliasName', title: '别名', render: (_value, row) => display(row.aliasName) }, { key: 'gender', title: '性别', width: 90, render: (_value, row) => genderText(personGender(row)) }, { key: 'generationWord', title: '字辈', width: 90, render: (_value, row) => display(personGenerationWord(row)) }, { key: 'generationNo', title: '代次', width: 90, render: (_value, row) => generationText(row) }, { key: 'branchName', title: '支派', render: (_value, row) => branchText(row) }, { key: 'life', title: '生卒', render: (_value, row) => lifeText(row) }, { key: 'isLiving', title: '是否在世', width: 110, render: (_value, row) => livingText(row.isLiving) }, { key: 'spouseName', title: '配偶', render: (_value, row) => spouseText(row) }, { key: 'dataStatus', title: '档案状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
          { key: 'actions', title: '操作', width: 300, fixed: 'right', render: (_value, row) => <Space size={4} onClick={event => event.stopPropagation()}><Button id={focusId(row, 'view')} type="link" className="person-archive-text-action" onClick={() => openDetail(row, focusId(row, 'view'))}>查看</Button><Button id={focusId(row, 'edit')} type="link" className="person-archive-text-action" onClick={() => openEditor(row, focusId(row, 'edit'))}>编辑</Button><DraftDeleteButton object={row} objectName={personName(row)} objectType="人物" onDelete={() => apiClient.delete(`/persons/${personId(row)}`)} onDeleted={() => search(currentPage, form, false)} label="删除草稿" buttonProps={{ type: 'link', size: 'small', className: 'person-archive-text-action' }} /><Dropdown menu={moreMenu(row)} trigger={['click']}><Button type="link" className="person-archive-text-action" aria-label={`更多操作：${display(personName(row), '未命名人物')}`}>更多</Button></Dropdown></Space> }
        ]} scroll={{ x: 'max-content' }} /></div>
        <div className="person-archive-mobile-list" aria-label="人物档案卡片列表">{querying ? <Card loading /> : rows.length ? rows.map(row => <Card key={String(personId(row))} className="person-archive-mobile-card" title={<Button id={focusId(row, 'name')} type="link" className="person-archive-mobile-name" onClick={() => openDetail(row, focusId(row, 'name'))}>{display(personName(row), '未命名人物')}</Button>} extra={<Tag color={statusColor(row)}>{statusText(row)}</Tag>}><div className="person-archive-mobile-subtitle">{display(row.genealogyName || row.aliasName, '谱名或别名待维护')}</div><dl className="person-archive-mobile-meta"><div><dt>字辈</dt><dd>{display(personGenerationWord(row))}</dd></div><div><dt>代次</dt><dd>{generationText(row)}</dd></div><div><dt>支派</dt><dd>{branchText(row)}</dd></div><div><dt>生卒</dt><dd>{lifeText(row)}</dd></div></dl><div className="person-archive-mobile-actions"><Button id={focusId(row, 'view')} onClick={() => openDetail(row, focusId(row, 'view'))}>查看</Button><Button id={focusId(row, 'edit')} onClick={() => openEditor(row, focusId(row, 'edit'))}>编辑</Button><DraftDeleteButton object={row} objectName={personName(row)} objectType="人物" onDelete={() => apiClient.delete(`/persons/${personId(row)}`)} onDeleted={() => search(currentPage, form, false)} label="删除草稿" buttonProps={{ size: 'small' }} /><Dropdown menu={moreMenu(row)} trigger={['click']}><Button aria-label={`更多操作：${display(personName(row), '未命名人物')}`}>更多</Button></Dropdown></div></Card>) : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description={hasQueried ? '未找到符合当前条件的人物档案，请调整筛选条件。' : '请设置查询条件后开始查询。'} />}{hasQueried && total > form.pageSize ? <Pagination current={currentPage} pageSize={form.pageSize} total={total} showSizeChanger pageSizeOptions={PERSON_PAGE_SIZE_OPTIONS.map(String)} onChange={(nextPage, nextSize) => { const criteria = nextSize === form.pageSize ? form : { ...form, pageSize: nextSize }; void search(nextSize === form.pageSize ? nextPage : 1, criteria); }} showTotal={value => `共 ${value} 条`} /> : null}</div>
      </>}
    </QueryResultCard>
  </div>;
}
