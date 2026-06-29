import { useEffect } from 'react';
import type { ReactNode } from 'react';

export function Modal({ open, title, children, onClose, width = 720 }: { open: boolean; title: string; children: ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-mask" onClick={onClose} role="presentation">
      <section className="modal-panel" style={{ maxWidth: width }} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="ghost" onClick={onClose}>关闭</button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
