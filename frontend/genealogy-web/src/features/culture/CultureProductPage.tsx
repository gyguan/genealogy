import { useEffect, useRef, useState } from 'react';
import { Card, Space, Tabs, Typography, message } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { CultureItemMaintenanceTab } from './CultureItemMaintenanceTab';
import { MigrationEventStandardTab } from './MigrationEventStandardTab';
import { CultureSiteStandardTab } from './CultureSiteStandardTab';
import { cultureMobileClass, cultureTabItems } from './culturePagePattern';
import { listCultureClans } from './cultureLibraryService';
import type { CultureClanOption } from './cultureLibraryService';
import { buildCultureTabLocation, readCultureTabLocation, resolveCultureTabMounts } from './cultureTabState';
import type { CultureTabKey } from './cultureTabState';
import './culture.css';

const { Title } = Typography;

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CultureProductPage() {
  const workspace = useWorkspace();
  const initialLocation = useRef(readCultureTabLocation()).current;
  const [messageApi, messageContext] = message.useMessage();
  const [activeTab, setActiveTab] = useState<CultureTabKey>(initialLocation.tab);
  const [clans, setClans] = useState<CultureClanOption[]>([]);
  const [clansLoading, setClansLoading] = useState(false);

  useEffect(() => {
    if (!initialLocation.needsNormalization) return;
    const href = buildCultureTabLocation(window.location.href, initialLocation.tab);
    window.history.replaceState(window.history.state, '', href);
  }, [initialLocation]);

  useEffect(() => {
    const onPopState = () => {
      const next = readCultureTabLocation();
      setActiveTab(next.tab);
      if (next.needsNormalization) {
        const href = buildCultureTabLocation(window.location.href, next.tab);
        window.history.replaceState(window.history.state, '', href);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    setClansLoading(true);
    listCultureClans()
      .then(rows => {
        if (!active) return;
        setClans(rows);
        if (!workspace.clanId && rows[0]?.id) workspace.setClanId(String(rows[0].id));
      })
      .catch(error => {
        if (!active) return;
        setClans([]);
        messageApi.error(errorText(error, '宗族列表加载失败'));
      })
      .finally(() => {
        if (active) setClansLoading(false);
      });
    return () => { active = false; };
  }, []);

  function changeTab(key: string) {
    const tab = key as CultureTabKey;
    setActiveTab(tab);
    const href = buildCultureTabLocation(window.location.href, tab);
    window.history.pushState(window.history.state, '', href);
  }

  function renderActiveTab() {
    const mounts = resolveCultureTabMounts(activeTab);
    const clanProps = {
      clanId: workspace.clanId,
      clans,
      clansLoading,
      onClanChange: workspace.setClanId
    };
    return (
      <div className={`culture-managed-tab ${cultureMobileClass(activeTab)}`}>
        {mounts.items ? <CultureItemMaintenanceTab {...clanProps} /> : null}
        {mounts.migrations ? <MigrationEventStandardTab {...clanProps} /> : null}
        {mounts.sites ? <CultureSiteStandardTab {...clanProps} /> : null}
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {messageContext}
      <Card className="culture-page-header">
        <div className="culture-page-header-main">
          <div className="culture-page-heading">
            <Title level={3}>宗族文化</Title>
          </div>
        </div>
        <Tabs activeKey={activeTab} items={cultureTabItems} onChange={changeTab} />
      </Card>

      {renderActiveTab()}
    </Space>
  );
}
