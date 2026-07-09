import type { ReactNode } from 'react';
import { Modal as AntdModal } from 'antd';

export function Modal({ open, title, children, onClose, width = 720 }: { open: boolean; title: string; children: ReactNode; onClose: () => void; width?: number }) {
  return (
    <AntdModal
      open={open}
      title={title}
      width={width}
      onCancel={onClose}
      footer={null}
      destroyOnClose
    >
      {children}
    </AntdModal>
  );
}
