import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function SourcePage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [sourceName, setSourceName] = useState('');
  const [targetType, setTargetType] = useState('person');
  const [targetId, setTargetId] = useState(workspace.personId);
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<unknown>();

  async function createSource() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/sources`, { sourceName, sourceType: 'genealogy_book' });
    if (res?.id) workspace.setSourceId(String(res.id));
    setData(res);
    notify(res);
  }

  async function bind() {
    const res = await apiClient.post('/source-bindings', { sourceId: Number(workspace.sourceId), targetType, targetId: Number(targetId) });
    setData(res);
    notify(res);
  }

  async function upload() {
    if (!file) throw new Error('请选择文件');
    const form = new FormData();
    form.append('file', file);
    if (workspace.sourceId) form.append('sourceId', workspace.sourceId);
    const res: any = await apiClient.upload(`/clans/${workspace.clanId}/attachments/upload`, form);
    if (res?.id) workspace.setAttachmentId(String(res.id));
    setData(res);
    notify(res);
  }

  async function download() {
    const blob = await apiClient.download(`/attachments/${workspace.attachmentId}/download`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attachment-${workspace.attachmentId}`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify('附件下载完成');
  }

  return (
    <div className="page-grid two">
      <Panel title="来源与证据" description="默认使用工作区宗族ID、来源ID和人物ID，创建来源后自动回填来源ID。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="来源名称"><input value={sourceName} onChange={e => setSourceName(e.target.value)} /></Field>
        <Actions><button onClick={createSource}>创建来源</button></Actions>
        <Field label="当前来源ID"><input value={workspace.sourceId} onChange={e => workspace.setSourceId(e.target.value)} /></Field>
        <Field label="目标类型"><input value={targetType} onChange={e => setTargetType(e.target.value)} /></Field>
        <Field label="目标ID"><input value={targetId} onChange={e => setTargetId(e.target.value)} /></Field>
        <Actions><button onClick={bind}>绑定来源</button></Actions>
      </Panel>
      <Panel title="附件上传下载" description="上传成功后自动回填附件ID。">
        <Field label="选择文件"><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        <Actions><button onClick={upload}>上传附件</button></Actions>
        <Field label="当前附件ID"><input value={workspace.attachmentId} onChange={e => workspace.setAttachmentId(e.target.value)} /></Field>
        <Actions><button className="secondary" onClick={download}>下载附件</button></Actions>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
