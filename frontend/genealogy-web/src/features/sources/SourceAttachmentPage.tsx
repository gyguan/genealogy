import { useEffect, useState } from 'react';
import { Alert, Button, Card, Empty, Form, Popconfirm, Select, Space, Table, Tag, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import {
  deleteSourceAttachment,
  downloadAttachment,
  listSourceAttachments,
  previewAttachment,
  uploadSourceAttachment
} from './sourceLibraryService';
import type { SourceAttachmentRecord } from './sourceLibraryService';

type Props = { notify: (data: unknown, error?: boolean) => void };

type AttachmentFormValues = { privacyLevel?: string; sensitiveLevel?: string };

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

function fileSizeText(value?: number) {
  if (!value) return '-';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function optionText(options: Array<{ value: string; label: string }>, value?: string) {
  return options.find(item => item.value === value)?.label || value || '待维护';
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
  const [attachments, setAttachments] = useState<SourceAttachmentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<AttachmentFormValues>();

  async function loadAttachments(pageNo = 1, pageSize = 20) {
    if (!workspace.sourceId) return;
    setLoading(true);
    try {
      const data = await listSourceAttachments(Number(workspace.sourceId), pageNo, pageSize);
      setAttachments(data.records || []);
      setTotal(data.total || 0);
    } catch (error) {
      notify({ message: (error as Error).message || '附件列表加载失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (workspace.sourceId) void loadAttachments(); }, [workspace.sourceId]);

  async function upload() {
    if (loading) return;
    if (!workspace.sourceId) { notify({ message: '请先在来源资料库中选择来源资料' }, true); return; }
    if (!file) { notify({ message: '请选择要上传的附件' }, true); return; }
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      await uploadSourceAttachment(Number(workspace.sourceId), file, values.privacyLevel || 'clan_only', values.sensitiveLevel || 'normal');
      notify({ message: '附件上传成功' });
      setFile(null);
      form.resetFields();
      await loadAttachments();
    } catch (error) {
      notify({ message: (error as Error).message || '附件上传失败' }, true);
    } finally {
      setLoading(false);
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
      notify({ message: '附件预览已打开' });
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
      notify({ message: '附件下载已开始' });
    } catch (error) {
      notify({ message: (error as Error).message || '附件下载失败' }, true);
    }
  }

  async function remove(row: SourceAttachmentRecord) {
    if (!row.id) return;
    try {
      await deleteSourceAttachment(row.id);
      notify({ message: '附件已删除' });
      await loadAttachments();
    } catch (error) {
      notify({ message: (error as Error).message || '附件删除失败' }, true);
    }
  }

  const uploadProps: UploadProps = {
    maxCount: 1,
    beforeUpload: nextFile => { setFile(nextFile); return false; },
    onRemove: () => { setFile(null); return true; },
    fileList: file ? [{ uid: file.name, name: file.name, status: 'done' }] : []
  };

  return (
    <div className="source-attachment-page">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card>
          <Space direction="vertical" size={4}>
            <Typography.Title level={4} style={{ margin: 0 }}>来源附件</Typography.Title>
            <Typography.Text type="secondary">附件需要先在“来源资料库”选择来源资料，再上传、预览、下载或删除。</Typography.Text>
          </Space>
        </Card>

        {!workspace.sourceId ? <Alert type="info" showIcon message="请先在来源资料库中选择来源资料" /> : null}

        <Card title="附件上传" extra={<Button disabled={!workspace.sourceId} onClick={() => void loadAttachments()}>刷新附件</Button>}>
          <Form form={form} layout="inline" initialValues={{ privacyLevel: 'clan_only', sensitiveLevel: 'normal' }}>
            <Form.Item label="附件"><Upload {...uploadProps}><Button>选择附件文件</Button></Upload></Form.Item>
            <Form.Item name="privacyLevel" label="可见范围"><Select options={privacyOptions} style={{ width: 150 }} /></Form.Item>
            <Form.Item name="sensitiveLevel" label="敏感级别"><Select options={sensitiveOptions} style={{ width: 120 }} /></Form.Item>
            <Form.Item><Button type="primary" disabled={loading || !workspace.sourceId || !file} loading={loading} onClick={() => void upload()}>上传到当前来源</Button></Form.Item>
          </Form>
        </Card>

        <Card title="附件列表">
          <Table<SourceAttachmentRecord>
            size="small"
            bordered
            loading={loading}
            rowKey={(row, index) => String(row.id || index)}
            dataSource={attachments}
            pagination={{ total, pageSize: 20, onChange: page => void loadAttachments(page, 20) }}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无附件" /> }}
            columns={[
              { key: 'fileName', title: '文件名', render: (_value, row) => row.fileName || '未命名附件' },
              { key: 'fileType', title: '文件类型', render: (_value, row) => row.fileType || '类型待维护' },
              { key: 'fileSize', title: '文件大小', render: (_value, row) => fileSizeText(row.fileSize) },
              { key: 'sensitiveLevel', title: '敏感级别', render: (_value, row) => <Tag>{optionText(sensitiveOptions, row.sensitiveLevel)}</Tag> },
              { key: 'uploadStatus', title: '上传状态', render: (_value, row) => <Tag color={uploadStatusColor(row.uploadStatus)}>{uploadStatusText(row.uploadStatus)}</Tag> },
              { key: 'uploadedAt', title: '上传时间', render: (_value, row) => row.uploadedAt || '待维护' },
              {
                key: 'actions',
                title: '操作',
                width: 190,
                render: (_value, row) => (
                  <Space size="small">
                    <Button size="small" type="link" disabled={!row.previewAllowed} onClick={() => void preview(row)}>预览</Button>
                    <Button size="small" type="link" disabled={!row.downloadAllowed} onClick={() => void download(row)}>下载</Button>
                    <Popconfirm title="删除附件" description={`确认删除附件“${row.fileName || '当前附件'}”吗？`} okText="删除" cancelText="取消" onConfirm={() => void remove(row)}>
                      <Button size="small" type="link" danger>删除</Button>
                    </Popconfirm>
                  </Space>
                )
              }
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}
