import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Space, Tag, Typography, message } from 'antd';
import { apiClient } from '../../shared/api/client';
import { useWorkspace } from '../../shared/context/WorkspaceContext';

type FocusPerson = {
  id?: number | string;
  name?: string;
  personName?: string;
  genealogyName?: string;
  gender?: string;
  branchName?: string;
  branchId?: number | string;
  generationNo?: number | string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
  birthDate?: string;
  deathDate?: string;
};

function display(value: unknown, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function personName(person?: FocusPerson | null) {
  return display(person?.name || person?.personName || person?.genealogyName, '未命名人物');
}

function genderText(value?: string) {
  const text = String(value || '').toLowerCase();
  if (text === 'male') return '男';
  if (text === 'female') return '女';
  if (text === 'unknown') return '未知';
  return display(value, '未知');
}

function statusText(person?: FocusPerson | null) {
  const status = String(person?.dataStatus || person?.status || '').trim().toLowerCase();
  const dict: Record<string, string> = {
    draft: '草稿',
    pending: '待审核',
    pending_review: '待审核',
    official: '正式',
    active: '正式',
    approved: '已通过',
    rejected: '已驳回',
    archived: '已归档'
  };
  return dict[status] || (status ? '未知状态' : '待维护');
}

function statusColor(person?: FocusPerson | null) {
  const status = String(person?.dataStatus || person?.status || '').trim().toLowerCase();
  if (['official', 'active', 'approved'].includes(status)) return 'success';
  if (['pending', 'pending_review'].includes(status)) return 'processing';
  if (status === 'rejected') return 'error';
  return 'default';
}

function lifeText(person?: FocusPerson | null) {
  const birth = String(person?.birthDate || '').slice(0, 10);
  const death = String(person?.deathDate || '').slice(0, 10);
  if (!birth && !death) return '-';
  return `${birth || '?'} - ${death || '?'}`;
}

function cssAttributeValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function PersonArchiveFocusBridge() {
  const workspace = useWorkspace();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [person, setPerson] = useState<FocusPerson | null>(null);
  const handledPersonIdRef = useRef('');
  const focusedPersonId = String(workspace.personId || '').trim();

  useEffect(() => {
    const personId = String(workspace.personId || '').trim();
    if (!personId || handledPersonIdRef.current === personId) return;
    handledPersonIdRef.current = personId;
    setLoading(true);
    apiClient.get(`/persons/${personId}`)
      .then(data => {
        setPerson(data as FocusPerson);
        setOpen(true);
      })
      .catch(error => message.error((error as Error).message || '加载工作台定位人物失败'))
      .finally(() => setLoading(false));
  }, [workspace.personId]);

  function close() {
    setOpen(false);
  }

  function clearFocus() {
    workspace.setPersonId('');
    handledPersonIdRef.current = '';
    setOpen(false);
    setPerson(null);
  }

  return (
    <>
      {focusedPersonId ? (
        <style>{`.person-archive-search .ant-table-row[data-row-key="${cssAttributeValue(focusedPersonId)}"] > td { background: #e6f4ff !important; } .person-archive-search .ant-table-row[data-row-key="${cssAttributeValue(focusedPersonId)}"] > td:first-child { box-shadow: inset 3px 0 0 #1677ff; }`}</style>
      ) : null}
      {workspace.personId ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="来自工作台定位"
          description={`已带入人物档案定位对象：${person ? personName(person) : `人物 ${workspace.personId}`}。可在弹窗中查看，列表命中时会自动高亮；或清除定位后重新检索。`}
          action={<Button size="small" onClick={clearFocus}>清除定位</Button>}
        />
      ) : null}
      <Drawer
        title="人物档案定位"
        width={560}
        open={open}
        loading={loading}
        onClose={close}
        extra={<Space><Button onClick={clearFocus}>清除定位</Button><Button onClick={close}>关闭</Button></Space>}
      >
        {person ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={statusColor(person)}>{statusText(person)}</Tag>
              <Tag>{display(person.branchName || person.branchId, '支派待维护')}</Tag>
            </Space>
            <Typography.Title level={4} style={{ margin: 0 }}>{personName(person)}</Typography.Title>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="姓名">{personName(person)}</Descriptions.Item>
              <Descriptions.Item label="性别">{genderText(person.gender)}</Descriptions.Item>
              <Descriptions.Item label="支派">{display(person.branchName || person.branchId, '支派待维护')}</Descriptions.Item>
              <Descriptions.Item label="代次 / 字辈">{display(person.generationNo, '代次待维护')} / {display(person.generationWord, '字辈待维护')}</Descriptions.Item>
              <Descriptions.Item label="生卒">{lifeText(person)}</Descriptions.Item>
              <Descriptions.Item label="档案状态">{statusText(person)}</Descriptions.Item>
            </Descriptions>
            <Alert type="success" showIcon message="交付体验" description="当前弹窗来自工作台上下文定位，只做只读查看，不影响人物档案原有搜索、编辑和保存流程。" />
          </Space>
        ) : (
          <Alert type="info" showIcon message="正在定位人物档案" description="系统正在根据工作台传入的人物 ID 加载档案详情。" />
        )}
      </Drawer>
    </>
  );
}
