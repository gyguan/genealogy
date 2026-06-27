import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { Actions, Field } from '../../shared/ui/Form';
import { DataBlock } from '../../shared/ui/DataBlock';
import { Panel } from '../../shared/ui/Panel';

export function ImportExportPage({ notify }: { notify: (data: unknown, error?: boolean) => void }) {
  const [clanId, setClanId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState('persons');
  const [data, setData] = useState<unknown>();

  function download(path: string, name: string) {
    apiClient.download(path).then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
      notify(`${name} 下载完成`);
    });
  }

  async function upload(action: 'preview' | 'import') {
    if (!file) throw new Error('请选择 CSV 文件');
    const form = new FormData();
    form.append('file', file);
    const suffix = action === 'preview' ? '/preview' : '';
    const res = await apiClient.upload(`/clans/${clanId}/imports/${mode}.csv${suffix}`, form);
    setData(res);
    notify(res);
  }

  return (
    <div className="page-grid two">
      <Panel title="导入导出" description="当前以 Excel 可打开的 UTF-8 BOM CSV 作为 MVP1 格式。">
        <Field label="宗族ID"><input value={clanId} onChange={e => setClanId(e.target.value)} /></Field>
        <Field label="类型"><select value={mode} onChange={e => setMode(e.target.value)}><option value="persons">人物</option><option value="relations">关系</option></select></Field>
        <Field label="CSV 文件"><input type="file" onChange={e => setFile(e.target.files?.[0] || null)} /></Field>
        <Actions>
          <button className="secondary" onClick={() => download(`/imports/templates/${mode}.csv`, `${mode}-template.csv`)}>模板</button>
          <button onClick={() => upload('preview')}>预校验</button>
          <button onClick={() => upload('import')}>导入</button>
          <button className="secondary" onClick={() => download(`/clans/${clanId}/exports/${mode}.csv`, `${mode}.csv`)}>导出</button>
        </Actions>
      </Panel>
      <Panel title="导入结果"><DataBlock data={data} /></Panel>
    </div>
  );
}
