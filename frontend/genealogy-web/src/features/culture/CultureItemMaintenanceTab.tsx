import { useEffect, useState } from 'react';
import { Alert, Space } from 'antd';
import { CultureItemStandardTab } from './CultureItemStandardTab';
import type { CultureClanOption } from './cultureLibraryService';
import type { CultureTabKey } from './cultureTabState';
import { subscribeCultureItemRefresh } from './cultureLibraryService';

type Props = {
  clanId?: string;
  clans: CultureClanOption[];
  clansLoading: boolean;
  onClanChange: (clanId: string) => void;
  activeTab: CultureTabKey;
  onTabChange: (tab: string) => void;
};

export function CultureItemMaintenanceTab({ clanId, clans, clansLoading, onClanChange, activeTab, onTabChange }: Props) {
  const [refreshError, setRefreshError] = useState('');

  useEffect(() => subscribeCultureItemRefresh(message => setRefreshError(message || '')), []);

  useEffect(() => {
    setRefreshError('');
  }, [clanId]);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {refreshError ? (
        <Alert
          type="warning"
          showIcon
          message="文化资料刷新失败，仍显示上次查询结果"
          description={refreshError}
          closable
          onClose={() => setRefreshError('')}
        />
      ) : null}
      <CultureItemStandardTab clanId={clanId} clans={clans} clansLoading={clansLoading} onClanChange={onClanChange} activeTab={activeTab} onTabChange={onTabChange} />
    </Space>
  );
}
