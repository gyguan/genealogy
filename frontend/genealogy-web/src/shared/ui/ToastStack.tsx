import { Space } from 'antd';
import { PageFeedback, type FeedbackTone } from './Feedback';

export type ToastItem = {
  id: number;
  message: string;
  description?: string;
  type?: FeedbackTone;
};

export function ToastStack({ items, onClose }: { items: ToastItem[]; onClose: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <Space className="toast-stack antd-toast-stack" direction="vertical" size="small">
      {items.map(item => (
        <PageFeedback
          key={item.id}
          variant="toast"
          tone={item.type || 'success'}
          title={item.message}
          description={item.description}
          closable
          onClose={() => onClose(item.id)}
        />
      ))}
    </Space>
  );
}
