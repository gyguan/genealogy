import { isFuturePersonEventDate, toReplacePersonEventsPayload } from './personEventEditorModel';
import type { PersonEventDraft } from './personEventEditorModel';

export type PersonEventValidationError = {
  index: number;
  field: 'eventTitle' | 'eventDate';
  message: string;
};

export function validatePersonEvents(events: PersonEventDraft[]): PersonEventValidationError[] {
  return events.flatMap((event, index) => {
    const errors: PersonEventValidationError[] = [];
    if (!String(event.eventTitle || '').trim()) {
      errors.push({ index, field: 'eventTitle', message: `第 ${index + 1} 条事件标题不能为空` });
    }
    if (isFuturePersonEventDate(event.eventDate)) {
      errors.push({ index, field: 'eventDate', message: `第 ${index + 1} 条事件日期不能晚于今天` });
    }
    return errors;
  });
}

export async function savePersonWithEvents<TPerson>({
  events,
  savePerson,
  saveEvents
}: {
  events: PersonEventDraft[];
  savePerson: () => Promise<TPerson>;
  saveEvents: (payload: ReturnType<typeof toReplacePersonEventsPayload>) => Promise<unknown>;
}): Promise<TPerson> {
  const validationErrors = validatePersonEvents(events);
  if (validationErrors.length) {
    throw new Error(validationErrors[0].message);
  }

  const savedPerson = await savePerson();
  await saveEvents(toReplacePersonEventsPayload(events));
  return savedPerson;
}
