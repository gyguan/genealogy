import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { EmptyState } from '../../shared/ui/Feedback';
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

export function PersonEventEditor({ value = [], onChange, disabled = false, title = '关键事件' }: Props) {
  const events = normalizePersonEvents(value);

  function update(index: number, patch: Partial<PersonEventDraft>) {
    onChange?.(events.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function add() {
    onChange?.([...events, emptyPersonEvent(events.length)]);
  }

  function remove(index: number) {
    onChange?.(events.filter((_item, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sortOrder: itemIndex })));
  }

  function move(index: number, offset: number) {
    onChange?.(movePersonEvent(events, index, index + offset));
  }

  return (
    <Card
      title={(
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <span>{title}</span>
          <Button type="dashed" icon={<PlusOutlined />} disabled={disabled} onClick={add}>新增事件</Button>
        </Space>
      )}
    >
      <Typography.Paragraph type="secondary">
        可维护人物一生中的重要节点。事件按人工顺序稳定展示，日期支持年、月、日精度，标题必填且日期不能晚于今天。
      </Typography.Paragraph>
      {!events.length ? (
        <EmptyState
          title="暂未录入关键事件"
          action={<Button type="primary" icon={<PlusOutlined />} disabled={disabled} onClick={add}>新增第一条事件</Button>}
        />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {events.map((event, index) => {
            const titleMissing = !event.eventTitle.trim();
            const futureDate = isFuturePersonEventDate(event.eventDate);
            return (
              <Card
                key={String(event.id || `event-${index}`)}
                size="small"
                title={(
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span>{`事件 ${index + 1}`}</span>
                    <Space size="small">
                      <Button aria-label="上移事件" icon={<ArrowUpOutlined />} disabled={disabled || index === 0} onClick={() => move(index, -1)} />
                      <Button aria-label="下移事件" icon={<ArrowDownOutlined />} disabled={disabled || index === events.length - 1} onClick={() => move(index, 1)} />
                      <Button danger aria-label="删除事件" icon={<DeleteOutlined />} disabled={disabled} onClick={() => remove(index)} />
                    </Space>
                  </Space>
                )}
              >
                <div className="person-edit-fields">
                  <Form.Item label="事件类型">
                    <Select allowClear options={eventTypeOptions} value={event.eventType} disabled={disabled} onChange={eventType => update(index, { eventType })} />
                  </Form.Item>
                  <Form.Item label="事件标题" required>
                    <Input status={titleMissing ? 'error' : undefined} aria-invalid={titleMissing} placeholder="请输入事件标题" value={event.eventTitle} disabled={disabled} maxLength={200} onChange={e => update(index, { eventTitle: e.target.value })} />
                  </Form.Item>
                  <Form.Item label="事件日期">
                    <DatePicker
                      style={{ width: '100%' }}
                      status={futureDate ? 'error' : undefined}
                      aria-invalid={futureDate}
                      value={event.eventDate ? dayjs(event.eventDate) : null}
                      disabled={disabled}
                      disabledDate={(current: Dayjs) => current.startOf('day').isAfter(dayjs().startOf('day'))}
                      onChange={date => update(index, {
                        eventDate: date ? date.format('YYYY-MM-DD') : undefined,
                        eventDatePrecision: date ? event.eventDatePrecision || 'day' : undefined
                      })}
                    />
                  </Form.Item>
                  <Form.Item label="日期精度">
                    <Select
                      options={eventDatePrecisionOptions}
                      value={event.eventDate ? event.eventDatePrecision || 'day' : undefined}
                      disabled={disabled || !event.eventDate}
                      placeholder="请先选择日期"
                      onChange={eventDatePrecision => update(index, { eventDatePrecision })}
                    />
                  </Form.Item>
                  <Form.Item label="地点">
                    <Input value={event.eventPlace} disabled={disabled} maxLength={255} onChange={e => update(index, { eventPlace: e.target.value })} />
                  </Form.Item>
                  <Form.Item label="事件描述" className="person-edit-field--wide">
                    <Input.TextArea rows={3} value={event.eventDescription} disabled={disabled} maxLength={4000} showCount onChange={e => update(index, { eventDescription: e.target.value })} />
                  </Form.Item>
                </div>
              </Card>
            );
          })}
        </Space>
      )}
    </Card>
  );
}
