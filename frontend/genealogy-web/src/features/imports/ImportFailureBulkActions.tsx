import { useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Table, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import type {
  ImportRowBulkItemResult,
  ImportRowBulkOperationResponse,
  ImportRowBulkSelectionRequest
} from '../../shared/api/generated/import-failure-types';
import { apiClient } from '../../shared/api/client';
import { saveDownloadedBlob } from '../../shared/utils/download';

type SelectedRow = {
  rowNo?: number;
  version?: number;
};

type Props = {
  clanId: string;
  jobId: number;
  selectedRows: SelectedRow[];
  totalFailures: number;
  editable: boolean;
  notify: (data: unknown, error?: boolean) => void;
  onChanged: () => Promise<void> | void;
};

type ExcludeScope = 'selected' | 'filtered';

function selection(mode: ExcludeScope, selectedRows: SelectedRow[]): ImportRowBulkSelectionRequest {
  return {
    mode,
    rows: mode === 'selected'
      ? selectedRows
          .filter(row => Number(row.rowNo) > 0 && Number(row.version) >= 0)
          .map(row => ({ rowNo: Number(row.rowNo), expectedVersion: Number(row.version) }))
      : undefined
  };
}

function actionSummary(result: ImportRowBulkOperationResponse) {
  return `匹配 ${result.matchedCount} 条，成功 ${result.successCount} 条，失败 ${result.failureCount} 条，剩余失败 ${result.remainingFailureCount} 条`;
}

export function ImportFailureBulkActions({
  clanId,
  jobId,
  selectedRows,
  totalFailures,
  editable,
  notify,
  onChanged
}: Props) {
  const [loadingAction, setLoadingAction] = useState('');
  const [excludeScope, setExcludeScope] = useState<ExcludeScope>();
  const [excludeReason, setExcludeReason] = useState('');
  const [result, setResult] = useState<ImportRowBulkOperationResponse>();

  const selectedCount = selectedRows.length;
  const failedItems = (result?.items || []).filter(item => !item.success);

  async function finish(nextResult: ImportRowBulkOperationResponse) {
    setResult(nextResult);
    notify({ message: actionSummary(nextResult) }, nextResult.failureCount > 0);
    await onChanged();
  }

  async function retry(scope: ExcludeScope) {
    setLoadingAction(`retry-${scope}`);
    try {
      const nextResult = await apiClient.post<ImportRowBulkOperationResponse>(
        `/clans/${clanId}/imports/${jobId}/rows/bulk-retry`,
        { selection: selection(scope, selectedRows) }
      );
      await finish(nextResult);
    } catch (error) {
      notify({ message: (error as Error).message || '批量重试失败' }, true);
    } finally {
      setLoadingAction('');
    }
  }

  async function exclude() {
    if (!excludeScope || !excludeReason.trim()) return;
    setLoadingAction(`exclude-${excludeScope}`);
    try {
      const nextResult = await apiClient.post<ImportRowBulkOperationResponse>(
        `/clans/${clanId}/imports/${jobId}/rows/bulk-exclude`,
        { selection: selection(excludeScope, selectedRows), reason: excludeReason.trim() }
      );
      setExcludeScope(undefined);
      setExcludeReason('');
      await finish(nextResult);
    } catch (error) {
      notify({ message: (error as Error).message || '批量排除失败' }, true);
    } finally {
      setLoadingAction('');
    }
  }

  async function exportFailures() {
    setLoadingAction('export');
    try {
      const blob = await apiClient.download(`/clans/${clanId}/imports/${jobId}/rows/failures.xlsx`);
      saveDownloadedBlob(blob, `import-failures-${jobId}.xlsx`);
      notify({ message: `已导出 ${totalFailures} 条失败行，可离线修改“当前修正数据(JSON)”后回传` });
    } catch (error) {
      notify({ message: (error as Error).message || '失败行导出失败' }, true);
    } finally {
      setLoadingAction('');
    }
  }

  async function uploadCorrections(file: File) {
    setLoadingAction('upload');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const nextResult = await apiClient.upload<ImportRowBulkOperationResponse>(
        `/clans/${clanId}/imports/${jobId}/rows/corrections.xlsx?retryAfterApply=true`,
        formData
      );
      await finish(nextResult);
    } catch (error) {
      notify({ message: (error as Error).message || '修正文件回传失败' }, true);
    } finally {
      setLoadingAction('');
    }
  }

  const uploadProps: UploadProps = {
    accept: '.xlsx',
    maxCount: 1,
    showUploadList: false,
    disabled: !editable || Boolean(loadingAction),
    beforeUpload: file => {
      void uploadCorrections(file);
      return Upload.LIST_IGNORE;
    }
  };

  return (
    <Card size="small" title="批量处理失败行" style={{ marginBottom: 12 }}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          已选择当前页 {selectedCount} 条；“全部失败行”作用于该批次当前所有失败行，单次最多 500 条。所有修改都会进行版本冲突检测。
        </Typography.Text>
        {!editable ? <Alert type="info" showIcon message="当前批次不可修改，仅可导出失败行。" /> : null}
        <Space wrap>
          <Button
            disabled={!editable || selectedCount === 0}
            loading={loadingAction === 'retry-selected'}
            onClick={() => void retry('selected')}
          >
            重试选中项
          </Button>
          <Button
            disabled={!editable || totalFailures === 0}
            loading={loadingAction === 'retry-filtered'}
            onClick={() => void retry('filtered')}
          >
            重试全部失败行
          </Button>
          <Button
            danger
            disabled={!editable || selectedCount === 0}
            onClick={() => { setExcludeScope('selected'); setExcludeReason(''); }}
          >
            排除选中项
          </Button>
          <Button
            danger
            disabled={!editable || totalFailures === 0}
            onClick={() => { setExcludeScope('filtered'); setExcludeReason(''); }}
          >
            排除全部失败行
          </Button>
          <Button loading={loadingAction === 'export'} disabled={totalFailures === 0} onClick={() => void exportFailures()}>
            导出失败行 XLSX
          </Button>
          <Upload {...uploadProps}>
            <Button loading={loadingAction === 'upload'} disabled={!editable}>回传修正文件并重试</Button>
          </Upload>
        </Space>
      </Space>

      <Modal
        title={excludeScope === 'filtered' ? '排除全部失败行' : '排除选中失败行'}
        open={Boolean(excludeScope)}
        okText="确认排除"
        okButtonProps={{ danger: true, disabled: !excludeReason.trim() }}
        confirmLoading={loadingAction.startsWith('exclude-')}
        onOk={() => void exclude()}
        onCancel={() => { setExcludeScope(undefined); setExcludeReason(''); }}
        destroyOnHidden
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message={`排除后不会删除原始数据，审核摘要会保留排除数量。${excludeScope === 'filtered' ? `本次最多处理当前 ${totalFailures} 条失败行。` : `本次处理 ${selectedCount} 条选中行。`}`}
          />
          <Input.TextArea
            rows={4}
            maxLength={500}
            showCount
            value={excludeReason}
            placeholder="请填写排除原因"
            onChange={event => setExcludeReason(event.target.value)}
          />
        </Space>
      </Modal>

      <Modal
        title="批量处理结果"
        open={Boolean(result)}
        footer={<Button type="primary" onClick={() => setResult(undefined)}>知道了</Button>}
        onCancel={() => setResult(undefined)}
        width={760}
        destroyOnHidden
      >
        {result ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type={result.failureCount > 0 ? 'warning' : 'success'}
              showIcon
              message={actionSummary(result)}
              description={`已排除 ${result.excludedCount} 条；批次状态：${result.processingStatus}`}
            />
            {failedItems.length > 0 ? (
              <Table<ImportRowBulkItemResult>
                size="small"
                rowKey={item => `${item.stableRowKey}-${item.version}`}
                dataSource={failedItems}
                pagination={{ pageSize: 10 }}
                columns={[
                  { key: 'rowNo', title: '原始行号', dataIndex: 'rowNo', width: 100 },
                  { key: 'errorCode', title: '错误码', dataIndex: 'errorCode', width: 190 },
                  { key: 'errorMessage', title: '失败原因', dataIndex: 'errorMessage' }
                ]}
              />
            ) : null}
          </Space>
        ) : null}
      </Modal>
    </Card>
  );
}
