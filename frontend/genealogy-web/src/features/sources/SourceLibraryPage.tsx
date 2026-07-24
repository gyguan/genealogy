import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftOutlined, MoreOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import {
  Alert, Button, Card, Col, Descriptions, Drawer, Dropdown, Form, Input, Modal, Result, Row, Select, Space, Spin, Table, Tabs, Tag, Tooltip, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
import {
  createSource,
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

import { feedback } from '../../shared/ui/OperationFeedback';

import { EmptyState, InlineFeedback, PageFeedback, confirmAction } from '../../shared/ui/Feedback';

const { Text, Title } = Typography;
const ATTACHMENT_PAGE_SIZE = 20;
const BINDING_PAGE_SIZE = 10;
const OFFICIAL_GENERATION_SCHEME_STATUSES = new Set(['official', 'active', 'approved']);
const SOURCE_PAGE_SIZES = new Set([10, 20, 50]);
const typeValues = new Set(['genealogy_book', 'local_chronicle', 'tombstone', 'photo', 'oral_history', 'archive', 'other']);
const statusValues = new Set(['draft', 'pending_review', 'official', 'rejected', 'archived']);
const privacyValues = new Set(['public', 'clan_only', 'branch_only', 'relatives_only', 'private', 'sealed']);

type Props = {  };
type BindingMode = 'create' | 'replace';
type BindingTargetType = 'person' | 'branch' | 'clan' | 'generation_word';
type DetailErrorKind = 'not_found' | 'forbidden' | 'service';

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
type SourceCreateFormValues = {
  sourceName: string;
  sourceType: string;
  providerName?: string;
  bookTitle?: string;
  volumeNo?: string;
  pageNo?: string;
  sourceDate?: string;
  excerpt?: string;
  description?: string;
  confidenceLevel?: string;
  privacyLevel?: string;
  sensitiveLevel?: string;
};
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
function pendingReferenceChangeText(value?: string) {
  if (value === 'replace') return '变更审核中';
  if (value === 'delete') return '解除审核中';
  return '审核中';
}
function statusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (status === 'official' || status === 'uploaded' || status === 'approved') return 'success';
  if (status === 'pending_review' || status === 'pending') return 'processing';
  if (status === 'rejected' || status === 'failed') return 'error';
  return 'default';
}
function uploadStatusText(value?: string) {
  const status = String(value || '').toLowerCase();
  return ({ uploaded: '已上传', success: '已上传', failed: '上传失败', processing: '处理中' } as Record<string, string>)[status] || value || '待维护';
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
function sourceSummary(source: SourceRecord) {
  return [
    optionText(sourceTypeOptions, source.sourceType),
    source.volumeNo,
    source.pageNo,
    source.providerName ? `提供者：${source.providerName}` : undefined
  ].filter(Boolean).join(' · ');
}
function formatDateTime(value?: string) {
  if (!value) return '待维护';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date).replaceAll('/', '-');
}
function boolFilter(value?: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}
function hasActiveSearch(value: SourceSearchParams) {
  return Boolean(value.keyword || value.sourceType || value.verificationStatus || value.privacyLevel || value.hasAttachment !== undefined || value.hasBinding !== undefined);
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
  return [{ id: row.targetId, word: displayName || '当前字辈', description: row.targetSummary }];
}
function readSourceIdFromUrl() {
  const parsed = Number(new URLSearchParams(window.location.search).get('sourceId'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
function readSearchFromUrl(): SourceSearchParams {
  const params = new URLSearchParams(window.location.search);
  const positiveInt = (name: string, fallback: number) => {
    const parsed = Number(params.get(name));
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  };
  const optionValue = (name: string, values: Set<string>) => {
    const value = params.get(name);
    return value && values.has(value) ? value : undefined;
  };
  const boolValue = (name: string) => {
    const value = params.get(name);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  };
  const rawPageSize = positiveInt('pageSize', 10);
  const rawSort = params.get('sort') || '';
  return {
    pageNo: positiveInt('pageNo', 1),
    pageSize: SOURCE_PAGE_SIZES.has(rawPageSize) ? rawPageSize : 10,
    sort: /^[A-Za-z][A-Za-z0-9_]*,(asc|desc)$/.test(rawSort) ? rawSort : 'updatedAt,desc',
    keyword: params.get('keyword') || undefined,
    sourceType: optionValue('sourceType', typeValues) ? [optionValue('sourceType', typeValues)!] : undefined,
    verificationStatus: optionValue('verificationStatus', statusValues) ? [optionValue('verificationStatus', statusValues)!] : undefined,
    privacyLevel: optionValue('privacyLevel', privacyValues) ? [optionValue('privacyLevel', privacyValues)!] : undefined,
    hasAttachment: boolValue('hasAttachment') === undefined ? undefined : [boolValue('hasAttachment')!],
    hasBinding: boolValue('hasBinding') === undefined ? undefined : [boolValue('hasBinding')!]
  };
}
function searchFormValues(value: SourceSearchParams): SourceSearchFormValues {
  return {
    ...value,
    hasAttachment: value.hasAttachment?.[0] === undefined ? undefined : String(value.hasAttachment[0]),
    hasBinding: value.hasBinding?.[0] === undefined ? undefined : String(value.hasBinding[0])
  };
}
function writeSearchToUrl(value: SourceSearchParams, mode: 'push' | 'replace' = 'push') {
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.hash = '';
  url.searchParams.set('view', 'sourceLibrary');
  url.searchParams.delete('sourceId');
  ['keyword', 'sourceType', 'verificationStatus', 'privacyLevel', 'hasAttachment', 'hasBinding', 'pageNo', 'pageSize', 'sort'].forEach(key => url.searchParams.delete(key));
  Object.entries(value).forEach(([key, item]) => {
    if (item !== undefined && item !== null && item !== '') url.searchParams.set(key, String(item));
  });
  const sourceLibraryScrollY = Number(window.history.state?.sourceLibraryScrollY ?? window.scrollY);
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({ ...window.history.state, sourceLibraryScrollY }, '', `${url.pathname}${url.search}`);
}
function writeSourceIdToUrl(sourceId?: number, mode: 'push' | 'replace' = 'push') {
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.hash = '';
  url.searchParams.set('view', 'sourceLibrary');
  if (sourceId) url.searchParams.set('sourceId', String(sourceId));
  else url.searchParams.delete('sourceId');
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', `${url.pathname}${url.search}`);
}
function detailErrorKind(error: unknown): DetailErrorKind {
  const record = error as { status?: number; response?: { status?: number } };
  const status = record?.status || record?.response?.status;
  if (status === 404) return 'not_found';
  if (status === 403) return 'forbidden';
  return 'service';
}

export function SourceLibraryPage({}: Props) {
  const workspace = useWorkspace();
  const [clans, setClans] = useState<Array<{ id?: number; clanName?: string; surname?: string }>>([]);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [search, setSearch] = useState<SourceSearchParams>(readSearchFromUrl);
  const [loading, setLoading] = useState(false);
  const [listLoaded, setListLoaded] = useState(false);
  const [listError, setListError] = useState<string>();
  const [listStale, setListStale] = useState(false);
  const [detailSourceId, setDetailSourceId] = useState<number | undefined>(readSourceIdFromUrl);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<DetailErrorKind | null>(null);
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [bindings, setBindings] = useState<SourceBindingSummary[]>([]);
  const [bindingTotal, setBindingTotal] = useState(0);
  const [bindingPage, setBindingPage] = useState({ pageNo: 1, pageSize: BINDING_PAGE_SIZE });
  const [bindingLoading, setBindingLoading] = useState(false);
  const [bindingError, setBindingError] = useState<string>();
  const [attachments, setAttachments] = useState<SourceAttachmentRecord[]>([]);
  const [attachmentTotal, setAttachmentTotal] = useState(0);
  const [attachmentPage, setAttachmentPage] = useState({ pageNo: 1, pageSize: ATTACHMENT_PAGE_SIZE });
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string>();
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [createSubmitLoading, setCreateSubmitLoading] = useState(false);
  const [createSubmitError, setCreateSubmitError] = useState<string>();
  const [attachmentSubmitLoading, setAttachmentSubmitLoading] = useState(false);
  const [attachmentSubmitError, setAttachmentSubmitError] = useState<string>();
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
  const [bindingSubmitLoading, setBindingSubmitLoading] = useState(false);
  const [bindingSubmitError, setBindingSubmitError] = useState<string>();
  const [lastRevision, setLastRevision] = useState<BindingRevisionResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceForm] = Form.useForm<SourceSearchFormValues>();
  const [createForm] = Form.useForm<SourceCreateFormValues>();
  const [bindingForm] = Form.useForm<BindingFormValues>();
  const [attachmentForm] = Form.useForm<AttachmentFormValues>();
  const listScrollRef = useRef<number>(Number(window.history.state?.sourceLibraryScrollY || 0));

  const clanId = workspace.clanId || String(clans[0]?.id || '');
  const selectedSource = detail?.source;
  const canBind = Boolean(detail?.permissions?.canBind);
  const canUploadAttachment = Boolean(detail?.permissions?.canUploadAttachment);

  async function loadClans() {
    try {
      const rows = await listClans();
      setClans(rows);
      if (!workspace.clanId && rows[0]?.id) workspace.setClanId(String(rows[0].id));
    } catch (error) {
      feedback.from({ message: (error as Error).message || '宗族信息加载失败' }, true);
    }
  }

  async function loadSources(nextSearch = search, preserveExisting = false) {
    if (!clanId) return;
    setLoading(true);
    setListError(undefined);
    try {
      const data = await listSources(clanId, nextSearch);
      setSources(data.records || []);
      setSourceTotal(data.total || 0);
      setListLoaded(true);
      setListStale(false);
    } catch (error) {
      const message = (error as Error).message || '来源列表加载失败';
      setListError(message);
      setListLoaded(true);
      if (preserveExisting && sources.length) setListStale(true);
      else if (!preserveExisting) {
        setSources([]);
        setSourceTotal(0);
      }
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
      feedback.from({ message: (error as Error).message || '字辈方案加载失败' }, true);
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
      setGenerationWords(await listGenerationWords(schemeId));
    } catch (error) {
      setGenerationWords([]);
      feedback.from({ message: (error as Error).message || '字辈明细加载失败' }, true);
    } finally {
      setGenerationWordLoading(false);
    }
  }

  async function loadBindings(sourceId: number, pageNo = 1, pageSize = BINDING_PAGE_SIZE) {
    setBindingLoading(true);
    setBindingError(undefined);
    try {
      const data = await listSourceBindings(sourceId, pageNo, pageSize);
      setBindings(data.records || []);
      setBindingTotal(data.total || 0);
      setBindingPage({ pageNo, pageSize });
    } catch (error) {
      setBindingError((error as Error).message || '引用关系加载失败');
    } finally {
      setBindingLoading(false);
    }
  }

  async function loadAttachments(sourceId: number, pageNo = 1, pageSize = ATTACHMENT_PAGE_SIZE) {
    setAttachmentLoading(true);
    setAttachmentError(undefined);
    try {
      const data = await listSourceAttachments(sourceId, pageNo, pageSize);
      setAttachments(data.records || []);
      setAttachmentTotal(data.total || 0);
      setAttachmentPage({ pageNo, pageSize });
    } catch (error) {
      setAttachmentError((error as Error).message || '附件列表加载失败');
    } finally {
      setAttachmentLoading(false);
    }
  }

  async function loadDetail(sourceId: number) {
    workspace.setSourceId(String(sourceId));
    setDetailLoading(true);
    setDetailError(null);
    setLastRevision(null);
    try {
      const nextDetail = await getSourceDetail(sourceId);
      setDetail(nextDetail);
      void loadBindings(sourceId, 1, BINDING_PAGE_SIZE);
      void loadAttachments(sourceId, 1, ATTACHMENT_PAGE_SIZE);
      void loadTargetOptions();
    } catch (error) {
      setDetail(null);
      setDetailError(detailErrorKind(error));
    } finally {
      setDetailLoading(false);
    }
  }

  async function reloadDetail() {
    if (!detailSourceId) return;
    await loadDetail(detailSourceId);
  }

  function openDetail(row: SourceRecord) {
    if (!row.id) return;
    listScrollRef.current = window.scrollY;
    window.history.replaceState({ ...window.history.state, sourceLibraryScrollY: window.scrollY }, '', window.location.href);
    writeSourceIdToUrl(row.id);
    setDetailSourceId(row.id);
  }

  function closeDetail(mode: 'push' | 'replace' = 'push') {
    writeSearchToUrl(search, mode);
    setDetailSourceId(undefined);
    setDetail(null);
    setDetailError(null);
    window.setTimeout(() => window.scrollTo({ top: listScrollRef.current }), 0);
  }

  function submitSearch(values: SourceSearchFormValues) {
    const next: SourceSearchParams = {
      ...values,
      hasAttachment: boolFilter(values.hasAttachment) === undefined ? undefined : [boolFilter(values.hasAttachment)!],
      hasBinding: boolFilter(values.hasBinding) === undefined ? undefined : [boolFilter(values.hasBinding)!],
      pageNo: 1,
      pageSize: search.pageSize || 10,
      sort: search.sort || 'updatedAt,desc'
    };
    setSearch(next);
    writeSearchToUrl(next);
    void loadSources(next);
  }

  function resetSearch() {
    const next: SourceSearchParams = { pageNo: 1, pageSize: search.pageSize || 10, sort: 'updatedAt,desc' };
    sourceForm.resetFields();
    sourceForm.setFieldsValue(searchFormValues(next));
    setSearch(next);
    writeSearchToUrl(next);
    void loadSources(next);
  }

  function openCreateSource() {
    setCreateSubmitError(undefined);
    createForm.resetFields();
    createForm.setFieldsValue({
      sourceType: 'genealogy_book',
      confidenceLevel: 'unknown',
      privacyLevel: 'clan_only',
      sensitiveLevel: 'normal'
    });
    setCreateDrawerOpen(true);
  }

  async function submitCreateSource(submitReview: boolean) {
    if (!clanId) {
      setCreateSubmitError('请先选择宗族后再新增来源');
      return;
    }
    try {
      const values = await createForm.validateFields();
      setCreateSubmitLoading(true);
      setCreateSubmitError(undefined);
      const created = await createSource(clanId, {
        sourceName: values.sourceName.trim(),
        sourceType: values.sourceType,
        providerName: values.providerName?.trim() || undefined,
        bookTitle: values.bookTitle?.trim() || undefined,
        volumeNo: values.volumeNo?.trim() || undefined,
        pageNo: values.pageNo?.trim() || undefined,
        sourceDate: values.sourceDate?.trim() || undefined,
        excerpt: values.excerpt?.trim() || undefined,
        description: values.description?.trim() || undefined,
        confidenceLevel: values.confidenceLevel,
        privacyLevel: values.privacyLevel,
        sensitiveLevel: values.sensitiveLevel,
        submitReview
      });
      feedback.from({ message: submitReview ? '来源已保存并提交审核' : '来源已保存为草稿', id: created?.id });
      setCreateDrawerOpen(false);
      createForm.resetFields();
      const nextSearch = { ...search, pageNo: 1 };
      setSearch(nextSearch);
      writeSearchToUrl(nextSearch, 'replace');
      await loadSources(nextSearch);
      if (created?.id) {
        writeSourceIdToUrl(created.id);
        setDetailSourceId(created.id);
      }
    } catch (error) {
      const fieldError = error as { errorFields?: unknown[] };
      if (fieldError?.errorFields) return;
      setCreateSubmitError((error as Error).message || '来源创建失败');
    } finally {
      setCreateSubmitLoading(false);
    }
  }

  function openCreateReference() {
    setBindingMode('create');
    setBindingTarget(null);
    setBindingTargetType('person');
    setGenerationWords([]);
    setBindingSubmitError(undefined);
    bindingForm.resetFields();
    bindingForm.setFieldsValue({ targetType: 'person', confidenceLevel: selectedSource?.confidenceLevel || 'unknown' });
    setBindingModalOpen(true);
  }

  function openReplaceReference(row: SourceBindingSummary) {
    const targetType = normalizeBindingTargetType(row.targetType);
    setBindingMode('replace');
    setBindingTarget(row);
    setBindingTargetType(targetType);
    setBindingSubmitError(undefined);
    if (targetType === 'generation_word') {
      setGenerationWords(currentGenerationWord(row));
      void loadOfficialGenerationSchemes();
    } else setGenerationWords([]);
    bindingForm.setFieldsValue({
      targetType,
      targetId: row.targetId,
      bindingReason: row.bindingReason,
      excerpt: row.excerpt,
      confidenceLevel: row.confidenceLevel || selectedSource?.confidenceLevel || 'unknown',
      changeReason: ''
    });
    setBindingModalOpen(true);
  }

  function changeBindingTargetType(value: BindingTargetType) {
    setBindingTargetType(value);
    bindingForm.setFieldsValue({ targetType: value, targetId: undefined, generationSchemeId: undefined });
    setGenerationWords([]);
    if (value === 'generation_word') void loadOfficialGenerationSchemes();
  }

  function changeGenerationScheme(value?: number) {
    bindingForm.setFieldValue('targetId', undefined);
    void loadGenerationWordOptions(value);
  }

  function openAttachmentModal() {
    setAttachmentSubmitError(undefined);
    attachmentForm.setFieldsValue({ privacyLevel: 'clan_only', sensitiveLevel: 'normal' });
    setAttachmentModalOpen(true);
  }

  async function uploadAttachment() {
    if (!selectedSource?.id) return;
    if (!file) {
      setAttachmentSubmitError('请选择需要上传的附件');
      return;
    }
    setAttachmentSubmitLoading(true);
    setAttachmentSubmitError(undefined);
    try {
      const values = attachmentForm.getFieldsValue();
      await uploadSourceAttachment(selectedSource.id, file, values.privacyLevel || 'clan_only', values.sensitiveLevel || 'normal');
      setFile(null);
      attachmentForm.resetFields();
      setAttachmentModalOpen(false);
      await loadAttachments(selectedSource.id, 1, attachmentPage.pageSize);
      feedback.from({ message: '附件上传成功' });
    } catch (error) {
      setAttachmentSubmitError((error as Error).message || '附件上传失败');
    } finally {
      setAttachmentSubmitLoading(false);
    }
  }

  async function preview(row: SourceAttachmentRecord) {
    if (!row.id) return;
    try {
      const blob = await previewAttachment(row.id);
      window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer');
    } catch (error) {
      feedback.from({ message: (error as Error).message || '附件预览失败' }, true);
    }
  }

  async function download(row: SourceAttachmentRecord) {
    if (!row.id) return;
    try {
      const blob = await downloadAttachment(row.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = row.fileName || '附件';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      feedback.from({ message: (error as Error).message || '附件下载失败' }, true);
    }
  }

  async function removeAttachment(row: SourceAttachmentRecord) {
    if (!row.id || !selectedSource?.id) return;
    try {
      await deleteSourceAttachment(row.id);
      await loadAttachments(selectedSource.id, attachmentPage.pageNo, attachmentPage.pageSize);
      feedback.from({ message: '附件已删除' });
    } catch (error) {
      feedback.from({ message: (error as Error).message || '附件删除失败' }, true);
    }
  }

  async function submitReferenceRevision(values: BindingFormValues) {
    if (!selectedSource?.id || !clanId || !values.targetId) return;
    setBindingSubmitLoading(true);
    setBindingSubmitError(undefined);
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
      await loadBindings(selectedSource.id, bindingMode === 'create' ? 1 : bindingPage.pageNo, bindingPage.pageSize);
      feedback.from({ message: '引用变更已提交审核' });
    } catch (error) {
      setBindingSubmitError((error as Error).message || '引用审核提交失败');
    } finally {
      setBindingSubmitLoading(false);
    }
  }

  async function submitDeleteReference(row: SourceBindingSummary) {
    if (!row.id || !selectedSource?.id) return;
    try {
      const response = await submitDeleteBindingRevision(row.id, '来源引用解除申请');
      setLastRevision(response);
      await loadBindings(selectedSource.id, bindingPage.pageNo, bindingPage.pageSize);
      feedback.from({ message: '解除引用申请已提交审核' });
    } catch (error) {
      feedback.from({ message: (error as Error).message || '解除引用审核提交失败' }, true);
    }
  }

  useEffect(() => { void loadClans(); }, []);
  useEffect(() => { if (clanId && !detailSourceId) void loadSources(search); }, [clanId, detailSourceId]);
  useEffect(() => { if (detailSourceId) void loadDetail(detailSourceId); }, [detailSourceId]);
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const nextSourceId = readSourceIdFromUrl();
      const nextSearch = readSearchFromUrl();
      setDetailSourceId(nextSourceId);
      setSearch(nextSearch);
      sourceForm.setFieldsValue(searchFormValues(nextSearch));
      listScrollRef.current = Number(event.state?.sourceLibraryScrollY || 0);
      if (!nextSourceId && clanId) void loadSources(nextSearch);
      window.setTimeout(() => window.scrollTo({ top: listScrollRef.current }), 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [clanId, sourceForm]);

  const targetOptions = useMemo(() => {
    if (bindingTargetType === 'branch') return branches.map(row => ({ value: row.id, label: branchOptionLabel(row) }));
    if (bindingTargetType === 'clan') return clans.filter(row => String(row.id) === clanId).map(row => ({ value: row.id, label: row.clanName || `${row.surname || ''}宗族` }));
    if (bindingTargetType === 'generation_word') return generationWords.map(row => ({ value: row.id, label: generationWordOptionLabel(row) }));
    return people.map(row => ({ value: row.id, label: personOptionLabel(row) }));
  }, [bindingTargetType, people, branches, clans, clanId, generationWords]);
  const generationSchemeOptions = useMemo(() => generationSchemes.map(row => ({ value: row.id, label: generationSchemeOptionLabel(row) })), [generationSchemes]);
  const uploadProps: UploadProps = {
    maxCount: 1,
    beforeUpload: nextFile => { setFile(nextFile); setAttachmentSubmitError(undefined); return false; },
    onRemove: () => { setFile(null); return true; },
    fileList: file ? [{ uid: file.name, name: file.name, status: 'done' }] : []
  };
  const targetPlaceholder = bindingTargetType === 'generation_word' ? '请选择具体字辈' : '请选择人物、支派或宗族';

  if (detailSourceId) {
    if (detailLoading) return <Card><Space direction="vertical" align="center" style={{ width: '100%', padding: 48 }}><Spin size="large" /><InlineFeedback tone="info" title="正在加载来源资料…" /></Space></Card>;
    if (detailError === 'not_found') return <Result status="404" title="来源资料不存在" subTitle="该来源可能已被删除或链接已经失效。" extra={<Button type="primary" onClick={() => closeDetail()}>返回来源资料库</Button>} />;
    if (detailError === 'forbidden') return <Result status="403" title="无权查看该来源资料" subTitle="当前账号没有访问该来源的权限。" extra={<Button type="primary" onClick={() => closeDetail()}>返回来源资料库</Button>} />;
    if (detailError === 'service' || !selectedSource) return <Result status="500" title="来源资料加载失败" subTitle="服务暂时不可用，请稍后重试。" extra={<Space><Button onClick={() => closeDetail()}>返回列表</Button><Button type="primary" onClick={() => void reloadDetail()}>重新加载</Button></Space>} />;

    return (
      <div className="source-library-page">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => closeDetail()}>返回来源资料库</Button>
              <Row justify="space-between" align="middle" gutter={[16, 12]}>
                <Col flex="auto">
                  <Space direction="vertical" size={4}>
                    <Space wrap><Title level={3} style={{ margin: 0 }}>{sourceTitle(selectedSource)}</Title><Tag color={statusColor(selectedSource.verificationStatus)}>{optionText(statusOptions, selectedSource.verificationStatus)}</Tag></Space>
                  </Space>
                </Col>
                <Col><Space wrap><TrackingLinkButton clanId={clanId} targetType="source" targetId={selectedSource.id} /><Button onClick={() => void reloadDetail()}>刷新</Button>{canBind ? <Button type="primary" onClick={openCreateReference}>新增引用</Button> : null}</Space></Col>
              </Row>
            </Space>
          </Card>
          {lastRevision ? <PageFeedback tone="success" title="引用变更已提交审核" description={lastRevision.diffSummary || '请在审核中心处理该变更。'} /> : null}
          <Card>
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
          </Card>
          <Card>
            <Tabs items={[
              {
                key: 'bindings',
                label: `引用关系（${bindingTotal || bindings.length}）`,
                children: <Space direction="vertical" style={{ width: '100%' }}>{!canBind ? <PageFeedback tone="info" title="当前账号仅可查看引用关系" /> : null}{bindingError ? <PageFeedback tone="error" title="引用关系加载失败" description={bindingError} action={<Button size="small" onClick={() => selectedSource.id && void loadBindings(selectedSource.id, bindingPage.pageNo, bindingPage.pageSize)}>重新加载</Button>} /> : null}<BindingTable clanId={clanId} rows={bindings} total={bindingTotal} pageNo={bindingPage.pageNo} pageSize={bindingPage.pageSize} loading={bindingLoading} canBind={canBind} onPageChange={(pageNo, pageSize) => selectedSource.id && void loadBindings(selectedSource.id, pageNo, pageSize)} onReplace={openReplaceReference} onDelete={submitDeleteReference} /></Space>
              },
              {
                key: 'attachments',
                label: `来源附件（${attachmentTotal}）`,
                children: <Space direction="vertical" style={{ width: '100%' }}>{attachmentError ? <PageFeedback tone="error" title="附件列表加载失败" description={attachmentError} action={<Button size="small" onClick={() => selectedSource.id && void loadAttachments(selectedSource.id, attachmentPage.pageNo, attachmentPage.pageSize)}>重新加载</Button>} /> : null}<Row justify="end"><Button type="primary" icon={<UploadOutlined />} disabled={!canUploadAttachment} onClick={openAttachmentModal}>上传附件</Button></Row>{!canUploadAttachment ? <PageFeedback tone="info" title="当前账号暂无附件上传权限" /> : null}<AttachmentTable rows={attachments} total={attachmentTotal} pageNo={attachmentPage.pageNo} pageSize={attachmentPage.pageSize} loading={attachmentLoading} canManage={canUploadAttachment} onPageChange={(pageNo, pageSize) => selectedSource.id && void loadAttachments(selectedSource.id, pageNo, pageSize)} onPreview={preview} onDownload={download} onDelete={removeAttachment} /></Space>
              }
            ]} />
          </Card>
        </Space>

        <Modal open={attachmentModalOpen} title="上传附件" width={600} confirmLoading={attachmentSubmitLoading} okText="上传" onOk={() => void uploadAttachment()} onCancel={() => !attachmentSubmitLoading && setAttachmentModalOpen(false)}>
          <Form form={attachmentForm} layout="vertical" initialValues={{ privacyLevel: 'clan_only', sensitiveLevel: 'normal' }}>
            {attachmentSubmitError ? <PageFeedback tone="error" title="附件上传失败" description={attachmentSubmitError} style={{ marginBottom: 16 }} /> : null}
            <Form.Item label="附件" required><Upload {...uploadProps}><Button icon={<UploadOutlined />}>选择文件</Button></Upload></Form.Item>
            <Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true, message: '请选择可见范围' }]}><Select options={privacyOptions} /></Form.Item>
            <Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true, message: '请选择敏感级别' }]}><Select options={sensitiveOptions} /></Form.Item>
          </Form>
        </Modal>

        <Modal open={bindingModalOpen} title={bindingMode === 'replace' ? '变更引用' : '新增引用'} confirmLoading={bindingSubmitLoading} onCancel={() => !bindingSubmitLoading && setBindingModalOpen(false)} onOk={() => bindingForm.submit()} okText="提交审核">
          <Form form={bindingForm} layout="vertical" onFinish={submitReferenceRevision}>
            {bindingSubmitError ? <PageFeedback tone="error" title="引用提交失败" description={bindingSubmitError} style={{ marginBottom: 12 }} /> : null}
            <PageFeedback tone="info" style={{ marginBottom: 12 }} title={bindingMode === 'replace' ? '变更引用提交后需审核通过才会生效，审核期间原引用继续有效。' : '新增引用提交后需审核通过才会正式生效。'} />
            <Form.Item name="targetType" label="引用对象类型" rules={[{ required: true, message: '请选择引用对象类型' }]}><Select options={bindingTargetTypeOptions} onChange={changeBindingTargetType} /></Form.Item>
            {bindingTargetType === 'generation_word' ? <Form.Item name="generationSchemeId" label="字辈方案"><Select allowClear showSearch optionFilterProp="label" loading={generationSchemeLoading} options={generationSchemeOptions.filter(item => item.value)} placeholder={generationSchemes.length ? '请选择已生效字辈方案' : '暂无已生效字辈方案'} onChange={changeGenerationScheme} /></Form.Item> : null}
            <Form.Item name="targetId" label="引用对象" rules={[{ required: true, message: '请选择引用对象' }]}><Select showSearch optionFilterProp="label" loading={bindingTargetType === 'generation_word' && generationWordLoading} options={targetOptions.filter(item => item.value)} placeholder={targetPlaceholder} disabled={bindingTargetType === 'generation_word' && !generationWordLoading && !generationWords.length} notFoundContent={bindingTargetType === 'generation_word' ? '请选择字辈方案后加载字辈明细' : '暂无可选对象'} /></Form.Item>
            <Form.Item name="bindingReason" label="引用说明"><Input.TextArea rows={2} placeholder="说明该来源为何能证明该对象" /></Form.Item>
            <Form.Item name="excerpt" label="来源摘录"><Input.TextArea rows={2} placeholder="摘录来源中与引用对象相关的内容" /></Form.Item>
            <Form.Item name="confidenceLevel" label="可信度"><Select options={confidenceOptions} /></Form.Item>
            <Form.Item name="changeReason" label="变更原因"><Input.TextArea rows={2} placeholder="说明为什么提交这次引用变更" /></Form.Item>
          </Form>
        </Modal>
      </div>
    );
  }

  const emptyContent = hasActiveSearch(search)
    ? <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="未找到符合当前条件的来源资料"><Button onClick={resetSearch}>重置筛选</Button></EmptyState>
    : <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="尚未录入来源资料，可先在资料库创建来源草稿，也可通过建谱向导完成首条主流程。"><Space><Button type="primary" icon={<PlusOutlined />} disabled={!clanId} onClick={openCreateSource}>新增来源</Button><Button onClick={() => window.location.assign('/?view=wizard')}>前往建谱向导</Button></Space></EmptyState>;

  return (
    <div className="source-library-page">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card className="source-library-query-card" title="来源资料查询">
          <Form form={sourceForm} layout="vertical" onFinish={submitSearch} initialValues={searchFormValues(search)}>
            <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} lg={8} xl={6}><Form.Item name="keyword" label="关键词"><Input allowClear placeholder="资料名、提供者、摘录" /></Form.Item></Col>
              <Col xs={24} sm={12} lg={8} xl={6}><Form.Item name="sourceType" label="类型"><Select allowClear options={sourceTypeOptions} /></Form.Item></Col>
              <Col xs={24} sm={12} lg={8} xl={6}><Form.Item name="verificationStatus" label="状态"><Select allowClear options={statusOptions} /></Form.Item></Col>
              <Col xs={24} sm={12} lg={8} xl={6}><Form.Item name="privacyLevel" label="可见范围"><Select allowClear options={privacyOptions} /></Form.Item></Col>
              <Col xs={24} sm={12} lg={8} xl={6}><Form.Item name="hasAttachment" label="附件"><Select allowClear options={[{ value: 'true', label: '有附件' }, { value: 'false', label: '无附件' }]} /></Form.Item></Col>
              <Col xs={24} sm={12} lg={8} xl={6}><Form.Item name="hasBinding" label="引用"><Select allowClear options={[{ value: 'true', label: '有引用' }, { value: 'false', label: '无引用' }]} /></Form.Item></Col>
            </Row>
            <Row justify="end"><Col><Space><Button onClick={resetSearch} disabled={loading}>重置</Button><Button type="primary" htmlType="submit" loading={loading}>查询</Button></Space></Col></Row>
          </Form>
        </Card>
        <Card title={`来源资料（共 ${sourceTotal} 条）`} extra={<Space><Tooltip title={!clanId ? '请先选择宗族' : '新增来源草稿'}><span><Button type="primary" icon={<PlusOutlined />} disabled={!clanId} onClick={openCreateSource}>新增来源</Button></span></Tooltip><Tooltip title="刷新"><Button icon={<ReloadOutlined />} aria-label="刷新来源列表" loading={loading} onClick={() => void loadSources(search, true)} /></Tooltip></Space>}>
          {listError ? <PageFeedback tone="error" title={listStale ? '数据刷新失败，当前展示上次结果' : '来源资料加载失败'} description={listError} action={<Button size="small" onClick={() => void loadSources(search, true)}>重新加载</Button>} style={{ marginBottom: 12 }} /> : null}
          {!listLoaded && loading ? <Space direction="vertical" align="center" style={{ width: '100%', padding: 48 }}><Spin /><InlineFeedback tone="info" title="正在加载来源资料…" /></Space> : (
            <Table<SourceRecord>
              rowKey={(row, index) => String(row.id || index)}
              size="small"
              loading={loading && listLoaded}
              dataSource={sources}
              scroll={{ x: 1180 }}
              locale={{ emptyText: emptyContent }}
              pagination={{
                current: search.pageNo || 1,
                pageSize: search.pageSize || 10,
                total: sourceTotal,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                showTotal: value => `共 ${value} 条`,
                onChange: (pageNo, pageSize) => {
                  const next = { ...search, pageNo, pageSize };
                  setSearch(next);
                  writeSearchToUrl(next);
                  void loadSources(next);
                }
              }}
              columns={[
                { title: '来源资料', width: 300, fixed: 'left', render: (_value, row) => <Space direction="vertical" size={0}><Button type="link" style={{ padding: 0, height: 'auto' }} onClick={() => openDetail(row)}>{sourceTitle(row)}</Button><Text type="secondary" ellipsis={{ tooltip: sourceSummary(row) }}>{sourceSummary(row) || '暂无摘要信息'}</Text></Space> },
                { title: '类型', width: 120, render: (_value, row) => <Tag>{optionText(sourceTypeOptions, row.sourceType)}</Tag> },
                { title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row.verificationStatus)}>{optionText(statusOptions, row.verificationStatus)}</Tag> },
                { title: '可信度', width: 90, render: (_value, row) => optionText(confidenceOptions, row.confidenceLevel) },
                { title: '可见范围', width: 120, render: (_value, row) => optionText(privacyOptions, row.privacyLevel) },
                { title: '引用', width: 90, render: (_value, row) => `${row.bindingCount || 0} 条` },
                { title: '附件', width: 90, render: (_value, row) => `${row.attachmentCount || 0} 个` },
                { title: '最近更新', width: 180, render: (_value, row) => <Tooltip title={row.updatedAt || row.createdAt || '待维护'}><span>{formatDateTime(row.updatedAt || row.createdAt)}</span></Tooltip> },
                { title: '操作', width: 90, fixed: 'right', render: (_value, row) => <Button type="link" size="small" onClick={() => openDetail(row)}>查看</Button> }
              ]}
            />
          )}
        </Card>
      </Space>
      <Drawer
        title="新增来源"
        width={720}
        open={createDrawerOpen}
        destroyOnHidden
        onClose={() => !createSubmitLoading && setCreateDrawerOpen(false)}
        extra={<Space><Button disabled={createSubmitLoading} onClick={() => setCreateDrawerOpen(false)}>取消</Button><Button loading={createSubmitLoading} onClick={() => void submitCreateSource(false)}>保存草稿</Button><Button type="primary" loading={createSubmitLoading} onClick={() => void submitCreateSource(true)}>保存并提交审核</Button></Space>}
      >
        <Form form={createForm} layout="vertical" initialValues={{ sourceType: 'genealogy_book', confidenceLevel: 'unknown', privacyLevel: 'clan_only', sensitiveLevel: 'normal' }}>
          {createSubmitError ? <PageFeedback tone="error" title="来源创建失败" description={createSubmitError} style={{ marginBottom: 16 }} /> : null}
          <PageFeedback tone="info" title="新增来源默认保存为草稿；提交审核通过后才能作为正式证据。" style={{ marginBottom: 16 }} />
          <Row gutter={16}>
            <Col xs={24} md={12}><Form.Item name="sourceName" label="来源名称" rules={[{ required: true, whitespace: true, message: '请输入来源名称' }]}><Input maxLength={200} placeholder="例如：张氏族谱卷一" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="sourceType" label="来源类型" rules={[{ required: true, message: '请选择来源类型' }]}><Select options={sourceTypeOptions} /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="providerName" label="提供者"><Input maxLength={100} placeholder="例如：修谱委员会、采集员姓名" /></Form.Item></Col>
            <Col xs={24} md={12}><Form.Item name="bookTitle" label="书名/题名"><Input maxLength={200} placeholder="例如：张氏族谱" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="volumeNo" label="卷册"><Input maxLength={50} placeholder="例如：卷一" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="pageNo" label="页码"><Input maxLength={50} placeholder="例如：12" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="sourceDate" label="来源年代"><Input maxLength={100} placeholder="例如：清光绪年间" /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="confidenceLevel" label="可信度"><Select options={confidenceOptions} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="privacyLevel" label="可见范围" rules={[{ required: true, message: '请选择可见范围' }]}><Select options={privacyOptions} /></Form.Item></Col>
            <Col xs={24} md={8}><Form.Item name="sensitiveLevel" label="敏感级别" rules={[{ required: true, message: '请选择敏感级别' }]}><Select options={sensitiveOptions} /></Form.Item></Col>
          </Row>
          <Form.Item name="excerpt" label="原文摘录"><Input.TextArea rows={4} maxLength={2000} showCount placeholder="摘录与人物、关系或支派相关的原文内容" /></Form.Item>
          <Form.Item name="description" label="资料说明"><Input.TextArea rows={3} maxLength={1000} showCount placeholder="说明资料来源、采集背景或可信度判断依据" /></Form.Item>
        </Form>
      </Drawer>
    </div>
  );
}

