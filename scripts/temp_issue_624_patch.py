from pathlib import Path

path = Path('frontend/genealogy-web/src/features/workbench/EditingWorkspacePage.tsx')
text = path.read_text(encoding='utf-8')
old = '''        <Collapse
          ghost
          activeKey={advancedOpen ? ['advanced'] : []}
          onChange={keys => setAdvancedOpen(Array.isArray(keys) ? keys.includes('advanced') : keys === 'advanced')}
          items={[{
            key: 'advanced',
            label: '更多筛选',
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
          <Space wrap><Button onClick={resetFilters}>重置</Button><Button type="primary" htmlType="submit" loading={taskLoading} disabled={!currentClanId}>查询</Button></Space>
        </Row>'''
new = '''        <Collapse
          ghost
          activeKey={advancedOpen ? ['advanced'] : []}
          onChange={keys => setAdvancedOpen(Array.isArray(keys) ? keys.includes('advanced') : keys === 'advanced')}
          items={[{
            key: 'advanced',
            label: '更多筛选',
            extra: <Space wrap onClick={event => event.stopPropagation()}>
              <Button onClick={resetFilters}>重置</Button>
              <Button type="primary" htmlType="submit" loading={taskLoading} disabled={!currentClanId}>查询</Button>
            </Space>,
            children: <Row gutter={[16, 0]}>
              <Col xs={24} sm={12} xl={4}><Form.Item label="任务状态"><Select mode="multiple" maxTagCount="responsive" value={filters.statuses} onChange={values => patchMulti('statuses', values, statusOptions.map(item => item.value))} options={optionsWithAll(statusOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="任务类型"><Select mode="multiple" showSearch optionFilterProp="label" maxTagCount="responsive" value={filters.taskTypes} onChange={values => patchMulti('taskTypes', values, taskTypeOptions.map(item => item.value))} options={optionsWithAll(taskTypeOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="优先级"><Select mode="multiple" maxTagCount="responsive" value={filters.risks} onChange={values => patchMulti('risks', values, riskOptions.map(item => item.value))} options={optionsWithAll(riskOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
              <Col xs={24} sm={12} xl={4}><Form.Item label="创建人"><Select showSearch optionFilterProp="label" value={filters.creator} onChange={value => patchFilter('creator', value)} options={creatorOptions} placeholder="请输入或选择" /></Form.Item></Col>
              <Col xs={24} xl={8}><Form.Item label="创建时间"><DatePicker.RangePicker style={{ width: '100%' }} value={filters.createdFrom || filters.createdTo ? [filters.createdFrom ? dayjs(filters.createdFrom) : null, filters.createdTo ? dayjs(filters.createdTo) : null] : null} onChange={values => setFilters(previous => ({ ...previous, createdFrom: values?.[0]?.format('YYYY-MM-DD') || '', createdTo: values?.[1]?.format('YYYY-MM-DD') || '' }))} /></Form.Item></Col>
            </Row>
          }]}
        />'''
if old not in text:
    raise SystemExit('target block not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
