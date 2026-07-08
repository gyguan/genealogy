import { apiClient } from '../../../shared/api/client';
import { toRows } from '../domain/normalize';

export type ClanLike = {
  id?: number | string;
  clanName?: string;
  surname?: string;
};

export async function loadClans(): Promise<ClanLike[]> {
  const data = await apiClient.get('/clans').catch(() => []);
  return toRows<ClanLike>(data);
}
