import type { ReactNode } from 'react';
import './wizard-result-list.css';

type Props = { children: ReactNode };

export function WizardResultListBoundary({ children }: Props) {
  return <div className="wizard-result-list-boundary">{children}</div>;
}
