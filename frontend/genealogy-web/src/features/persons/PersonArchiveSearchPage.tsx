import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Descriptions, Drawer, Empty, Form, Input, Progress, Select, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { toRecordList } from '../../shared/ui/DataTable';

type Props = { notify: (data: unknown, error?: boolean) => void };
type DrawerMode = 'view' | 'edit';

type SearchForm = {
  keyword: string;
  name: string;
  gender: string;
  generationWord: string;
  generationNo: string;
  branchId: string;
  dataStatus: string;
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

type PersonEvent = {
  id: number | string;
  eventType?: string;
  eventTitle?: string;
  eventDate?: string;
  eventDatePrecision?: string;
  eventPlace?: string;
  eventDescription?: string;
  sourceType?: string;
  sourceName?: string;
  sourceTitle?: string;
  dataStatus?: string;
};

const PAGE_SIZE = 20;
const emptySearch: SearchForm = { keyword: '', name: '', gender: '', generationWord: '', generationNo: '', branchId: '', dataStatus: '' };
const privacyOptions = [
  ['public', '公开'],
  ['clan_only', '宗族内可见'],
  ['branch_only', '支派内可见'],
  ['relatives_only', '亲属可见'],
  ['private', '私密'],
  ['sealed', '封存']
] as const;

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

function privacyText(value?: string) {
  return privacyOptions.find(([code]) => code === value)?.[1] || value || '-';
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
  const dict: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    official: '正式',
    active: '正式',
    approved: '已通过',
    rejected: '已驳回',
    archived: '已归档'
  };
  return dict[status] || (status ? '未知状态' : '-');
}