function BindingTable({ clanId, rows, total, pageNo, pageSize, loading, canBind, onPageChange, onReplace, onDelete }: {
  clanId: string;
  rows: SourceBindingSummary[];
  total: number;
  pageNo: number;
  pageSize: number;
  loading: boolean;
  canBind: boolean;
  onPageChange: (pageNo: number, pageSize: number) => void;
  onReplace: (row: SourceBindingSummary) => void;
  onDelete: (row: SourceBindingSummary) => void;
}) {
  const columns: any[] = [
    { title: '引用对象类型', width: 120, render: (_value: unknown, row: SourceBindingSummary) => <Tag>{bindingTargetTypeText(row.targetType)}</Tag> },
    { title: '引用对象', render: (_value: unknown, row: SourceBindingSummary) => <Space direction="vertical" size={0}><Text strong>{row.targetDisplayName || '待维护对象名称'}</Text><Text type="secondary">{row.targetBranchName || row.targetSummary || '暂无对象摘要'}</Text></Space> },
    { title: '引用说明', render: (_value: unknown, row: SourceBindingSummary) => row.bindingReason || '待维护' },
    { title: '可信度', width: 90, render: (_value: unknown, row: SourceBindingSummary) => optionText(confidenceOptions, row.confidenceLevel) },
    { title: '状态', width: 130, render: (_value: unknown, row: SourceBindingSummary) => <Space direction="vertical" size={0}><Tag color={statusColor(row.bindingStatus)}>{optionText(statusOptions, row.bindingStatus) || '正式'}</Tag>{row.hasPendingRevision ? <Tag color="processing">{pendingReferenceChangeText(row.pendingChangeType)}</Tag> : null}</Space> },
    { title: '创建时间', width: 170, render: (_value: unknown, row: SourceBindingSummary) => formatDateTime(row.createdAt) }
  ];
  if (canBind) columns.push({
    title: '操作', width: 220, fixed: 'right', render: (_value: unknown, row: SourceBindingSummary) => {
      const bindingStatus = String(row.bindingStatus || '').toLowerCase();
      const disabled = bindingStatus !== 'official' || Boolean(row.hasPendingRevision);
      return <Space size="small">
        <TrackingLinkButton size="small" type="link" clanId={clanId} targetType={row.targetType} targetId={row.targetId} />
        <Tooltip title={disabled ? (row.hasPendingRevision ? '已有待审核变更，不能重复提交' : '当前引用状态不可变更') : undefined}><span><Button size="small" type="link" disabled={disabled} onClick={() => onReplace(row)}>变更</Button></span></Tooltip>
        <Dropdown trigger={['click']} menu={{ items: [{ key: 'delete', label: '解除引用', danger: true, disabled, onClick: () => confirmAction({ title: '提交解除引用审核', content: '解除引用不会立即生效，审核通过后该引用将归档。', okText: '提交审核', okType: 'danger', onOk: () => onDelete(row) }) }] }}><Button type="text" size="small" icon={<MoreOutlined />} aria-label="更多引用操作" /></Dropdown>
      </Space>;
    }
  });
  return <Table<SourceBindingSummary> size="small" rowKey={(row, index) => String(row.id || index)} dataSource={rows} loading={loading} pagination={{ current: pageNo, pageSize, total, showSizeChanger: false, showTotal: value => `共 ${value} 条引用`, onChange: onPageChange }} scroll={{ x: 980 }} locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无引用记录" /> }} columns={columns} />;
}

