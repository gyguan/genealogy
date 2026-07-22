export type PersonEventDraft = {
  id?: string | number;
  eventType?: string;
  eventTitle: string;
  eventDate?: string;
  eventDatePrecision?: string;
  eventPlace?: string;
  eventDescription?: string;
  sortOrder: number;
};

export function emptyPersonEvent(sortOrder = 0): PersonEventDraft {
  return {
    eventTitle: '',
    eventDatePrecision: 'day',
    sortOrder
  };
}

export function normalizePersonEvents(input: unknown): PersonEventDraft[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: any, index) => ({
      id: item?.id,
      eventType: trimToUndefined(item?.eventType),
      eventTitle: String(item?.eventTitle || '').trim(),
      eventDate: trimToUndefined(item?.eventDate),
      eventDatePrecision: trimToUndefined(item?.eventDatePrecision) || 'day',
      eventPlace: trimToUndefined(item?.eventPlace),
      eventDescription: trimToUndefined(item?.eventDescription),
      sortOrder: Number.isInteger(item?.sortOrder) && item.sortOrder >= 0 ? item.sortOrder : index
    }))
    .sort(comparePersonEvents)
    .map((item, index) => ({ ...item, sortOrder: index }));
}

export function toReplacePersonEventsPayload(events: PersonEventDraft[]) {
  return {
    events: normalizePersonEvents(events).map((item, index) => ({
      eventType: item.eventType,
      eventTitle: item.eventTitle,
      eventDate: item.eventDate,
      eventDatePrecision: item.eventDate ? item.eventDatePrecision || 'day' : undefined,
      eventPlace: item.eventPlace,
      eventDescription: item.eventDescription,
      sortOrder: index
    }))
  };
}

export function movePersonEvent(events: PersonEventDraft[], from: number, to: number): PersonEventDraft[] {
  if (from === to || from < 0 || to < 0 || from >= events.length || to >= events.length) return normalizeOrder(events);
  const next = [...events];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return normalizeOrder(next);
}

export function isFuturePersonEventDate(value?: string, today = new Date()): boolean {
  if (!value) return false;
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.getTime() > normalizedToday.getTime();
}

function comparePersonEvents(left: PersonEventDraft, right: PersonEventDraft) {
  const leftDate = left.eventDate || '9999-12-31';
  const rightDate = right.eventDate || '9999-12-31';
  return leftDate.localeCompare(rightDate)
    || left.sortOrder - right.sortOrder
    || left.eventTitle.localeCompare(right.eventTitle);
}

function normalizeOrder(events: PersonEventDraft[]) {
  return events.map((item, index) => ({ ...item, sortOrder: index }));
}

function trimToUndefined(value: unknown) {
  const text = String(value ?? '').trim();
  return text || undefined;
}
