import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Empty, Form, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import {
  deleteSourceAttachment,
  downloadAttachment,
  getSourceDetail,
  listBranches,
  listClans,
  listGenerationSchemes,
  listGenerationWords,
  listPersons,
  listSourceAttachments,
  listSourceBindings,
  listSources,
  previewAttachment,
  submitCreateBindingRevision,
  submitDeleteBindingRevision,
  submitReplaceBindingRevision,
  uploadSourceAttachment
} from './sourceLibraryService';
import type {
  BindingRevisionResponse,
  BranchOption,
  GenerationSchemeOption,
  GenerationWordOption,
  PersonOption,
  SourceAttachmentRecord,
  SourceBindingSummary,
  SourceDetail,
  SourceRecord,
  SourceSearchParams
} from './sourceLibraryService';

const { Text, Title } = Typography;
const ATTACHMENT_PAGE_SIZE = 20;
const OFFICIAL_GENERATION_SCHEME_STATUSES = new Set(['official', 'active', 'approved']);

type Props = { notify: (data: unknown, error?: boolean) => void };
type BindingMode = 'create' | 'replace';
type BindingTargetType = 'person' | 'branch' | 'clan' | 'generation_word';

type BindingFormValues = {
  targetType: BindingTargetType;
  generationSchemeId?: number;
  targetId?: number;
  bindingReason?: string;
  excerpt?: string;
  confidenceLevel?: string;
  changeReason?: string;
};

type AttachmentFormValues = { privacyLevel?: string; sensitiveLevel?: string };

type SourceSearchFormValues = Omit<SourceSearchParams, 'hasAttachment' | 'hasBinding'> & {
  hasAttachment?: string;
  hasBinding?: string;
};

const sourceTypeOptions = [
  { value: 'genealogy_book', label: '族谱原文' },
  { value: 'local_chronicle', label: '地方志' },
  { value: 'tombstone', label: '墓志碑刻' },
  { value: 'photo', label: '照片资料' },
  { value: 'oral_history', label: '口述记录' },
  { value: 'archive', label: '档案资料' },
  { value: 'other', label: '其他' }
];

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'official', label: '正式' },
  { value: 'rejected', label: '已驳回' },
  { value: 'archived', label: '已归档' }
];

const privacyOptions = [
  { value: 'public', label: '公开' },
  { value: 'clan_only', label: '宗族内可见' },
  { value: 'branch_only', label: '支派内可见' },
  { value: 'relatives_only', label: '亲属可见' },
  { value: 'private', label: '私密' },
  { value: 'sealed', label: '封存' }
];

const sensitiveOptions = [
  { value: 'normal', label: '普通' },
  { value: 'sensitive', label: '敏感' },
  { value: 'highly_sensitive', label: '高敏' }
];

const confidenceOptions = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
  { value: 'unknown', label: '待评估' }
];

const bindingTargetTypeOptions = [
  { value: 'person', label: '人物' },
  { value: 'branch', label: '支派' },
  { value: 'clan', label: '宗族' },
  { value: 'generation_word', label: '字辈' }
];

function optionText(options: Array<{ value: string; label: string }>, value?: string) {
  return options.find(item => item.value === value)?.label || value || '待维护';
}

function bindingTargetTypeText(value?: string) {
  return bindingTargetTypeOptions.find(item => item.value === value)?.label || '其他对象';
}

function pendingBindingChangeText(value?: string) {
  if (value === 'replace') return '变更审核中';
  if (value === 'delete') return '解除审核中';
  return '审核中';
}

function statusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'official' || status === 'uploaded' || status === 'approved') return 'success';
  if (status === 'pending_review' || status === 'pending') return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}

function uploadStatusText(value?: string) {
  const status = String(value || '').toLowerCase();
  const dict: Record<string, string> = {
    uploaded: '已上传',
    success: '已上传',
    failed: '上传失败',
    processing: '处理中'
  };
  return dict[status] || value || '待维护';
}

function uploadStatusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'uploaded' || status === 'success') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'processing') return 'processing';
  return 'default';
}