function AttachmentTable({ rows, total, pageNo, pageSize, loading, canManage, onPageChange, onPreview, onDownload, onDelete }: {
  rows: SourceAttachmentRecord[];
  total: number;
  pageNo: number;
  pageSize: number;
  loading: boolean;
  canManage: boolean;
  onPageChange: (pageNo: number, pageSize: number) => void;
  onPreview: (row: SourceAttachmentRecord) => void;
  onDownload: (row: SourceAttachmentRecord) => void;
  onDelete: (row: SourceAttachmentRecord) => void;
}) {
  return <Table<SourceAttachmentRecord>
    size="small"
    rowKey={(row, index) => String(row.id || index)}
    dataSource={rows}
    loading={loading}
    scroll={{ x: 900 }}
    pagination={{ current: pageNo, pageSize, total, showSizeChanger: true, pageSizeOptions: [10, 20, 50], showTotal: value => `共 ${value} 个附件`, onChange: onPageChange }}
    locale={{ emptyText: <EmptyState image={EmptyState.PRESENTED_IMAGE_SIMPLE} description="暂无附件" /> }}
    columns={[
      { title: '文件名', render: (_value, row) => row.fileName || '未命名附件' },
      { title: '类型', width: 120, render: (_value, row) => row.fileType || '待维护' },
      { title: '大小', width: 90, render: (_value, row) => fileSizeText(row.fileSize) },
      { title: '敏感级别', width: 100, render: (_value, row) => <Tag>{optionText(sensitiveOptions, row.sensitiveLevel)}</Tag> },
      { title: '上传状态', width: 100, render: (_value, row) => <Tag color={statusColor(row.uploadStatus)}>{uploadStatusText(row.uploadStatus)}</Tag> },
      { title: '上传时间', width: 170, render: (_value, row) => formatDateTime(row.uploadedAt) },
      { title: '操作', width: 190, fixed: 'right', render: (_value, row) => <Space size="small">
        <Tooltip title={row.previewAllowed ? '预览附件' : '该附件格式或权限不支持在线预览'}><span><Button size="small" type="link" disabled={!row.previewAllowed} onClick={() => onPreview(row)}>预览</Button></span></Tooltip>
        <Tooltip title={row.downloadAllowed ? '下载附件' : '您没有下载该附件的权限'}><span><Button size="small" type="link" disabled={!row.downloadAllowed} onClick={() => onDownload(row)}>下载</Button></span></Tooltip>
        {canManage ? <Dropdown trigger={['click']} menu={{ items: [{ key: 'delete', label: '删除附件', danger: true, onClick: () => confirmAction({ title: '删除附件', content: `确认删除附件“${row.fileName || '当前附件'}”吗？`, okType: 'danger', okText: '删除', onOk: () => onDelete(row) }) }] }}><Button type="text" size="small" icon={<MoreOutlined />} aria-label="更多附件操作" /></Dropdown> : null}
      </Space> }
    ]}
  />;
}
