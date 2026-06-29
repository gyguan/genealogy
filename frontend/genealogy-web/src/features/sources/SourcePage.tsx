import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { DetailCard } from '../../shared/ui/DetailCard';
import { Modal } from '../../shared/ui/Modal';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function SourcePage({ notify, mode = 'manage' }: { notify: (data: unknown, error?: boolean) => void; mode?: 'manage' | 'attachment' }) {
  const workspace = useWorkspace();
  const [sourceName, setSourceName] = useState('');
  const [targetType, setTargetType] = useState('person');
  const [targetId, setTargetId] = useState(workspace.personId);
  const [file, setFile] = useState<File | null>(null);
  const [sources, setSources] = useState<unknown>();
  const [bindings, setBindings] = useState<unknown>();
  const [selected, setSelected] = useState<any>();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bindOpen, setBindOpen] = useState(false);
  const [result, setResult] = useState<unknown>();

  async function createSource() {
    const res: any = await apiClient.post(`/clans/${workspace.clanId}/sources`, { sourceName, sourceType: 'genealogy_book' });
    if (res?.id) workspace.setSourceId(String(res.id));
    setResult({ message: '来源创建成功', id: res?.id });
    setCreateOpen(false);
    notify({ message: '来源创建成功', id: res?.id });
    await listSources();
  }

  async function listSources() {
    const res = await apiClient.get(`/clans/${workspace.clanId}/sources`);
    setSources(res);
    notify({ message: '来源列表查询完成' });
  }

  async function detailSource(id: string) {
    const res: any = await apiClient.get(`/sources/${id}`);
    setSelected(res);
    workspace.setSourceId(String(res?.id || id));
    setDetailOpen(true);
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
    setBindOpen(false);
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

  if (mode === 'attachment') {
    return (
      <Panel title="附件管理" description="上传族谱、图片或 PDF 等资料附件。">
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
    <Panel title="来源管理" description="查询资料来源，创建、详情和绑定操作通过弹框完成。">
      <Field label="宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
      <Actions><button onClick={listSources}>查询来源</button><button className="secondary" onClick={() => setCreateOpen(true)}>新建来源</button><button className="secondary" onClick={() => setBindOpen(true)}>绑定来源</button></Actions>
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
      <ResultNotice result={result} />

      <Modal open={createOpen} title="新建来源" onClose={() => setCreateOpen(false)}>
        <Field label="来源名称"><input value={sourceName} onChange={e => setSourceName(e.target.value)} /></Field>
        <Actions><button onClick={createSource}>保存</button><button className="secondary" onClick={() => setCreateOpen(false)}>取消</button></Actions>
      </Modal>

      <Modal open={detailOpen} title="来源详情" onClose={() => setDetailOpen(false)} width={820}>
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
        <Actions><button className="secondary" onClick={listSourceBindings}>查看绑定</button></Actions>
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
      </Modal>

      <Modal open={bindOpen} title="绑定来源" onClose={() => setBindOpen(false)}>
        <Field label="来源ID"><input value={workspace.sourceId} onChange={e => workspace.setSourceId(e.target.value)} /></Field>
        <Field label="目标类型"><select value={targetType} onChange={e => setTargetType(e.target.value)}><option value="person">人物</option><option value="relationship">关系</option><option value="branch">支派</option><option value="clan">宗族</option></select></Field>
        <Field label="目标ID"><input value={targetId} onChange={e => setTargetId(e.target.value)} /></Field>
        <Actions><button onClick={bind}>保存绑定</button><button className="secondary" onClick={listTargetBindings}>查询目标来源</button></Actions>
        <DataTable
          data={bindings}
          columns={[
            { key: 'id', title: '绑定ID' },
            { key: 'sourceId', title: '来源ID' },
            { key: 'targetType', title: '目标类型' },
            { key: 'targetId', title: '目标ID' }
          ]}
        />
      </Modal>
    </Panel>
  );
}
