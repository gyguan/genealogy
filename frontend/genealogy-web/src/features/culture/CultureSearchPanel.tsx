import { useEffect } from 'react';
import { Button, Card, Col, Form, Input, Row, Select, Space } from 'antd';
import type { CultureCategory, CultureDataStatus, CulturePrivacyLevel } from '../../shared/api/generated/culture-types';
import type { CultureBranchOption } from './cultureLibraryService';
import { booleanOptions, categoryOptions, privacyOptions, sortOptions, statusOptions } from './cultureOptions';
import type { CultureSearchState } from './cultureUrlState';
import { defaultCultureSearch } from './cultureUrlState';

type FormValues = {
  keyword?: string;
  category?: CultureCategory;
  branchId?: number;
  dataStatus?: CultureDataStatus;
  privacyLevel?: CulturePrivacyLevel;
  hasSource?: 'true' | 'false';
  featuredOnHome?: 'true' | 'false';
  sort?: string;
};

type Props = {
  branches: CultureBranchOption[];
  clanId: string;
  search: CultureSearchState;
  loading: boolean;
  onSearch: (search: CultureSearchState) => void;
  onCreate: () => void;
};

function branchLabel(branch: CultureBranchOption) {
  return branch.branchName || branch.branchPath || '未命名支派';
}

function boolText(value?: boolean) {
  return typeof value === 'boolean' ? String(value) as 'true' | 'false' : undefined;
}

export function CultureSearchPanel(props: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    form.setFieldsValue({
      keyword: props.search.keyword,
      category: props.search.category,
      branchId: props.search.branchId,
      dataStatus: props.search.dataStatus,
      privacyLevel: props.search.privacyLevel,
      hasSource: boolText(props.search.hasSource),
      featuredOnHome: boolText(props.search.featuredOnHome),
      sort: props.search.sort
    });
  }, [form, props.search]);

  function submit(values: FormValues) {
    props.onSearch({
      ...props.search,
      keyword: values.keyword?.trim() || '',
      category: values.category,
      branchId: values.branchId,
      dataStatus: values.dataStatus,
      privacyLevel: values.privacyLevel,
      hasSource: values.hasSource === undefined ? undefined : values.hasSource === 'true',
      featuredOnHome: values.featuredOnHome === undefined ? undefined : values.featuredOnHome === 'true',
      sort: values.sort || defaultCultureSearch.sort,
      pageNo: 1
    });
  }

  function reset() {
    form.resetFields();
    props.onSearch({ ...defaultCultureSearch, pageSize: props.search.pageSize });
  }

  return (
    <Card size="small" title="文化资料检索" extra={<Button type="primary" onClick={props.onCreate} disabled={!props.clanId}>新增资料</Button>}>
      <Form form={form} layout="vertical" onFinish={submit}>
        <Row gutter={[12, 0]}>
          <Col xs={24} sm={12} lg={6}><Form.Item name="keyword" label="关键词"><Input allowClear placeholder="标题、摘要、时期或地点" /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item name="category" label="分类"><Select allowClear options={categoryOptions} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item name="branchId" label="支派"><Select allowClear showSearch optionFilterProp="label" options={props.branches.filter(branch => branch.id).map(branch => ({ value: branch.id, label: branchLabel(branch) }))} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item name="dataStatus" label="状态"><Select allowClear options={statusOptions} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item name="privacyLevel" label="可见范围"><Select allowClear options={privacyOptions} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item name="hasSource" label="已有来源"><Select allowClear options={booleanOptions} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item name="featuredOnHome" label="首页精选"><Select allowClear options={booleanOptions} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item name="sort" label="排序"><Select options={sortOptions} /></Form.Item></Col>
          <Col xs={24} lg={8} className="culture-search-actions">
            <Space><Button type="primary" htmlType="submit" loading={props.loading}>查询</Button><Button onClick={reset}>重置</Button></Space>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}