function fileSizeText(value?: number) {
  if (!value) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function sourceTitle(source?: SourceRecord) {
  return source?.sourceName || source?.bookTitle || '未命名来源';
}

function boolFilter(value?: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function personOptionLabel(row: PersonOption) {
  const name = row.genealogyName || row.name || '未命名人物';
  const code = row.personCode ? `（${row.personCode}）` : '';
  const branch = row.branchName ? ` · ${row.branchName}` : '';
  const word = row.generationWord ? ` · ${row.generationWord}字辈` : '';
  return `${name}${code}${branch}${word}`;
}

function branchOptionLabel(row: BranchOption) {
  return row.branchName || row.branchPath || '未命名支派';
}

function generationSchemeOptionLabel(row: GenerationSchemeOption) {
  return row.schemeName || '未命名字辈方案';
}

function generationWordOptionLabel(row: GenerationWordOption) {
  const generation = row.generationNo ? `第${row.generationNo}世 · ` : '';
  return `${generation}${row.word || '未命名字辈'}`;
}

function isOfficialGenerationScheme(row: GenerationSchemeOption) {
  return OFFICIAL_GENERATION_SCHEME_STATUSES.has(String(row.status || '').toLowerCase());
}

function normalizeBindingTargetType(value?: string): BindingTargetType {
  if (value === 'branch' || value === 'clan' || value === 'generation_word') return value;
  return 'person';
}

function currentGenerationWord(row: SourceBindingSummary): GenerationWordOption[] {
  if (!row.targetId) return [];
  const displayName = String(row.targetDisplayName || '').replace(/^字辈[：:]/, '').trim();
  return [{
    id: row.targetId,
    word: displayName || '当前字辈',
    description: row.targetSummary
  }];
}

export function SourceLibraryPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<Array<{ id?: number; clanName?: string; surname?: string }>>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [search, setSearch] = useState<SourceSearchParams>({ pageNo: 1, pageSize: 10, sort: 'updatedAt,desc' });
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [bindings, setBindings] = useState<SourceBindingSummary[]>([]);
  const [bindingTotal, setBindingTotal] = useState(0);
  const [attachments, setAttachments] = useState<SourceAttachmentRecord[]>([]);
  const [attachmentTotal, setAttachmentTotal] = useState(0);
  const [attachmentPage, setAttachmentPage] = useState({ pageNo: 1, pageSize: ATTACHMENT_PAGE_SIZE });
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [generationSchemes, setGenerationSchemes] = useState<GenerationSchemeOption[]>([]);
  const [generationWords, setGenerationWords] = useState<GenerationWordOption[]>([]);
  const [generationSchemeLoading, setGenerationSchemeLoading] = useState(false);
  const [generationWordLoading, setGenerationWordLoading] = useState(false);
  const [bindingModalOpen, setBindingModalOpen] = useState(false);
  const [bindingMode, setBindingMode] = useState<BindingMode>('create');
  const [bindingTargetType, setBindingTargetType] = useState<BindingTargetType>('person');
  const [bindingTarget, setBindingTarget] = useState<SourceBindingSummary | null>(null);
  const [lastRevision, setLastRevision] = useState<BindingRevisionResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceForm] = Form.useForm<SourceSearchFormValues>();
  const [bindingForm] = Form.useForm<BindingFormValues>();
  const [attachmentForm] = Form.useForm<AttachmentFormValues>();

  const clanId = workspace.clanId || String(clans[0]?.id || '');
  const selectedSource = detail?.source;
  const canBind = Boolean(detail?.permissions?.canBind);
  const canUploadAttachment = Boolean(detail?.permissions?.canUploadAttachment);

  async function loadClans() {
    const rows = await listClans();
    setClans(rows);
    if (!workspace.clanId && rows[0]?.id) workspace.setClanId(String(rows[0].id));
  }

  async function loadSources(nextSearch = search) {
    if (!clanId) return;
    setLoading(true);
    try {
      const data = await listSources(clanId, nextSearch);
      setSources(data.records || []);
      setSourceTotal(data.total || 0);
    } catch (error) {
      notify({ message: (error as Error).message || '来源列表加载失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function loadTargetOptions() {
    if (!clanId) return;
    const [nextPeople, nextBranches] = await Promise.all([
      listPersons(clanId).catch(() => []),
      listBranches(clanId).catch(() => [])
    ]);
    setPeople(nextPeople);
    setBranches(nextBranches);
  }

  async function loadOfficialGenerationSchemes() {
    if (!clanId) return;
    setGenerationSchemeLoading(true);
    try {
      const rows = await listGenerationSchemes(clanId);
      setGenerationSchemes(rows.filter(isOfficialGenerationScheme));
    } catch (error) {
      setGenerationSchemes([]);
      notify({ message: (error as Error).message || '字辈方案加载失败' }, true);
    } finally {
      setGenerationSchemeLoading(false);
    }
  }

  async function loadGenerationWordOptions(schemeId?: number) {
    if (!schemeId) {
      setGenerationWords([]);
      return;
    }
    setGenerationWordLoading(true);
    try {
      const rows = await listGenerationWords(schemeId);
      setGenerationWords(rows);
    } catch (error) {
      setGenerationWords([]);
      notify({ message: (error as Error).message || '字辈明细加载失败' }, true);
    } finally {
      setGenerationWordLoading(false);
    }
  }

  async function loadAttachments(sourceId: number, pageNo = 1, pageSize = ATTACHMENT_PAGE_SIZE) {
    setAttachmentLoading(true);
    try {
      const data = await listSourceAttachments(sourceId, pageNo, pageSize);
      setAttachments(data.records || []);
      setAttachmentTotal(data.total || 0);
      setAttachmentPage({ pageNo, pageSize });
    } catch (error) {
      notify({ message: (error as Error).message || '附件列表加载失败' }, true);
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function openDetail(row: SourceRecord) {
    if (!row.id) return;
    workspace.setSourceId(String(row.id));
    setDrawerOpen(true);
    setLastRevision(null);
    setAttachmentPage({ pageNo: 1, pageSize: ATTACHMENT_PAGE_SIZE });
    try {
      const [nextDetail, nextBindings, nextAttachments] = await Promise.all([
        getSourceDetail(row.id),
        listSourceBindings(row.id, 1, 10),
        listSourceAttachments(row.id, 1, ATTACHMENT_PAGE_SIZE)
      ]);
      setDetail(nextDetail);
      setBindings(nextBindings.records || []);
      setBindingTotal(nextBindings.total || 0);
      setAttachments(nextAttachments.records || []);
      setAttachmentTotal(nextAttachments.total || 0);
      void loadTargetOptions();
    } catch (error) {
      notify({ message: (error as Error).message || '来源详情加载失败' }, true);
    }
  }

  async function reloadDetail() {
    const sourceId = selectedSource?.id || Number(workspace.sourceId || 0);
    if (!sourceId) return;
    try {
      const [nextDetail, nextBindings] = await Promise.all([
        getSourceDetail(sourceId),
        listSourceBindings(sourceId, 1, 10)
      ]);
      setDetail(nextDetail);
      setBindings(nextBindings.records || []);
      setBindingTotal(nextBindings.total || 0);
      await loadAttachments(sourceId, attachmentPage.pageNo, attachmentPage.pageSize);
    } catch (error) {
      notify({ message: (error as Error).message || '来源详情刷新失败' }, true);
    }
  }

  async function submitSearch(values: SourceSearchFormValues) {
    const next: SourceSearchParams = {
      ...search,
      ...values,
      hasAttachment: boolFilter(values.hasAttachment),
      hasBinding: boolFilter(values.hasBinding),
      pageNo: 1
    };
    setSearch(next);
    await loadSources(next);
  }

  async function uploadAttachment() {
    if (!selectedSource?.id || !file) return;
    const values = attachmentForm.getFieldsValue();
    try {
      await uploadSourceAttachment(selectedSource.id, file, values.privacyLevel || 'clan_only', values.sensitiveLevel || 'normal');
      setFile(null);
      attachmentForm.resetFields();
      notify({ message: '附件上传成功' });
      await loadAttachments(selectedSource.id, 1, attachmentPage.pageSize);
    } catch (error) {
      notify({ message: (error as Error).message || '附件上传失败' }, true);
    }
  }

  async function preview(row: SourceAttachmentRecord) {
    if (!row.id) return;
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      notify({ message: '浏览器拦截了预览窗口，请允许弹窗后重试' }, true);
      return;
    }
    try {
      const blob = await previewAttachment(row.id);
      const url = URL.createObjectURL(blob);
      previewWindow.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      previewWindow.close();
      notify({ message: (error as Error).message || '附件预览失败' }, true);
    }
  }

  async function download(row: SourceAttachmentRecord) {
    if (!row.id) return;
    try {
      const blob = await downloadAttachment(row.id);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = row.fileName || 'source-attachment';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      notify({ message: (error as Error).message || '附件下载失败' }, true);
    }
  }

  async function removeAttachment(row: SourceAttachmentRecord) {
    if (!row.id || !selectedSource?.id) return;
    try {
      await deleteSourceAttachment(row.id);
      notify({ message: '附件已删除' });
      const nextPageNo = attachments.length === 1 && attachmentPage.pageNo > 1
        ? attachmentPage.pageNo - 1
        : attachmentPage.pageNo;
      await loadAttachments(selectedSource.id, nextPageNo, attachmentPage.pageSize);
    } catch (error) {
      notify({ message: (error as Error).message || '附件删除失败' }, true);
    }
  }

  function openCreateBinding() {
    if (!selectedSource?.id) return;
    setBindingMode('create');
    setBindingTarget(null);
    setBindingTargetType('person');
    setGenerationWords([]);
    bindingForm.resetFields();
    bindingForm.setFieldsValue({ targetType: 'person', confidenceLevel: selectedSource.confidenceLevel || 'unknown' });
    setBindingModalOpen(true);
  }

  function openReplaceBinding(row: SourceBindingSummary) {
    if (!selectedSource?.id) return;
    const targetType = normalizeBindingTargetType(row.targetType);
    setBindingMode('replace');
    setBindingTarget(row);
    setBindingTargetType(targetType);
    if (targetType === 'generation_word') {
      setGenerationWords(currentGenerationWord(row));
      void loadOfficialGenerationSchemes();
    } else {
      setGenerationWords([]);
    }
    bindingForm.setFieldsValue({
      targetType,
      generationSchemeId: undefined,
      targetId: row.targetId,
      bindingReason: row.bindingReason,
      excerpt: row.excerpt,
      confidenceLevel: row.confidenceLevel || selectedSource.confidenceLevel || 'unknown',
      changeReason: '修正来源绑定证据'
    });
    setBindingModalOpen(true);
  }

  function changeBindingTargetType(value: BindingTargetType) {
    setBindingTargetType(value);
    setGenerationWords([]);
    bindingForm.setFieldsValue({ generationSchemeId: undefined, targetId: undefined });
    if (value === 'generation_word') void loadOfficialGenerationSchemes();
  }

  function changeGenerationScheme(schemeId?: number) {
    bindingForm.setFieldValue('targetId', undefined);
    void loadGenerationWordOptions(schemeId);
  }

  async function submitBindingRevision(values: BindingFormValues) {
    if (!selectedSource?.id || !clanId || !values.targetType || !values.targetId) return;
    const payload = {
      binding: {
        sourceId: selectedSource.id,
        targetType: values.targetType,
        targetId: Number(values.targetId),
        bindingReason: values.bindingReason,
        excerpt: values.excerpt,
        confidenceLevel: values.confidenceLevel || selectedSource.confidenceLevel || 'unknown'
      },
      changeReason: values.changeReason
    };
    try {
      const response = bindingMode === 'replace' && bindingTarget?.id
        ? await submitReplaceBindingRevision(bindingTarget.id, payload)
        : await submitCreateBindingRevision(clanId, payload);
      setLastRevision(response);
      setBindingModalOpen(false);
      await reloadDetail();
      notify({ message: '来源绑定变更已提交审核' });
    } catch (error) {
      notify({ message: (error as Error).message || '来源绑定审核提交失败' }, true);
    }
  }

  async function submitDeleteRevision(row: SourceBindingSummary) {
    if (!row.id) return;
    try {
      const response = await submitDeleteBindingRevision(row.id, '来源绑定解除申请');
      setLastRevision(response);
      await reloadDetail();
      notify({ message: '解除绑定申请已提交审核' });
    } catch (error) {
      notify({ message: (error as Error).message || '解除绑定审核提交失败' }, true);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => { if (clanId) void loadSources(search); }, [clanId]);

  const targetOptions = useMemo(() => {
    if (bindingTargetType === 'branch') return branches.map(row => ({ value: row.id, label: branchOptionLabel(row) }));
    if (bindingTargetType === 'clan') return clans.filter(row => String(row.id) === clanId).map(row => ({ value: row.id, label: row.clanName || `${row.surname || ''}宗族` }));
    if (bindingTargetType === 'generation_word') return generationWords.map(row => ({ value: row.id, label: generationWordOptionLabel(row) }));
    return people.map(row => ({ value: row.id, label: personOptionLabel(row) }));
  }, [bindingTargetType, people, branches, clans, clanId, generationWords]);

  const generationSchemeOptions = useMemo(
    () => generationSchemes.map(row => ({ value: row.id, label: generationSchemeOptionLabel(row) })),
    [generationSchemes]
  );

  const uploadProps: UploadProps = {
    maxCount: 1,
    beforeUpload: nextFile => { setFile(nextFile); return false; },
    onRemove: () => { setFile(null); return true; },
    fileList: file ? [{ uid: file.name, name: file.name, status: 'done' }] : []
  };

  const targetPlaceholder = bindingTargetType === 'generation_word'
    ? '请选择具体字辈'
    : '请选择人物、支派或宗族';

  return (
    <div className="source-library-page">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size={4}>
            <Title level={4} style={{ margin: 0 }}>来源资料库</Title>
            <Text type="secondary">统一管理族谱原文、地方志、照片、口述记录等来源证据，并串联引用、附件和绑定审核。</Text>
          </Space>
        </Card>

        <Card title="来源检索">
          <Form form={sourceForm} layout="inline" onFinish={submitSearch} initialValues={search} style={{ rowGap: 12 }}>
            <Form.Item name="keyword" label="关键词"><Input allowClear placeholder="资料名、提供者、摘录" style={{ width: 220 }} /></Form.Item>
            <Form.Item name="sourceType" label="类型"><Select allowClear options={sourceTypeOptions} style={{ width: 150 }} /></Form.Item>
            <Form.Item name="verificationStatus" label="状态"><Select allowClear options={statusOptions} style={{ width: 130 }} /></Form.Item>
            <Form.Item name="privacyLevel" label="可见范围"><Select allowClear options={privacyOptions} style={{ width: 150 }} /></Form.Item>
            <Form.Item name="hasAttachment" label="附件"><Select allowClear options={[{ value: 'true', label: '有附件' }, { value: 'false', label: '无附件' }]} style={{ width: 120 }} /></Form.Item>
            <Form.Item name="hasBinding" label="引用"><Select allowClear options={[{ value: 'true', label: '有引用' }, { value: 'false', label: '无引用' }]} style={{ width: 120 }} /></Form.Item>
            <Form.Item><Button type="primary" htmlType="submit" loading={loading}>查询</Button></Form.Item>
          </Form>
        </Card>

        <Card title="来源列表" extra={<Button onClick={() => void loadSources(search)}>刷新</Button>}>
          <Table<SourceRecord>
            rowKey={(row, index) => String(row.id || index)}
            size="small"
            loading={loading}
            dataSource={sources}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无来源资料" /> }}
            pagination={{
              current: search.pageNo || 1,
              pageSize: search.pageSize || 10,
              total: sourceTotal,
              onChange: (pageNo, pageSize) => {
                const next = { ...search, pageNo, pageSize };
                setSearch(next);
                void loadSources(next);
              }
            }}
            columns={[
              { title: '来源资料', render: (_value, row) => <Button type="link" onClick={() => void openDetail(row)}>{sourceTitle(row)}</Button> },
              { title: '类型', width: 120, render: (_value, row) => <Tag>{optionText(sourceTypeOptions, row.sourceType)}</Tag> },
              { title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.verificationStatus)}>{optionText(statusOptions, row.verificationStatus)}</Tag> },
              { title: '可信度', width: 90, render: (_value, row) => optionText(confidenceOptions, row.confidenceLevel) },
              { title: '可见范围', width: 120, render: (_value, row) => optionText(privacyOptions, row.privacyLevel) },
              { title: '引用', width: 90, render: (_value, row) => `${row.bindingCount || 0} 条` },
              { title: '附件', width: 90, render: (_value, row) => `${row.attachmentCount || 0} 个` },
              { title: '最近更新', width: 170, render: (_value, row) => row.updatedAt || row.createdAt || '待维护' }
            ]}
          />
        </Card>
      </Space>

      <Drawer
        width={920}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={sourceTitle(selectedSource)}
        extra={<Space><Button onClick={() => void reloadDetail()}>刷新</Button>{canBind ? <Button type="primary" onClick={openCreateBinding}>新建绑定关系</Button> : null}</Space>}
      >
        {!selectedSource ? <Empty description="请选择来源资料" /> : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {lastRevision ? <Alert type="success" showIcon message="绑定变更已提交审核" description={lastRevision.diffSummary || '请在审核中心处理该变更。'} /> : null}
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="来源类型"><Tag>{optionText(sourceTypeOptions, selectedSource.sourceType)}</Tag></Descriptions.Item>
              <Descriptions.Item label="状态"><Tag color={statusColor(selectedSource.verificationStatus)}>{optionText(statusOptions, selectedSource.verificationStatus)}</Tag></Descriptions.Item>
              <Descriptions.Item label="可信度">{optionText(confidenceOptions, selectedSource.confidenceLevel)}</Descriptions.Item>
              <Descriptions.Item label="可见范围">{optionText(privacyOptions, selectedSource.privacyLevel)}</Descriptions.Item>
              <Descriptions.Item label="提供者">{selectedSource.providerName || '待维护'}</Descriptions.Item>
              <Descriptions.Item label="书名/题名">{selectedSource.bookTitle || '待维护'}</Descriptions.Item>
              <Descriptions.Item label="卷册页码">{[selectedSource.volumeNo, selectedSource.pageNo].filter(Boolean).join(' / ') || '待维护'}</Descriptions.Item>
              <Descriptions.Item label="来源时间">{selectedSource.sourceDate || '待维护'}</Descriptions.Item>
              <Descriptions.Item label="摘录" span={2}>{selectedSource.excerpt || '暂无摘录'}</Descriptions.Item>
              <Descriptions.Item label="说明" span={2}>{selectedSource.description || '暂无说明'}</Descriptions.Item>
            </Descriptions>

            <Tabs
              items={[
                { key: 'bindings', label: `引用情况（${bindingTotal || bindings.length}）`, children: <BindingTable rows={bindings} canBind={canBind} onReplace={openReplaceBinding} onDelete={submitDeleteRevision} /> },
                {
                  key: 'attachments',
                  label: `附件（${attachmentTotal}）`,
                  children: (
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      {canUploadAttachment ? (
                        <Card size="small" title="上传附件">
                          <Form form={attachmentForm} layout="inline" initialValues={{ privacyLevel: 'clan_only', sensitiveLevel: 'normal' }}>
                            <Form.Item label="附件"><Upload {...uploadProps}><Button>选择文件</Button></Upload></Form.Item>
                            <Form.Item name="privacyLevel" label="可见范围"><Select options={privacyOptions} style={{ width: 150 }} /></Form.Item>
                            <Form.Item name="sensitiveLevel" label="敏感级别"><Select options={sensitiveOptions} style={{ width: 120 }} /></Form.Item>
                            <Form.Item><Button type="primary" disabled={!file || attachmentLoading} loading={attachmentLoading} onClick={() => void uploadAttachment()}>上传</Button></Form.Item>
                          </Form>
                        </Card>
                      ) : <Alert type="info" showIcon message="当前账号暂无附件上传权限" />}
                      <AttachmentTable
                        rows={attachments}
                        total={attachmentTotal}
                        pageNo={attachmentPage.pageNo}
                        pageSize={attachmentPage.pageSize}
                        loading={attachmentLoading}
                        onPageChange={(pageNo, pageSize) => {
                          if (selectedSource.id) void loadAttachments(selectedSource.id, pageNo, pageSize);
                        }}
                        onPreview={preview}
                        onDownload={download}
                        onDelete={removeAttachment}
                      />
                    </Space>
                  )
                }
              ]}
            />
          </Space>
        )}
      </Drawer>

      <Modal open={bindingModalOpen} title={bindingMode === 'replace' ? '变更绑定关系' : '新建绑定关系'} onCancel={() => setBindingModalOpen(false)} onOk={() => bindingForm.submit()} okText="提交审核">
        <Form form={bindingForm} layout="vertical" onFinish={submitBindingRevision}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message={bindingMode === 'replace'
              ? '变更绑定提交后需审核通过才会生效，审核期间原绑定继续有效。'
              : '新建绑定关系提交后需审核通过才会正式生效。'}
          />
          <Form.Item name="targetType" label="绑定对象类型" rules={[{ required: true, message: '请选择绑定对象类型' }]}>
            <Select
              options={bindingTargetTypeOptions}
              onChange={changeBindingTargetType}
            />
          </Form.Item>
          {bindingTargetType === 'generation_word' ? (
            <Form.Item name="generationSchemeId" label="字辈方案">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                loading={generationSchemeLoading}
                options={generationSchemeOptions.filter(item => item.value)}
                placeholder={generationSchemes.length ? '请选择已生效字辈方案' : '暂无已生效字辈方案'}
                onChange={changeGenerationScheme}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="targetId" label="绑定对象" rules={[{ required: true, message: '请选择绑定对象' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              loading={bindingTargetType === 'generation_word' && generationWordLoading}
              options={targetOptions.filter(item => item.value)}
              placeholder={targetPlaceholder}
              disabled={bindingTargetType === 'generation_word' && !generationWordLoading && !generationWords.length}
              notFoundContent={bindingTargetType === 'generation_word' ? '请选择字辈方案后加载字辈明细' : '暂无可选对象'}
            />
          </Form.Item>
          <Form.Item name="bindingReason" label="绑定理由"><Input.TextArea rows={2} placeholder="说明该来源为何能证明该对象" /></Form.Item>
          <Form.Item name="excerpt" label="来源摘录"><Input.TextArea rows={2} placeholder="摘录来源中与绑定对象相关的内容" /></Form.Item>
          <Form.Item name="confidenceLevel" label="可信度"><Select options={confidenceOptions} /></Form.Item>
          <Form.Item name="changeReason" label="变更原因"><Input.TextArea rows={2} placeholder="说明为什么提交这次绑定变更" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function BindingTable({ rows, canBind, onReplace, onDelete }: { rows: SourceBindingSummary[]; canBind: boolean; onReplace: (row: SourceBindingSummary) => void; onDelete: (row: SourceBindingSummary) => void }) {
  return (
    <Table<SourceBindingSummary>
      size="small"
      rowKey={(row, index) => String(row.id || index)}
      dataSource={rows}
      pagination={false}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无引用记录" /> }}
      columns={[
        { title: '引用对象类型', width: 120, render: (_value, row) => <Tag>{bindingTargetTypeText(row.targetType)}</Tag> },
        { title: '引用对象', render: (_value, row) => <Space direction="vertical" size={0}><Text strong>{row.targetDisplayName || '待维护对象名称'}</Text><Text type="secondary">{row.targetBranchName || row.targetSummary || '暂无对象摘要'}</Text></Space> },
        { title: '绑定理由', render: (_value, row) => row.bindingReason || '待维护' },
        { title: '可信度', width: 90, render: (_value, row) => optionText(confidenceOptions, row.confidenceLevel) },
        {
          title: '状态',
          width: 130,
          render: (_value, row) => (
            <Space direction="vertical" size={0}>
              <Tag color={statusColor(row.bindingStatus)}>{optionText(statusOptions, row.bindingStatus) || '正式'}</Tag>
              {row.hasPendingRevision ? <Tag color="processing">{pendingBindingChangeText(row.pendingChangeType)}</Tag> : null}
            </Space>
          )
        },
        { title: '创建时间', width: 170, render: (_value, row) => row.createdAt || '待维护' },
        {
          title: '操作',
          width: 180,
          render: (_value, row) => {
            if (!canBind) return <Text type="secondary">暂无权限</Text>;
            const bindingStatus = String(row.bindingStatus || '').toLowerCase();
            if (bindingStatus !== 'official') {
              return <Text type="secondary">{bindingStatus === 'archived' ? '已归档' : '不可变更'}</Text>;
            }
            if (row.hasPendingRevision) {
              return <Tag color="processing">{pendingBindingChangeText(row.pendingChangeType)}</Tag>;
            }
            return (
              <Space>
                <Button size="small" type="link" onClick={() => onReplace(row)}>变更绑定</Button>
                <Popconfirm
                  title="提交解除绑定审核"
                  description="解除绑定不会立即生效，审核通过后该绑定将归档。"
                  onConfirm={() => onDelete(row)}
                >
                  <Button size="small" type="link" danger>解除绑定</Button>
                </Popconfirm>
              </Space>
            );
          }
        }
      ]}
    />
  );
}

function AttachmentTable({ rows, total, pageNo, pageSize, loading, onPageChange, onPreview, onDownload, onDelete }: {
  rows: SourceAttachmentRecord[];
  total: number;
  pageNo: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (pageNo: number, pageSize: number) => void;
  onPreview: (row: SourceAttachmentRecord) => void;
  onDownload: (row: SourceAttachmentRecord) => void;
  onDelete: (row: SourceAttachmentRecord) => void;
}) {
  return (
    <Table<SourceAttachmentRecord>
      size="small"
      rowKey={(row, index) => String(row.id || index)}
      dataSource={rows}
      loading={loading}
      pagination={{
        current: pageNo,
        pageSize,
        total,
        showSizeChanger: true,
        pageSizeOptions: [10, 20, 50],
        showTotal: value => `共 ${value} 个附件`,
        onChange: onPageChange
      }}
      locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" /> }}
      columns={[
        { title: '文件名', render: (_value, row) => row.fileName || '未命名附件' },
        { title: '类型', width: 120, render: (_value, row) => row.fileType || '待维护' },
        { title: '大小', width: 90, render: (_value, row) => fileSizeText(row.fileSize) },
        { title: '敏感级别', width: 100, render: (_value, row) => <Tag>{optionText(sensitiveOptions, row.sensitiveLevel)}</Tag> },
        { title: '上传状态', width: 100, render: (_value, row) => <Tag color={uploadStatusColor(row.uploadStatus)}>{uploadStatusText(row.uploadStatus)}</Tag> },
        { title: '上传时间', width: 170, render: (_value, row) => row.uploadedAt || '待维护' },
        { title: '操作', width: 190, render: (_value, row) => <Space size="small"><Button size="small" type="link" disabled={!row.previewAllowed} onClick={() => onPreview(row)}>预览</Button><Button size="small" type="link" disabled={!row.downloadAllowed} onClick={() => onDownload(row)}>下载</Button><Popconfirm title="删除附件" description={`确认删除附件“${row.fileName || '当前附件'}”吗？`} onConfirm={() => onDelete(row)}><Button size="small" type="link" danger>删除</Button></Popconfirm></Space> }
      ]}
    />
  );
}
