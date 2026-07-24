import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  DatePicker,
  Drawer,
  Form,
  Grid,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { ConfirmAction, EmptyState } from '../../shared/ui/Feedback';
import {
  emptyPersonEvent,
  isFuturePersonEventDate,
  movePersonEvent,
  normalizePersonEvents
} from './personEventEditorModel';
import type { PersonEventDraft } from './personEventEditorModel';

type Props = {
  value?: PersonEventDraft[];
  onChange?: (events: PersonEventDraft[]) => void;
  disabled?: boolean;
  title?: string;
};

const eventTypeOptions = [
  { value: 'birth', label: '出生' },
  { value: 'education', label: '求学' },
  { value: 'career', label: '任职' },
  { value: 'migration', label: '迁徙' },
  { value: 'marriage', label: '婚姻' },
  { value: 'honor', label: '荣誉' },
  { value: 'death', label: '逝世' },
  { value: 'other', label: '其他' }
];

const eventDatePrecisionOptions = [
  { value: 'year', label: '年' },
  { value: 'month', label: '月' },
  { value: 'day', label: '日' }
];

function eventTypeText(value?: string) {
  return eventTypeOptions.find(item => item.value === value)?.label || '其他';
}

function eventDateText(event: PersonEventDraft) {
  if (!event.eventDate) return '—';
  const date = dayjs(event.eventDate);
  if (!date.isValid()) return event.eventDate;
  if (event.eventDatePrecision === 'year') return date.format('YYYY年');
  if (event.eventDatePrecision === 'month') return date.format('YYYY年MM月');
  return date.format('YYYY年MM月DD日');
}

