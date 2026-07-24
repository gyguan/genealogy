import {
  useEffect } from 'react';
import type { ReactNode } from 'react';
import { Alert,
  Button,
  Card,
  Space,
  Typography
} from 'antd';
import { confirmCultureEditorLeave } from './cultureEditorState';

import { PageFeedback } from '../../shared/ui/Feedback';

const { Paragraph, Title } = Typography;

type Props = {
  title: string;
  description: string;
  children: ReactNode;
  statusAlert?: ReactNode;
  submitError?: string;
  saving: boolean;
  dirty: boolean;
  primaryText: string;
  primaryDisabled?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
};

export function CultureEditorShell({
  title,
  description,
  children,
  statusAlert,
  submitError,
  saving,
  dirty,
  primaryText,
  primaryDisabled,
  onCancel,
  onSubmit
}: Props) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const navigationClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('.ant-menu-item, .culture-page-header .ant-tabs-tab')) return;
      if (confirmCultureEditorLeave(true)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', navigationClick, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', navigationClick, true);
    };
  }, [dirty]);

  function cancel() {
    if (confirmCultureEditorLeave(dirty)) onCancel();
  }

  return (
    <div className="culture-editor-page">
      <Card className="culture-editor-header">
        <Space direction="vertical" size={4}>
          <Button type="link" className="culture-editor-back" onClick={cancel}>← 返回迁徙与文化列表</Button>
          <Title level={3}>{title}</Title>
          <Paragraph type="secondary">{description}</Paragraph>
        </Space>
      </Card>
      {statusAlert}
      {submitError ? <PageFeedback tone="error" title="保存失败" description={submitError} /> : null}
      <div className="culture-editor-content">{children}</div>
      <div className="culture-editor-actions" role="toolbar" aria-label="编辑操作">
        <Space>
          <Button disabled={saving} onClick={cancel}>取消</Button>
          <Button type="primary" loading={saving} disabled={primaryDisabled} onClick={onSubmit}>{primaryText}</Button>
        </Space>
      </div>
    </div>
  );
}
