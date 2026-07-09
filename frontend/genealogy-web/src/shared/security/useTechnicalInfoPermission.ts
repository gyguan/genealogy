import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type RoleLike = string | { roleCode?: string; roleName?: string; roleType?: string; code?: string; name?: string };
export type CurrentUserLike = { username?: string; displayName?: string; roleCode?: string; roleType?: string; roleName?: string; roles?: RoleLike[]; permissions?: string[] };

function normalize(value?: unknown) { return String(value ?? '').trim().toLowerCase(); }
function roleValue(role: RoleLike) { return typeof role === 'string' ? role : [role.roleCode, role.roleName, role.roleType, role.code, role.name].filter(Boolean).join(' '); }

export function canViewTechnicalInfo(user?: CurrentUserLike | null) {
  if (!user) return false;
  const values = [user.username, user.displayName, user.roleCode, user.roleName, user.roleType, ...(user.roles || []).map(roleValue), ...(user.permissions || [])].map(normalize).join(' ');
  return ['admin', 'administrator', 'auditor', 'audit', 'security', 'clan_admin', '系统管理员', '审计', '管理员'].some(keyword => values.includes(keyword));
}

export function useTechnicalInfoPermission() {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!apiClient.getToken()) { if (alive) setAllowed(false); return; }
      try {
        const user = await apiClient.get('/auth/me') as CurrentUserLike;
        if (alive) setAllowed(canViewTechnicalInfo(user));
      } catch {
        if (alive) setAllowed(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);
  return allowed;
}
