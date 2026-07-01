import { useEffect, useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable, toRecordList } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';

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

export function SourceAttachmentPage({ notify }: Props) {
  const workspace = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAttachments() {
    if (!workspace.sourceId) return;
    const data = await apiClient.get(`/source-attachments/sources/${workspace.sourceId}`);
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
      await apiClient.upload(`/sources/${workspace.sourceId}/attachments`, formData);
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
      const blob = await apiClient.download(`/source-attachments/${row.id}/content`);
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
      const blob = await apiClient.download(`/source-attachments/${row.id}/content`);
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
    if (!window.confirm(`确认删除附件「${row.originalFilename || '当前附件'}」吗？`)) return;
    try {
      await apiClient.delete(`/source-attachments/${row.id}`);
      notify({ message: '附件已删除' });
      await loadAttachments();
    } catch (error) {
      notify({ message: (error as Error).message || '附件删除失败' }, true);
    }
  }

  return (
    <div className="source-attachment-page">
      <Panel title="来源附件上传" description="为族谱原文、照片、墓碑、地方志、口述资料等来源上传原始附件。请先在来源资料库中选择来源资料，再上传附件。">
        <div className="wizard-form-grid">
          <Field label="附件文件"><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        </div>
        <Actions>
          <button disabled={loading || !workspace.sourceId} onClick={upload}>{loading ? '上传中...' : '上传到当前来源'}</button>
          <button className="secondary" disabled={!workspace.sourceId} onClick={() => void loadAttachments()}>刷新附件</button>
        </Actions>
      </Panel>

      <Panel title="附件列表" description="展示当前来源的附件原始文件名、大小、校验值，支持浏览器可识别格式在线预览。">
        <DataTable
          data={attachments}
          columns={[
            { key: 'originalFilename', title: '原始文件名' },
            { key: 'contentType', title: '类型' },
            { key: 'fileSize', title: '大小' },
            { key: 'uploadStatus', title: '状态' },
            { key: 'checksum', title: 'SHA-256' },
            { key: 'createdAt', title: '上传时间' },
            { key: 'actions', title: '操作', render: row => <span className="row-action-buttons"><button onClick={() => void previewAttachment(row)}>预览</button><button onClick={() => void downloadAttachment(row)}>下载</button><button className="danger" onClick={() => void removeAttachment(row)}>删除</button></span> }
          ]}
          empty="暂无附件"
        />
      </Panel>
    </div>
  );
}
