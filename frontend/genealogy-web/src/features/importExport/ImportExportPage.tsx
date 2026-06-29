import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Actions, Field } from '../../shared/ui/Form';
import { DataTable } from '../../shared/ui/DataTable';
import { Panel } from '../../shared/ui/Panel';
import { ResultNotice } from '../../shared/ui/ResultNotice';

export function ImportExportPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const workspace = useWorkspace();
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState('persons');
  const [previewRows, setPreviewRows] = useState<unknown>();
  const [result, setResult] = useState<unknown>();

  function download(path: string, name: string) {
    apiClient.download(path).then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
      const next = { message: `${name} 下载完成` };
      setResult(next);
      notify(next);
    });
  }

  async function upload(action: 'preview' | 'import') {
    if (!file) throw new Error('请选择 CSV 文件');
    const form = new FormData();
    form.append('file', file);
    const suffix = action === 'preview' ? '/preview' : '';
    const res: any = await apiClient.upload(`/clans/${workspace.clanId}/imports/${mode}.csv${suffix}`, form);
    if (action === 'preview') setPreviewRows(res?.rows || res?.errors || res);
    const next = { message: action === 'preview' ? '预校验完成' : '导入完成', id: res?.batchId };
    setResult(next);
    notify(next);
  }

  return (
    <div className="page-grid two">
      <Panel title="导入导出" description="当前以 Excel 可打开的 UTF-8 BOM CSV 作为 MVP1 格式。">
        <Field label="当前宗族ID"><input value={workspace.clanId} onChange={e => workspace.setClanId(e.target.value)} /></Field>
        <Field label="类型"><select value={mode} onChange={e => setMode(e.target.value)}><option value="persons">人物</option><option value="relations">关系</option></select></Field>
        <Field label="CSV 文件"><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        <Actions>
          <button className="secondary" onClick={() => download(`/imports/templates/${mode}.csv`, `${mode}-template.csv`)}>下载模板</button>
          <button onClick={() => upload('preview')}>预校验</button>
          <button onClick={() => upload('import')}>导入</button>
          <button className="secondary" onClick={() => download(`/clans/${workspace.clanId}/exports/${mode}.csv`, `${mode}.csv`)}>导出</button>
        </Actions>
        <ResultNotice result={result} />
      </Panel>
      <Panel title="预校验结果">
        <DataTable
          data={previewRows}
          columns={[
            { key: 'rowNo', title: '行号' },
            { key: 'valid', title: '是否通过', render: row => row.valid === false ? '否' : '是' },
            { key: 'message', title: '提示' },
            { key: 'errorMessage', title: '错误信息' }
          ]}
        />
      </Panel>
    </div>
  );
}
