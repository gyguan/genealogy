from pathlib import Path

path = Path('frontend/genealogy-web/src/features/workbench/EditingWorkspacePage.tsx')
text = path.read_text(encoding='utf-8')
old = '''        <Collapse
          ghost
          activeKey={advancedOpen ? ['advanced'] : []}
          items={[{
            key: 'advanced',
            showArrow: false,
            collapsible: 'icon',
            label: <Row justify={screens.xl ? 'end' : 'start'}>
              <Space wrap onClick={event => event.stopPropagation()}>
                <Button type="link" onClick={() => setAdvancedOpen(previous => !previous)}>{advancedOpen ? '收起筛选' : '更多筛选'}</Button>
                <Button onClick={resetFilters}>重置</Button>
                <Button type="primary" htmlType="submit" loading={taskLoading} disabled={!currentClanId}>查询</Button>
              </Space>
            </Row>,
            children: <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} xl={4}><Form.Item label="任务状态"><Select mode="multiple" maxTagCount="responsive" value={filters.statuses} onChange={values => patchMulti('statuses', values, statusOptions.map(item => item.value))} options={optionsWithAll(statusOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="任务类型"><Select mode="multiple" showSearch optionFilterProp="label" maxTagCount="responsive" value={filters.taskTypes} onChange={values => patchMulti('taskTypes', values, taskTypeOptions.map(item => item.value))} options={optionsWithAll(taskTypeOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="优先级"><Select mode="multiple" maxTagCount="responsive" value={filters.risks} onChange={values => patchMulti('risks', values, riskOptions.map(item => item.value))} options={optionsWithAll(riskOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="创建人"><Select showSearch optionFilterProp="label" value={filters.creator} onChange={value => patchFilter('creator', value)} options={creatorOptions} placeholder="请输入或选择" /></Form.Item></Col>
              <Col xs={24} xl={8}><Form.Item label="创建时间"><DatePicker.RangePicker style={{ width: '100%' }} value={filters.createdFrom || filters.createdTo ? [filters.createdFrom ? dayjs(filters.createdFrom) : null, filters.createdTo ? dayjs(filters.createdTo) : null] : null} onChange={values => setFilters(previous => ({ ...previous, createdFrom: values?.[0]?.format('YYYY-MM-DD') || '', createdTo: values?.[1]?.format('YYYY-MM-DD') || '' }))} /></Form.Item></Col>
            </Row>
          }]}
        />'''
new = '''        <Collapse
          ghost
          activeKey={advancedOpen ? ['advanced'] : []}
          items={[{
            key: 'advanced',
            showArrow: false,
            collapsible: 'disabled',
            label: null,
            styles: { header: { display: 'none' }, body: { padding: 0 } },
            children: <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} xl={4}><Form.Item label="任务状态"><Select mode="multiple" maxTagCount="responsive" value={filters.statuses} onChange={values => patchMulti('statuses', values, statusOptions.map(item => item.value))} options={optionsWithAll(statusOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="任务类型"><Select mode="multiple" showSearch optionFilterProp="label" maxTagCount="responsive" value={filters.taskTypes} onChange={values => patchMulti('taskTypes', values, taskTypeOptions.map(item => item.value))} options={optionsWithAll(taskTypeOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="优先级"><Select mode="multiple" maxTagCount="responsive" value={filters.risks} onChange={values => patchMulti('risks', values, riskOptions.map(item => item.value))} options={optionsWithAll(riskOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="创建人"><Select showSearch optionFilterProp="label" value={filters.creator} onChange={value => patchFilter('creator', value)} options={creatorOptions} placeholder="请输入或选择" /></Form.Item></Col>
              <Col xs={24} xl={8}><Form.Item label="创建时间"><DatePicker.RangePicker style={{ width: '100%' }} value={filters.createdFrom || filters.createdTo ? [filters.createdFrom ? dayjs(filters.createdFrom) : null, filters.createdTo ? dayjs(filters.createdTo) : null] : null} onChange={values => setFilters(previous => ({ ...previous, createdFrom: values?.[0]?.format('YYYY-MM-DD') || '', createdTo: values?.[1]?.format('YYYY-MM-DD') || '' }))} /></Form.Item></Col>
            </Row>
          }]}
        />
        <Row justify={screens.xl ? 'end' : 'start'} style={{ marginTop: 8 }}>
          <Space wrap>
            <Button type="link" onClick={() => setAdvancedOpen(previous => !previous)}>{advancedOpen ? '收起筛选' : '更多筛选'}</Button>
            <Button onClick={resetFilters}>重置</Button>
            <Button type="primary" htmlType="submit" loading={taskLoading} disabled={!currentClanId}>查询</Button>
          </Space>
        </Row>'''
if old not in text:
    raise SystemExit('target block not found')
path.write_text(text.replace(old, new), encoding='utf-8')
