import { useEffect, useMemo, useState } from 'react';
import type { Key } from 'react';
import { Button, Descriptions, Drawer, Empty, Input, Modal, Select, Space, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import type { PageResponse } from '../../shared/api/client';
import { apiClient } from '../../shared/api/client';
import type { ReviewTaskListItemResponse, ReviewTaskViewDetailResponse } from '../../shared/api/generated/tracking-types';
import { useWorkspace } from '../../shared/context/WorkspaceContext';
import { Panel } from '../../shared/ui/Panel';

 type Props = { notify: (data: unknown, error?: boolean) => void };
 type ReviewTabKey = 'pending' | 'submitted' | 'processed';
 type DecisionType = 'approve' | 'reject';
 type BranchOption = { id: number | string; branchName?: string };

 const targetTypeOptions = [
   { value: 'import_job', label: '导入批次' },
   { value: 'person', label: '人物' },
   { value: 'relationship', label: '人物关系' },
   { value: 'source', label: '来源资料' },
   { value: 'source_binding', label: '来源绑定' },
   { value: 'branch', label: '支派' },
   { value: 'generation_scheme', label: '字辈方案' },
   { value: 'clan', label: '宗族' }
 ];

 const statusOptions = [
   { value: 'pending', label: '待审核' },
   { value: 'approved', label: '已通过' },
   { value: 'rejected', label: '已驳回' },
   { value: 'cancelled', label: '已取消' }
 ];

 function rowKey(row: ReviewTaskListItemResponse) {
   return String(row.id);
 }

 function targetTypeText(value?: string) {
   const normalized = String(value || '').trim().toLowerCase().replace(/-/g, '_');
   return targetTypeOptions.find(option => option.value === normalized)?.label || '其他对象';
 }

 function statusText(value?: string) {
   const status = String(value || '').trim().toLowerCase();
   const dict: Record<string, string> = {
     pending: '待审核',
     pending_review: '待审核',
     reviewing: '审核中',
     approved: '已通过',
     passed: '已通过',
     rejected: '已驳回',
     cancelled: '已取消',
     canceled: '已取消',
     completed: '已完成'
   };
   return dict[status] || '未知状态';
 }

 function statusColor(value?: string) {
   const status = String(value || '').trim().toLowerCase();
   if (['approved', 'passed', 'completed'].includes(status)) return 'success';
   if (['rejected', 'cancelled', 'canceled'].includes(status)) return 'error';
   if (['pending', 'pending_review', 'reviewing'].includes(status)) return 'processing';
   return 'default';
 }

 function formatDateTime(value?: string | null) {
   if (!value) return '-';
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
 }

 function dateStart(value: string) {
   return value ? `${value}T00:00:00` : '';
 }

 function dateEnd(value: string) {
   return value ? `${value}T23:59:59` : '';
 }

 function isPending(row?: ReviewTaskListItemResponse | null) {
   return String(row?.status || '').toLowerCase() === 'pending';
 }

 function reviewRoundText(row: ReviewTaskListItemResponse) {
   const round = row.targetSummary?.reviewRound;
   return round ? `第 ${round} 轮` : '审核记录';
 }

 export function ReviewCenterPage({ notify }: Props) {
   const workspace = useWorkspace();
   const [activeTab, setActiveTab] = useState<ReviewTabKey>('pending');
   const [tasks, setTasks] = useState<ReviewTaskListItemResponse[]>([]);
   const [total, setTotal] = useState(0);
   const [pageNo, setPageNo] = useState(1);
   const [pageSize, setPageSize] = useState(20);
   const [loading, setLoading] = useState(false);
   const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
   const [processingKeys, setProcessingKeys] = useState<Key[]>([]);
   const [detail, setDetail] = useState<ReviewTaskViewDetailResponse | null>(null);
   const [detailLoading, setDetailLoading] = useState(false);
   const [branches, setBranches] = useState<BranchOption[]>([]);
   const [targetType, setTargetType] = useState<string>();
   const [status, setStatus] = useState<string>();
   const [branchId, setBranchId] = useState<string>();
   const [submittedFrom, setSubmittedFrom] = useState('');
   const [submittedTo, setSubmittedTo] = useState('');
   const [processedFrom, setProcessedFrom] = useState('');
   const [processedTo, setProcessedTo] = useState('');
   const [decisionTask, setDecisionTask] = useState<ReviewTaskListItemResponse | null>(null);
   const [decisionType, setDecisionType] = useState<DecisionType>('approve');
   const [decisionComment, setDecisionComment] = useState('');
   const [decisionLoading, setDecisionLoading] = useState(false);

   const selectedTasks = useMemo(
     () => tasks.filter(task => selectedRowKeys.includes(rowKey(task))),
     [tasks, selectedRowKeys]
   );

   async function loadBranches() {
     if (!workspace.clanId) {
       setBranches([]);
       return;
     }
     try {
       const data = await apiClient.get<BranchOption[]>(`/clans/${workspace.clanId}/branches`);
       setBranches(Array.isArray(data) ? data : []);
     } catch {
       setBranches([]);
     }
   }

   async function loadTasks(nextPage = pageNo, nextPageSize = pageSize) {
     if (!workspace.clanId) {
       setTasks([]);
       setTotal(0);
       setSelectedRowKeys([]);
       return;
     }
     setLoading(true);
     try {
       const params = new URLSearchParams({
         view: activeTab,
         scope: 'mine',
         pageNo: String(nextPage),
         pageSize: String(nextPageSize)
       });
       if (targetType) params.set('targetType', targetType);
       if (status) params.set('status', status);
       if (branchId) params.set('branchId', branchId);
       if (submittedFrom) params.set('submittedFrom', dateStart(submittedFrom));
       if (submittedTo) params.set('submittedTo', dateEnd(submittedTo));
       if (processedFrom) params.set('processedFrom', dateStart(processedFrom));
       if (processedTo) params.set('processedTo', dateEnd(processedTo));
       const page = await apiClient.get<PageResponse<ReviewTaskListItemResponse>>(
         `/clans/${workspace.clanId}/review-tasks/search?${params.toString()}`
       );
       setTasks(page.records || []);
       setTotal(page.total || 0);
       setSelectedRowKeys([]);
     } catch (error) {
       setTasks([]);
       setTotal(0);
       notify({ message: (error as Error).message || '查询审核任务失败' }, true);
     } finally {
       setLoading(false);
     }
   }

   async function openDetail(taskId: number) {
     if (!workspace.clanId) return;
     setDetailLoading(true);
     try {
       const result = await apiClient.get<ReviewTaskViewDetailResponse>(
         `/clans/${workspace.clanId}/review-tasks/${taskId}/view`
       );
       setDetail(result);
       if (isPending(result.task)) setActiveTab('pending');
     } catch (error) {
       notify({ message: (error as Error).message || '审核详情加载失败' }, true);
     } finally {
       setDetailLoading(false);
     }
   }

   useEffect(() => { void loadBranches(); }, [workspace.clanId]);
   useEffect(() => { void loadTasks(); }, [
     workspace.clanId,
     activeTab,
     pageNo,
     pageSize,
     targetType,
     status,
     branchId,
     submittedFrom,
     submittedTo,
     processedFrom,
     processedTo
   ]);
   useEffect(() => {
     const taskId = Number(workspace.reviewTaskId);
     if (workspace.clanId && Number.isFinite(taskId) && taskId > 0) {
       void openDetail(taskId);
     }
   }, [workspace.clanId, workspace.reviewTaskId]);

   function switchTab(key: string) {
     setActiveTab(key as ReviewTabKey);
     setPageNo(1);
     setSelectedRowKeys([]);
     setDetail(null);
     setStatus(undefined);
   }

   function resetFilters() {
     setTargetType(undefined);
     setStatus(undefined);
     setBranchId(undefined);
     setSubmittedFrom('');
     setSubmittedTo('');
     setProcessedFrom('');
     setProcessedTo('');
     setPageNo(1);
   }

   function openDecision(row: ReviewTaskListItemResponse, type: DecisionType) {
     setDecisionTask(row);
     setDecisionType(type);
     setDecisionComment(type === 'approve' ? '同意通过' : '请补充资料后重新提交');
   }

   async function submitDecision() {
     if (!decisionTask?.id) return;
     const key = rowKey(decisionTask);
     setDecisionLoading(true);
     setProcessingKeys(previous => [...previous, key]);
     try {
       await apiClient.post(
         `/review-tasks/${decisionTask.id}/${decisionType}`,
         { comment: decisionComment.trim() || undefined }
       );
       notify({ message: decisionType === 'approve' ? '审核已通过' : '审核已驳回' });
       setDecisionTask(null);
       setDetail(null);
       await loadTasks();
     } catch (error) {
       notify({ message: (error as Error).message || '审核处理失败' }, true);
     } finally {
       setDecisionLoading(false);
       setProcessingKeys(previous => previous.filter(item => item !== key));
     }
   }

   async function batchDecision(type: DecisionType) {
     if (!selectedTasks.length) return;
     setLoading(true);
     try {
       const comment = type === 'approve' ? '批量审核通过' : '批量驳回，请补充资料后重新提交';
       const results = await Promise.allSettled(
         selectedTasks.map(task => apiClient.post(`/review-tasks/${task.id}/${type}`, { comment }))
       );
       const successCount = results.filter(result => result.status === 'fulfilled').length;
       const failureCount = results.length - successCount;
       if (successCount) notify({ message: `已处理 ${successCount} 条审核任务` });
       if (failureCount) notify({ message: `${failureCount} 条审核任务处理失败` }, true);
       await loadTasks();
     } finally {
       setLoading(false);
     }
   }

   const columns = [
     { key: 'title', title: '审核事项', width: 220, ellipsis: true, render: (_: unknown, row: ReviewTaskListItemResponse) => row.title },
     { key: 'targetType', title: '审核对象', width: 120, render: (_: unknown, row: ReviewTaskListItemResponse) => targetTypeText(row.targetType) },
     { key: 'branch', title: '目标支派', width: 140, render: (_: unknown, row: ReviewTaskListItemResponse) => row.branchName || '全宗族' },
     { key: 'diffSummary', title: '变更摘要', dataIndex: 'diffSummary', width: 260, ellipsis: true },
     { key: 'status', title: '状态', width: 100, render: (_: unknown, row: ReviewTaskListItemResponse) => <Tag color={statusColor(row.status)}>{statusText(row.status)}</Tag> },
     { key: 'submitter', title: '提交人', width: 120, render: (_: unknown, row: ReviewTaskListItemResponse) => row.submitterName || '-' },
     { key: 'reviewer', title: '审核人', width: 120, render: (_: unknown, row: ReviewTaskListItemResponse) => row.reviewerName || '-' },
     { key: 'submitTime', title: '提交时间', width: 175, render: (_: unknown, row: ReviewTaskListItemResponse) => formatDateTime(row.submitTime) },
     { key: 'processedAt', title: '处理时间', width: 175, render: (_: unknown, row: ReviewTaskListItemResponse) => formatDateTime(row.processedAt) },
     {
       key: 'actions',
       title: '操作',
       width: activeTab === 'pending' ? 190 : 90,
       fixed: 'right' as const,
       render: (_: unknown, row: ReviewTaskListItemResponse) => (
         <Space size="small" onClick={event => event.stopPropagation()}>
           <Button size="small" onClick={() => void openDetail(row.id)}>详情</Button>
           {activeTab === 'pending' ? (
             <>
               <Button size="small" type="primary" loading={processingKeys.includes(rowKey(row))} onClick={() => openDecision(row, 'approve')}>通过</Button>
               <Button size="small" danger loading={processingKeys.includes(rowKey(row))} onClick={() => openDecision(row, 'reject')}>驳回</Button>
             </>
           ) : null}
         </Space>
       )
     }
   ];

   const filterBar = (
     <Space wrap style={{ marginBottom: 16 }}>
       <Select allowClear placeholder="对象类型" value={targetType} options={targetTypeOptions} style={{ width: 150 }} onChange={value => { setTargetType(value); setPageNo(1); }} />
       <Select allowClear placeholder="审核状态" value={status} options={statusOptions} style={{ width: 130 }} onChange={value => { setStatus(value); setPageNo(1); }} />
       <Select
         allowClear
         showSearch
         optionFilterProp="label"
         placeholder="目标支派"
         value={branchId}
         options={branches.map(branch => ({ value: String(branch.id), label: branch.branchName || '未命名支派' }))}
         style={{ width: 170 }}
         onChange={value => { setBranchId(value); setPageNo(1); }}
       />
       <Input type="date" aria-label="提交开始日期" value={submittedFrom} style={{ width: 145 }} onChange={event => { setSubmittedFrom(event.target.value); setPageNo(1); }} />
       <Typography.Text type="secondary">至</Typography.Text>
       <Input type="date" aria-label="提交结束日期" value={submittedTo} style={{ width: 145 }} onChange={event => { setSubmittedTo(event.target.value); setPageNo(1); }} />
       {activeTab === 'processed' ? (
         <>
           <Input type="date" aria-label="处理开始日期" value={processedFrom} style={{ width: 145 }} onChange={event => { setProcessedFrom(event.target.value); setPageNo(1); }} />
           <Typography.Text type="secondary">至</Typography.Text>
           <Input type="date" aria-label="处理结束日期" value={processedTo} style={{ width: 145 }} onChange={event => { setProcessedTo(event.target.value); setPageNo(1); }} />
         </>
       ) : null}
       <Button onClick={resetFilters}>重置筛选</Button>
     </Space>
   );

   function renderTable() {
     return (
       <>
         {filterBar}
         {activeTab === 'pending' ? (
           <div className="batch-review-actions table-review-actions">
             <Typography.Text type="secondary">当前筛选共 {total} 条待审核任务</Typography.Text>
             <Space wrap>
               <Button type="primary" disabled={!selectedTasks.length || loading} onClick={() => void batchDecision('approve')}>批量通过（{selectedTasks.length}）</Button>
               <Button danger disabled={!selectedTasks.length || loading} onClick={() => void batchDecision('reject')}>批量驳回（{selectedTasks.length}）</Button>
             </Space>
           </div>
         ) : null}
         <Table<ReviewTaskListItemResponse>
           size="small"
           bordered
           loading={loading}
           rowKey={rowKey}
           dataSource={tasks}
           rowSelection={activeTab === 'pending' ? {
             selectedRowKeys,
             onChange: keys => setSelectedRowKeys(keys),
             preserveSelectedRowKeys: false
           } : undefined}
           onRow={row => ({ onClick: () => void openDetail(row.id), style: { cursor: 'pointer' } })}
           locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={workspace.clanId ? '当前筛选条件下暂无审核记录' : '请先选择宗族'} /> }}
           pagination={{
             current: pageNo,
             pageSize,
             total,
             showSizeChanger: true,
             pageSizeOptions: [10, 20, 50, 100],
             showTotal: value => `共 ${value} 条`,
             onChange: (nextPage, nextPageSize) => {
               setPageNo(nextPageSize === pageSize ? nextPage : 1);
               setPageSize(nextPageSize);
             }
           }}
           columns={columns}
           scroll={{ x: 'max-content' }}
         />
       </>
     );
   }

   const currentDetail = detail?.task;
   const historyItems = [...(detail?.history || [])].reverse().map(item => ({
     color: isPending(item) ? 'blue' : statusColor(item.status) === 'success' ? 'green' : 'red',
     children: (
       <div>
         <Space wrap>
           <Typography.Text strong>{reviewRoundText(item)} · {statusText(item.status)}</Typography.Text>
           <Tag color={statusColor(item.status)}>{statusText(item.status)}</Tag>
         </Space>
         <div><Typography.Text type="secondary">提交：{formatDateTime(item.submitTime)} · {item.submitterName || '-'}</Typography.Text></div>
         {item.processedAt ? <div><Typography.Text type="secondary">处理：{formatDateTime(item.processedAt)} · {item.reviewerName || '-'}</Typography.Text></div> : null}
         <div>{item.reviewComment || item.diffSummary || '暂无审核意见'}</div>
       </div>
     )
   }));

   return (
     <div className="review-center-page">
       <Panel title="审核中心" help="分页查看待审任务、我提交的审核进展和本人已处理记录；筛选与权限范围均由服务端执行。">
         <Tabs
           activeKey={activeTab}
           onChange={switchTab}
           items={[
             { key: 'pending', label: activeTab === 'pending' ? `待我审核（${total}）` : '待我审核', children: renderTable() },
             { key: 'submitted', label: activeTab === 'submitted' ? `我提交的（${total}）` : '我提交的', children: renderTable() },
             { key: 'processed', label: activeTab === 'processed' ? `已处理（${total}）` : '已处理', children: renderTable() }
           ]}
         />
       </Panel>

       <Drawer
         title="审核详情与流转记录"
         width={680}
         open={Boolean(detail) || detailLoading}
         loading={detailLoading}
         onClose={() => { setDetail(null); workspace.setReviewTaskId(''); }}
         extra={currentDetail && isPending(currentDetail) ? (
           <Space>
             <Button danger onClick={() => openDecision(currentDetail, 'reject')}>驳回</Button>
             <Button type="primary" onClick={() => openDecision(currentDetail, 'approve')}>通过</Button>
           </Space>
         ) : null}
       >
         {currentDetail ? (
           <Space direction="vertical" size="large" style={{ width: '100%' }}>
             <Descriptions column={1} size="small" bordered>
               <Descriptions.Item label="审核事项">{currentDetail.title}</Descriptions.Item>
               <Descriptions.Item label="审核对象">{targetTypeText(currentDetail.targetType)}</Descriptions.Item>
               <Descriptions.Item label="目标支派">{currentDetail.branchName || '全宗族'}</Descriptions.Item>
               <Descriptions.Item label="审核状态"><Tag color={statusColor(currentDetail.status)}>{statusText(currentDetail.status)}</Tag></Descriptions.Item>
               <Descriptions.Item label="提交人">{currentDetail.submitterName || '-'}</Descriptions.Item>
               <Descriptions.Item label="审核人">{currentDetail.reviewerName || '-'}</Descriptions.Item>
               <Descriptions.Item label="提交时间">{formatDateTime(currentDetail.submitTime)}</Descriptions.Item>
               <Descriptions.Item label="处理时间">{formatDateTime(currentDetail.processedAt)}</Descriptions.Item>
               <Descriptions.Item label="变更摘要">{currentDetail.diffSummary || '暂无摘要'}</Descriptions.Item>
               <Descriptions.Item label="审核意见">{currentDetail.reviewComment || '暂无审核意见'}</Descriptions.Item>
               {currentDetail.targetSummary?.fileName ? <Descriptions.Item label="导入文件">{currentDetail.targetSummary.fileName}</Descriptions.Item> : null}
               {currentDetail.targetSummary?.reviewRound ? <Descriptions.Item label="审核轮次">第 {currentDetail.targetSummary.reviewRound} 轮</Descriptions.Item> : null}
               {currentDetail.targetSummary?.draftCount !== undefined && currentDetail.targetSummary?.draftCount !== null ? <Descriptions.Item label="草稿数量">{currentDetail.targetSummary.draftCount}</Descriptions.Item> : null}
               {currentDetail.targetSummary?.excludedCount !== undefined && currentDetail.targetSummary?.excludedCount !== null ? <Descriptions.Item label="排除数量">{currentDetail.targetSummary.excludedCount}</Descriptions.Item> : null}
             </Descriptions>
             <div>
               <Typography.Title level={5}>历史审核轮次</Typography.Title>
               <Timeline items={historyItems} />
             </div>
           </Space>
         ) : null}
       </Drawer>

       <Modal
         title={decisionType === 'approve' ? '通过审核' : '驳回审核'}
         open={Boolean(decisionTask)}
         confirmLoading={decisionLoading}
         okText={decisionType === 'approve' ? '确认通过' : '确认驳回'}
         okButtonProps={{ danger: decisionType === 'reject' }}
         onOk={() => void submitDecision()}
         onCancel={() => setDecisionTask(null)}
         destroyOnHidden
       >
         <Space direction="vertical" style={{ width: '100%' }}>
           <Typography.Text>{decisionTask?.title}</Typography.Text>
           <Input.TextArea
             rows={4}
             maxLength={500}
             showCount
             value={decisionComment}
             placeholder={decisionType === 'approve' ? '填写审核意见（可选）' : '请填写驳回原因'}
             onChange={event => setDecisionComment(event.target.value)}
           />
         </Space>
       </Modal>
     </div>
   );
 }
