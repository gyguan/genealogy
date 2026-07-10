import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Descriptions, Drawer, Space, Steps, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

type FocusSource = {
  id?: number | string;
  sourceName?: string;
  sourceTitle?: string;
  title?: string;
  sourceType?: string;
  materialType?: string;
  author?: string;
  compiler?: string;
  publishYear?: number | string;
  archiveLocation?: string;
  status?: string;
  verificationStatus?: string;
};

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function sourceTitle(source?: FocusSource | null) {
  return display(source?.sourceName || source?.sourceTitle || source?.title, '未命名来源');
}

function sourceTypeText(value?: string) {
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

function statusText(source?: FocusSource | null) {
  const status = String(source?.verificationStatus || source?.status || '').trim().toLowerCase();
  const dict: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    verified: '已核验',
    official: '正式',
    active: '正式',
    rejected: '已驳回',
    archived: '已归档'
  };
  return dict[status] || (status ? '未知状态' : '待维护');
}

function statusColor(source?: FocusSource | null) {
  const status = String(source?.verificationStatus || source?.status || '').trim().toLowerCase();
  if (['verified', 'official', 'active'].includes(status)) return 'success';
  if (['pending', 'pending_review'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}

export function SourceLibraryFocusBridge() {
  const workspace = useWorkspace();
  const [source, setSource] = useState<FocusSource | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const handledSourceIdRef = useRef('');

  const isMissingSourceIntent = workspace.sourceFocusReason === 'missing_source';
  const hasFocus = Boolean(workspace.sourceId || workspace.sourceFocusReason);

  useEffect(() => {
    const sourceId = String(workspace.sourceId || '').trim();
    if (!sourceId || handledSourceIdRef.current === sourceId) return;
    handledSourceIdRef.current = sourceId;
    setLoading(true);
    apiClient.get(`/sources/${sourceId}`)
      .then(data => {
        setSource(data as FocusSource);
        setOpen(true);
      })
      .catch(error => message.error((error as Error).message || '加载工作台定位来源失败'))
      .finally(() => setLoading(false));
  }, [workspace.sourceId]);

  function clearFocus() {
    workspace.patch({ sourceId: '', sourceFocusReason: '' });
    handledSourceIdRef.current = '';
    setSource(null);
    setOpen(false);
  }

  if (!hasFocus) return null;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 12 }}>
      <Alert
        type={isMissingSourceIntent ? 'warning' : 'info'}
        showIcon
        message={isMissingSourceIntent ? '来自工作台：缺来源处理' : '来自工作台：来源资料定位'}
        description={workspace.sourceId ? `已带入来源资料定位对象：${source ? sourceTitle(source) : `来源 ${workspace.sourceId}`}。` : '当前任务没有具体来源资料，需要先新增资料，再绑定到人物、关系或支派等业务对象。'}
        action={<Button size="small" onClick={clearFocus}>清除定位</Button>}
      />
      {workspace.sourceId ? null : (
        <Card size="small" title="新增资料 / 绑定来源引导">
          <Steps
            size="small"
            current={0}
            items={[
              { title: '新增来源资料', description: '维护老谱、地方志、照片、口述等来源资料。' },
              { title: '上传或补充附件', description: '如有扫描件、照片或原文摘录，可继续补充附件。' },
              { title: '绑定业务对象', description: '把来源绑定到人物、关系、支派或字辈方案，支撑后续审核。' }
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            该引导只说明处理路径，不自动创建来源、不自动绑定对象，也不绕过审核流程。
          </Typography.Paragraph>
        </Card>
      )}
      <Drawer
        title="来源资料定位"
        width={560}
        open={open}
        onClose={() => setOpen(false)}
        extra={<Space><Button onClick={clearFocus}>清除定位</Button><Button onClick={() => setOpen(false)}>关闭</Button></Space>}
      >
        {source ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={statusColor(source)}>{statusText(source)}</Tag>
              <Tag>{sourceTypeText(source.sourceType || source.materialType)}</Tag>
            </Space>
            <Typography.Title level={4} style={{ margin: 0 }}>{sourceTitle(source)}</Typography.Title>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="来源名称">{sourceTitle(source)}</Descriptions.Item>
              <Descriptions.Item label="来源类型">{sourceTypeText(source.sourceType || source.materialType)}</Descriptions.Item>
              <Descriptions.Item label="作者 / 编修人">{display(source.author || source.compiler, '待维护')}</Descriptions.Item>
              <Descriptions.Item label="出版年份">{display(source.publishYear, '待维护')}</Descriptions.Item>
              <Descriptions.Item label="馆藏 / 存放位置">{display(source.archiveLocation, '待维护')}</Descriptions.Item>
              <Descriptions.Item label="状态">{statusText(source)}</Descriptions.Item>
            </Descriptions>
            <Alert type="success" showIcon message="交付体验" description="当前弹窗来自工作台上下文定位，只做只读查看，不影响来源资料库原有维护流程。" />
          </Space>
        ) : (
          <Alert type={loading ? 'info' : 'warning'} showIcon message={loading ? '正在定位来源资料' : '暂无来源详情'} description={loading ? '系统正在根据工作台传入的来源 ID 加载详情。' : '未能获取来源详情，请在来源资料库中重新检索。'} />
        )}
      </Drawer>
    </Space>
  );
}