function statusColor(row: any) {
  const status = String(personStatus(row)).trim().toLowerCase();
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (['pending', 'pending_review'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function boolText(value: unknown) {
  if (value === true) return '是';
  if (value === false) return '否';
  return '-';
}

function livingText(value: unknown) {
  if (value === true) return '在世';
  if (value === false) return '已故';
  return '未知';
}

function asString(value: unknown) {
  return value === null || value === undefined ? '' : String(value);
}

function asDate(value: unknown) {
  return asString(value).slice(0, 10);
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

function eventTypeText(type?: string) {
  const dict: Record<string, string> = {
    birth: '出生',
    education: '教育',
    career: '职业',
    migration: '迁徙',
    marriage: '婚配',
    child_birth: '子女',
    death: '逝世',
    burial: '墓葬'
  };
  return dict[type || ''] || type || '事件';
}

function eventDateText(event: PersonEvent) {
  const date = display(event.eventDate, '时间未详');
  const precision = event.eventDatePrecision;
  if (precision === 'year') return `${date.slice(0, 4)}年`;
  if (precision === 'month') return `${date.slice(0, 7)}`;
  return date;
}

function relationshipName(row: any, side: 'from' | 'to') {
  if (side === 'from') return row.fromPersonName || row.fromName || row.sourcePersonName || row.personName || '起点人物待维护';
  return row.toPersonName || row.toName || row.targetPersonName || row.relativeName || '关联人物待维护';
}

function relationshipTypeText(value: unknown) {
  const type = String(value || '').trim().toLowerCase();
  const dict: Record<string, string> = {
    father: '父亲',
    mother: '母亲',
    parent: '父母',
    son: '儿子',
    daughter: '女儿',
    child: '子女',
    spouse: '配偶',
    husband: '丈夫',
    wife: '妻子',
    adopted_in: '继入',
    adopted_out: '出嗣'
  };
  return dict[type] || display(value, '关系待维护');
}

function sourceTitle(row: any) {
  return row.sourceName || row.sourceTitle || row.title || row.fileName || row.materialName || '来源资料待维护';
}

function sourceTypeText(value: unknown) {
  const type = String(value || '').trim().toLowerCase();
  const dict: Record<string, string> = {
    genealogy_book: '族谱文献',
    oral: '口述材料',
    archive: '档案材料',
    tombstone: '碑刻墓志',
    image: '图片资料',
    file: '附件资料'
  };
  return dict[type] || display(value, '来源类型待维护');
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
  const [pageNo, setPageNo] = useState(1);
  const [rawData, setRawData] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [relationships, setRelationships] = useState<unknown>();
  const [sources, setSources] = useState<unknown>();
  const [events, setEvents] = useState<unknown>();
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('view');
  const [loading, setLoading] = useState(false);
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
      notify({ message: (error as Error).message || '操作失败' }, true);
    } finally {
      setLoading(false);
    }
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
      const schemes = toRecordList<any>(schemeData);
      const defaultScheme = schemes.find(item => item.isDefault) || schemes[0];
      if (defaultScheme?.id) {
        const items = await apiClient.get(`/generation-schemes/${defaultScheme.id}/items`).catch(() => []);
        setGenerationItems(toRecordList<any>(items));
      } else {
        setGenerationItems([]);
      }
    } finally {
      setFilterLoading(false);
    }
  }

  async function changeClan(nextClanId: string) {
    workspace.setClanId(nextClanId);
    workspace.setBranchId('');
    setForm({ ...emptySearch });
    setRawData(undefined);
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

  async function openDetail(row: any, mode: DrawerMode = 'view') {
    await run(async () => {
      const id = row.id || row.personId;
      const detail = await apiClient.get(`/persons/${id}`);
      setSelected(detail);
      setEditForm(toEditForm(detail));
      setDrawerMode(mode);
      workspace.setPersonId(String(id));
      const [relationshipData, sourceData, eventData] = await Promise.all([
        apiClient.get(`/persons/${id}/relationships`).catch(() => []),
        apiClient.get(`/source-bindings/target/person/${id}`).catch(() => []),
        apiClient.get(`/persons/${id}/events`).catch(() => [])
      ]);
      setRelationships(relationshipData);
      setSources(sourceData);
      setEvents(eventData);
    });
  }

  function closeDetail() {
    setSelected(undefined);
    setEditForm(null);
    setRelationships(undefined);
    setSources(undefined);
    setEvents(undefined);
    setDrawerMode('view');
  }

  async function saveDetail() {
    if (!selected || !editForm) return;
    await run(async () => {
      if (!editForm.name.trim()) throw new Error('姓名不能为空');
      const data = await apiClient.put(`/persons/${selected.id}`, toUpdatePayload(editForm));
      setSelected(data);
      setEditForm(toEditForm(data));
      setDrawerMode('view');
      notify({ message: '人物档案已保存' });
      void search(currentPage);
    });
  }

  function startEdit() {
    if (!selected) return;
    setEditForm(toEditForm(selected));
    setDrawerMode('edit');
  }

  function cancelEdit() {
    if (selected) setEditForm(toEditForm(selected));
    setDrawerMode('view');
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
  const eventRows = useMemo(() => toRecordList(events) as PersonEvent[], [events]);
  const relationshipRows = useMemo(() => toRecordList<any>(relationships), [relationships]);
  const sourceRows = useMemo(() => toRecordList<any>(sources), [sources]);

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
    relationshipRows.length,
    sourceRows.length,
    eventRows.length
  ].filter(Boolean).length * 5) : 0;

  const timelineItems = eventRows.map(event => ({
    key: String(event.id),
    children: (
      <div className="archive-event-item">
        <Typography.Text strong>{display(event.eventTitle, eventTypeText(event.eventType))}</Typography.Text>
        <br />
        <Typography.Text type="secondary">{eventDateText(event)} · {display(event.eventPlace, '地点未详')}</Typography.Text>
        <p>{display(event.eventDescription, '暂无事件说明。')}</p>
        {event.sourceName || event.sourceTitle || event.sourceType ? <Tag>{sourceTitle(event)}</Tag> : null}
      </div>
    )
  }));

  const selectedName = selected ? display(selected.name || selected.personName, '未命名人物') : '';

  return (
    <div className="person-archive-search">
      <Card className="archive-search-panel archive-search-panel--compact" title="人物档案检索" loading={querying || filterLoading}>
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
            <Input value={form.keyword} onChange={e => patch('keyword', e.target.value)} placeholder="姓名 / 谱名 / 字号 / 籍贯 / 墓葬" />
          </Form.Item>
          <Form.Item label="姓名">
            <Input value={form.name} onChange={e => patch('name', e.target.value)} placeholder="姓名" />
          </Form.Item>
          <Form.Item label="性别">
            <Select value={form.gender} onChange={value => patch('gender', value)} options={genderOptions} />
          </Form.Item>
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
          <Form.Item label="档案状态">
            <Select value={form.dataStatus} onChange={value => patch('dataStatus', value)} options={statusOptions} />
          </Form.Item>
          <Form.Item>
            <Space wrap>
              <Button type="primary" htmlType="submit" disabled={loading || !workspace.clanId}>搜索</Button>
              <Button onClick={reset}>重置</Button>
              <Button disabled={filterLoading} onClick={() => workspace.clanId ? void loadClanFilterOptions(workspace.clanId) : void loadClans()}>刷新选项</Button>
            </Space>
          </Form.Item>
        </Form>

        <Space className="archive-search-summary archive-search-summary--compact" wrap>
          <Tag>第 {currentPage} / {totalPages} 页</Tag>
          <Tag>本页 {rows.length} 条</Tag>
          <Tag>共 {total} 条</Tag>
          {selectedName ? <Tag color="processing">当前人物：{selectedName}</Tag> : null}
        </Space>

        <Table<any>
          size="small"
          bordered
          rowKey={(row, index) => String(row.id || row.personId || index)}
          dataSource={rows}
          pagination={false}
          loading={querying}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无人物记录，请先选择宗族并搜索，或调整筛选条件。" /> }}
          onRow={row => ({ onClick: () => void openDetail(row, 'view'), style: { cursor: 'pointer' } })}
          columns={[
            { key: 'name', title: '姓名', render: (_value, row) => display(personName(row), '未命名人物') },
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
              render: (_value, row) => (
                <Space size="small" onClick={event => event.stopPropagation()}>
                  <Button size="small" type="link" onClick={() => void openDetail(row, 'view')}>查看</Button>
                  <Button size="small" type="link" onClick={() => void openDetail(row, 'edit')}>编辑</Button>
                </Space>
              )
            }
          ]}
          scroll={{ x: 'max-content' }}
        />
        <Space className="antd-actions" wrap>
          <Button disabled={currentPage <= 1 || loading} onClick={() => void search(currentPage - 1)}>上一页</Button>
          <Button disabled={currentPage >= totalPages || loading} onClick={() => void search(currentPage + 1)}>下一页</Button>
        </Space>
      </Card>

      <Drawer
        title={selected ? display(selected.name || selected.personName, '未命名人物') : '人物档案'}
        width={720}
        open={Boolean(selected && editForm)}
        onClose={closeDetail}
        extra={selected ? (
          <Space>
            {drawerMode === 'view' ? <Button onClick={startEdit}>编辑档案</Button> : <Button onClick={cancelEdit}>取消编辑</Button>}
            <Button onClick={closeDetail}>关闭</Button>
          </Space>
        ) : null}
      >
        {selected && editForm ? (
          drawerMode === 'view' ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Typography.Text type="secondary">资料完整度</Typography.Text>
                <Progress percent={completeness} size="small" />
              </div>
              <Tabs
                items={[
                  {
                    key: 'summary',
                    label: '基础信息',
                    children: (
                      <Descriptions column={2} size="small" bordered>
                        <Descriptions.Item label="姓名">{display(selected.name || selected.personName, '未命名人物')}</Descriptions.Item>
                        <Descriptions.Item label="谱名">{display(selected.genealogyName)}</Descriptions.Item>
                        <Descriptions.Item label="字号">{display(selected.courtesyName)}</Descriptions.Item>
                        <Descriptions.Item label="别名">{display(selected.aliasName)}</Descriptions.Item>
                        <Descriptions.Item label="性别">{genderText(selected.gender)}</Descriptions.Item>
                        <Descriptions.Item label="支派">{branchText(selected)}</Descriptions.Item>
                        <Descriptions.Item label="字辈">{display(selected.generationWord)}</Descriptions.Item>
                        <Descriptions.Item label="代次">{generationText(selected)}</Descriptions.Item>
                        <Descriptions.Item label="排行">{display(selected.rankInFamily)}</Descriptions.Item>
                        <Descriptions.Item label="生卒">{lifeText(selected)}</Descriptions.Item>
                        <Descriptions.Item label="是否在世">{livingText(selected.isLiving)}</Descriptions.Item>
                        <Descriptions.Item label="隐私级别">{privacyText(selected.privacyLevel)}</Descriptions.Item>
                        <Descriptions.Item label="档案状态"><Tag color={statusColor(selected)}>{statusText(selected)}</Tag></Descriptions.Item>
                      </Descriptions>
                    )
                  },
                  {
                    key: 'detail',
                    label: '扩展信息',
                    children: (
                      <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="出生地">{display(selected.birthPlace)}</Descriptions.Item>
                        <Descriptions.Item label="居住地">{display(selected.residencePlace)}</Descriptions.Item>
                        <Descriptions.Item label="职业">{display(selected.occupation)}</Descriptions.Item>
                        <Descriptions.Item label="教育程度">{display(selected.education)}</Descriptions.Item>
                        <Descriptions.Item label="称号荣誉">{display(selected.titleOrHonor)}</Descriptions.Item>
                        <Descriptions.Item label="墓葬地">{display(selected.tombPlace)}</Descriptions.Item>
                        <Descriptions.Item label="世系状态">{display(selected.lineageStatus)}</Descriptions.Item>
                        <Descriptions.Item label="是否有后裔">{boolText(selected.hasDescendant)}</Descriptions.Item>
                      </Descriptions>
                    )
                  },
                  {
                    key: 'events',
                    label: '事件与传记',
                    children: (
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {timelineItems.length ? <Timeline items={timelineItems} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无关键事件记录。" />}
                        <Card size="small" title="人物传记"><Typography.Paragraph>{display(selected.biography, '暂无人物传记。')}</Typography.Paragraph></Card>
                        <Card size="small" title="墓志铭"><Typography.Paragraph>{display(selected.epitaph, '暂无墓志铭。')}</Typography.Paragraph></Card>
                      </Space>
                    )
                  },
                  {
                    key: 'relations',
                    label: '亲属关系',
                    children: (
                      <Table<any>
                        size="small"
                        rowKey={(row, index) => String(row.id || index)}
                        dataSource={relationshipRows}
                        pagination={false}
                        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无亲属关系，或尚未点击人物记录。" /> }}
                        columns={[
                          { key: 'fromPersonName', title: '起点人物', render: (_value, row) => relationshipName(row, 'from') },
                          { key: 'toPersonName', title: '关联人物', render: (_value, row) => relationshipName(row, 'to') },
                          { key: 'relationType', title: '关系类型', render: (_value, row) => relationshipTypeText(row.relationLabel || row.relationType) }
                        ]}
                      />
                    )
                  },
                  {
                    key: 'sources',
                    label: '来源证据',
                    children: (
                      <Table<any>
                        size="small"
                        rowKey={(row, index) => String(row.id || index)}
                        dataSource={sourceRows}
                        pagination={false}
                        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无来源绑定，或尚未点击人物记录。" /> }}
                        columns={[
                          { key: 'sourceName', title: '来源资料', render: (_value, row) => sourceTitle(row) },
                          { key: 'sourceType', title: '来源类型', render: (_value, row) => sourceTypeText(row.sourceType || row.type) },
                          { key: 'status', title: '状态', render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> }
                        ]}
                      />
                    )
                  }
                ]}
              />
            </Space>
          ) : (
            <Form layout="vertical" className="archive-edit-section">
              <Card size="small" title="编辑人物档案">
                <div className="archive-edit-grid">
                  <Form.Item label="支派"><Select value={editForm.branchId} onChange={value => patchEdit('branchId', value)} options={[{ value: '', label: '请选择支派' }, ...branchOptions.map(branch => ({ value: String(branch.id), label: branchLabel(branch) }))]} /></Form.Item>
                  <Form.Item label="姓名"><Input value={editForm.name} onChange={e => patchEdit('name', e.target.value)} /></Form.Item>
                  <Form.Item label="谱名"><Input value={editForm.genealogyName} onChange={e => patchEdit('genealogyName', e.target.value)} /></Form.Item>
                  <Form.Item label="字号"><Input value={editForm.courtesyName} onChange={e => patchEdit('courtesyName', e.target.value)} /></Form.Item>
                  <Form.Item label="别名"><Input value={editForm.aliasName} onChange={e => patchEdit('aliasName', e.target.value)} /></Form.Item>
                  <Form.Item label="性别"><Select value={editForm.gender} onChange={value => patchEdit('gender', value)} options={genderOptions.filter(item => item.value)} /></Form.Item>
                  <Form.Item label="代次"><Select value={editForm.generationNo} onChange={value => patchEdit('generationNo', value)} options={[{ value: '', label: '请选择代次' }, ...generationNoOptions.map(no => ({ value: no, label: generationNoLabel(no) }))]} /></Form.Item>
                  <Form.Item label="字辈"><Select value={editForm.generationWord} onChange={value => patchEdit('generationWord', value)} options={[{ value: '', label: '请选择字辈' }, ...generationWordOptions.map(word => ({ value: word, label: word }))]} /></Form.Item>
                  <Form.Item label="排行"><Input value={editForm.rankInFamily} onChange={e => patchEdit('rankInFamily', e.target.value)} /></Form.Item>
                  <Form.Item label="出生日期"><Input value={editForm.birthDate} onChange={e => patchEdit('birthDate', e.target.value)} placeholder="YYYY-MM-DD" /></Form.Item>
                  <Form.Item label="逝世日期"><Input value={editForm.deathDate} onChange={e => patchEdit('deathDate', e.target.value)} placeholder="YYYY-MM-DD" /></Form.Item>
                  <Form.Item label="是否在世"><Select value={editForm.isLiving} onChange={value => patchEdit('isLiving', value)} options={[{ value: 'true', label: '在世' }, { value: 'false', label: '已故' }]} /></Form.Item>
                  <Form.Item label="是否有后裔"><Select value={editForm.hasDescendant} onChange={value => patchEdit('hasDescendant', value)} options={[{ value: '', label: '未知' }, { value: 'true', label: '有' }, { value: 'false', label: '无' }]} /></Form.Item>
                  <Form.Item label="出生地"><Input value={editForm.birthPlace} onChange={e => patchEdit('birthPlace', e.target.value)} /></Form.Item>
                  <Form.Item label="居住地"><Input value={editForm.residencePlace} onChange={e => patchEdit('residencePlace', e.target.value)} /></Form.Item>
                  <Form.Item label="职业"><Input value={editForm.occupation} onChange={e => patchEdit('occupation', e.target.value)} /></Form.Item>
                  <Form.Item label="教育程度"><Input value={editForm.education} onChange={e => patchEdit('education', e.target.value)} /></Form.Item>
                  <Form.Item label="称号荣誉"><Input value={editForm.titleOrHonor} onChange={e => patchEdit('titleOrHonor', e.target.value)} /></Form.Item>
                  <Form.Item label="墓葬地"><Input value={editForm.tombPlace} onChange={e => patchEdit('tombPlace', e.target.value)} /></Form.Item>
                  <Form.Item label="世系状态"><Select value={editForm.lineageStatus} onChange={value => patchEdit('lineageStatus', value)} options={[{ value: 'normal', label: '正常' }, { value: 'adopted_in', label: '继入' }, { value: 'adopted_out', label: '出嗣' }, { value: 'unknown', label: '未知' }]} /></Form.Item>
                  <Form.Item label="隐私级别"><Select value={editForm.privacyLevel} onChange={value => patchEdit('privacyLevel', value)} options={privacyOptions.map(([value, label]) => ({ value, label }))} /></Form.Item>
                  <Form.Item label="档案状态"><Select value={editForm.dataStatus} onChange={value => patchEdit('dataStatus', value)} options={statusOptions.filter(item => item.value)} /></Form.Item>
                </div>
                <Form.Item label="人物传记"><Input.TextArea value={editForm.biography} onChange={e => patchEdit('biography', e.target.value)} rows={5} placeholder="记录生平、迁徙、功名、事迹等" /></Form.Item>
                <Form.Item label="墓志铭"><Input.TextArea value={editForm.epitaph} onChange={e => patchEdit('epitaph', e.target.value)} rows={4} placeholder="记录墓志、碑文或相关摘录" /></Form.Item>
                <Space>
                  <Button type="primary" loading={loading} onClick={() => void saveDetail()}>{loading ? '保存中...' : '保存人物档案'}</Button>
                  <Button onClick={cancelEdit}>取消</Button>
                </Space>
              </Card>
            </Form>
          )
        ) : null}
      </Drawer>
    </div>
  );
}
