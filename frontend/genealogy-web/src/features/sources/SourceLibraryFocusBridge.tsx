import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Space, Steps, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

type FocusSource = {
  sourceName?: string;
  sourceTitle?: string;
  title?: string;
};

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function sourceTitle(source?: FocusSource | null) {
  return display(source?.sourceName || source?.sourceTitle || source?.title, '未命名来源');
}

function clearSourceFocusClasses() {
  document.querySelectorAll('.xp-source-row--focused, .xp-source-guide-focused, .xp-source-bind-focused').forEach(item => {
    item.classList.remove('xp-source-row--focused', 'xp-source-guide-focused', 'xp-source-bind-focused');
  });
}

export function SourceLibraryFocusBridge() {
  const workspace = useWorkspace();
  const [source, setSource] = useState<FocusSource | null>(null);
  const handledSourceIdRef = useRef('');

  const isMissingSourceIntent = workspace.sourceFocusReason === 'missing_source';
  const hasFocus = Boolean(workspace.sourceFocusReason);

  useEffect(() => {
    const sourceId = String(workspace.sourceId || '').trim();
    if (!hasFocus || !sourceId || handledSourceIdRef.current === sourceId) return;
    handledSourceIdRef.current = sourceId;
    apiClient.get(`/sources/${sourceId}`)
      .then(data => setSource(data as FocusSource))
      .catch(error => message.error((error as Error).message || '加载工作台定位来源失败'));
  }, [hasFocus, workspace.sourceId]);

  useEffect(() => {
    clearSourceFocusClasses();
    if (!hasFocus) return;
    const timer = window.setTimeout(() => {
      if (isMissingSourceIntent && !workspace.sourceId) {
        const cards = Array.from(document.querySelectorAll('.xp-source-layout .xp-card'));
        cards[0]?.classList.add('xp-source-guide-focused');
        cards[1]?.classList.add('xp-source-bind-focused');
        cards[0]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }
      const title = sourceTitle(source).trim();
      if (!title || title === '未命名来源') return;
      const row = Array.from(document.querySelectorAll('.xp-source-row')).find(item => item.textContent?.includes(title));
      row?.classList.add('xp-source-row--focused');
      row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [hasFocus, isMissingSourceIntent, source, workspace.sourceId]);

  function clearFocus() {
    workspace.patch({ sourceId: '', sourceFocusReason: '' });
    handledSourceIdRef.current = '';
    setSource(null);
    clearSourceFocusClasses();
  }

  if (!hasFocus) return null;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 12 }}>
      <Alert
        type={isMissingSourceIntent ? 'warning' : 'info'}
        showIcon
        message={isMissingSourceIntent ? '来自工作台：缺来源处理' : '来自工作台：来源资料定位'}
        description={workspace.sourceId ? `已带入来源资料定位对象：${source ? sourceTitle(source) : `来源 ${workspace.sourceId}`}。列表命中时会自动高亮。` : '当前任务没有具体来源资料，页面已默认突出“新增资料”和“绑定来源”处理区域。'}
        action={<Button size="small" onClick={clearFocus}>清除定位</Button>}
      />
      {workspace.sourceId ? null : (
        <Card size="small" title="新增资料 / 绑定来源引导">
          <Steps
            size="small"
            current={0}
            items={[
              { title: '新增来源资料', description: '维护老谱、地方志、照片、口述等来源资料。' },
              { title: '上传或补充附件', description: '如有扫描件、照片或原文摘录，可继续补充附件。' },
              { title: '绑定业务对象', description: '把来源绑定到人物、关系、支派或字辈方案，支撑后续审核。' }
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
            该引导只说明处理路径，不自动创建来源、不自动绑定对象，也不绕过审核流程。
          </Typography.Paragraph>
        </Card>
      )}
    </Space>
  );
}
