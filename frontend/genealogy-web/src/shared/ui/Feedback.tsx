import type { ReactNode } from 'react';
import { Alert, Empty as AntEmpty, Modal, Popconfirm, Result, Spin } from 'antd';
import type { AlertProps, EmptyProps, ModalFuncProps, PopconfirmProps, ResultProps } from 'antd';
import '../../feedback-system.css';

export type FeedbackTone = 'success' | 'info' | 'warning' | 'error';
export type FeedbackVariant = 'page' | 'section' | 'inline' | 'toast';
export type PageStateKind = 'prerequisite' | 'first-empty' | 'no-results' | 'forbidden' | 'loading' | 'error';

export type PageFeedbackProps = Omit<AlertProps, 'type' | 'message' | 'description' | 'action' | 'showIcon' | 'variant'> & {
  tone?: FeedbackTone;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: FeedbackVariant;
  closable?: boolean;
  className?: string;
  onClose?: AlertProps['onClose'];
};

function classNames(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(' ');
}

/**
 * 页面与区块级持久提示的唯一标准入口。
 * - page/section：加载失败、权限限制、数据陈旧等需要持续可见的状态。
 * - inline：查询条件变更、轻量规则说明等局部状态。
 * - toast：由 ToastStack 使用的短暂操作反馈。
 */
export function PageFeedback({
  tone = 'info',
  title,
  description,
  action,
  variant = 'section',
  closable = false,
  className,
  onClose,
  ...alertProps
}: PageFeedbackProps) {
  return (
    <Alert
      {...alertProps}
      className={classNames('ui-feedback', `ui-feedback--${variant}`, className)}
      type={tone}
      showIcon
      closable={closable}
      message={title}
      description={description}
      action={action}
      onClose={onClose}
    />
  );
}

export function InlineFeedback(props: Omit<PageFeedbackProps, 'variant'>) {
  return <PageFeedback {...props} variant="inline" />;
}

export type EmptyStateProps = Omit<EmptyProps, 'description' | 'children'> & {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  children?: ReactNode;
};

/** 空状态的统一入口，同时兼容历史 Ant Design Empty 常用属性。 */
export function EmptyState({
  title,
  description,
  action,
  compact = false,
  className,
  image = AntEmpty.PRESENTED_IMAGE_SIMPLE,
  children,
  ...emptyProps
}: EmptyStateProps) {
  const content = title ? (
    <span className="ui-empty-state__content">
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
    </span>
  ) : (description ?? '暂无数据');

  return (
    <AntEmpty
      {...emptyProps}
      className={classNames('ui-empty-state', compact && 'ui-empty-state--compact', className)}
      image={image}
      description={content}
    >
      {action ?? children}
    </AntEmpty>
  );
}

export namespace EmptyState {
  export const PRESENTED_IMAGE_DEFAULT = AntEmpty.PRESENTED_IMAGE_DEFAULT;
  export const PRESENTED_IMAGE_SIMPLE = AntEmpty.PRESENTED_IMAGE_SIMPLE;
}

/** 仅用于整页无法继续的 403/404/500 等状态。 */
export function FullPageFeedback(props: ResultProps) {
  return <Result {...props} className={classNames('ui-full-page-feedback', props.className)} />;
}

export type PageStateProps = {
  kind: PageStateKind;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
  loadingTip?: ReactNode;
};

const pageStateDefaults: Record<PageStateKind, { title: string; description: string }> = {
  prerequisite: { title: '请先补齐必要信息', description: '完成前置条件后即可继续当前操作。' },
  'first-empty': { title: '暂无业务数据', description: '可通过创建或导入开始维护数据。' },
  'no-results': { title: '未找到符合条件的结果', description: '请调整或重置查询条件后重试。' },
  forbidden: { title: '无权访问当前内容', description: '当前账号没有查看或操作该内容的权限。' },
  loading: { title: '正在加载', description: '请稍候。' },
  error: { title: '内容加载失败', description: '请稍后重试。' }
};

/**
 * 六类正式页面状态的统一语义入口。
 * - prerequisite / forbidden / error：阻断型 Result，不继续展示无效业务区域。
 * - first-empty / no-results：Empty，明确区分首次无数据与查询无结果。
 * - loading：首次加载使用居中加载态，不以空列表冒充结果。
 */
export function PageState({ kind, title, description, action, compact = false, className, loadingTip }: PageStateProps) {
  const defaults = pageStateDefaults[kind];
  const stateTitle = title ?? defaults.title;
  const stateDescription = description ?? defaults.description;

  if (kind === 'loading') {
    return (
      <div className={classNames('ui-page-state', 'ui-page-state--loading', className)} data-page-state={kind} role="status" aria-live="polite">
        <Spin size="large" tip={loadingTip ?? stateTitle} />
      </div>
    );
  }

  if (kind === 'first-empty' || kind === 'no-results') {
    return (
      <div className={classNames('ui-page-state', `ui-page-state--${kind}`, className)} data-page-state={kind}>
        <EmptyState compact={compact} title={stateTitle} description={stateDescription} action={action} />
      </div>
    );
  }

  const status: ResultProps['status'] = kind === 'forbidden' ? '403' : kind === 'error' ? 'error' : 'info';
  return (
    <FullPageFeedback
      className={classNames('ui-page-state', `ui-page-state--${kind}`, className)}
      data-page-state={kind}
      status={status}
      title={stateTitle}
      subTitle={stateDescription}
      extra={action}
    />
  );
}

/** 刷新失败但仍有上次成功数据时的固定反馈，禁止清空当前结果。 */
export function RetainedDataFeedback({ description, action, className }: { description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <PageFeedback
      className={className}
      tone="warning"
      title="刷新失败，当前展示的是上次成功数据"
      description={description ?? '可稍后重试，当前筛选条件和已有结果已保留。'}
      action={action}
    />
  );
}

/** 高风险或不可逆操作的统一确认入口。 */
export function ConfirmAction({
  okText = '确认',
  cancelText = '取消',
  placement = 'topRight',
  danger = false,
  children,
  ...props
}: PopconfirmProps & { danger?: boolean }) {
  return (
    <Popconfirm
      {...props}
      placement={placement}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{ ...props.okButtonProps, danger: danger || props.okButtonProps?.danger }}
    >
      {children}
    </Popconfirm>
  );
}

/** 命令式确认的统一入口，仅用于无法随触发器渲染 ConfirmAction 的场景。 */
export function confirmAction(options: ModalFuncProps) {
  return Modal.confirm({
    okText: '确认',
    cancelText: '取消',
    centered: true,
    ...options,
    okButtonProps: {
      ...options.okButtonProps,
      danger: options.okButtonProps?.danger || options.type === 'error'
    }
  });
}
