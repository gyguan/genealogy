import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Empty, Spin, Table, Typography } from 'antd';
import { apiClient } from '../../shared/api/client';
import { toRecordList } from '../../shared/ui/DataTable';

type GenerationWord = {
  id?: number | string;
  generationNo?: number | string;
  word?: string;
  description?: string;
  sortOrder?: number | string;
};

function getWorkspaceValue(key: string) {
  const runtimeValue = (window as any).__genealogyWorkspace?.[key];
  if (runtimeValue) return String(runtimeValue);
  return localStorage.getItem(`genealogy.workspace.${key}`) || '';
}

function reviewPanelBody() {
  return document.querySelector<HTMLElement>('.mvp1-wizard-page:has(.wizard-steps > button:nth-child(7).active) .panel:has(select option[value="generation-schemes"]) .ant-card-body');
}

function parsePayload(payload: unknown) {
  if (!payload) return null;
  if (typeof payload === 'object') return payload as any;
  try {
    return JSON.parse(String(payload));
  } catch {
    return null;
  }
}

function generationWordsFromDetail(detail: any): GenerationWord[] {
  const payload = parsePayload(detail?.auditRecord?.newPayload);
  return toRecordList<GenerationWord>(payload?.words);
}

function generationSchemeName(detail: any) {
  const payload = parsePayload(detail?.auditRecord?.newPayload);
  return payload?.scheme?.schemeName || `字辈方案#${detail?.auditRecord?.targetId || ''}`;
}

export function ReviewGenerationWordsPanel() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [taskId, setTaskId] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setContainer(reviewPanelBody());
      setTaskId(getWorkspaceValue('reviewTaskId'));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDetail(null);
    if (!container || !taskId) return;
    const timer = window.setTimeout(() => void loadDetail(taskId), 0);
    return () => window.clearTimeout(timer);
  }, [container, taskId]);

  async function loadDetail(sourceTaskId: string) {
    setLoading(true);
    try {
      const data = await apiClient.get(`/review-tasks/${sourceTaskId}/detail`).catch(() => apiClient.get(`/review-tasks/${sourceTaskId}`));
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  const isGenerationSchemeTask = detail?.auditRecord?.targetType === 'generation_scheme';
  const words = useMemo(() => isGenerationSchemeTask ? generationWordsFromDetail(detail) : [], [detail, isGenerationSchemeTask]);

  if (!container || !taskId || (!loading && !isGenerationSchemeTask)) return null;

  return createPortal(
    <section className="review-generation-words-panel">
      <Typography.Title level={5}>字辈方案审核详情</Typography.Title>
      {loading ? <Spin size="small" /> : (
        <>
          <Alert type="info" showIcon message={`当前审核方案：${generationSchemeName(detail)}`} style={{ marginBottom: 10 }} />
          {!words.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该审核快照未包含字辈明细" /> : (
            <Table<GenerationWord>
              size="small"
              rowKey={row => String(row.id || `${row.generationNo}-${row.word}`)}
              pagination={false}
              dataSource={words}
              columns={[
                { title: '代次', dataIndex: 'generationNo', key: 'generationNo', render: value => value ? `第${value}世` : '-' },
                { title: '字辈', dataIndex: 'word', key: 'word', render: value => value || '-' },
                { title: '说明', dataIndex: 'description', key: 'description', render: value => value || '-' }
              ]}
            />
          )}
        </>
      )}
    </section>,
    container
  );
}
