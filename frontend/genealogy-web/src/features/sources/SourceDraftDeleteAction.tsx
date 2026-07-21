import { Alert, Card, Skeleton } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { objectLifecycleStatus } from '../../shared/domain/draftDeleteModel';
import { DraftDeleteButton } from '../../shared/ui/DraftDeleteButton';
import { deleteSource, getSourceDetail, type SourceDetail } from './sourceLibraryService';

type Props = { notify?: (data: unknown, error?: boolean) => void };

function sourceIdFromLocation() {
  const value = Number(new URLSearchParams(window.location.search).get('sourceId'));
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function sourceName(detail: SourceDetail | null) {
  return detail?.source?.sourceName || detail?.source?.bookTitle || '未命名来源';
}

function sourceDependencyCounts(detail: SourceDetail | null) {
  const bindingCount = Number(detail?.source?.bindingCount ?? detail?.bindingSummaries?.length ?? 0);
  const attachmentCount = Number(detail?.source?.attachmentCount ?? detail?.attachmentSummaries?.length ?? 0);
  return {
    bindingCount: Number.isFinite(bindingCount) ? Math.max(0, bindingCount) : 0,
    attachmentCount: Number.isFinite(attachmentCount) ? Math.max(0, attachmentCount) : 0
  };
}

export function SourceDraftDeleteAction({ notify }: Props) {
  const workspace = useWorkspace();
  const sourceId = Number(workspace.sourceId || sourceIdFromLocation() || 0) || undefined;
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    if (!sourceId) {
      setDetail(null);
      setLoadError('');
      return () => { active = false; };
    }
    setDetail(null);
    setLoading(true);
    setLoadError('');
    getSourceDetail(sourceId)
      .then(value => { if (active) setDetail(value); })
      .catch(error => { if (active) setLoadError((error as Error).message || '来源删除权限加载失败'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sourceId]);

  const dependencyCounts = useMemo(() => sourceDependencyCounts(detail), [detail]);
  const deleteObject = useMemo(() => {
    const source = detail?.source;
    const draft = objectLifecycleStatus(source) === 'draft';
    const dependencyFree = dependencyCounts.bindingCount === 0 && dependencyCounts.attachmentCount === 0;
    return source ? {
      ...source,
      allowedActions: draft && dependencyFree && detail?.permissions?.canDelete ? ['delete'] : []
    } : undefined;
  }, [dependencyCounts, detail]);

  async function afterDeleted() {
    const url = new URL(window.location.href);
    url.searchParams.delete('sourceId');
    workspace.setSourceId('');
    setDetail(null);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    notify?.({ message: '草稿来源已删除，列表已刷新。' });
  }

  if (!sourceId) return null;
  if (loading && !detail) return <Card size="small" style={{ marginBottom: 12 }}><Skeleton active paragraph={{ rows: 1 }} /></Card>;
  if (loadError) return <Alert type="warning" showIcon message="来源删除操作暂不可用" description={loadError} style={{ marginBottom: 12 }} />;

  const isDraft = objectLifecycleStatus(detail?.source) === 'draft';
  const canDelete = Boolean(detail?.permissions?.canDelete);
  const hasDependencies = dependencyCounts.bindingCount > 0 || dependencyCounts.attachmentCount > 0;
  if (!isDraft || !canDelete) return null;

  return (
    <Card
      size="small"
      title="草稿来源操作"
      extra={deleteObject?.allowedActions.length ? (
        <DraftDeleteButton
          object={deleteObject}
          objectName={sourceName(detail)}
          objectType="来源资料"
          onDelete={() => deleteSource(sourceId)}
          onDeleted={afterDeleted}
          label="删除草稿"
          buttonProps={{ size: 'small' }}
        />
      ) : null}
      style={{ marginBottom: 12 }}
    >
      {hasDependencies ? (
        <Alert
          type="warning"
          showIcon
          message={`草稿来源“${sourceName(detail)}”暂不能删除`}
          description={`请先处理 ${dependencyCounts.bindingCount} 条引用和 ${dependencyCounts.attachmentCount} 个附件；后端仍会执行最终依赖校验。`}
        />
      ) : (
        <Alert type="warning" showIcon message={`当前打开的是草稿来源“${sourceName(detail)}”，可在未提交审核前直接删除。`} />
      )}
    </Card>
  );
}
