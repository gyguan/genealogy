import { ExportOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import { useState } from 'react';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { feedback } from '../../shared/ui/OperationFeedback';
import { saveDownloadedBlob } from '../../shared/utils/download';
import './booklet-actions-issue473.css';

type Props = {  };

type BookletScope = 'clan' | 'branch';

export function BookletActions(_props: Props) {
  const workspace = useWorkspace();
  const [loading, setLoading] = useState(false);

  async function generateBooklet(scope: BookletScope) {
    if (loading) return;
    if (!workspace.clanId) {
      feedback.warning('请先选择宗族');
      return;
    }
    if (scope === 'branch' && !workspace.branchId) {
      feedback.warning('请先选择支派');
      return;
    }

    const path = scope === 'branch'
      ? `/clans/${workspace.clanId}/branches/${workspace.branchId}/exports/booklet.html`
      : `/clans/${workspace.clanId}/exports/booklet.html`;
    const filename = scope === 'branch' ? 'branch-booklet.html' : 'clan-booklet.html';

    setLoading(true);
    try {
      const blob = await apiClient.download(path);
      saveDownloadedBlob(blob, filename);
      feedback.success(`谱册已生成：${filename}`);
    } catch (error) {
      feedback.error((error as Error).message || '谱册生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dropdown
      disabled={!workspace.clanId || loading}
      menu={{
        items: [
          { key: 'clan', label: '导出全宗族谱册' },
          { key: 'branch', label: '导出当前支派谱册', disabled: !workspace.branchId }
        ],
        onClick: info => void generateBooklet(info.key as BookletScope)
      }}
    >
      <Button icon={<ExportOutlined />} loading={loading}>导出族谱</Button>
    </Dropdown>
  );
}
