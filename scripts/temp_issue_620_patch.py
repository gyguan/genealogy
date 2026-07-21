from pathlib import Path

path = Path('frontend/genealogy-web/src/features/workbench/EditingWorkspacePage.tsx')
text = path.read_text()
text = text.replace(
    "  Alert, Button, Card, Checkbox, Col, DatePicker, Descriptions, Drawer, Dropdown, Empty, Form, Grid, Input,\n  Modal, Pagination, Row, Select, Skeleton, Space, Table, Tag, Timeline, Typography, message",
    "  Alert, Button, Card, Checkbox, Col, Collapse, DatePicker, Descriptions, Drawer, Dropdown, Empty, Form, Grid, Input,\n  Modal, Pagination, Row, Select, Skeleton, Space, Table, Tag, Timeline, Typography, message"
)
old = '''        <Row gutter={[16, 0]} align="bottom">
          <Col xs={24} sm={12} xl={4}><Form.Item label="宗族"><Select showSearch optionFilterProp="label" value={currentClanId} onChange={changeClan} options={clans.map(clan => ({ value: String(clan.id || ''), label: clanLabel(clan) }))} placeholder="请选择宗族" /></Form.Item></Col>
          <Col xs={24} sm={12} xl={4}><Form.Item label="谱书"><Select value={currentClanId || undefined} disabled={!currentClanId} options={currentClanId ? [{ value: currentClanId, label: bookLabel(activeClan) }] : []} placeholder="请选择谱书" /></Form.Item></Col>
          <Col xs={24} sm={12} xl={4}><Form.Item label="任务名称"><Input value={filters.taskName} onChange={event => patchFilter('taskName', event.target.value)} placeholder="请输入任务名称" allowClear /></Form.Item></Col>
          <Col xs={24} sm={12} xl={5}><Form.Item label="关键词"><Input value={filters.keyword} onChange={event => patchFilter('keyword', event.target.value)} placeholder="任务描述、涉及对象或所属范围" allowClear /></Form.Item></Col>
          <Col xs={24} xl={7}><Form.Item label=" "><Row justify={screens.xl ? 'end' : 'start'}><Space><Button type="link" onClick={() => setAdvancedOpen(previous => !previous)}>{advancedOpen ? '收起筛选' : '更多筛选'}</Button><Button onClick={resetFilters}>重置</Button><Button type="primary" htmlType="submit" loading={taskLoading} disabled={!currentClanId}>查询</Button></Space></Row></Form.Item></Col>
        </Row>
        {advancedOpen ? <Row gutter={[16, 0]}>
          <Col xs={24} sm={12} xl={4}><Form.Item label="任务状态"><Select mode="multiple" maxTagCount="responsive" value={filters.statuses} onChange={values => patchMulti('statuses', values, statusOptions.map(item => item.value))} options={optionsWithAll(statusOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
          <Col xs={24} sm={12} xl={4}><Form.Item label="任务类型"><Select mode="multiple" showSearch optionFilterProp="label" maxTagCount="responsive" value={filters.taskTypes} onChange={values => patchMulti('taskTypes', values, taskTypeOptions.map(item => item.value))} options={optionsWithAll(taskTypeOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
          <Col xs={24} sm={12} xl={4}><Form.Item label="优先级"><Select mode="multiple" maxTagCount="responsive" value={filters.risks} onChange={values => patchMulti('risks', values, riskOptions.map(item => item.value))} options={optionsWithAll(riskOptions)} placeholder="请选择（多选）" allowClear /></Form.Item></Col>
          <Col xs={24} sm={12} xl={4}><Form.Item label="创建人"><Select showSearch optionFilterProp="label" value={filters.creator} onChange={value => patchFilter('creator', value)} options={creatorOptions} placeholder="请输入或选择" /></Form.Item></Col>
          <Col xs={24} xl={8}><Form.Item label="创建时间"><DatePicker.RangePicker style={{ width: '100%' }} value={filters.createdFrom || filters.createdTo ? [filters.createdFrom ? dayjs(filters.createdFrom) : null, filters.createdTo ? dayjs(filters.createdTo) : null] : null} onChange={values => setFilters(previous => ({ ...previous, createdFrom: values?.[0]?.format('YYYY-MM-DD') || '', createdTo: values?.[1]?.format('YYYY-MM-DD') || '' }))} /></Form.Item></Col>
        </Row> : null}'''
new = '''        <Row gutter={[16, 0]} align="bottom">
          <Col xs={24} sm={12} xl={6}><Form.Item label="宗族"><Select showSearch optionFilterProp="label" value={currentClanId} onChange={changeClan} options={clans.map(clan => ({ value: String(clan.id || ''), label: clanLabel(clan) }))} placeholder="请选择宗族" /></Form.Item></Col>
          <Col xs={24} sm={12} xl={6}><Form.Item label="谱书"><Select value={currentClanId || undefined} disabled={!currentClanId} options={currentClanId ? [{ value: currentClanId, label: bookLabel(activeClan) }] : []} placeholder="请选择谱书" /></Form.Item></Col>
          <Col xs={24} sm={12} xl={6}><Form.Item label="任务名称"><Input value={filters.taskName} onChange={event => patchFilter('taskName', event.target.value)} placeholder="请输入任务名称" allowClear /></Form.Item></Col>
          <Col xs={24} sm={12} xl={6}><Form.Item label="关键词"><Input value={filters.keyword} onChange={event => patchFilter('keyword', event.target.value)} placeholder="任务描述、涉及对象或所属范围" allowClear /></Form.Item></Col>
        </Row>
        <Collapse
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
if old not in text:
    raise SystemExit('target query layout block not found')
path.write_text(text.replace(old, new))
