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
  const [sourceId, setSourceId] = useState(workspace.sourceId || '');
  const [file, setFile] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadAttachments(nextSourceId = sourceId) {
    if (!nextSourceId) return;
    const data = await apiClient.get(`/source-attachments/sources/${nextSourceId}`);
    setAttachments(toRecordList<Attachment>(data));
  }

  useEffect(() => { if (sourceId) void loadAttachments(sourceId); }, [sourceId]);

  async function upload() {
    if (loading) return;
    if (!sourceId) { notify({ message: '请先输入来源ID' }, true); return; }
    if (!file) { notify({ message: '请选择要上传的附件' }, true); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result: any = await apiClient.upload(`/sources/${sourceId}/attachments`, formData);
      workspace.setSourceId(sourceId);
      notify({ message: '附件上传成功', id: result?.id });
      setFile(null);
      await loadAttachments(sourceId);
    } catch (error) {
      notify({ message: (error as Error).message || '附件上传失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  async function downloadAttachment(row: Attachment) {
    if (!row.id) return;
    try {
      const blob = await apiClient.download(`/source-attachments/${row.id}/content`);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = row.originalFilename || `attachment-${row.id}`;
      link.click();
      URL.revokeObjectURL(link.href);
      notify({ message: '附件下载已开始' });
    } catch (error) {
      notify({ message: (error as Error).message || '附件下载失败' }, true);
    }
  }

  async function removeAttachment(row: Attachment) {
    if (!row.id) return;
    if (!window.confirm(`确认删除附件「${row.originalFilename || row.id}」吗？`)) return;
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
      <Panel title="来源附件上传" description="为族谱原文、照片、墓碑、地方志、口述资料等来源上传原始附件，作为审核和入谱证据。">
        <div className="wizard-form-grid">
          <Field label="来源ID"><input value={sourceId} onChange={e => setSourceId(e.target.value)} placeholder="请输入来源资料ID" /></Field>
          <Field label="附件文件"><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        </div>
        <Actions>
          <button disabled={loading} onClick={upload}>{loading ? '上传中...' : '上传附件'}</button>
          <button className="secondary" onClick={() => void loadAttachments()}>刷新附件</button>
        </Actions>
      </Panel>

      <Panel title="附件列表" description="展示附件原始文件名、大小、存储路径和 SHA-256 校验值。">
        <DataTable
          data={attachments}
          columns={[
            { key: 'id', title: '附件ID' },
            { key: 'originalFilename', title: '原始文件名' },
            { key: 'contentType', title: '类型' },
            { key: 'fileSize', title: '大小' },
            { key: 'uploadStatus', title: '状态' },
            { key: 'checksum', title: 'SHA-256' },
            { key: 'createdAt', title: '上传时间' },
            { key: 'actions', title: '操作', render: row => <span className="row-action-buttons"><button onClick={() => void downloadAttachment(row)}>下载</button><button className="danger" onClick={() => void removeAttachment(row)}>删除</button></span> }
          ]}
          empty="暂无附件"
        />
      </Panel>
    </div>
  );
}