export function PersonEventEditor({ value = [], onChange, disabled = false, title = '关键事件' }: Props) {
  const screens = Grid.useBreakpoint();
  const events = normalizePersonEvents(value);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<PersonEventDraft | null>(null);
  const [titleError, setTitleError] = useState(false);

  function openCreate() {
    setEditingIndex(null);
    setDraft(emptyPersonEvent(events.length));
    setTitleError(false);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setDraft({ ...events[index] });
    setTitleError(false);
  }

  function closeEditor() {
    setDraft(null);
    setEditingIndex(null);
    setTitleError(false);
  }

  function patchDraft(patch: Partial<PersonEventDraft>) {
    setDraft(current => current ? { ...current, ...patch } : current);
  }

  function confirmEditor() {
    if (!draft) return;
    const eventTitle = draft.eventTitle.trim();
    if (!eventTitle) {
      setTitleError(true);
      return;
    }
    if (isFuturePersonEventDate(draft.eventDate)) return;
    const normalized = { ...draft, eventTitle };
    const next = editingIndex === null
      ? [...events, normalized]
      : events.map((item, index) => index === editingIndex ? normalized : item);
    onChange?.(normalizePersonEvents(next));
    closeEditor();
  }

  function remove(index: number) {
    onChange?.(events.filter((_item, itemIndex) => itemIndex !== index)
      .map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })));
  }

  function move(index: number, offset: number) {
    onChange?.(movePersonEvent(events, index, index + offset));
  }

  function actionButtons(index: number, compact = false) {
    const event = events[index];
    return (
      <Space size="small" wrap={!compact}>
        <Button aria-label="上移事件" size="small" icon={<ArrowUpOutlined />} disabled={disabled || index === 0} onClick={() => move(index, -1)} />
        <Button aria-label="下移事件" size="small" icon={<ArrowDownOutlined />} disabled={disabled || index === events.length - 1} onClick={() => move(index, 1)} />
        <Button aria-label="编辑事件" size="small" icon={<EditOutlined />} disabled={disabled} onClick={() => openEdit(index)}>{compact ? null : '编辑'}</Button>
        <ConfirmAction title={`确认删除“${event.eventTitle}”这条生平事迹吗？`} okText="删除" danger onConfirm={() => remove(index)} disabled={disabled}>
          <Button danger aria-label="删除事件" size="small" icon={<DeleteOutlined />} disabled={disabled}>{compact ? null : '删除'}</Button>
        </ConfirmAction>
      </Space>
    );
  }

  const columns: ColumnsType<PersonEventDraft> = [
    { title: '顺序', width: 72, render: (_value, _record, index) => index + 1 },
    { title: '日期', width: 140, render: (_value, event) => eventDateText(event) },
    { title: '类型', width: 88, render: (_value, event) => <Tag>{eventTypeText(event.eventType)}</Tag> },
    {
      title: '事件',
      render: (_value, event, index) => (
        <Button type="link" style={{ padding: 0, height: 'auto', textAlign: 'left' }} disabled={disabled} onClick={() => openEdit(index)}>
          <Space direction="vertical" size={2} align="start">
            <Typography.Text strong>{event.eventTitle}</Typography.Text>
            {event.eventDescription ? <span style={{ color: 'rgba(0, 0, 0, 0.45)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.eventDescription}</span> : null}
          </Space>
        </Button>
      )
    },
    { title: '地点', width: 160, render: (_value, event) => event.eventPlace || '—' },
    { title: '操作', width: 250, fixed: 'right', render: (_value, _event, index) => actionButtons(index) }
  ];

  return (
    <Card
      title={(
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>{title}</span>
          <Button type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={openCreate}>新增事迹</Button>
        </Space>
      )}
    >
      <Typography.Paragraph type="secondary">
        记录人物一生中的重要经历。新增和编辑在弹层中完成，列表按人工顺序稳定展示。
      </Typography.Paragraph>

      {!events.length ? (
        <EmptyState
          title="暂未录入生平事迹"
          action={<Button type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={openCreate}>新增第一条生平事迹</Button>}
        />
      ) : screens.md ? (
        <Table<PersonEventDraft>
          rowKey={(event, index) => String(event.id || `event-${index}`)}
          columns={columns}
          dataSource={events}
          pagination={false}
          size="small"
          scroll={{ x: 920 }}
        />
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {events.map((event, index) => (
            <Card key={String(event.id || `event-${index}`)} size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                  <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>{eventDateText(event)}</span>
                  <Tag>{eventTypeText(event.eventType)}</Tag>
                </Space>
                <Button type="link" style={{ padding: 0, height: 'auto', textAlign: 'left' }} disabled={disabled} onClick={() => openEdit(index)}>
                  <Typography.Text strong>{event.eventTitle}</Typography.Text>
                </Button>
                {event.eventPlace ? <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>地点：{event.eventPlace}</span> : null}
                {event.eventDescription ? <Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>{event.eventDescription}</Typography.Paragraph> : null}
                {actionButtons(index, true)}
              </Space>
            </Card>
          ))}
        </Space>
      )}

      <Drawer
        open={Boolean(draft)}
        title={editingIndex === null ? '新增生平事迹' : '编辑生平事迹'}
        width={screens.md ? 640 : '100%'}
        destroyOnHidden
        onClose={closeEditor}
        footer={(
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={closeEditor}>取消</Button>
            <Button type="primary" disabled={Boolean(draft && isFuturePersonEventDate(draft.eventDate))} onClick={confirmEditor}>
              {editingIndex === null ? '确认新增' : '保存修改'}
            </Button>
          </Space>
        )}
      >
        {draft ? (
          <Form layout="vertical" requiredMark="optional">
            <Form.Item label="事件标题" required validateStatus={titleError ? 'error' : undefined} help={titleError ? '请输入事件标题' : undefined}>
              <Input autoFocus maxLength={200} placeholder="请输入事件标题" value={draft.eventTitle} onChange={event => { setTitleError(false); patchDraft({ eventTitle: event.target.value }); }} />
            </Form.Item>
            <div className="person-edit-fields">
              <Form.Item label="事件类型">
                <Select allowClear options={eventTypeOptions} value={draft.eventType} onChange={eventType => patchDraft({ eventType })} />
              </Form.Item>
              <Form.Item label="事件日期" validateStatus={isFuturePersonEventDate(draft.eventDate) ? 'error' : undefined} help={isFuturePersonEventDate(draft.eventDate) ? '事件日期不能晚于今天' : undefined}>
                <DatePicker
                  style={{ width: '100%' }}
                  value={draft.eventDate ? dayjs(draft.eventDate) : null}
                  disabledDate={(current: Dayjs) => current.startOf('day').isAfter(dayjs().startOf('day'))}
                  onChange={date => patchDraft({
                    eventDate: date ? date.format('YYYY-MM-DD') : undefined,
                    eventDatePrecision: date ? draft.eventDatePrecision || 'day' : undefined
                  })}
                />
              </Form.Item>
              <Form.Item label="日期精度">
                <Select options={eventDatePrecisionOptions} value={draft.eventDate ? draft.eventDatePrecision || 'day' : undefined} disabled={!draft.eventDate} placeholder="请先选择日期" onChange={eventDatePrecision => patchDraft({ eventDatePrecision })} />
              </Form.Item>
              <Form.Item label="地点">
                <Input maxLength={255} value={draft.eventPlace} onChange={event => patchDraft({ eventPlace: event.target.value })} />
              </Form.Item>
              <Form.Item label="事件描述" className="person-edit-field--wide">
                <Input.TextArea rows={5} maxLength={4000} showCount value={draft.eventDescription} onChange={event => patchDraft({ eventDescription: event.target.value })} />
              </Form.Item>
            </div>
          </Form>
        ) : null}
      </Drawer>
    </Card>
  );
}
