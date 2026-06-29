import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function SourcePage({ notify, mode = 'sourceCreate' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'sourceCreate' | 'query' | 'bind' | 'attachment' }) {
  const workspace = useWorkspace();
  const [sourceName, setSourceName] = useState('');
  const [targetType, setTargetType] = useState('person');
  const [targetId, setTargetId] = useState(workspace.personId);
  const [file, setFile] = useState<File | null>(null);
  const [sources, setSources] = useState<unknown>();
  const [bindings, setBindings] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [result, setResult] = useState<unknown>();

  async function createSource() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/sources`, { sourceName, sourceType: 'genealogy_book' });
    if (res?.id) workspace.setSourceId(String(res.id));
    setResult(res);
    notify({ message: '来源创建成功', id: res?.id });
  }

  async function listSources() {
    const res = await apiClient.get(`/clans/${workspace.clanId}/sources`);
    setSources(res);
    notify({ message: '来源列表查询完成' });
  }

  async function detailSource(id = workspace.sourceId) {
    if (!id) throw new Error('请选择来源');
    const res: any = await apiClient.get(`/sources/${id}`);
    setSelected(res);
    workspace.setSourceId(String(res?.id || id));
    notify({ message: '来源详情查询完成' });
  }

  async function listTargetBindings() {
    const res = await apiClient.get(`/source-bindings?targetType=${targetType}&targetId=${targetId}`);
    setBindings(res);
    notify({ message: '绑定来源查询完成' });
  }

  async function listSourceBindings() {
    const res = await apiClient.get(`/sources/${workspace.sourceId}/bindings`);
    setBindings(res);
    notify({ message: '来源绑定列表查询完成' });
  }

  async function unbind(bindingId: string) {
    await apiClient.delete(`/source-bindings/${bindingId}`);
    setResult({ message: '来源绑定已解除' });
    notify({ message: '来源绑定已解除' });
    await listSourceBindings();
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

  if (mode === 'query') {
    return (
      <div className="page-grid two">
        <Panel title="来源查询" description="查询宗族资料来源，点击表格行可查看详情。">
          <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
          <Field label="来源ID"><input value={workspace.sourceId} onChange={e => workspace.setSourceId(e.target.value)} /></Field>
          <Actions><button onClick={listSources}>查询来源</button><button className="secondary" onClick={() => detailSource()}>查询详情</button></Actions>
          <DataTable
            data={sources}
            columns={[
              { key: 'id', title: 'ID' },
              { key: 'sourceName', title: '来源名称' },
              { key: 'sourceType', title: '来源类型' },
              { key: 'verificationStatus', title: '状态' }
            ]}
            onSelect={row => detailSource(String(row.id))}
          />
        </Panel>
        <Panel title="来源详情" description="查看资料来源基础信息和审核状态。">
          <DetailCard
            title="基础信息"
            data={selected}
            fields={[
              { label: '来源ID', value: row => row.id },
              { label: '来源名称', value: row => row.sourceName },
              { label: '来源类型', value: row => row.sourceType },
              { label: '状态', value: row => row.verificationStatus || row.status }
            ]}
          />
          <ResultNotice result={result} />
        </Panel>
      </div>
    );
  }

  if (mode === 'bind') {
    return (
      <div className="page-grid two">
        <Panel title="来源绑定" description="把来源绑定到人物、关系、支派或宗族。">
          <Field label="来源ID"><input value={workspace.sourceId} onChange={e => workspace.setSourceId(e.target.value)} /></Field>
          <Field label="目标类型"><select value={targetType} onChange={e => setTargetType(e.target.value)}><option value="person">人物</option><option value="relationship">关系</option><option value="branch">支派</option><option value="clan">宗族</option></select></Field>
          <Field label="目标ID"><input value={targetId} onChange={e => setTargetId(e.target.value)} /></Field>
          <Actions><button onClick={bind}>绑定来源</button><button className="secondary" onClick={listTargetBindings}>查目标来源</button><button className="secondary" onClick={listSourceBindings}>查来源绑定</button></Actions>
          <ResultNotice result={result} />
        </Panel>
        <Panel title="绑定记录" description="点击行可以解除绑定。">
          <DataTable
            data={bindings}
            columns={[
              { key: 'id', title: '绑定ID' },
              { key: 'sourceId', title: '来源ID' },
              { key: 'targetType', title: '目标类型' },
              { key: 'targetId', title: '目标ID' }
            ]}
            onSelect={row => unbind(String(row.id))}
          />
        </Panel>
      </div>
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
