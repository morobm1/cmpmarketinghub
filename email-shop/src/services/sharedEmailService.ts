import type { ID } from '@/types';
import type { SharedEmail, SharedEmailVisibility, ISharedEmailService } from '@/types/collaboration';

/**
 * Shared Email Service - API implementation for shared email library.
 */
class ApiSharedEmailService implements ISharedEmailService {
  private base = '/.netlify/functions/email-shared';

  private async request<T>(path = '', options: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base + path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getByProperty(propertyId: ID): Promise<SharedEmail[]> {
    return this.request<SharedEmail[]>('?propertyId=' + encodeURIComponent(propertyId));
  }

  async getMyShared(username: string): Promise<SharedEmail[]> {
    return this.request<SharedEmail[]>('?mine=true&username=' + encodeURIComponent(username));
  }

  async getPublic(): Promise<SharedEmail[]> {
    return this.request<SharedEmail[]>('?visibility=public');
  }

  async getById(id: ID): Promise<SharedEmail | undefined> {
    return this.request<SharedEmail>('?id=' + encodeURIComponent(id));
  }

  async share(email: SharedEmail): Promise<SharedEmail> {
    return this.request<SharedEmail>('', {
      method: 'POST',
      body: JSON.stringify(email),
    });
  }

  async unshare(id: ID): Promise<void> {
    await this.request<void>('?id=' + encodeURIComponent(id), { method: 'DELETE' });
  }

  async updateVisibility(id: ID, visibility: SharedEmailVisibility): Promise<SharedEmail> {
    return this.request<SharedEmail>('', {
      method: 'PUT',
      body: JSON.stringify({ id, visibility }),
    });
  }

  async duplicate(id: ID, newName: string, username: string): Promise<SharedEmail> {
    return this.request<SharedEmail>('', {
      method: 'POST',
      body: JSON.stringify({ action: 'duplicate', id, newName, username }),
    });
  }
}

export const sharedEmailService: ISharedEmailService = new ApiSharedEmailService();
