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

type PersonPreviewRow = ImportPreviewRowBase & {
  name?: string;
  gender?: string;
  generationNo?: number;
  generationWord?: string;
  birthDate?: string;
  isLiving?: boolean;
  duplicateCount?: number;
};

const genderLabels: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
const genderText = (value?: string) => genderLabels[value || ''] || value || '-';

const columns: ColumnsType<PersonPreviewRow> = [
  { key: 'rowNo', title: '行号', dataIndex: 'rowNo', width: 72 },
  { key: 'name', title: '姓名', dataIndex: 'name' },
  { key: 'gender', title: '性别', dataIndex: 'gender', render: value => genderText(String(value || '')) },
  { key: 'generationNo', title: '代次', dataIndex: 'generationNo' },
  { key: 'generationWord', title: '字辈', dataIndex: 'generationWord' },
  { key: 'birthDate', title: '出生日期', dataIndex: 'birthDate' }
];

export function PersonImportWorkspace(props: Props) {
  return (
    <StandardImportWorkspace<PersonPreviewRow>
      {...props}
      title="人物导入"
      objectName="人物"
      targetLabel="目标支派"
      templateSlug="persons"
      previewPath={clanId => `/clans/${clanId}/imports/persons/preview`}
      createPath={clanId => `/clans/${clanId}/imports/persons.csv`}
      guide="表头依次为姓名、性别、代次、字辈、出生日期、是否在世，请勿改名或调整顺序。性别填写男/女/未知，是否在世填写是/否，代次填写正整数，日期格式为 yyyy-MM-dd。"
      columns={columns}
    />
  );
}
