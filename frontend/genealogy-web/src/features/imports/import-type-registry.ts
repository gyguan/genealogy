export type ImportTypeKey = 'person' | 'relationship' | 'generation' | 'source';

export type ImportTypeDefinition = {
  key: ImportTypeKey;
  title: string;
  description: string;
  availability: 'available' | 'planned';
};

export const importTypeRegistry: ImportTypeDefinition[] = [
  {
    key: 'person',
    title: '人物导入',
    description: '批量导入人物基础信息，支持预览、查重、失败行修正和审核入谱。',
    availability: 'available'
  },
  {
    key: 'relationship',
    title: '人物关系导入',
    description: '批量建立父母、配偶、子女、继嗣等人物关系。',
    availability: 'planned'
  },
  {
    key: 'generation',
    title: '字辈导入',
    description: '批量维护世次与字辈映射。',
    availability: 'planned'
  },
  {
    key: 'source',
    title: '来源资料导入',
    description: '批量登记谱书、地方志、照片和口述记录等来源资料。',
    availability: 'planned'
  }
];
