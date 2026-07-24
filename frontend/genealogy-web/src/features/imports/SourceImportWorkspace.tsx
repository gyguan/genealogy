import type { ColumnsType } from 'antd/es/table';
import type { ImportWorkspaceProgress } from './import-workspace-progress';
import type { ImportPreviewRowBase } from './import-preview-model';
import { StandardImportWorkspace } from './StandardImportWorkspace';

type Props = {

  clanId: string;
  branchId: string;
  branchName: string;
  onBatchCreated: () => void;
  onProgressChange?: (progress: ImportWorkspaceProgress) => void;
};

type SourcePreviewRow = ImportPreviewRowBase & {
  sourceName?: string;
  sourceType?: string;
  providerName?: string;
  bookTitle?: string;
  sourceDate?: string;
  privacyLevel?: string;
};

const columns: ColumnsType<SourcePreviewRow> = [
  { key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 72 },
  { key: 'sourceName', title: '资料名称', dataIndex: 'sourceName' },
  { key: 'sourceType', title: '资料类型', dataIndex: 'sourceType' },
  { key: 'providerName', title: '作者/编纂者', dataIndex: 'providerName' },
  { key: 'bookTitle', title: '书名/题名', dataIndex: 'bookTitle' },
  { key: 'sourceDate', title: '形成时间', dataIndex: 'sourceDate' },
  { key: 'privacyLevel', title: '可见范围', dataIndex: 'privacyLevel' }
];

export function SourceImportWorkspace(props: Props) {
  return (
    <StandardImportWorkspace<SourcePreviewRow>
      {...props}
      title="来源资料导入"
      objectName="来源资料"
      targetLabel="批次管理支派"
      templateSlug="sources"
      previewPath={clanId => `/clans/${clanId}/imports/sources/preview`}
      createPath={clanId => `/clans/${clanId}/imports/sources`}
      guide="表头依次为资料名称、资料类型、作者/编纂者、书名/题名、卷号、页码、形成时间、馆藏位置、来源说明、摘录内容、可信度、可见范围、敏感级别。重复资料和字段警告必须在预检阶段核对。"
      columns={columns}
    />
  );
}
