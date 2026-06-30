import { Alert, Space } from 'antd';

export type ToastItem = {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info';
};

export function ToastStack({ items, onClose }: { items: ToastItem[]; onClose: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <Space className="toast-stack antd-toast-stack" direction="vertical" size="small">
      {items.map(item => (
        <Alert
          key={item.id}
          showIcon
          closable
          type={item.type || 'success'}
          message={item.message}
          onClose={() => onClose(item.id)}
        />
      ))}
    </Space>
  );
}
