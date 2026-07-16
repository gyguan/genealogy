import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Empty, Form, Input, Select, Space, Table, Tag } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/utils/records';
import { navigateToPersonDetail } from './personDetailNavigation';
import { navigateToPersonEdit } from './personEditNavigation';

type Props = { notify: (data: unknown, error?: boolean) => void };

type SearchForm = {
  keyword: string;
  name: string;
  gender: string;
  generationWord: string;
  generationNo: string;
  branchId: string;
  dataStatus: string;
};

const PAGE_SIZE = 20;
const emptySearch: SearchForm = { keyword: '', name: '', gender: '', generationWord: '', generationNo: '', branchId: '', dataStatus: '' };

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'official', label: '正式' },
  { value: 'rejected', label: '已驳回' },
  { value: 'archived', label: '已归档' }
];

const genderOptions = [
  { value: '', label: '全部' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'unknown', label: '未知' }
];

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function personName(row: any) {
  return row.name || row.personName || row.displayName || row.fullName || '';
}

function personGender(row: any) {
  return row.gender || row.sex || '';
}

function genderText(value: unknown) {
  const text = String(value || '').toLowerCase();
  if (text === 'male') return '男';
  if (text === 'female') return '女';
  if (text === 'unknown') return '未知';
  return display(value);
}

function personGenerationNo(row: any) {
  return row.generationNo || row.generation || row.generationNumber || '';
}

function generationText(row: any) {
  const no = personGenerationNo(row);
  return no ? `第${no}世` : '-';
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

function statusText(row: any) {
  const status = String(personStatus(row)).trim().toLowerCase();
  const labels: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    official: '正式',
    active: '正式',
    approved: '已通过',
    rejected: '已驳回',
    archived: '已归档'
  };
  return labels[status] || (status ? '未知状态' : '-');
}

