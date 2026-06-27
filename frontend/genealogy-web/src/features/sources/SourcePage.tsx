import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function SourcePage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const [clanId, setClanId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [targetType, setTargetType] = useState('person');
  const [targetId, setTargetId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attachmentId, setAttachmentId] = useState('');
  const [data, setData] = useState<unknown>();

  async function createSource() {
    const res = await apiClient.post(`/clans/${clanId}/sources`, { sourceName, sourceType: 'genealogy_book' });
    setData(res);
    notify(res);
  }

  async function bind() {
    const res = await apiClient.post('/source-bindings', { sourceId: Number(sourceId), targetType, targetId: Number(targetId) });
    setData(res);
    notify(res);
  }

  async function upload() {
    if (!file) throw new Error('请选择文件');
    const form = new FormData();
    form.append('file', file);
    if (sourceId) form.append('sourceId', sourceId);
    const res = await apiClient.upload(`/clans/${clanId}/attachments/upload`, form);
    setData(res);
    notify(res);
  }

  async function download() {
    const blob = await apiClient.download(`/attachments/${attachmentId}/download`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attachment-${attachmentId}`;
    link.click();
    URL.revokeObjectURL(link.href);
    notify('附件下载完成');
  }

  return (
    <div className="page-grid two">
      <Panel title="来源与证据" description="管理资料来源，并绑定到人物、关系、支派或宗族。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="来源名称"><input value={sourceName} onChange={e => setSourceName(e.target.value)} /></Field>
        <Actions><button onClick={createSource}>创建来源</button></Actions>
        <Field label="来源ID"><input value={sourceId} onChange={e => setSourceId(e.target.value)} /></Field>
        <Field label="目标类型"><input value={targetType} onChange={e => setTargetType(e.target.value)} /></Field>
        <Field label="目标ID"><input value={targetId} onChange={e => setTargetId(e.target.value)} /></Field>
        <Actions><button onClick={bind}>绑定来源</button></Actions>
      </Panel>
      <Panel title="附件上传下载">
        <Field label="选择文件"><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        <Actions><button onClick={upload}>上传附件</button></Actions>
        <Field label="附件ID"><input value={attachmentId} onChange={e => setAttachmentId(e.target.value)} /></Field>
        <Actions><button className="secondary" onClick={download}>下载附件</button></Actions>
        <DataBlock data={data} />
      </Panel>
    </div>
  );
}
