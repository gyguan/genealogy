import { Button, Space, Tabs, Typography } from 'antd';
import type { CultureTabKey } from './cultureTabState';
import { cultureTabItems } from './culturePagePattern';

const { Paragraph, Title } = Typography;

type Props = {
  activeTab: CultureTabKey;
  description: string;
  primaryAction: string;
  primaryDisabled?: boolean;
  onTabChange: (tab: string) => void;
  onPrimaryAction: () => void;
};

export function CultureSearchHeader({ activeTab, description, primaryAction, primaryDisabled, onTabChange, onPrimaryAction }: Props) {
  return (
    <div className="culture-search-header">
      <div className="culture-page-header-main">
        <div className="culture-page-heading">
          <Title level={3}>宗族文化</Title>
          <Paragraph type="secondary">{description}</Paragraph>
        </div>
        <Space className="culture-page-context-actions">
          <Button className="culture-page-primary-action" type="primary" disabled={primaryDisabled} onClick={onPrimaryAction}>{primaryAction}</Button>
        </Space>
      </div>
      <Tabs activeKey={activeTab} items={cultureTabItems} onChange={onTabChange} />
    </div>
  );
}
