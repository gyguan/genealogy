import { CultureItemStandardTab } from './CultureItemStandardTab';

export function CultureItemTab({ clanId }: { clanId: string }) {
  return <CultureItemStandardTab clanId={clanId} clans={[]} clansLoading={false} onClanChange={() => undefined} />;
}
