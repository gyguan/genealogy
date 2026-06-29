import type { ReactNode } from 'react';

export function Modal({ open, title, children, onClose, width = 720 }: { open: boolean; title: string; children: ReactNode; onClose: () => void; width?: number }) {
  if (!open) return null;
  return (
    <div className="modal-mask" onClick={onClose}>
      <section className="modal-panel" style={{ maxWidth: width }} onClick={event => event.stopPropagation()}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="ghost" onClick={onClose}>关闭</button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
