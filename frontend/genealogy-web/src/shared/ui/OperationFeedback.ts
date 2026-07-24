import { message } from 'antd';

export type OperationFeedbackTone = 'success' | 'info' | 'warning' | 'error';
export type OperationFeedbackContent = string | {
  message: string;
  duration?: number;
};

function normalizeUnknown(data: unknown, fallback: string): OperationFeedbackContent {
  if (typeof data === 'string') return data;
  if (data instanceof Error) return data.message || fallback;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const message = record.message ?? record.errorMessage ?? record.status;
    const duration = typeof record.duration === 'number' ? record.duration : undefined;
    if (message !== undefined && message !== null) return { message: String(message), duration };
  }
  return data === undefined || data === null ? fallback : String(data);
}

function normalize(content: OperationFeedbackContent) {
  return typeof content === 'string'
    ? { message: content, duration: 3.2 }
    : { message: content.message, duration: content.duration ?? 3.2 };
}

function emit(type: OperationFeedbackTone, content: OperationFeedbackContent) {
  const normalized = normalize(content);
  return message.open({
    type,
    content: normalized.message,
    duration: normalized.duration
  });
}

/**
 * 用户主动操作后的短暂反馈唯一入口。
 * 需要持续展示、重试或人工处理的错误应使用 PageFeedback，避免重复提示。
 */
export const feedback = {
  success: (content: OperationFeedbackContent) => emit('success', content),
  info: (content: OperationFeedbackContent) => emit('info', content),
  warning: (content: OperationFeedbackContent) => emit('warning', content),
  error: (content: OperationFeedbackContent) => emit('error', content),
  from: (data: unknown, error = false) => {
    const record = data && typeof data === 'object' ? data as Record<string, unknown> : null;
    const requestedTone = record?.type;
    const tone: OperationFeedbackTone = error
      ? 'error'
      : requestedTone === 'success' || requestedTone === 'info' || requestedTone === 'warning' || requestedTone === 'error'
        ? requestedTone
        : 'success';
    return emit(tone, normalizeUnknown(data, error ? '操作失败，请稍后重试' : '操作成功'));
  }
};
