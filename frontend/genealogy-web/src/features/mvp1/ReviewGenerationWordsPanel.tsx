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

function isGenerationSchemeDetail(detail: any) {
  return detail?.auditRecord?.targetType === 'generation_scheme';
}

export function ReviewGenerationWordsPanel() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [clanId, setClanId] = useState('');
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setContainer(reviewPanelBody());
      setClanId(getWorkspaceValue('clanId'));
    }, 500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDetails([]);
    if (!container || !clanId) return;
    const timer = window.setTimeout(() => void loadGenerationDetails(), 0);
    return () => window.clearTimeout(timer);
  }, [container, clanId]);

  async function loadTaskDetail(taskId: string) {
    return apiClient.get(`/review-tasks/${taskId}/detail`).catch(() => apiClient.get(`/review-tasks/${taskId}`));
  }

  async function loadGenerationDetails() {
    setLoading(true);
    try {
      const tasks = toRecordList<any>(await apiClient.get(`/clans/${clanId}/review-tasks/pending`));
      const results = await Promise.allSettled(tasks.map(task => loadTaskDetail(String(task.id))));
      setDetails(results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(isGenerationSchemeDetail));
    } catch {
      setDetails([]);
    } finally {
      setLoading(false);
    }
  }

  const hasDetails = useMemo(() => details.length > 0, [details]);

  if (!container || (!loading && !hasDetails)) return null;

  return createPortal(
    <section className="review-generation-words-panel">
      <Typography.Title level={5}>字辈方案审核详情</Typography.Title>
      {loading ? <Spin size="small" /> : (
        <>
          <Alert type="info" showIcon message="以下展示待审字辈方案的方案信息与字辈明细，便于审核人确认方案内容。" style={{ marginBottom: 10 }} />
          {details.map(detail => {
            const words = generationWordsFromDetail(detail);
            return (
              <section className="review-generation-words-card" key={`${detail?.auditRecord?.targetId}-${detail?.auditRecord?.id}`}>
                <Typography.Text strong>{generationSchemeName(detail)}</Typography.Text>
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
              </section>
            );
          })}
        </>
      )}
    </section>,
    container
  );
}
