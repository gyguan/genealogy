import { useEffect, useRef, useState } from 'react';
import { Button, Card, Select, Space, Tabs, Typography, message } from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { CultureItemMaintenanceTab } from './CultureItemMaintenanceTab';
import { MigrationEventStandardTab } from './MigrationEventStandardTab';
import { CultureSiteStandardTab } from './CultureSiteStandardTab';
import { buildCultureEditorLocation } from './cultureEditorState';
import { listCultureClans } from './cultureLibraryService';
import type { CultureClanOption } from './cultureLibraryService';
import { buildCultureTabLocation, readCultureTabLocation, resolveCultureTabMounts } from './cultureTabState';
import type { CultureTabKey } from './cultureTabState';
import './culture.css';

const { Paragraph, Text, Title } = Typography;

const tabItems = [
  { key: 'items', label: '文化资料' },
  { key: 'migrations', label: '迁徙脉络' },
  { key: 'sites', label: '文化场所' }
] satisfies Array<{ key: CultureTabKey; label: string }>;

const primaryActionText: Record<CultureTabKey, string> = {
  items: '新增资料',
  migrations: '新增迁徙事件',
  sites: '新增场所'
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function clanLabel(clan: CultureClanOption) {
  return clan.clanName || clan.surname || '未命名宗族';
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

  function openPrimaryAction() {
    if (!workspace.clanId) return;
    if (activeTab === 'items') {
      window.dispatchEvent(new CustomEvent('culture:item:create'));
      return;
    }
    const target = activeTab === 'migrations' ? 'migration' : 'site';
    const href = buildCultureEditorLocation(window.location.href, { target, mode: 'create' });
    window.history.pushState(window.history.state, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function renderActiveTab() {
    const mounts = resolveCultureTabMounts(activeTab);
    return (
      <div className={`culture-managed-tab culture-tab-${activeTab}`}>
        {mounts.items ? <CultureItemMaintenanceTab clanId={workspace.clanId} /> : null}
        {mounts.migrations ? <MigrationEventStandardTab /> : null}
        {mounts.sites ? <CultureSiteStandardTab /> : null}
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
            <Paragraph type="secondary">查询和维护宗族文化资料、迁徙脉络及文化场所。</Paragraph>
          </div>
          <div className="culture-page-context-actions">
            <div className="culture-clan-scope">
              <Text type="secondary">当前宗族</Text>
              <Select
                aria-label="当前宗族"
                value={workspace.clanId || undefined}
                placeholder="请选择宗族"
                loading={clansLoading}
                showSearch
                optionFilterProp="label"
                onChange={value => workspace.setClanId(String(value))}
                options={clans.filter(clan => clan.id).map(clan => ({ value: String(clan.id), label: clanLabel(clan) }))}
              />
            </div>
            <Button type="primary" className="culture-page-primary-action" disabled={!workspace.clanId} onClick={openPrimaryAction}>
              {primaryActionText[activeTab]}
            </Button>
          </div>
        </div>
        <Tabs activeKey={activeTab} items={tabItems} onChange={changeTab} />
      </Card>

      {renderActiveTab()}
    </Space>
  );
}
