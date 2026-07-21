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

  const deleteObject = useMemo(() => {
    const source = detail?.source;
    const draft = objectLifecycleStatus(source) === 'draft';
    return source ? {
      ...source,
      allowedActions: draft && detail?.permissions?.canDelete ? ['delete'] : []
    } : undefined;
  }, [detail]);

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
  if (!deleteObject?.allowedActions.length) return null;

  return (
    <Card
      size="small"
      title="草稿来源操作"
      extra={
        <DraftDeleteButton
          object={deleteObject}
          objectName={sourceName(detail)}
          objectType="来源资料"
          onDelete={() => deleteSource(sourceId)}
          onDeleted={afterDeleted}
          label="删除草稿"
          buttonProps={{ size: 'small' }}
        />
      }
      style={{ marginBottom: 12 }}
    >
      <Alert type="warning" showIcon message={`当前打开的是草稿来源“${sourceName(detail)}”，可在未提交审核前直接删除。`} />
    </Card>
  );
}
