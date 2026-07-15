import { useEffect, useRef, useState } from 'react';
import { Alert, Card, Empty, Modal, Result, Space, message } from 'antd';
import type {
  CultureItemCreateRequest,
  CultureItemDetailResponse,
  CultureItemPage,
  CultureItemSummaryResponse,
  CultureItemUpdateRequest
} from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { ApiRequestError } from '../../shared/api/client';
import { CultureActionModals } from './CultureActionModals';
import { CultureItemDetailDrawer } from './CultureItemDetailDrawer';
import { CultureItemFormModal } from './CultureItemFormModal';
import { CultureItemTable } from './CultureItemTable';
import { CultureSearchPanel } from './CultureSearchPanel';
import {
  archiveCultureItem,
  createCultureItem,
  deleteCultureItem,
  downloadCultureAttachment,
  getCultureItem,
  getCultureTrace,
  listCultureBranches,
  listCultureItems,
  previewCultureAttachment,
  submitCultureItemReview,
  updateCultureItem
} from './cultureLibraryService';
import type { CultureBranchOption } from './cultureLibraryService';
import { buildCultureLocation, cultureSearchKey, readCultureLocation } from './cultureUrlState';
import type { CultureSearchState } from './cultureUrlState';

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function forbidden(error: unknown) {
  return error instanceof ApiRequestError && error.status === 403;
}

