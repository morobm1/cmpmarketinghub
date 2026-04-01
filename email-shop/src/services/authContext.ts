/**
 * Auth Context - reads the mmp_token JWT cookie to extract user info.
 * The JWT payload has: { sub: username, role: 'admin'|'user', properties: string[] }
 */

export interface AuthUser {
  username: string;
  role: 'admin' | 'user';
  properties: string[];
}

function base64UrlDecode(str: string): string {
  // Replace URL-safe chars
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  // Pad with '='
  while (s.length % 4) s += '=';
  return decodeURIComponent(
    atob(s)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
}

export function getAuthUser(): AuthUser | null {
  try {
    // Also check if user info was injected by the host page
    const win = window as unknown as { __EMAIL_SHOP_USER__?: AuthUser };
    if (win.__EMAIL_SHOP_USER__) {
      return win.__EMAIL_SHOP_USER__;
    }

    // Read from mmp_token cookie
    const match = document.cookie.match(/mmp_token=([^;]+)/);
    if (!match) return null;

    const token = match[1] ?? '';
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1]!));
    return {
      username: payload.sub || '',
      role: payload.role || 'user',
      properties: Array.isArray(payload.properties)
        ? payload.properties
        : payload.properties === '*'
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
