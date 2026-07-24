import {
  useEffect,
  useRef,
  useState } from 'react';
import { Spin
} from 'antd';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { CultureItemMaintenanceTab } from './CultureItemMaintenanceTab';
import { MigrationEventStandardTab } from './MigrationEventStandardTab';
import { CultureSiteStandardTab } from './CultureSiteStandardTab';
import { cultureMobileClass } from './culturePagePattern';
import { listCultureClans } from './cultureLibraryService';
import type { CultureClanOption } from './cultureLibraryService';
import { buildCultureTabLocation, readCultureTabLocation, resolveCultureTabMounts } from './cultureTabState';
import type { CultureTabKey } from './cultureTabState';
import './culture.css';

import { feedback } from '../../shared/ui/OperationFeedback';

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CultureProductPage() {
  const workspace = useWorkspace();
  const initialLocation = useRef(readCultureTabLocation()).current;
  const [messageApi, messageContext] = message.useMessage();
  const [activeTab, setActiveTab] = useState<CultureTabKey>(initialLocation.tab);
  const [clans, setClans] = useState<CultureClanOption[]>([]);
  const [clansLoading, setClansLoading] = useState(true);

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
        feedback.error(errorText(error, '宗族列表加载失败'));
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
        {mounts.items ? <CultureItemMaintenanceTab {...clanProps} activeTab={activeTab} onTabChange={changeTab} /> : null}
        {mounts.migrations ? <MigrationEventStandardTab {...clanProps} activeTab={activeTab} onTabChange={changeTab} /> : null}
        {mounts.sites ? <CultureSiteStandardTab {...clanProps} activeTab={activeTab} onTabChange={changeTab} /> : null}
      </div>
    );
  }

  const hydratingInitialClan = clansLoading && !workspace.clanId;

  return (
    <div className="tabbed-module-page culture-product-page">
      {messageContext}
      {hydratingInitialClan ? <div className="culture-page-loading"><Spin size="large" tip="正在加载宗族文化…" /></div> : renderActiveTab()}
    </div>
  );
}
