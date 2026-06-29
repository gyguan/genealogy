export type ToastItem = {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info';
};

export function ToastStack({ items, onClose }: { items: ToastItem[]; onClose: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="toast-stack">
      {items.map(item => (
        <div key={item.id} className={`toast toast--${item.type || 'success'}`}>
          <span>{item.message}</span>
          <button className="toast__close" onClick={() => onClose(item.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
