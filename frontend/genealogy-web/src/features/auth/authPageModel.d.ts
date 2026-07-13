export type AuthMode = 'login' | 'forgot' | 'reset' | 'invite';
export const AUTH_REMEMBERED_USERNAME_KEY: string;
export function authModeFromLocation(search: string): AuthMode;
export function resetTokenFromLocation(search: string): string;
export function invitationTokenFromLocation(search: string): string;
