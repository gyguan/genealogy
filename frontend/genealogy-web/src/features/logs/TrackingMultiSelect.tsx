import type { ReactNode } from 'react';
import { QueryMultiSelect } from '../../shared/ui/QueryMultiSelect';

export type TrackingOption = {
  value?: string;
  label: ReactNode;
  options?: TrackingOption[];
};

type Props = {
  value: string;
  options: TrackingOption[];
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  notFoundContent?: ReactNode;
};

function selectedValues(value: string) {
  return Array.from(new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean)));
}

export function TrackingMultiSelect({ value, options, placeholder, ariaLabel, onChange, notFoundContent }: Props) {
  return (
    <QueryMultiSelect<string>
      aria-label={ariaLabel}
      value={selectedValues(value)}
      options={options}
      placeholder={placeholder}
      notFoundContent={notFoundContent}
      onChange={values => onChange(values.join(','))}
    />
  );
}
