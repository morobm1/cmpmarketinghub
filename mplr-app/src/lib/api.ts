import type { CurrentUser, MPLRData } from '../types';
import { normalizeMPLRData } from './normalize';

async function apiFetch(path: string, opts: RequestInit = {}): Promise<Response> {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const res = await fetch('/api' + path, { ...opts, headers, credentials: 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res;
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const res = await fetch('/.netlify/functions/me', { credentials: 'include' });
  if (!res.ok) throw new Error('Not authenticated');
  const data = await res.json();
  return {
    username: data.username || '',
    role: data.role || 'user',
    properties: Array.isArray(data.properties) ? data.properties : data.properties === '*' ? '*' : [],
  };
}

export async function logout(): Promise<void> {
  await fetch('/.netlify/functions/auth-logout', { method: 'POST', credentials: 'include' }).catch(() => {});
}

export async function fetchProperties(): Promise<string[]> {
  const res = await apiFetch('/properties');
  const list = await res.json();
  return (list || []).map((p: any) => p.name).filter(Boolean);
}

export function getAccessibleProperties(user: CurrentUser | null, all: string[]): string[] {
  if (!user) return [];
  if (user.properties === '*') return all;
  return all.filter((p) => (user.properties as string[]).includes(p));
}

export async function loadMPLRData(property: string): Promise<MPLRData> {
  const res = await apiFetch(`/mplr-data/${encodeURIComponent(property)}`);
  const data = await res.json();
  return normalizeMPLRData(property, data);
}

export async function saveMPLRData(property: string, partial: Partial<MPLRData>): Promise<boolean> {
  const res = await apiFetch(`/mplr-data/${encodeURIComponent(property)}`, {
    method: 'POST',
    body: JSON.stringify(partial),
  });
  const result = await res.json();
  return !!result.success;
}

export async function deleteMPLRData(property: string): Promise<boolean> {
  const res = await apiFetch(`/mplr-data/${encodeURIComponent(property)}`, { method: 'DELETE' });
  const result = await res.json();
  return !!result.success;
}
