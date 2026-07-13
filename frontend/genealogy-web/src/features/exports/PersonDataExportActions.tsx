import { Button, Dropdown } from 'antd';
import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { saveDownloadedBlob } from '../../shared/utils/download';

type Props = { notify: (data: unknown, error?: boolean) => void };

type ExportScope = 'clan' | 'branch';

export function PersonDataExportActions({ notify }: Props) {
  const workspace = useWorkspace();
  const [loading, setLoading] = useState(false);

  async function exportPersons(scope: ExportScope) {
    if (loading) return;
    if (!workspace.clanId) {
      notify({ message: '请先选择宗族' }, true);
      return;
    }
    if (scope === 'branch' && !workspace.branchId) {
      notify({ message: '请先选择支派' }, true);
      return;
    }

    const path = scope === 'branch'
      ? `/clans/${workspace.clanId}/branches/${workspace.branchId}/exports/persons.csv`
      : `/clans/${workspace.clanId}/exports/persons.csv`;
    const filename = scope === 'branch' ? 'branch-persons.csv' : 'persons.csv';

    setLoading(true);
    try {
      const blob = await apiClient.download(path);
      saveDownloadedBlob(blob, filename);
      notify({ message: `人物数据已导出：${filename}` });
    } catch (error) {
      notify({ message: (error as Error).message || '人物数据导出失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dropdown
      disabled={!workspace.clanId || loading}
      menu={{
        items: [
          { key: 'clan', label: '导出全宗族人物' },
          { key: 'branch', label: '导出当前支派人物', disabled: !workspace.branchId }
        ],
        onClick: info => void exportPersons(info.key as ExportScope)
      }}
    >
      <Button loading={loading}>导出人物数据</Button>
    </Dropdown>
  );
}
