import { useEffect, useState } from 'react';
import { Button, Card, Empty, Popconfirm, Space, Table, Tag, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { sourceAttachmentService } from '../../shared/services/sourceAttachmentService';
import { toRecordList } from '../../shared/ui/DataTable';

type Props = { notify: (data: unknown, error?: boolean) => void };

type Attachment = {
  id?: number;
  sourceId?: number;
  clanId?: number;
  originalFilename?: string;
  contentType?: string;
  fileSize?: number;
  storagePath?: string;
  checksum?: string;
  uploadStatus?: string;
  createdAt?: string;
};

function fileSizeText(value?: number) {
  if (!value) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function uploadStatusText(value?: string) {
  const status = String(value || '').toLowerCase();
  const dict: Record<string, string> = { uploaded: '已上传', success: '已上传', failed: '上传失败', processing: '处理中' };
  return dict[status] || value || '待维护';
}

function uploadStatusColor(value?: string) {
  const status = String(value || '').toLowerCase();
  if (['uploaded', 'success'].includes(status)) return 'success';
  if (status === 'failed') return 'error';
  if (status === 'processing') return 'processing';
  return 'default';
}

export function SourceAttachmentPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAttachments() {
    if (!workspace.sourceId) return;
    const data = await sourceAttachmentService.listBySource(workspace.sourceId);
    setAttachments(toRecordList<Attachment>(data));
  }

  useEffect(() => { if (workspace.sourceId) void loadAttachments(); }, [workspace.sourceId]);

  async function upload() {
    if (loading) return;
    if (!workspace.sourceId) { notify({ message: '请先在来源资料库中选择来源资料' }, true); return; }
    if (!file) { notify({ message: '请选择要上传的附件' }, true); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await sourceAttachmentService.uploadToSource(workspace.sourceId, formData);
      notify({ message: '附件上传成功' });
      setFile(null);
      await loadAttachments();
    } catch (error) {
      notify({ message: (error as Error).message || '附件上传失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function previewAttachment(row: Attachment) {
    if (!row.id) return;
    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
      notify({ message: '浏览器拦截了预览窗口，请允许弹窗后重试' }, true);
      return;
    }
    try {
      const blob = await sourceAttachmentService.downloadContent(row.id);
      const url = URL.createObjectURL(blob);
      previewWindow.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      notify({ message: '附件预览已打开' });
    } catch (error) {
      previewWindow.close();
      notify({ message: (error as Error).message || '附件预览失败' }, true);
    }
  }

  async function downloadAttachment(row: Attachment) {
    if (!row.id) return;
    try {
      const blob = await sourceAttachmentService.downloadContent(row.id);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = row.originalFilename || 'attachment';
      link.click();
      URL.revokeObjectURL(link.href);
      notify({ message: '附件下载已开始' });
    } catch (error) {
      notify({ message: (error as Error).message || '附件下载失败' }, true);
    }
  }

  async function removeAttachment(row: Attachment) {
    if (!row.id) return;
    try {
      await sourceAttachmentService.remove(row.id);
      notify({ message: '附件已删除' });
      await loadAttachments();
    } catch (error) {
      notify({ message: (error as Error).message || '附件删除失败' }, true);
    }
  }

  const uploadProps: UploadProps = {
    maxCount: 1,
    beforeUpload: nextFile => {
      setFile(nextFile);
      return false;
    },
    onRemove: () => {
      setFile(null);
      return true;
    },
    fileList: file ? [{ uid: file.name, name: file.name, status: 'done' }] : []
  };

  return (
    <div className="source-attachment-page">
      <Card title="来源附件上传" extra={<Button disabled={!workspace.sourceId} onClick={() => void loadAttachments()}>刷新附件</Button>}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Upload {...uploadProps}>
            <Button>选择附件文件</Button>
          </Upload>
          <Space wrap>
            <Button type="primary" disabled={loading || !workspace.sourceId} loading={loading} onClick={() => void upload()}>
              上传到当前来源
            </Button>
            <Button disabled={!workspace.sourceId} onClick={() => void loadAttachments()}>刷新附件</Button>
          </Space>
        </Space>
      </Card>

      <Card title="附件列表" style={{ marginTop: 16 }}>
        <Table<Attachment>
          size="small"
          bordered
          rowKey={(row, index) => String(row.id || index)}
          dataSource={attachments}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" /> }}
          columns={[
            { key: 'originalFilename', title: '文件名', render: (_value, row) => row.originalFilename || '未命名附件' },
            { key: 'contentType', title: '文件类型', render: (_value, row) => row.contentType || '类型待维护' },
            { key: 'fileSize', title: '文件大小', render: (_value, row) => fileSizeText(row.fileSize) },
            { key: 'uploadStatus', title: '上传状态', render: (_value, row) => <Tag color={uploadStatusColor(row.uploadStatus)}>{uploadStatusText(row.uploadStatus)}</Tag> },
            { key: 'createdAt', title: '上传时间', render: (_value, row) => row.createdAt || '待维护' },
            {
              key: 'actions',
              title: '操作',
              width: 180,
              render: (_value, row) => (
                <Space size="small">
                  <Button size="small" type="link" onClick={() => void previewAttachment(row)}>预览</Button>
                  <Button size="small" type="link" onClick={() => void downloadAttachment(row)}>下载</Button>
                  <Popconfirm title="删除附件" description={`确认删除附件“${row.originalFilename || '当前附件'}”吗？`} okText="删除" cancelText="取消" onConfirm={() => void removeAttachment(row)}>
                    <Button size="small" type="link" danger>删除</Button>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
}
