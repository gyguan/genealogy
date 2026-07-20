import type { ReactNode } from 'react';
import { ApartmentOutlined, DownloadOutlined, FolderOpenOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Modal, Space, Typography } from 'antd';
import { downloadImportTemplate, IMPORT_TEMPLATE_UPDATED_AT, IMPORT_TEMPLATE_VERSION, importTemplateSlug } from './import-template';
import type { ImportFileFormat, ImportTypeKey } from './import-type-registry';

const typeOptions: Array<{ value: ImportTypeKey; label: string; description: string; icon: ReactNode }> = [
  { value: 'person', label: '人物', description: '导入族谱人物信息', icon: <UserOutlined /> },
  { value: 'relationship', label: '关系', description: '导入人物关系信息', icon: <ApartmentOutlined /> },
  { value: 'source', label: '来源', description: '导入资料来源信息', icon: <FolderOpenOutlined /> }
];

type Props = {
  open: boolean;
  activeType: ImportTypeKey;
  downloading?: ImportFileFormat;
  onTypeChange: (value: ImportTypeKey) => void;
  onDownloadingChange: (value?: ImportFileFormat) => void;
  onCancel: () => void;
  onContinue: () => void;
  notify: (data: unknown, error?: boolean) => void;
};

export function NewImportModal({
  open,
  activeType,
  downloading,
  onTypeChange,
  onDownloadingChange,
  onCancel,
  onContinue,
  notify
}: Props) {
  async function handleDownload(format: ImportFileFormat) {
    if (downloading) return;
    const slug = importTemplateSlug(activeType);
    if (!slug) return;
    onDownloadingChange(format);
    try {
      await downloadImportTemplate(slug, format);
      notify({ message: `${format.toUpperCase()} 模板已下载` });
    } catch (error) {
      notify({ message: (error as Error).message || '模板下载失败' }, true);
    } finally {
      onDownloadingChange(undefined);
    }
  }

  return (
    <Modal
      open={open}
      title="新建导入"
      width={680}
      destroyOnHidden
      onCancel={onCancel}
      footer={(
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" onClick={onContinue}>上传文件并预检</Button>
        </Space>
      )}
    >
      <Space direction="vertical" size={20} className="import-new-modal-content">
        <section>
          <Typography.Title level={5}>1. 选择导入对象</Typography.Title>
          <div className="import-new-type-grid">
            {typeOptions.map(option => (
              <button
                key={option.value}
                type="button"
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
        </section>

        <section>
          <Typography.Title level={5}>2. 下载模板</Typography.Title>
          <Space wrap>
            <Button type="primary" ghost icon={<DownloadOutlined />} loading={downloading === 'xlsx'} disabled={Boolean(downloading)} onClick={() => void handleDownload('xlsx')}>下载 XLSX 模板</Button>
            <Button icon={<DownloadOutlined />} loading={downloading === 'csv'} disabled={Boolean(downloading)} onClick={() => void handleDownload('csv')}>下载 CSV 模板</Button>
          </Space>
        </section>

        <Alert
          type="info"
          showIcon
          message={`当前模板版本：${IMPORT_TEMPLATE_VERSION}　更新时间：${IMPORT_TEMPLATE_UPDATED_AT}`}
          description="历史模板可能无法导入，请重新下载最新模板。"
        />
        <Typography.Text type="secondary">选择导入对象后下载对应模板，再填写数据并创建导入任务。</Typography.Text>
      </Space>
    </Modal>
  );
}
