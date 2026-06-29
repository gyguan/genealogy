import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function SourcePage({ notify, mode = 'sourceCreate' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'sourceCreate' | 'bind' | 'attachment' }) {
  const workspace = useWorkspace();
  const [sourceName, setSourceName] = useState('');
  const [targetType, setTargetType] = useState('person');
  const [targetId, setTargetId] = useState(workspace.personId);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<unknown>();

  async function createSource() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/sources`, { sourceName, sourceType: 'genealogy_book' });
    if (res?.id) workspace.setSourceId(String(res.id));
    setResult(res);
    notify({ message: '来源创建成功', id: res?.id });
  }

  async function bind() {
    const res: any = await apiClient.post('/source-bindings', { sourceId: Number(workspace.sourceId), targetType, targetId: Number(targetId) });
    setResult({ message: '来源绑定成功', id: res?.id });
    notify({ message: '来源绑定成功', id: res?.id });
  }

  async function upload() {
    if (!file) throw new Error('请选择文件');
    const form = new FormData();
    form.append('file', file);
    if (workspace.sourceId) form.append('sourceId', workspace.sourceId);
    const res: any = await apiClient.upload(`/clans/${workspace.clanId}/attachments/upload`, form);
    if (res?.id) workspace.setAttachmentId(String(res.id));
    setResult({ message: '附件上传成功', id: res?.id });
    notify({ message: '附件上传成功', id: res?.id });
  }

  async function download() {
    const blob = await apiClient.download(`/attachments/${workspace.attachmentId}/download`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attachment-${workspace.attachmentId}`;
    link.click();
    URL.revokeObjectURL(link.href);
    setResult({ message: '附件下载完成' });
    notify({ message: '附件下载完成' });
  }

  if (mode === 'bind') {
    return (
      <Panel title="来源绑定" description="把来源绑定到人物、关系、支派或宗族。">
        <Field label="来源ID"><input value={workspace.sourceId} onChange={e => workspace.setSourceId(e.target.value)} /></Field>
        <Field label="目标类型"><select value={targetType} onChange={e => setTargetType(e.target.value)}><option value="person">人物</option><option value="relationship">关系</option><option value="branch">支派</option><option value="clan">宗族</option></select></Field>
        <Field label="目标ID"><input value={targetId} onChange={e => setTargetId(e.target.value)} /></Field>
        <Actions><button onClick={bind}>绑定来源</button></Actions>
        <ResultNotice result={result} />
      </Panel>
    );
  }

  if (mode === 'attachment') {
    return (
      <Panel title="附件上传下载" description="上传族谱、图片或 PDF 等资料附件。">
        <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="来源ID"><input value={workspace.sourceId} onChange={e => workspace.setSourceId(e.target.value)} /></Field>
        <Field label="选择文件"><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        <Actions><button onClick={upload}>上传附件</button></Actions>
        <Field label="附件ID"><input value={workspace.attachmentId} onChange={e => workspace.setAttachmentId(e.target.value)} /></Field>
        <Actions><button className="secondary" onClick={download}>下载附件</button></Actions>
        <ResultNotice result={result} />
      </Panel>
    );
  }

  return (
    <Panel title="来源创建" description="创建族谱书、图片、口述记录等资料来源。">
      <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
      <Field label="来源名称"><input value={sourceName} onChange={e => setSourceName(e.target.value)} /></Field>
      <Actions><button onClick={createSource}>创建来源</button></Actions>
      <ResultNotice result={result} successText="来源创建成功" />
    </Panel>
  );
}
