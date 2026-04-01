/**
 * Auth Context - reads user info from the host page or API.
 * The JWT cookie (mmp_token) is HttpOnly, so we can't read it directly.
 * Instead, the host page (creative_studio.html) calls /api/me and injects
 * user info into window.__EMAIL_SHOP_USER__.
 */

export interface AuthUser {
  username: string;
  role: 'admin' | 'user';
  properties: string[];
}

export function getAuthUser(): AuthUser | null {
  try {
    // Read from host page injection
    const win = window as unknown as { __EMAIL_SHOP_USER__?: AuthUser };
    if (win.__EMAIL_SHOP_USER__) {
      return win.__EMAIL_SHOP_USER__;
    }
    return null;
  } catch {
    return null;
  }
}

/** Fetch user from API (for standalone dev mode or when host page hasn't injected) */
export async function fetchAuthUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/.netlify/functions/me', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      username: data.username || '',
      role: data.role || 'user',
      properties: Array.isArray(data.properties)
        ? data.properties
        : data.properties === '*'
          ? ['*']
          : [],
    };
  } catch {
    return null;
  }
}

/** Get the list of property IDs the user has access to */
export function getUserProperties(): string[] {
  const user = getAuthUser();
  if (!user) return [];
  return user.properties;
}

/** Check if user is admin (has wildcard access) */
export function isAdmin(): boolean {
  const user = getAuthUser();
  if (!user) return false;
  return user.role === 'admin' || user.properties.includes('*');
}
