import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Empty, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { DataTable, type Column, toRecordList } from '../../shared/ui/DataTable';

const SCHEME_COLUMNS: Column<any>[] = [
  { key: 'schemeName', title: '字辈方案' },
  { key: 'branchId', title: '支派', render: row => row.branchName || row.branchId || '-' },
  { key: 'status', title: '状态', render: row => statusText(row) }
];

const ITEM_COLUMNS: Column<any>[] = [
  { key: 'generationNo', title: '代次', render: row => row.generationNo ? `第${row.generationNo}世` : '-' },
  { key: 'word', title: '字辈', render: row => row.word || '-' }
];

function statusOf(row: any) {
  return String(row?.status || row?.dataStatus || row?.verificationStatus || '').trim().toLowerCase();
}

function statusText(row: any) {
  const status = statusOf(row);
  const dict: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审核',
    official: '已通过',
    rejected: '已驳回',
    archived: '已归档'
  };
  return dict[status] || status || '-';
}

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function activeStepIndex() {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>('.mvp1-wizard-page .wizard-steps > button'));
  return buttons.findIndex(button => button.classList.contains('active')) + 1;
}

function generationSchemeHost() {
  return document.querySelector<HTMLElement>('.mvp1-wizard-page .wizard-generation-section:not(.wizard-generation-section--items)');
}

function generationItemHost() {
  return document.querySelector<HTMLElement>('.mvp1-wizard-page .wizard-generation-section--items');
}

function currentSchemeId(host: HTMLElement | null) {
  if (!host) return '';
  const selects = Array.from(host.querySelectorAll<HTMLSelectElement>('select'));
  return selects[2]?.value || '';
}

export function GenerationStepListsPanel() {
  const schemeRequestSeq = useRef(0);
  const itemRequestSeq = useRef(0);
  const [schemeHost, setSchemeHost] = useState<HTMLElement | null>(null);
  const [itemHost, setItemHost] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [schemeId, setSchemeId] = useState('');
  const [schemes, setSchemes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [schemeSearched, setSchemeSearched] = useState(false);
  const [itemSearched, setItemSearched] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (activeStepIndex() !== 3) {
        setSchemeHost(null);
        setItemHost(null);
        return;
      }
      const nextSchemeHost = generationSchemeHost();
      setSchemeHost(nextSchemeHost);
      setItemHost(generationItemHost());
      setClanId(getWorkspaceValue('clanId'));
      setSchemeId(currentSchemeId(nextSchemeHost));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSchemes([]);
    setSchemeSearched(false);
    if (!schemeHost || !clanId) return;
    const timer = window.setTimeout(() => void loadSchemes(), 0);
    return () => window.clearTimeout(timer);
  }, [schemeHost, clanId]);

  useEffect(() => {
    setItems([]);
    setItemSearched(false);
    if (!itemHost || !schemeId) return;
    const timer = window.setTimeout(() => void loadItems(), 0);
    return () => window.clearTimeout(timer);
  }, [itemHost, schemeId]);

  async function loadSchemes() {
    if (!clanId) return;
    const seq = ++schemeRequestSeq.current;
    setLoadingSchemes(true);
    setSchemeSearched(true);
    try {
      const data = await apiClient.get(`/clans/${clanId}/generation-schemes`);
      if (seq === schemeRequestSeq.current) setSchemes(toRecordList(data));
    } catch (error) {
      if (seq === schemeRequestSeq.current) {
        setSchemes([]);
        message.error((error as Error).message || '查询字辈方案失败');
      }
    } finally {
      if (seq === schemeRequestSeq.current) setLoadingSchemes(false);
    }
  }

  async function loadItems() {
    if (!schemeId) return;
    const seq = ++itemRequestSeq.current;
    setLoadingItems(true);
    setItemSearched(true);
    try {
      const data = await apiClient.get(`/generation-schemes/${schemeId}/items`);
      if (seq === itemRequestSeq.current) setItems(toRecordList(data));
    } catch (error) {
      if (seq === itemRequestSeq.current) {
        setItems([]);
        message.error((error as Error).message || '查询字辈明细失败');
      }
    } finally {
      if (seq === itemRequestSeq.current) setLoadingItems(false);
    }
  }

  const schemeList = schemeHost ? createPortal(
    <section className="wizard-branch-list wizard-generation-inline-list">
      <div className="wizard-inline-list-header">
        <h4>该宗族下已有字辈方案</h4>
        <Button size="small" loading={loadingSchemes} onClick={() => void loadSchemes()}>刷新</Button>
      </div>
      {!schemeSearched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="正在加载字辈方案" /> : <DataTable data={schemes} empty="暂无字辈方案，创建后会显示在这里" columns={SCHEME_COLUMNS} />}
    </section>,
    schemeHost
  ) : null;

  const itemList = itemHost ? createPortal(
    <section className="wizard-branch-list wizard-generation-detail-list">
      <div className="wizard-inline-list-header">
        <h4>字辈明细查询列表</h4>
        <Button size="small" disabled={!schemeId} loading={loadingItems} onClick={() => void loadItems()}>刷新</Button>
      </div>
      <Typography.Paragraph type="secondary">请选择已审核通过的字辈方案后查看明细。</Typography.Paragraph>
      {!schemeId ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先选择字辈方案" /> : !itemSearched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="正在加载字辈明细" /> : <DataTable data={items} empty="暂无字辈明细，追加后会显示在这里" columns={ITEM_COLUMNS} />}
    </section>,
    itemHost
  ) : null;

  return <>{schemeList}{itemList}</>;
}
