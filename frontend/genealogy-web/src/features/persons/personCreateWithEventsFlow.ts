import type { PersonEventDraft } from './personEventEditorModel.js';
import { savePersonWithEvents } from './personEventSaveFlow.js';

export type CreatedPerson = {
  id?: string | number | null;
};

export async function createPersonWithEvents<TPerson extends CreatedPerson>({
  events,
  createPerson,
  saveEvents,
  submitReview
}: {
  events: PersonEventDraft[];
  createPerson: () => Promise<TPerson>;
  saveEvents: (personId: string, events: PersonEventDraft[]) => Promise<unknown>;
  submitReview?: (personId: string) => Promise<unknown>;
}): Promise<TPerson> {
  const created = await savePersonWithEvents({
    events,
    savePerson: createPerson,
    saveEvents: async () => {
      const personId = String(createdPersonId(created));
      await saveEvents(personId, events);
    }
  });

  const personId = String(createdPersonId(created));
  if (submitReview) {
    await submitReview(personId);
  }
  return created;
}

function createdPersonId(person: CreatedPerson) {
  const id = person?.id;
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new Error('人物创建成功但未返回人物 ID，无法保存关键事件');
  }
  return id;
}
