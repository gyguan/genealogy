import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';

export type PersonLike = {
  id?: number | string;
  name?: string;
  gender?: string;
  generationNo?: number | string;
  generationWord?: string;
  dataStatus?: string;
  status?: string;
  branchId?: number | string;
  allowedActions?: string[];
};

export type CreatePersonPayload = {
  branchId: number | null;
  personCode: string | null;
  name: string;
  genealogyName: string | null;
  courtesyName: string | null;
  aliasName: string | null;
  gender: string;
  generationNo: number | null;
  generationWord: string | null;
  rankInFamily: string | null;
  birthDate: string | null;
  birthDatePrecision: string | null;
  deathDate: string | null;
  deathDatePrecision: string | null;
  isLiving: boolean | null;
  birthPlace: string | null;
  residencePlace: string | null;
  occupation: string | null;
  education: string | null;
  titleOrHonor: string | null;
  biography: string | null;
  tombPlace: string | null;
  epitaph: string | null;
  hasDescendant: boolean | null;
  lineageStatus: string | null;
  privacyLevel: string | null;
  dataStatus: string | null;
};

export async function loadPersons(clanId?: number | string): Promise<PersonLike[]> {
  if (!clanId) return [];
  const data = await apiClient.get(`/clans/${clanId}/persons`);
  return toRows<PersonLike>(data);
}

export async function createPersonApi(clanId: number | string, payload: CreatePersonPayload): Promise<PersonLike> {
  return apiClient.post(`/clans/${clanId}/persons`, payload);
}

export async function deletePersonApi(personId: number | string): Promise<void> {
  await apiClient.delete(`/persons/${personId}`);
}
