import { Tabs, Typography } from 'antd';
import type { CultureTabKey } from './cultureTabState';
import { cultureTabItems } from './culturePagePattern';

const { Paragraph } = Typography;

type Props = {
  activeTab: CultureTabKey;
  description: string;
  onTabChange: (tab: string) => void;
};

export function CultureSearchHeader({ activeTab, description, onTabChange }: Props) {
  return (
    <div className="culture-search-header">
      <Tabs activeKey={activeTab} items={cultureTabItems} onChange={onTabChange} />
      <Paragraph type="secondary" className="culture-search-description">{description}</Paragraph>
    </div>
  );
}
