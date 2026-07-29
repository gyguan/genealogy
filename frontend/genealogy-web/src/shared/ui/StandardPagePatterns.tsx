import { createContext, useContext, useState } from 'react';
import type { ReactNode, Ref } from 'react';
import { createPortal } from 'react-dom';
import {
  Card,
  Drawer,
  Space,
  Spin,
  Table,
  Typography
} from 'antd';
import type { CardProps, DrawerProps, ResultProps, TableProps } from 'antd';
import { EmptyState, FullPageFeedback, PageFeedback } from './Feedback';
import '../../styles/shared/standard-page-patterns.css';

const StandardPageActionTarget = createContext<HTMLElement | null | undefined>(undefined);

export type StandardPageProps = {
  title: ReactNode;
  description?: ReactNode;
  scope?: ReactNode;
  back?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
  pageKey?: string;
};

export function StandardPage({ title, description, scope, back, extra, children, className = '', pageKey }: StandardPageProps) {
  const classes = ['standard-page', className].filter(Boolean).join(' ');
  const [actionTarget, setActionTarget] = useState<HTMLElement | null>(null);
  return <StandardPageActionTarget.Provider value={actionTarget}>
    <section className={classes} data-standard-page={pageKey || 'standard'}>
      <StandardPageHeader title={title} description={description} scope={scope} back={back} extra={extra} actionTargetRef={setActionTarget} />
      <div className="standard-page__content">{children}</div>
    </section>
  </StandardPageActionTarget.Provider>;
}

export type StandardPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  scope?: ReactNode;
  back?: ReactNode;
  extra?: ReactNode;
  className?: string;
  actionTargetRef?: Ref<HTMLDivElement>;
};

export function StandardPageHeader({ title, description, scope, back, extra, className = '', actionTargetRef }: StandardPageHeaderProps) {
  const classes = ['standard-page-header', className].filter(Boolean).join(' ');
  return <header className={classes}>
    <div className="standard-page-header__leading">
      {back ? <div className="standard-page-header__back">{back}</div> : null}
      <div className="standard-page-header__copy">
        <Typography.Title level={2} className="standard-page-header__title">{title}</Typography.Title>
        {description ? <Typography.Paragraph type="secondary" className="standard-page-header__description">{description}</Typography.Paragraph> : null}
        {scope ? <div className="standard-page-header__scope">{scope}</div> : null}
      </div>
    </div>
    <div ref={actionTargetRef} className="standard-page-header__actions" aria-label="页面操作">
      {extra ? <Space className="standard-page-header__extra" wrap>{extra}</Space> : null}
    </div>
  </header>;
}

export type StandardPageActionsProps = {
  children: ReactNode;
};

export function StandardPageActions({ children }: StandardPageActionsProps) {
  const target = useContext(StandardPageActionTarget);
  if (target === undefined) return <>{children}</>;
  return target ? createPortal(children, target) : null;
}

export type StandardQueryPanelProps = Omit<CardProps, 'title' | 'children'> & {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function StandardQueryPanel({ title = '查询条件', description, actions, children, className = '', ...cardProps }: StandardQueryPanelProps) {
  const classes = ['standard-query-panel', className].filter(Boolean).join(' ');
  return <Card {...cardProps} className={classes} title={title}>
    {description ? <Typography.Paragraph type="secondary" className="standard-query-panel__description">{description}</Typography.Paragraph> : null}
    <div className="standard-query-panel__body">{children}</div>
    {actions ? <Space className="standard-query-panel__actions" wrap>{actions}</Space> : null}
  </Card>;
}

export type StandardResultSectionProps = Omit<CardProps, 'title' | 'children'> & {
  title?: ReactNode;
  total?: number;
  extra?: ReactNode;
  children: ReactNode;
};

export function StandardResultSection({ title = '查询结果', total, extra, children, className = '', ...cardProps }: StandardResultSectionProps) {
  const classes = ['standard-result-section', className].filter(Boolean).join(' ');
  const heading = <Space size={8}><span>{title}</span>{typeof total === 'number' ? <Typography.Text type="secondary">共 {total} 条</Typography.Text> : null}</Space>;
  return <Card {...cardProps} className={classes} title={heading} extra={extra}>
    {children}
  </Card>;
}

export type StandardTableProps<RecordType extends object = Record<string, unknown>> = TableProps<RecordType> & {
  tableLabel?: string;
};

export function StandardTable<RecordType extends object = Record<string, unknown>>({ tableLabel = '数据列表', className = '', ...props }: StandardTableProps<RecordType>) {
  const classes = ['standard-table', className].filter(Boolean).join(' ');
  return <div className="standard-table__viewport" role="region" aria-label={tableLabel} tabIndex={0}>
    <Table<RecordType> {...props} className={classes} scroll={props.scroll || { x: 'max-content' }} />
  </div>;
}

export type StandardDetailDrawerProps = DrawerProps & {
  description?: ReactNode;
};

export function StandardDetailDrawer({ title, description, children, className = '', ...props }: StandardDetailDrawerProps) {
  const classes = ['standard-detail-drawer', className].filter(Boolean).join(' ');
  return <Drawer {...props} className={classes} title={title}>
    {description ? <Typography.Paragraph type="secondary" className="standard-detail-drawer__description">{description}</Typography.Paragraph> : null}
    {children}
  </Drawer>;
}

export type StandardEditorPageProps = {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
};

export function StandardEditorPage({ title, description, children, primaryAction, secondaryAction, className = '' }: StandardEditorPageProps) {
  return <StandardPage title={title} description={description} className={['standard-editor-page', className].filter(Boolean).join(' ')}>
    <Card className="standard-editor-page__card">
      <div className="standard-editor-page__body">{children}</div>
      {(primaryAction || secondaryAction) ? <Space className="standard-editor-page__actions" wrap>{secondaryAction}{primaryAction}</Space> : null}
    </Card>
  </StandardPage>;
}

export type StandardPageStateProps = {
  state: 'loading' | 'empty' | 'error' | 'forbidden' | 'warning';
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  resultStatus?: ResultProps['status'];
};

export function StandardPageState({ state, title, description, action, resultStatus }: StandardPageStateProps) {
  if (state === 'loading') return <div className="standard-page-state standard-page-state--loading" role="status"><Spin size="large" /><Typography.Text type="secondary">{title || '正在加载…'}</Typography.Text></div>;
  if (state === 'empty') return <div className="standard-page-state"><EmptyState title={title} description={description} action={action} /></div>;
  if (state === 'warning') return <PageFeedback className="standard-page-state" tone="warning" title={title || '请注意'} description={description} action={action} />;
  const forbidden = state === 'forbidden';
  return <FullPageFeedback className="standard-page-state" status={resultStatus || (forbidden ? '403' : 'error')} title={title || (forbidden ? '暂无访问权限' : '加载失败')} subTitle={description} extra={action} />;
}
