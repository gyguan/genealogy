import { Tabs, Typography } from 'antd';
import type { CultureTabKey } from './cultureTabState';
import { cultureTabItems } from './culturePagePattern';

const { Paragraph, Title } = Typography;

type Props = {
  activeTab: CultureTabKey;
  description?: string;
  onTabChange: (tab: string) => void;
};

export function CultureSearchHeader({ activeTab, description, onTabChange }: Props) {
  return (
    <div className="culture-search-header">
      <Title level={3} className="culture-page-title">宗族文化</Title>
      <Tabs activeKey={activeTab} items={cultureTabItems} onChange={onTabChange} />
      {description ? <Paragraph type="secondary" className="culture-search-description">{description}</Paragraph> : null}
    </div>
  );
}
