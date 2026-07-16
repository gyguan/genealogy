import { isOfficial } from '../domain/status';
import { buildWizardSummary, type SummarySectionKey } from '../domain/wizardSummaryModel';
import { loadBranches } from './branchService';
import { loadGenerationItems, loadGenerationSchemes } from './generationService';
import { loadPersons } from './personService';
import { loadRelationships } from './relationshipService';
import { loadSourceLinks, loadSources } from './sourceService';

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function loadWizardSummary(clanId: string, selectedPersonId?: string) {
  const errors: Partial<Record<SummarySectionKey, string>> = {};
  const [branchesResult, schemesResult, personsResult, sourcesResult] = await Promise.allSettled([
    loadBranches(clanId), loadGenerationSchemes(clanId), loadPersons(clanId), loadSources(clanId)
  ]);
  const branches = branchesResult.status === 'fulfilled' ? branchesResult.value : [];
  const schemes = schemesResult.status === 'fulfilled' ? schemesResult.value : [];
  const persons = personsResult.status === 'fulfilled' ? personsResult.value : [];
  const sources = sourcesResult.status === 'fulfilled' ? sourcesResult.value : [];
  if (branchesResult.status === 'rejected') errors.branch = errorText(branchesResult.reason, '支派加载失败');
  if (schemesResult.status === 'rejected') errors.generation = errorText(schemesResult.reason, '字辈方案加载失败');
  if (personsResult.status === 'rejected') errors.person = errorText(personsResult.reason, '人物加载失败');
  if (sourcesResult.status === 'rejected') errors.source = errorText(sourcesResult.reason, '来源加载失败');

  const officialPersons = persons.filter(isOfficial);
  const personIds = selectedPersonId
    ? [selectedPersonId, ...officialPersons.map(row => String(row.id || '')).filter(id => id && id !== selectedPersonId)]
    : officialPersons.map(row => String(row.id || '')).filter(Boolean);
  const relationshipResults = await Promise.allSettled(personIds.map(id => loadRelationships(id)));
  const relationships = Array.from(new Map(relationshipResults
    .filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof loadRelationships>>> => item.status === 'fulfilled')
    .flatMap(item => item.value)
    .map(row => [String(row.id || `${row.fromPersonId}-${row.toPersonId}-${row.relationType}`), row])).values());
  if (personIds.length && relationshipResults.every(item => item.status === 'rejected')) errors.relationship = '关系列表加载失败';

  const itemResults = await Promise.allSettled(schemes.map(row => loadGenerationItems(row.id)));
  const generationItemCount = itemResults
    .filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof loadGenerationItems>>> => item.status === 'fulfilled')
    .reduce((sum, item) => sum + item.value.length, 0);
  if (schemes.length && itemResults.every(item => item.status === 'rejected')) errors.generation = errors.generation || '字辈明细加载失败';

  const linkResults = await Promise.allSettled(sources.map(row => loadSourceLinks(row.id)));
  const sourceLinkCount = linkResults
    .filter((item): item is PromiseFulfilledResult<Awaited<ReturnType<typeof loadSourceLinks>>> => item.status === 'fulfilled')
    .reduce((sum, item) => sum + item.value.length, 0);
  if (sources.length && linkResults.every(item => item.status === 'rejected')) errors.source = errors.source || '来源绑定加载失败';

  return buildWizardSummary({
    clanSelected: Boolean(clanId),
    branches,
    schemes,
    generationItemCount,
    persons,
    relationships,
    sources,
    sourceLinkCount,
    errors
  });
}
