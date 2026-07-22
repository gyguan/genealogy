import type { ReactNode } from 'react';
import { ApartmentOutlined, FolderOpenOutlined, UserOutlined } from '@ant-design/icons';
import { Card } from 'antd';
import type { ImportTypeKey } from './import-type-registry';

const typeOptions: Array<{ value: ImportTypeKey; label: string; description: string; icon: ReactNode }> = [
  { value: 'person', label: '人物', description: '导入族谱人物信息', icon: <UserOutlined /> },
  { value: 'relationship', label: '关系', description: '导入人物关系信息', icon: <ApartmentOutlined /> },
  { value: 'source', label: '来源', description: '导入资料来源信息', icon: <FolderOpenOutlined /> }
];

type Props = {
  activeType: ImportTypeKey;
  onTypeChange: (value: ImportTypeKey) => void;
};

export function ImportTypeSelector({ activeType, onTypeChange }: Props) {
  return (
    <Card size="small" title="1. 选择导入对象" className="import-type-selector-card">
      <div className="import-new-type-grid">
        {typeOptions.map(option => (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.label}导入`}
            aria-pressed={activeType === option.value}
            className={`import-new-type-card${activeType === option.value ? ' is-selected' : ''}`}
            onClick={() => onTypeChange(option.value)}
          >
            <span className={`import-new-type-icon import-new-type-icon--${option.value}`}>{option.icon}</span>
            <strong>{option.label}</strong>
            <span>{option.description}</span>
            {activeType === option.value ? <span className="import-new-type-check">✓</span> : null}
          </button>
        ))}
      </div>
    </Card>
  );
}