export function CultureItemTab({ clanId }: { clanId: string }) {
  const initialLocation = useRef(readCultureLocation()).current;
  const previousClanId = useRef(clanId);
  const [messageApi, messageContext] = message.useMessage();
  const [modalApi, modalContext] = Modal.useModal();
  const [search, setSearch] = useState<CultureSearchState>(initialLocation.search);
  const [selectedItemId, setSelectedItemId] = useState<number | undefined>(initialLocation.selectedItemId);
  const [branches, setBranches] = useState<CultureBranchOption[]>([]);
  const [items, setItems] = useState<CultureItemSummaryResponse[]>([]);
  const [page, setPage] = useState<CultureItemPage['page']>({ pageNo: 1, pageSize: 10, totalElements: 0, totalPages: 0 });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [listForbidden, setListForbidden] = useState(false);
  const [detail, setDetail] = useState<CultureItemDetailResponse | null>(null);
  const [trace, setTrace] = useState<TrackingTraceDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [traceError, setTraceError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formItem, setFormItem] = useState<CultureItemDetailResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<CultureItemSummaryResponse | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<CultureItemSummaryResponse | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);

  function writeLocation(nextSearch: CultureSearchState, nextSelected?: number, mode: 'push' | 'replace' = 'push') {
    const href = buildCultureLocation(window.location.href, nextSearch, nextSelected);
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](window.history.state, '', href);
  }

  function refresh() {
    setRefreshVersion(value => value + 1);
  }

  useEffect(() => {
    const onPopState = () => {
      const next = readCultureLocation();
      setSearch(next.search);
      setSelectedItemId(next.selectedItemId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (previousClanId.current === clanId) return;
    previousClanId.current = clanId;
    const nextSearch = { ...search, branchId: undefined, pageNo: 1 };
    setSearch(nextSearch);
    setSelectedItemId(undefined);
    setDetail(null);
    setTrace(null);
    writeLocation(nextSearch, undefined, 'replace');
  }, [clanId]);

  useEffect(() => {
    if (!clanId) {
      setBranches([]);
      return;
    }
    let active = true;
    listCultureBranches(clanId)
      .then(rows => { if (active) setBranches(rows); })
      .catch(error => { if (active) { setBranches([]); messageApi.error(errorText(error, '支派列表加载失败')); } });
    return () => { active = false; };
  }, [clanId]);

  useEffect(() => {
    if (!clanId) {
      listRequest.current += 1;
      setItems([]);
      setPage({ pageNo: search.pageNo, pageSize: search.pageSize, totalElements: 0, totalPages: 0 });
      return;
    }
    const requestId = ++listRequest.current;
    const requestKey = cultureSearchKey(clanId, search);
    setListLoading(true);
    setListError('');
    setListForbidden(false);
    listCultureItems(clanId, search)
      .then(data => {
        if (requestId !== listRequest.current || requestKey !== cultureSearchKey(clanId, search)) return;
        setItems(data.items);
        setPage(data.page);
      })
      .catch(error => {
        if (requestId !== listRequest.current) return;
        setListError(errorText(error, '文化资料列表加载失败'));
        setListForbidden(forbidden(error));
        setItems([]);
        setPage({ pageNo: search.pageNo, pageSize: search.pageSize, totalElements: 0, totalPages: 0 });
      })
      .finally(() => { if (requestId === listRequest.current) setListLoading(false); });
  }, [clanId, search, refreshVersion]);

  useEffect(() => {
    if (!clanId || !selectedItemId) {
      detailRequest.current += 1;
      setDetail(null);
      setTrace(null);
      setTraceError('');
      return;
    }
    const requestId = ++detailRequest.current;
    setDetail(null);
    setTrace(null);
    setTraceError('');
    setDetailLoading(true);
    Promise.allSettled([getCultureItem(selectedItemId), getCultureTrace(clanId, selectedItemId)])
      .then(([detailResult, traceResult]) => {
        if (requestId !== detailRequest.current) return;
        if (detailResult.status === 'fulfilled') setDetail(detailResult.value);
        else messageApi.error(errorText(detailResult.reason, '文化资料详情加载失败'));
        if (traceResult.status === 'fulfilled') setTrace(traceResult.value);
        else setTraceError(errorText(traceResult.reason, '暂无权限查看完整追踪或追踪服务暂不可用'));
      })
      .finally(() => { if (requestId === detailRequest.current) setDetailLoading(false); });
  }, [clanId, selectedItemId, refreshVersion]);

  function changeSearch(nextSearch: CultureSearchState) {
    setSearch(nextSearch);
    setSelectedItemId(undefined);
    writeLocation(nextSearch, undefined);
  }

  function openItem(itemOrId: CultureItemSummaryResponse | number) {
    const id = typeof itemOrId === 'number' ? itemOrId : itemOrId.id;
    setSelectedItemId(id);
    writeLocation(search, id);
  }

  function closeDetail() {
    setSelectedItemId(undefined);
    setDetail(null);
    setTrace(null);
    writeLocation(search, undefined, 'replace');
  }

  async function openEdit(item: CultureItemSummaryResponse | CultureItemDetailResponse) {
    try {
      setActionLoading(true);
      const nextDetail = detail?.id === item.id ? detail : await getCultureItem(item.id);
      setFormItem(nextDetail);
      setFormOpen(true);
    } catch (error) {
      messageApi.error(errorText(error, '文化资料加载失败，无法编辑'));
    } finally {
      setActionLoading(false);
    }
  }

  async function saveItem(values: CultureItemCreateRequest | CultureItemUpdateRequest) {
    if (!clanId) return;
    setSaving(true);
    try {
      const officialChange = formItem?.dataStatus === 'official';
      const saved = formItem
        ? await updateCultureItem(formItem.id, values as CultureItemUpdateRequest)
        : await createCultureItem(clanId, values as CultureItemCreateRequest);
      setFormOpen(false);
      setFormItem(null);
      setSelectedItemId(saved.id);
      writeLocation(search, saved.id, 'replace');
      messageApi.success(officialChange ? '正式资料变更申请已提交审核' : '文化资料已保存为草稿');
      refresh();
    } catch (error) {
      messageApi.error(errorText(error, '文化资料保存失败'));
      throw error;
    } finally {
      setSaving(false);
    }
  }

  async function confirmReview() {
    if (!reviewTarget || actionLoading) return;
    setActionLoading(true);
    try {
      const result = await submitCultureItemReview(reviewTarget.id, { comment: reviewComment.trim() || undefined });
      messageApi.success(result.message || '文化资料已提交审核');
      setReviewTarget(null);
      setReviewComment('');
      refresh();
    } catch (error) {
      messageApi.error(errorText(error, '提交审核失败'));
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmArchive() {
    if (!archiveTarget || actionLoading) return;
    const reason = archiveReason.trim();
    if (!reason) {
      messageApi.warning('请填写归档原因');
      return;
    }
    setActionLoading(true);
    try {
      const result = await archiveCultureItem(archiveTarget.id, { reason });
      messageApi.success(result.message || '归档操作已提交');
      setArchiveTarget(null);
      setArchiveReason('');
      refresh();
    } catch (error) {
      messageApi.error(errorText(error, '归档失败'));
    } finally {
      setActionLoading(false);
    }
  }

  function confirmDelete(item: CultureItemSummaryResponse) {
    const reviewRequired = item.allowedActions.includes('request_delete');
    modalApi.confirm({
      title: reviewRequired ? `申请删除“${item.title}”` : `删除“${item.title}”`,
      content: reviewRequired ? '正式资料不会立即删除，将创建删除审核申请。' : '草稿或驳回资料删除后将无法继续维护。',
      okText: reviewRequired ? '提交删除申请' : '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        setActionLoading(true);
        try {
          const result = await deleteCultureItem(item.id);
          messageApi.success(result.message || '删除操作已完成');
          if (!reviewRequired && selectedItemId === item.id) closeDetail();
          refresh();
        } catch (error) {
          messageApi.error(errorText(error, '删除失败'));
          throw error;
        } finally {
          setActionLoading(false);
        }
      }
    });
  }

  async function previewAttachment(attachmentId: number) {
    try {
      const blob = await previewCultureAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      messageApi.error(errorText(error, '附件预览失败'));
    }
  }

  async function downloadAttachment(attachmentId: number, fileName: string) {
    try {
      const blob = await downloadCultureAttachment(attachmentId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      messageApi.error(errorText(error, '附件下载失败'));
    }
  }

  const selectedSummary = detail || items.find(item => item.id === selectedItemId) || null;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {messageContext}{modalContext}
      <CultureSearchPanel
        branches={branches}
        clanId={clanId}
        search={search}
        loading={listLoading}
        onSearch={changeSearch}
        onCreate={() => { setFormItem(null); setFormOpen(true); }}
      />

      <Card title="文化资料列表">
        {!clanId ? <Empty description="请选择宗族后浏览文化资料" /> : null}
        {clanId && listForbidden ? <Result status="403" title="暂无权限" subTitle={listError || '当前账号无权查看该宗族文化资料'} /> : null}
        {clanId && listError && !listForbidden ? <Alert type="error" showIcon message="文化资料列表加载失败" description={listError} style={{ marginBottom: 12 }} /> : null}
        {clanId && !listForbidden ? (
          <CultureItemTable
            items={items}
            total={page.totalElements}
            pageNo={page.pageNo}
            pageSize={page.pageSize}
            loading={listLoading}
            onPageChange={(pageNo, pageSize) => changeSearch({ ...search, pageNo, pageSize })}
            onOpen={openItem}
            onEdit={openEdit}
            onSubmitReview={item => { setReviewTarget(item); setReviewComment(''); }}
            onArchive={item => { setArchiveTarget(item); setArchiveReason(''); }}
            onDelete={confirmDelete}
          />
        ) : null}
      </Card>

      <CultureItemDetailDrawer
        open={Boolean(selectedItemId)}
        clanId={clanId}
        item={detail}
        trace={trace}
        loading={detailLoading}
        traceError={traceError}
        actionLoading={actionLoading}
        onClose={closeDetail}
        onEdit={() => detail && void openEdit(detail)}
        onSubmitReview={() => selectedSummary && setReviewTarget(selectedSummary)}
        onArchive={() => selectedSummary && setArchiveTarget(selectedSummary)}
        onDelete={() => selectedSummary && confirmDelete(selectedSummary)}
        onPreviewAttachment={(id) => void previewAttachment(id)}
        onDownloadAttachment={(id, fileName) => void downloadAttachment(id, fileName)}
      />

      <CultureItemFormModal
        open={formOpen}
        item={formItem}
        branches={branches}
        saving={saving}
        onCancel={() => { if (!saving) { setFormOpen(false); setFormItem(null); } }}
        onSubmit={saveItem}
      />

      <CultureActionModals
        reviewTarget={reviewTarget}
        reviewComment={reviewComment}
        archiveTarget={archiveTarget}
        archiveReason={archiveReason}
        loading={actionLoading}
        onReviewCommentChange={setReviewComment}
        onArchiveReasonChange={setArchiveReason}
        onCancelReview={() => { if (!actionLoading) setReviewTarget(null); }}
        onConfirmReview={() => void confirmReview()}
        onCancelArchive={() => { if (!actionLoading) setArchiveTarget(null); }}
        onConfirmArchive={() => void confirmArchive()}
      />
    </Space>
  );
}
