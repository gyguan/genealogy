import { Button, Descriptions, Drawer, Empty, List, Skeleton, Space, Tabs, Tag, Timeline, Typography } from 'antd';
import type { CultureItemDetailResponse } from '../../shared/api/generated/culture-types';
import type { TrackingTraceDetailResponse } from '../../shared/api/generated/tracking-types';
import { TrackingLinkButton } from '../../shared/navigation/TrackingLinkButton';
import {
  categoryOptions,
  confidenceColor,
  confidenceOptions,
  formatDateTime,
  formatFileSize,
  optionLabel,
  privacyColor,
  privacyOptions,
  sensitiveOptions,
  statusColor,
  statusOptions
} from './cultureOptions';

import { PageFeedback } from '../../shared/ui/Feedback';

const { Paragraph, Text, Title } = Typography;

const sourceTypeText: Record<string, string> = {
  genealogy_book: '族谱原文', local_chronicle: '地方志', tombstone: '墓志碑刻', photo: '照片资料',
  oral_history: '口述记录', archive: '档案资料', other: '其他'
};

function allowed(item: CultureItemDetailResponse | null, ...actions: string[]) {
  return Boolean(item && actions.some(action => item.allowedActions.includes(action)));
}

function reviewStatusText(value?: string | null) {
  const dict: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回' };
  return dict[String(value || '').toLowerCase()] || value || '暂无审核任务';
}

type Props = {
  open: boolean;
  clanId: string;
  item: CultureItemDetailResponse | null;
  trace: TrackingTraceDetailResponse | null;
  loading: boolean;
  traceError?: string;
  actionLoading?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSubmitReview: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onPreviewAttachment: (attachmentId: number, fileName: string) => void;
  onDownloadAttachment: (attachmentId: number, fileName: string) => void;
};

