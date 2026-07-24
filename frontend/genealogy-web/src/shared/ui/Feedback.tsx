import type { ReactNode } from 'react';
import { Alert, Empty as AntEmpty, Modal, Popconfirm, Result } from 'antd';
import type { AlertProps, EmptyProps, ModalFuncProps, PopconfirmProps, ResultProps } from 'antd';
import '../../feedback-system.css';

export type FeedbackTone = 'success' | 'info' | 'warning' | 'error';
export type FeedbackVariant = 'page' | 'section' | 'inline' | 'toast';

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
