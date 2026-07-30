import { Typography } from 'antd';
import type { CultureTabKey } from './cultureTabState';

const { Paragraph } = Typography;

type Props = {
  activeTab: CultureTabKey;
  description?: string;
  onTabChange: (tab: string) => void;
};

export function CultureSearchHeader({ activeTab: _activeTab, description, onTabChange: _onTabChange }: Props) {
  if (!description) return null;
  return <Paragraph type="secondary" className="culture-search-description">{description}</Paragraph>;
}
