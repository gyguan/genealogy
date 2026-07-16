import { Select } from 'antd';
import type { CultureClanOption } from './cultureLibraryService';

function clanLabel(clan: CultureClanOption) {
  return clan.clanName || clan.surname || '未命名宗族';
}

type Props = {
  value?: string;
  clans: CultureClanOption[];
  loading: boolean;
  onChange: (value: string) => void;
};

export function CultureClanSelect({ value, clans, loading, onChange }: Props) {
  return (
    <Select
      aria-label="宗族"
      value={value || undefined}
      placeholder="请选择宗族"
      loading={loading}
      showSearch
      optionFilterProp="label"
      onChange={next => onChange(String(next))}
      options={clans.filter(clan => clan.id).map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))}
    />
  );
}
