import { useEffect, useState } from 'react';
import { Alert, Space } from 'antd';
import { CultureItemTab } from './CultureItemTab';
import { subscribeCultureItemRefresh } from './cultureLibraryService';

export function CultureItemMaintenanceTab({ clanId }: { clanId: string }) {
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
      <CultureItemTab clanId={clanId} />
    </Space>
  );
}
