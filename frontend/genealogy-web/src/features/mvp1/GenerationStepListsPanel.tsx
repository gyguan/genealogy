import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Empty, Input, Modal, Select, Space, Typography, message } from 'antd';
import { createPortal } from 'react-dom';
import { apiClient } from '../../shared/api/client';
import { DataTable, type Column, toRecordList } from '../../shared/ui/DataTable';

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

function isEditableScheme(row: any) {
  return ['draft', 'rejected'].includes(statusOf(row));
}

function generationNoOptions() {
  return Array.from({ length: 60 }, (_, index) => ({ label: `第${index + 1}世`, value: String(index + 1) }));
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

export function GenerationStepListsPanel() {
  const schemeRequestSeq = useRef(0);
  const itemRequestSeq = useRef(0);
  const [schemeHost, setSchemeHost] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [selectedSchemeId, setSelectedSchemeId] = useState('');
  const [generationNo, setGenerationNo] = useState('1');
  const [word, setWord] = useState('');
  const [schemes, setSchemes] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [schemeSearched, setSchemeSearched] = useState(false);
  const [itemSearched, setItemSearched] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [wordsModalOpen, setWordsModalOpen] = useState(false);

  const selectedScheme = useMemo(() => schemes.find(scheme => String(scheme.id) === selectedSchemeId), [schemes, selectedSchemeId]);

  const schemeColumns: Column<any>[] = [
    { key: 'schemeName', title: '字辈方案' },
    { key: 'branchId', title: '支派', render: row => row.branchName || row.branchId || '-' },
    { key: 'status', title: '状态', render: row => statusText(row) },
    {
      key: 'maintainWords',
      title: '维护字辈',
      render: row => isEditableScheme(row) ? (
        <Button
          size="small"
          type={String(row.id) === selectedSchemeId && wordsModalOpen ? 'primary' : 'default'}
          onClick={event => {
            event.stopPropagation();
            openWordsModal(row);
          }}
        >
          维护字辈
        </Button>
      ) : '-'
    }
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (activeStepIndex() !== 3) {
        setSchemeHost(null);
        return;
      }
      setSchemeHost(generationSchemeHost());
      setClanId(getWorkspaceValue('clanId'));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSchemes([]);
    setItems([]);
    setSelectedSchemeId('');
    setSchemeSearched(false);
    setItemSearched(false);
    setWordsModalOpen(false);
    if (!schemeHost || !clanId) return;
    const timer = window.setTimeout(() => void loadSchemes(), 0);
    return () => window.clearTimeout(timer);
  }, [schemeHost, clanId]);

  useEffect(() => {
    setItems([]);
    setItemSearched(false);
    if (!wordsModalOpen || !selectedSchemeId) return;
    const timer = window.setTimeout(() => void loadItems(selectedSchemeId), 0);
    return () => window.clearTimeout(timer);
  }, [wordsModalOpen, selectedSchemeId]);

  function openWordsModal(row: any) {
    if (!isEditableScheme(row)) {
      message.warning('仅草稿/已驳回字辈方案可维护字辈');
      return;
    }
    setSelectedSchemeId(String(row.id));
    setGenerationNo('1');
    setWord('');
    setWordsModalOpen(true);
  }

  async function loadSchemes() {
    if (!clanId) return;
    const seq = ++schemeRequestSeq.current;
    setLoadingSchemes(true);
    setSchemeSearched(true);
    try {
      const data = await apiClient.get(`/clans/${clanId}/generation-schemes`);
      const nextSchemes = toRecordList<any>(data);
      if (seq === schemeRequestSeq.current) {
        setSchemes(nextSchemes);
      }
    } catch (error) {
      if (seq === schemeRequestSeq.current) {
        setSchemes([]);
        message.error((error as Error).message || '查询字辈方案失败');
      }
    } finally {
      if (seq === schemeRequestSeq.current) setLoadingSchemes(false);
    }
  }

  async function loadItems(sourceSchemeId = selectedSchemeId) {
    if (!sourceSchemeId) return;
    const seq = ++itemRequestSeq.current;
    setLoadingItems(true);
    setItemSearched(true);
    try {
      const data = await apiClient.get(`/generation-schemes/${sourceSchemeId}/items`);
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

  async function addGenerationItem() {
    if (!selectedSchemeId) {
      message.warning('请先选择草稿/已驳回的字辈方案');
      return;
    }
    if (!generationNo) {
      message.warning('请选择代次');
      return;
    }
    if (!word.trim()) {
      message.warning('请填写字辈');
      return;
    }
    setAddingItem(true);
    try {
      await apiClient.post(`/generation-schemes/${selectedSchemeId}/items`, { generationNo: Number(generationNo), word: word.trim() });
      setWord('');
      setGenerationNo(String(Number(generationNo || '0') + 1));
      message.success('字辈明细已追加；完善后请在方案列表勾选该方案并提交审批');
      await loadItems(selectedSchemeId);
    } catch (error) {
      message.error((error as Error).message || '追加字辈明细失败');
    } finally {
      setAddingItem(false);
    }
  }

  const schemeList = schemeHost ? createPortal(
    <section className="wizard-branch-list wizard-generation-inline-list">
      <div className="wizard-inline-list-header">
        <h4>该宗族下已有字辈方案</h4>
        <Button size="small" loading={loadingSchemes} onClick={() => void loadSchemes()}>刷新</Button>
      </div>
      <Alert type="info" showIcon message="字辈方案与字辈明细作为一个整体提交审批：先保存草稿方案，再从列表点击“维护字辈”补充明细，最后勾选方案提交审批。" style={{ marginBottom: 10 }} />
      {!schemeSearched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="正在加载字辈方案" /> : <DataTable data={schemes} empty="暂无字辈方案，创建后会显示在这里" columns={schemeColumns} />}
    </section>,
    schemeHost
  ) : null;

  return <>
    {schemeList}
    <Modal
      title="维护字辈"
      open={wordsModalOpen}
      width={760}
      footer={null}
      destroyOnClose
      onCancel={() => setWordsModalOpen(false)}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message={selectedScheme ? `当前维护方案：${selectedScheme.schemeName || `方案#${selectedScheme.id}`}（${statusText(selectedScheme)}）` : '请选择草稿/已驳回字辈方案'}
        />
        <div className="wizard-generation-detail-form wizard-generation-word-grid">
          <label className="wizard-inline-form-field">
            <span>代次 *</span>
            <Select value={generationNo} options={generationNoOptions()} onChange={value => setGenerationNo(value)} />
          </label>
          <label className="wizard-inline-form-field">
            <span>字辈 *</span>
            <Input value={word} onChange={event => setWord(event.target.value)} placeholder="例如：德" />
          </label>
          <label className="wizard-inline-form-field wizard-generation-modal-action">
            <span>&nbsp;</span>
            <Button type="primary" disabled={!selectedSchemeId} loading={addingItem} onClick={() => void addGenerationItem()}>追加字辈</Button>
          </label>
        </div>
        <div className="wizard-inline-list-header">
          <h4>字辈明细查询列表</h4>
          <Button size="small" disabled={!selectedSchemeId} loading={loadingItems} onClick={() => void loadItems()}>刷新</Button>
        </div>
        <Typography.Paragraph type="secondary">字辈明细会随字辈方案整体提交审批；正式方案不可在此直接维护。</Typography.Paragraph>
        {!selectedSchemeId ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先从方案列表点击维护字辈" /> : !itemSearched ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="正在加载字辈明细" /> : <DataTable data={items} empty="暂无字辈明细，追加后会显示在这里" columns={ITEM_COLUMNS} />}
      </Space>
    </Modal>
  </>;
}