function statusColor(row: any) {
  const status = String(personStatus(row)).trim().toLowerCase();
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (['pending', 'pending_review'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}

function livingText(value: unknown) {
  if (value === true) return '在世';
  if (value === false) return '已故';
  return '未知';
}

function asDate(value: unknown) {
  return value === null || value === undefined ? '' : String(value).slice(0, 10);
}

function lifeText(row: any) {
  const birth = asDate(row.birthDate);
  const death = asDate(row.deathDate);
  if (!birth && !death) return '-';
  return `${birth || '?'} - ${death || (row.isLiving === true ? '今' : '?')}`;
}

function spouseText(row: any) {
  if (Array.isArray(row.spouseNames) && row.spouseNames.length) return row.spouseNames.join('、');
  return row.spouseName || row.spouseNames || '-';
}

function clanLabel(clan: any) {
  return clan.clanName || clan.name || clan.surname || '未命名宗族';
}

function branchLabel(branch: any) {
  return branch.branchName || branch.name || '未命名支派';
}

function generationNoLabel(value: string) {
  return value ? `${value} 世` : '';
}

function uniqueTexts(values: unknown[]) {
  return Array.from(new Set(values.map(value => String(value ?? '').trim()).filter(Boolean)));
}

function sortGenerationNos(values: string[]) {
  return [...values].sort((left, right) => {
    const leftNo = Number(left);
    const rightNo = Number(right);
    if (Number.isFinite(leftNo) && Number.isFinite(rightNo)) return leftNo - rightNo;
    return left.localeCompare(right);
  });
}

export function PersonArchiveSearchPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [form, setForm] = useState<SearchForm>(emptySearch);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [rawData, setRawData] = useState<unknown>();
  const [querying, setQuerying] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);
  const [clans, setClans] = useState<unknown>([]);
  const [branches, setBranches] = useState<unknown>([]);
  const [generationItems, setGenerationItems] = useState<any[]>([]);

  const clanOptions = useMemo(() => toRecordList<any>(clans), [clans]);
  const branchOptions = useMemo(() => toRecordList<any>(branches), [branches]);
  const generationWordOptions = useMemo(() => uniqueTexts(generationItems.map(item => item.word || item.generationWord)), [generationItems]);
  const generationNoOptions = useMemo(() => sortGenerationNos(uniqueTexts(generationItems.map(item => item.generationNo))), [generationItems]);

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => { void loadClanFilterOptions(workspace.clanId); }, [workspace.clanId]);

  function patch(key: keyof SearchForm, value: string) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  async function loadClans() {
    setFilterLoading(true);
    try {
      const data = await apiClient.get('/clans').catch(() => []);
      setClans(data);
      const list = toRecordList<any>(data);
      if (!workspace.clanId && list[0]?.id) workspace.setClanId(String(list[0].id));
    } finally {
      setFilterLoading(false);
    }
  }

  async function loadClanFilterOptions(clanId: string) {
    if (!clanId) {
      setBranches([]);
      setGenerationItems([]);
      return;
    }
    setFilterLoading(true);
    try {
      const [branchData, schemeData] = await Promise.all([
        apiClient.get(`/clans/${clanId}/branches`).catch(() => []),
        apiClient.get(`/clans/${clanId}/generation-schemes`).catch(() => [])
      ]);
      setBranches(branchData);
      const schemes = toRecordList<any>(schemeData).filter(item => item?.id);
      const schemeItems = await Promise.all(schemes.map(item => apiClient.get(`/generation-schemes/${item.id}/items`).catch(() => [])));
      setGenerationItems(schemeItems.flatMap(item => toRecordList<any>(item)));
    } finally {
      setFilterLoading(false);
    }
  }

  async function changeClan(nextClanId: string) {
    const changed = nextClanId !== workspace.clanId;
    workspace.setClanId(nextClanId);
    workspace.setBranchId('');
    setForm({ ...emptySearch });
    setRawData(undefined);
    if (changed) notify({ message: '已切换宗族，搜索条件和结果已清空，请重新搜索。' });
    await loadClanFilterOptions(nextClanId);
  }

  function changeBranch(nextBranchId: string) {
    workspace.setBranchId(nextBranchId);
    patch('branchId', nextBranchId);
  }

  async function search(nextPage = 1) {
    if (!workspace.clanId) return;
    setQuerying(true);
    try {
      const params = new URLSearchParams({ clanId: workspace.clanId, pageNo: String(nextPage), pageSize: String(PAGE_SIZE) });
      if (form.branchId) params.set('branchId', form.branchId);
      if (form.keyword.trim()) params.set('keyword', form.keyword.trim());
      if (form.name.trim()) params.set('name', form.name.trim());
      if (form.gender) params.set('gender', form.gender);
      if (form.generationNo) params.set('generationNo', form.generationNo);
      if (form.generationWord) params.set('generationWord', form.generationWord);
      if (form.dataStatus) params.set('dataStatus', form.dataStatus);
      const data = await apiClient.get(`/persons/search?${params.toString()}`);
      setRawData(data);
      setPageNo(nextPage);
    } catch (error) {
      notify({ message: (error as Error).message || '查询失败' }, true);
    } finally {
      setQuerying(false);
    }
  }

  function reset() {
    setForm({ ...emptySearch });
    setPageNo(1);
    setRawData(undefined);
  }

  function openDetail(row: any) {
    const id = row.id || row.personId;
    if (!id) return;
    workspace.setPersonId(String(id));
    navigateToPersonDetail(id);
  }

  function openEditor(row: any) {
    const id = row.id || row.personId;
    if (!id) return;
    workspace.setPersonId(String(id));
    navigateToPersonEdit(id);
  }

  function branchText(row: any) {
    const branchId = String(personBranchId(row) || '');
    const branch = branchOptions.find(item => String(item.id) === branchId);
    return row.branchName || row.branch?.branchName || branch?.branchName || '支派待维护';
  }

  const rows = useMemo(() => toRecordList(rawData) as any[], [rawData]);
  const total = (rawData as any)?.total ?? rows.length;
  const currentPage = Number((rawData as any)?.pageNo ?? pageNo ?? 1);
  const totalPages = Number((rawData as any)?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE)));

  return (
    <div className="person-archive-search">
      <Card className="archive-search-panel archive-search-panel--compact" title="人物档案检索" loading={filterLoading}>
        <Form layout="vertical" className="archive-search-form" onFinish={() => void search(1)}>
          <Form.Item label="宗族名称">
            <Select
              showSearch
              optionFilterProp="label"
              value={workspace.clanId}
              onChange={value => void changeClan(value)}
              options={[{ value: '', label: '请选择宗族' }, ...clanOptions.map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))]}
            />
          </Form.Item>
          <Form.Item label="关键词">
            <Input value={form.keyword} onChange={event => patch('keyword', event.target.value)} placeholder="姓名 / 谱名 / 字号 / 籍贯 / 墓葬" />
          </Form.Item>
          {advancedOpen ? (
            <>
              <Form.Item label="姓名"><Input value={form.name} onChange={event => patch('name', event.target.value)} placeholder="姓名" /></Form.Item>
              <Form.Item label="性别"><Select value={form.gender} onChange={value => patch('gender', value)} options={genderOptions} /></Form.Item>
              <Form.Item label="字辈">
                <Select
                  value={form.generationWord}
                  disabled={!workspace.clanId || filterLoading}
                  onChange={value => patch('generationWord', value)}
                  options={[{ value: '', label: '全部' }, ...generationWordOptions.map(word => ({ value: word, label: word }))]}
                />
              </Form.Item>
              <Form.Item label="代次">
                <Select
                  value={form.generationNo}
                  disabled={!workspace.clanId || filterLoading}
                  onChange={value => patch('generationNo', value)}
                  options={[{ value: '', label: '全部' }, ...generationNoOptions.map(no => ({ value: no, label: generationNoLabel(no) }))]}
                />
              </Form.Item>
              <Form.Item label="支派">
                <Select
                  showSearch
                  optionFilterProp="label"
                  value={form.branchId}
                  disabled={!workspace.clanId || filterLoading}
                  onChange={changeBranch}
                  options={[{ value: '', label: '全部' }, ...branchOptions.map(branch => ({ value: String(branch.id), label: branchLabel(branch) }))]}
                />
              </Form.Item>
              <Form.Item label="档案状态"><Select value={form.dataStatus} onChange={value => patch('dataStatus', value)} options={statusOptions} /></Form.Item>
            </>
          ) : null}
          <Form.Item className="archive-search-actions-item">
            <Space wrap>
              <Button type="primary" htmlType="submit" disabled={querying || !workspace.clanId}>搜索</Button>
              <Button onClick={reset}>重置</Button>
              <Button onClick={() => setAdvancedOpen(previous => !previous)}>{advancedOpen ? '收起高级筛选' : '高级筛选'}</Button>
            </Space>
          </Form.Item>
        </Form>

        <Space className="archive-search-summary archive-search-summary--compact" wrap>
          <Tag>第 {currentPage} / {totalPages} 页</Tag>
          <Tag>本页 {rows.length} 条</Tag>
          <Tag>共 {total} 条</Tag>
        </Space>

        <Table<any>
          size="small"
          bordered
          rowKey={(row, index) => String(row.id || row.personId || index)}
          dataSource={rows}
          pagination={{
            current: currentPage,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: value => `共 ${value} 条`,
            onChange: nextPage => void search(nextPage)
          }}
          loading={querying}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无人物记录，请先选择宗族并搜索，或调整筛选条件。" /> }}
          onRow={row => ({ onClick: () => openDetail(row), style: { cursor: 'pointer' }, title: '点击查看人物档案' })}
          columns={[
            {
              key: 'name',
              title: '姓名',
              render: (_value, row) => (
                <Button type="link" className="archive-person-name-link" onClick={event => { event.stopPropagation(); openDetail(row); }}>
                  {display(personName(row), '未命名人物')}
                </Button>
              )
            },
            { key: 'aliasName', title: '别名', render: (_value, row) => display(row.aliasName) },
            { key: 'gender', title: '性别', width: 90, render: (_value, row) => genderText(personGender(row)) },
            { key: 'generationWord', title: '字辈', width: 90, render: (_value, row) => display(personGenerationWord(row)) },
            { key: 'generationNo', title: '代次', width: 90, render: (_value, row) => generationText(row) },
            { key: 'branchName', title: '支派', render: (_value, row) => branchText(row) },
            { key: 'life', title: '生卒', render: (_value, row) => lifeText(row) },
            { key: 'isLiving', title: '是否在世', width: 110, render: (_value, row) => livingText(row.isLiving) },
            { key: 'spouseName', title: '配偶', render: (_value, row) => spouseText(row) },
            { key: 'dataStatus', title: '档案状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
            {
              key: 'actions',
              title: '操作',
              width: 130,
              fixed: 'right',
              render: (_value, row) => (
                <Space size="small" onClick={event => event.stopPropagation()}>
                  <Button type="link" onClick={() => openDetail(row)}>查看</Button>
                  <Button type="link" onClick={() => openEditor(row)}>编辑</Button>
                </Space>
              )
            }
          ]}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
