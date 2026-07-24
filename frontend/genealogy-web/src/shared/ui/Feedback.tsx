import type { ReactNode } from 'react';
import { Alert, Popconfirm, Result } from 'antd';
import type { AlertProps, PopconfirmProps, ResultProps } from 'antd';
import '../../feedback-system.css';

import { EmptyState } from './EmptyState';

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

export function EmptyState({
  title = '暂无数据',
  description,
  action,
  compact = false,
  className
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <EmptyState
      className={classNames('ui-empty-state', compact && 'ui-empty-state--compact', className)}
      image={EmptyState.PRESENTED_IMAGE_SIMPLE}
      description={(
        <span className="ui-empty-state__content">
          <strong>{title}</strong>
          {description ? <span>{description}</span> : null}
        </span>
      )}
    >
      {action}
    </EmptyState>
  );
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
