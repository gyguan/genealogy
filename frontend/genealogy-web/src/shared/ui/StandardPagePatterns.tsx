import { createContext, useContext, useMemo, useState } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Card,
  Drawer,
  Form,
  Space,
  Spin,
  Table,
  Tabs,
  Typography
} from 'antd';
import type { CardProps, DrawerProps, FormItemProps, ResultProps, TableProps, TabsProps } from 'antd';
import { EmptyState, FullPageFeedback, PageFeedback } from './Feedback';
import '../../styles/shared/standard-page-patterns.css';
import '../../styles/shared/standard-query-card.css';

type StandardPageActionContextValue = {
  target: HTMLElement | null;
  setTarget: (target: HTMLElement | null) => void;
};

const StandardPageActionTarget = createContext<StandardPageActionContextValue | undefined>(undefined);

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

export function StandardPage({ title: _title, description: _description, scope: _scope, back, extra, children, className = '', pageKey }: StandardPageProps) {
  const classes = ['standard-page', className].filter(Boolean).join(' ');
  const [actionTarget, setActionTarget] = useState<HTMLElement | null>(null);
  const actionContext = useMemo(() => ({ target: actionTarget, setTarget: setActionTarget }), [actionTarget]);

  return <StandardPageActionTarget.Provider value={actionContext}>
    <section className={classes} data-standard-page={pageKey || 'standard'}>
      <StandardPageHeader back={back} />
      {extra ? <StandardPageActions><Space className="standard-result-section__page-actions" wrap>{extra}</Space></StandardPageActions> : null}
      <div className="standard-page__content">{children}</div>
    </section>
  </StandardPageActionTarget.Provider>;
}

export type StandardPageHeaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  scope?: ReactNode;
  back?: ReactNode;
  extra?: ReactNode;
  className?: string;
};

export function StandardPageHeader({ back, className = '' }: StandardPageHeaderProps) {
  if (!back) return null;
  const classes = ['standard-page-header', className].filter(Boolean).join(' ');
  return <header className={classes}>
    <div className="standard-page-header__back">{back}</div>
  </header>;
}

export type StandardPageActionsProps = {
  children: ReactNode;
};

export function StandardPageActions({ children }: StandardPageActionsProps) {
  const context = useContext(StandardPageActionTarget);
  if (context === undefined) return <>{children}</>;
  return context.target ? createPortal(children, context.target) : null;
}

export type StandardPageTabsProps = Omit<TabsProps, 'tabPosition'> & {
  ariaLabel?: string;
};

export function StandardPageTabs({ className = '', ariaLabel = '页面内容导航', animated = false, ...props }: StandardPageTabsProps) {
  return (
    <nav className={['standard-page-tabs', className].filter(Boolean).join(' ')} aria-label={ariaLabel} data-page-tabs-level="page">
      <Tabs {...props} animated={animated} tabPosition="top" />
    </nav>
  );
}

export type StandardQueryPanelProps = Omit<CardProps, 'title' | 'children' | 'actions'> & {
  title?: ReactNode;
  description?: ReactNode;
  tabs?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function StandardQueryPanel({ title = '查询条件', description, tabs, actions, children, className = '', ...cardProps }: StandardQueryPanelProps) {
  const classes = ['standard-query-panel', className].filter(Boolean).join(' ');
  return <Card {...cardProps} className={classes} title={title} data-query-panel-role="query">
    {description ? <Typography.Paragraph type="secondary" className="standard-query-panel__description">{description}</Typography.Paragraph> : null}
    {tabs ? <div className="standard-query-panel__tabs" data-query-tabs-level="parallel">{tabs}</div> : null}
    <div className="standard-query-panel__body">{children}</div>
    {actions ? <div className="standard-query-panel__actions">{actions}</div> : null}
  </Card>;
}

export type StandardQueryGridProps = {
  children: ReactNode;
  className?: string;
};

export function StandardQueryGrid({ children, className = '' }: StandardQueryGridProps) {
  return <div className={['standard-query-grid', className].filter(Boolean).join(' ')} data-query-grid-role="fields">{children}</div>;
}

export type StandardQueryFieldProps = Omit<FormItemProps, 'children' | 'extra'> & {
  children: ReactNode;
  hint?: ReactNode;
  reserveHintSpace?: boolean;
  wrapperClassName?: string;
};

export function StandardQueryField({
  children,
  hint,
  reserveHintSpace = true,
  wrapperClassName = '',
  className = '',
  ...formItemProps
}: StandardQueryFieldProps) {
  const wrapperClasses = ['standard-query-field', wrapperClassName].filter(Boolean).join(' ');
  const itemClasses = ['standard-query-field__item', className].filter(Boolean).join(' ');
  return <div className={wrapperClasses} data-query-field-role="field">
    <Form.Item {...formItemProps} className={itemClasses}>{children}</Form.Item>
    {reserveHintSpace || hint ? <div className="standard-query-field__hint">{hint || <span aria-hidden="true">&nbsp;</span>}</div> : null}
  </div>;
}

export type StandardAdvancedFiltersProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: ReactNode;
  expanded?: boolean;
};

export function StandardAdvancedFilters({ children, expanded = true, className = '', ...props }: StandardAdvancedFiltersProps) {
  return <div
    {...props}
    hidden={!expanded}
    aria-hidden={!expanded}
    className={['standard-query-grid', 'standard-query-advanced', className].filter(Boolean).join(' ')}
    data-query-advanced-role="filters"
  >{children}</div>;
}

export type StandardResultSectionProps = Omit<CardProps, 'title' | 'children'> & {
  title?: ReactNode;
  total?: number;
  extra?: ReactNode;
  children: ReactNode;
};

export function StandardResultSection({ title = '查询结果', total, extra, children, className = '', ...cardProps }: StandardResultSectionProps) {
  const classes = ['standard-result-section', className].filter(Boolean).join(' ');
  const heading = <Space size={4}><span>{title}</span>{typeof total === 'number' ? <Typography.Text type="secondary">（共 {total} 条）</Typography.Text> : null}</Space>;
  const actionContext = useContext(StandardPageActionTarget);
  const resultActions = <Space className="standard-result-section__actions" wrap>
    {actionContext ? <span ref={actionContext.setTarget} className="standard-result-section__page-action-target" /> : null}
    {extra}
  </Space>;

  return <Card {...cardProps} className={classes} title={heading} extra={resultActions} data-query-result-role="section">
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
