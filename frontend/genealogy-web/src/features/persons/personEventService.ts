import { apiClient } from '../../shared/api/client';
import { normalizePersonEvents, toReplacePersonEventsPayload } from './personEventEditorModel';
import type { PersonEventDraft } from './personEventEditorModel';

export async function loadPersonEvents(personId: string | number): Promise<PersonEventDraft[]> {
  const response = await apiClient.get<unknown>(`/persons/${personId}/events`);
  return normalizePersonEvents(response);
}

export async function replacePersonEvents(
  personId: string | number,
  events: PersonEventDraft[]
): Promise<PersonEventDraft[]> {
  const response = await apiClient.put<unknown>(
    `/persons/${personId}/events`,
    toReplacePersonEventsPayload(events)
  );
  return normalizePersonEvents(response);
}

export async function submitPersonRevisionWithEvents<TPerson>(
  personId: string | number,
  person: unknown,
  events: PersonEventDraft[]
): Promise<TPerson> {
  return apiClient.put<TPerson>(`/persons/${personId}/revision`, {
    person,
    events: toReplacePersonEventsPayload(events)
  });
}
