import { Modal } from './Modal';

export function ConfirmDialog({
  open,
  title = '确认操作',
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onClose
}: {
  open: boolean;
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} width={520}>
      <p className="confirm-description">{description}</p>
      <div className="actions">
        <button className={danger ? 'danger' : undefined} onClick={onConfirm}>{confirmText}</button>
        <button className="secondary" onClick={onClose}>{cancelText}</button>
      </div>
    </Modal>
  );
}
