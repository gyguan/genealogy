import { ExportOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { saveDownloadedBlob } from '../../shared/utils/download';
import './booklet-actions-issue473.css';

type Props = { notify: (data: unknown, error?: boolean) => void };

type BookletScope = 'clan' | 'branch';

export function BookletActions({ notify }: Props) {
  const workspace = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null);

  useEffect(() => {
    function locateToolbar() {
      setToolbar(document.querySelector<HTMLElement>('.lineage-canvas-view-bar'));
    }

    locateToolbar();
    const observer = new MutationObserver(locateToolbar);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  async function generateBooklet(scope: BookletScope) {
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
      ? `/clans/${workspace.clanId}/branches/${workspace.branchId}/exports/booklet.html`
      : `/clans/${workspace.clanId}/exports/booklet.html`;
    const filename = scope === 'branch' ? 'branch-booklet.html' : 'clan-booklet.html';

    setLoading(true);
    try {
      const blob = await apiClient.download(path);
      saveDownloadedBlob(blob, filename);
      notify({ message: `谱册已生成：${filename}` });
    } catch (error) {
      notify({ message: (error as Error).message || '谱册生成失败' }, true);
    } finally {
      setLoading(false);
    }
  }

  const action = (
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

  return toolbar ? createPortal(<span className="lineage-result-export-action">{action}</span>, toolbar) : null;
}