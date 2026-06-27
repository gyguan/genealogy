import type { ReactNode } from 'react';

export function Panel(props: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2>{props.title}</h2>
          {props.description ? <p>{props.description}</p> : null}
        </div>
        {props.actions ? <div className="panel__actions">{props.actions}</div> : null}
      </div>
      {props.children}
    </section>
  );
}
