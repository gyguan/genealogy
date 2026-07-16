import type { ColumnsType } from 'antd/es/table';
import type { ImportWorkspaceProgress } from './import-workspace-progress';
import type { ImportPreviewRowBase } from './import-preview-model';
import { StandardImportWorkspace } from './StandardImportWorkspace';

type Props = {
  notify: (data: unknown, error?: boolean) => void;
  clanId: string;
  branchId: string;
  branchName: string;
  onBatchCreated: () => void;
  onProgressChange?: (progress: ImportWorkspaceProgress) => void;
};

type RelationshipPreviewRow = ImportPreviewRowBase & {
  fromPersonCode?: string;
  fromPersonName?: string;
  toPersonCode?: string;
  toPersonName?: string;
  relationshipType?: string;
  description?: string;
};

const columns: ColumnsType<RelationshipPreviewRow> = [
  { key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 72 },
  { key: 'fromPersonCode', title: '主体编码', dataIndex: 'fromPersonCode' },
  { key: 'fromPersonName', title: '主体人物', dataIndex: 'fromPersonName' },
  { key: 'toPersonCode', title: '对象编码', dataIndex: 'toPersonCode' },
  { key: 'toPersonName', title: '对象人物', dataIndex: 'toPersonName' },
  { key: 'relationshipType', title: '关系类型', dataIndex: 'relationshipType' }
];

export function RelationshipImportWorkspace(props: Props) {
  return (
    <StandardImportWorkspace<RelationshipPreviewRow>
      {...props}
      title="人物关系导入"
      objectName="关系"
      targetLabel="批次管理支派"
      templateSlug="relationships"
      previewPath={clanId => `/clans/${clanId}/imports/relationships/preview`}
      createPath={clanId => `/clans/${clanId}/imports/relationships`}
      guide="使用人物业务编码建立关系。表头依次为关系主体编码、关系对象编码、关系类型、说明；关系类型支持父子、母子、配偶。重复、自关联、人物未匹配或循环关系必须在预检阶段处理。"
      columns={columns}
    />
  );
}
