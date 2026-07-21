import { QueryMultiSelect } from '../../shared/ui/QueryMultiSelect';

export type ImportFilterOption<Value extends string> = { value: Value; label: string };

type Props<Value extends string> = {
  value?: Value[];
  options: ImportFilterOption<Value>[];
  placeholder: string;
  ariaLabel: string;
  onChange?: (value: Value[]) => void;
};

export function ImportFilterMultiSelect<Value extends string>({
  value,
  options,
  placeholder,
  ariaLabel,
  onChange
}: Props<Value>) {
  return (
    <QueryMultiSelect<Value>
      aria-label={ariaLabel}
      value={value}
      options={options}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
}
