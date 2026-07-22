from pathlib import Path
import re

ROOT = Path('frontend/genealogy-web/src/features/mvp1/steps')


def replace_tail(relative: str, start_pattern: str, end_pattern: str, replacement: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding='utf-8')
    updated, count = re.subn(start_pattern + r'[\s\S]*?' + end_pattern, replacement, text, count=1)
    if count != 1:
        raise RuntimeError(f'{relative}: expected one replacement, got {count}')
    path.write_text(updated, encoding='utf-8')


person = '''      <ResultListCard<PersonLike>
        cardClassName="person-step-query-results"
        totalSuffix="个人物"
        description="草稿/已驳回人物可勾选后批量提交审批；已通过人物可选中后用于建立关系。"
        notice={!workspace.clanId ? <Alert type="warning" showIcon message="请先选择宗族" /> : null}
        extra={(
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewablePersons.length} loading={submittingPersons} onClick={() => void submitSelectedPersons()}>
              批量提交审核（{selectedReviewablePersons.length}）
            </Button>
            <Button loading={loadingPersons} disabled={!workspace.clanId} onClick={() => void loadPersons()}>刷新</Button>
          </Space>
        )}
        size="small"
        bordered
        loading={loadingPersons}
        rowKey={row => String(row.id || '')}
        dataSource={persons}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedPersonRowKeys,
          columnTitle: '勾选',
          columnWidth: 72,
          onChange: keys => setSelectedPersonRowKeys(keys),
          getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
        }}
        onRow={row => ({ onClick: () => selectPerson(row) })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '暂无人物数据' : '请选择宗族后查看人物'} /> }}
        columns={[
          { key: 'name', title: '姓名', render: (_value, row) => row.name || '未命名人物' },
          { key: 'gender', title: '性别', width: 90, render: (_value, row) => genderText(row.gender) },
          { key: 'generationNo', title: '代次', width: 100, render: (_value, row) => row.generationNo ? `第${row.generationNo}世` : '-' },
          { key: 'generationWord', title: '字辈', width: 100, render: (_value, row) => row.generationWord || '-' },
          { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
          {
            key: 'actions',
            title: '操作',
            width: 120,
            render: (_value, row) => row.id ? (
              <DraftDeleteButton
                object={row}
                objectName={row.name}
                objectType="人物"
                onDelete={() => deletePersonApi(row.id!)}
                onDeleted={() => afterDeletePerson(row)}
                label="删除草稿"
                buttonProps={{ size: 'small' }}
              />
            ) : null
          }
        ]}
      />
    </Panel>'''
replace_tail('person/PersonStep.tsx', r'      <ResultListCard<PersonLike>', r'    </Panel>', person)

relationship = '''      <ResultListCard<RelationshipLike>
        cardClassName="relationship-step-query-results"
        totalSuffix="条关系"
        description="草稿/已驳回关系可勾选后批量提交审批。"
        notice={!centerPersonId ? <Alert type="info" showIcon message="关系按当前中心人物加载，请先选择中心人物。" /> : null}
        extra={(
          <Space wrap>
            <Button type="primary" disabled={!selectedReviewableRelationships.length} loading={submittingRelationships} onClick={() => void submitSelectedRelationships()}>
              批量提交审核（{selectedReviewableRelationships.length}）
            </Button>
            <Button loading={loadingRelationships} disabled={!centerPersonId} onClick={() => void loadRelationships(centerPersonId)}>刷新</Button>
          </Space>
        )}
        size="small"
        bordered
        loading={loadingRelationships}
        rowKey={row => String(row.id || '')}
        dataSource={relationships}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedRelationshipRowKeys,
          columnTitle: '勾选',
          columnWidth: 72,
          onChange: keys => setSelectedRelationshipRowKeys(keys),
          getCheckboxProps: row => ({ disabled: !isReviewable(row) || !row.id })
        }}
        onRow={row => ({ onClick: () => selectRelationship(row) })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={centerPersonId ? '暂无关系数据' : '请选择中心人物后查看关系'} /> }}
        columns={[
          { key: 'name', title: '姓名', render: (_value, row) => relativeName(row, centerPersonId || workspace.personId) },
          { key: 'relationType', title: '关系类型', width: 120, render: (_value, row) => relationTypeText(row, centerPersonId || workspace.personId) },
          { key: 'dataStatus', title: '状态', width: 110, render: (_value, row) => <Tag color={statusColor(row)}>{statusText(row)}</Tag> },
          {
            key: 'actions',
            title: '操作',
            width: 220,
            render: (_value, row) => (
              <Space size={4} wrap>
                <TrackingLinkButton size="small" type="link" clanId={workspace.clanId} targetType="relationship" targetId={row.id} />
                {row.id ? (
                  <DraftDeleteButton
                    object={row}
                    objectName={relativeName(row, centerPersonId || workspace.personId)}
                    objectType="关系"
                    onDelete={() => deleteRelationshipApi(row.id!)}
                    onDeleted={() => afterDeleteRelationship(row)}
                    label="删除草稿"
                    buttonProps={{ size: 'small', type: 'link' }}
                  />
                ) : null}
              </Space>
            )
          }
        ]}
      />
    </Panel>'''
replace_tail('relationship/RelationshipStep.tsx', r'      <ResultListCard<RelationshipLike>', r'    </Panel>', relationship)

source = '''          <ResultListCard<SourceLinkLike>
            cardClassName="source-stage-links"
            totalSuffix="条绑定记录"
            resultTotal={links.length}
            extra={<Button loading={linksLoading} disabled={!workspace.sourceId} onClick={() => void refreshLinks()}>刷新已绑定对象</Button>}
            notice={linksError ? <Alert type="error" showIcon message={linksError} action={<Button size="small" onClick={() => void refreshLinks()}>重试</Button>} /> : null}
            size="small"
            bordered
            rowKey={link => String(link.id || `${link.targetType}-${link.targetId}`)}
            loading={linksLoading}
            dataSource={pagedLinks.rows}
            pagination={pagedLinks.total > SOURCE_BINDING_PAGE_SIZE ? {
              current: pagedLinks.page,
              pageSize: SOURCE_BINDING_PAGE_SIZE,
              total: pagedLinks.total,
              showSizeChanger: false,
              showTotal: total => `共 ${total} 条`,
              onChange: setLinkPage
            } : false}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={stage.bindingOpen ? '当前来源暂无绑定记录' : '选择正式来源后显示绑定记录'} /> }}
            columns={[
              { key: 'targetType', title: '对象类型', width: 120, render: (_value, link) => <Tag>{targetTypeText(link.targetType)}</Tag> },
              { key: 'targetId', title: '绑定对象', render: (_value, link) => `对象 #${link.targetId}` },
              { key: 'createdAt', title: '绑定时间', width: 180, render: (_value, link) => link.createdAt || '-' }
            ]}
          />
        </Card>'''
replace_tail('source/SourceStageStep.tsx', r'          <ResultListCard<SourceLinkLike>', r'        </Card>', source)

print('Issue 694 syntax cleanup completed')
