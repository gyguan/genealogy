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
            extra: <Space wrap onClick={event => event.stopPropagation()}>
              <Button onClick={resetFilters}>重置</Button>
              <Button type="primary" htmlType="submit" loading={taskLoading} disabled={!currentClanId}>查询</Button>
            </Space>,
            children: <Row gutter={[16, 0]}>
'''
new = '''        <Collapse
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
'''
if old not in text:
    raise SystemExit('target block not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
