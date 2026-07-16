import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';
import {
  emptyWizardStateSnapshot,
  type WizardEntity,
  type WizardStateSnapshot,
  type WizardTask
} from '../domain/wizardStepState';

export type WizardStateLoadInput = {
  clanId: string;
  branchId: string;
  personId: string;
  relationshipId: string;
  sourceId: string;
  skipped: {
    relationship: boolean;
    source: boolean;
  };
};

type SettledRows<T> = {
  rows: T[];
  error?: string;
};

function errorMessage(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.message) return reason.message;
  return fallback;
}

async function loadRows<T>(path: string, fallbackMessage: string): Promise<SettledRows<T>> {
  try {
    return { rows: toRows<T>(await apiClient.get(path)) };
  } catch (error) {
    return { rows: [], error: errorMessage(error, fallbackMessage) };
  }
}

function idOf(value: unknown) {
  return String(value ?? '').trim();
}

export async function loadWizardStateSnapshot(input: WizardStateLoadInput): Promise<WizardStateSnapshot> {
  const snapshot = emptyWizardStateSnapshot();
  snapshot.clanId = input.clanId;
  snapshot.branchId = input.branchId;
  snapshot.personId = input.personId;
  snapshot.relationshipId = input.relationshipId;
  snapshot.sourceId = input.sourceId;
  snapshot.skipped = { ...input.skipped };

  const clans = await loadRows<WizardEntity>('/clans', '加载宗族失败');
  snapshot.clans = clans.rows;
  if (clans.error) snapshot.errors.clan = clans.error;

  if (!input.clanId || clans.error) return snapshot;

  const [branches, schemes, persons, sources, tasks] = await Promise.all([
    loadRows<WizardEntity>(`/clans/${input.clanId}/branches`, '加载支派失败'),
    loadRows<WizardEntity>(`/clans/${input.clanId}/generation-schemes`, '加载字辈方案失败'),
    loadRows<WizardEntity>(`/clans/${input.clanId}/persons`, '加载人物失败'),
    loadRows<WizardEntity>(`/clans/${input.clanId}/sources`, '加载来源失败'),
    loadRows<WizardTask>(`/clans/${input.clanId}/review-tasks/pending`, '加载审核任务失败')
  ]);

  snapshot.branches = branches.rows;
  snapshot.schemes = schemes.rows;
  snapshot.persons = persons.rows;
  snapshot.sources = sources.rows;
  snapshot.tasks = tasks.rows;

  if (branches.error) snapshot.errors.branch = branches.error;
  if (schemes.error) snapshot.errors.generation = schemes.error;
  if (persons.error) snapshot.errors.person = persons.error;
  if (sources.error) snapshot.errors.source = sources.error;
  if (tasks.error) snapshot.errors.review = tasks.error;

  if (!schemes.error && input.branchId) {
    const relevantSchemes = schemes.rows.filter(row => row.id && (!row.branchId || idOf(row.branchId) === input.branchId));
    const itemResults = await Promise.all(relevantSchemes.map(async scheme => {
      const schemeId = idOf(scheme.id);
      const items = await loadRows<WizardEntity>(`/generation-schemes/${schemeId}/items`, '加载字辈明细失败');
      return { schemeId, ...items };
    }));
    for (const result of itemResults) {
      snapshot.generationItemCounts[result.schemeId] = result.rows.length;
      if (result.error && !snapshot.errors.generation) snapshot.errors.generation = result.error;
    }
  }

  if (input.personId && !input.skipped.relationship) {
    const relationships = await loadRows<WizardEntity>(`/persons/${input.personId}/relationships`, '加载人物关系失败');
    snapshot.relationships = relationships.rows;
    if (relationships.error) snapshot.errors.relationship = relationships.error;
  }

  if (input.sourceId && !input.skipped.source) {
    const links = await loadRows<WizardEntity>(`/source-bindings/sources/${input.sourceId}`, '加载来源绑定失败');
    snapshot.sourceLinkCount = links.rows.length;
    if (links.error) snapshot.errors.source = links.error;
  }

  return snapshot;
}