export function CultureItemDetailDrawer(props: Props) {
  const item = props.item;
  const headerActions = item ? (
    <Space wrap>
      {allowed(item, 'update', 'request_update') ? <Button onClick={props.onEdit}>编辑</Button> : null}
      {allowed(item, 'submit_review') ? <Button type="primary" loading={props.actionLoading} onClick={props.onSubmitReview}>提交审核</Button> : null}
      {allowed(item, 'archive', 'request_archive') ? <Button loading={props.actionLoading} onClick={props.onArchive}>归档</Button> : null}
      {allowed(item, 'delete', 'request_delete') ? <Button danger loading={props.actionLoading} onClick={props.onDelete}>删除</Button> : null}
      <TrackingLinkButton clanId={props.clanId} targetType="culture_item" targetId={item.id} reviewTaskId={item.review.reviewTaskId} label="完整追踪" />
    </Space>
  ) : null;

  return (
    <Drawer
      open={props.open}
      width={760}
      title={<Title level={4} style={{ margin: 0 }}>{item?.title || '文化资料详情'}</Title>}
      extra={headerActions}
      onClose={props.onClose}
      destroyOnHidden
    >
      {props.loading && !item ? <Skeleton active paragraph={{ rows: 10 }} /> : null}
      {!props.loading && !item ? <Empty description="资料不存在、已删除或当前无权查看" /> : null}
      {item ? (
        <Tabs
          items={[
            {
              key: 'content', label: '资料内容', children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag>{optionLabel(categoryOptions, item.category)}</Tag>
                    <Tag color={statusColor(item.dataStatus)}>{optionLabel(statusOptions, item.dataStatus)}</Tag>
                    <Tag color={privacyColor(item.privacyLevel)}>{optionLabel(privacyOptions, item.privacyLevel)}</Tag>
                    <Tag color={confidenceColor(item.confidenceLevel)}>可信度：{optionLabel(confidenceOptions, item.confidenceLevel)}</Tag>
                    {item.featuredOnHome ? <Tag color="gold">首页精选</Tag> : null}
                  </Space>
                  <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label="所属宗族">{item.scope.clanName}</Descriptions.Item>
                    <Descriptions.Item label="所属支派">{item.scope.branchName || '宗族级资料'}</Descriptions.Item>
                    <Descriptions.Item label="历史时期">{item.historicalPeriod || '待维护'}</Descriptions.Item>
                    <Descriptions.Item label="相关地点">{item.locationText || '待维护'}</Descriptions.Item>
                    <Descriptions.Item label="敏感级别">{optionLabel(sensitiveOptions, item.sensitiveLevel)}</Descriptions.Item>
                    <Descriptions.Item label="维护人">{item.createdByName || '未返回'}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{formatDateTime(item.createdAt)}</Descriptions.Item>
                    <Descriptions.Item label="最近更新">{formatDateTime(item.updatedAt)}</Descriptions.Item>
                  </Descriptions>
                  <div>
                    <Title level={5}>摘要</Title>
                    <Paragraph>{item.summary || '暂无摘要'}</Paragraph>
                  </div>
                  <div>
                    <Title level={5}>正文</Title>
                    {item.content ? <Paragraph className="culture-detail-content">{item.content}</Paragraph> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无正文或当前响应未返回正文" />}
                  </div>
                </Space>
              )
            },
            {
              key: 'evidence', label: `来源与附件（${item.sourceCount + item.attachmentCount}）`, children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Title level={5}>来源证据</Title>
                    <List
                      bordered
                      dataSource={item.sources}
                      locale={{ emptyText: '尚未绑定可见来源' }}
                      renderItem={source => (
                        <List.Item>
                          <List.Item.Meta
                            title={<Space wrap><Text strong>{source.sourceName}</Text><Tag>{sourceTypeText[source.sourceType] || '其他来源'}</Tag><Tag color={statusColor(source.bindingStatus)}>{optionLabel(statusOptions, source.bindingStatus)}</Tag></Space>}
                            description={<Space direction="vertical" size={2}><Text type="secondary">可信度：{optionLabel(confidenceOptions, source.confidenceLevel)}</Text>{source.excerpt ? <Paragraph ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>{source.excerpt}</Paragraph> : <Text type="secondary">未返回可见摘录</Text>}</Space>}
                          />
                        </List.Item>
                      )}
                    />
                  </div>
                  <div>
                    <Title level={5}>附件</Title>
                    <List
                      bordered
                      dataSource={item.attachments}
                      locale={{ emptyText: '尚无可见附件' }}
                      renderItem={attachment => (
                        <List.Item
                          actions={[
                            attachment.canPreview ? <Button key="preview" type="link" onClick={() => props.onPreviewAttachment(attachment.attachmentId, attachment.fileName)}>预览</Button> : null,
                            attachment.canDownload ? <Button key="download" type="link" onClick={() => props.onDownloadAttachment(attachment.attachmentId, attachment.fileName)}>下载</Button> : null
                          ].filter(Boolean)}
                        >
                          <List.Item.Meta title={attachment.fileName} description={`${attachment.contentType || '未知类型'} · ${formatFileSize(attachment.fileSize)}`} />
                        </List.Item>
                      )}
                    />
                  </div>
                </Space>
              )
            },
            {
              key: 'history', label: `审核与追踪（${item.reviewCount}）`, children: (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                    <Descriptions.Item label="当前审核状态">{reviewStatusText(item.review.status)}</Descriptions.Item>
                    <Descriptions.Item label="提交人">{item.review.submitterName || '未返回'}</Descriptions.Item>
                    <Descriptions.Item label="审核人">{item.review.reviewerName || '待分配'}</Descriptions.Item>
                    <Descriptions.Item label="提交时间">{formatDateTime(item.review.submittedAt)}</Descriptions.Item>
                    <Descriptions.Item label="处理时间">{formatDateTime(item.review.reviewedAt)}</Descriptions.Item>
                    <Descriptions.Item label="驳回原因" span={2}>{item.review.rejectedReason || '-'}</Descriptions.Item>
                  </Descriptions>
                  {props.traceError ? <PageFeedback tone="warning" title="追踪时间线暂不可用" description={props.traceError} /> : null}
                  {props.trace ? (
                    <>
                      <Timeline items={props.trace.timeline.map(event => ({
                        children: <Space direction="vertical" size={2}><Text strong>{event.title}</Text>{event.summary ? <Text>{event.summary}</Text> : null}<Text type="secondary">{event.actorDisplayName || '系统'} · {formatDateTime(event.occurredAt)}</Text></Space>
                      }))} />
                      {props.trace.traceCoverage.notes.length ? <PageFeedback tone="info" title="追踪覆盖说明" description={props.trace.traceCoverage.notes.join('；')} /> : null}
                    </>
                  ) : !props.traceError ? <Skeleton active paragraph={{ rows: 4 }} /> : null}
                </Space>
              )
            }
          ]}
        />
      ) : null}
    </Drawer>
  );
}
