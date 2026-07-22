import { message } from 'antd';

export type OperationFeedbackTone = 'success' | 'info' | 'warning' | 'error';
export type OperationFeedbackContent = string | {
  message: string;
  duration?: number;
};

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
  error: (content: OperationFeedbackContent) => emit('error', content)
};
