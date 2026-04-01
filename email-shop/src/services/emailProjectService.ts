import type { EmailProject, ID } from '@/types';

/**
 * Email Project Service - abstraction for email project CRUD.
 */
export interface IEmailProjectService {
  getAll(): Promise<EmailProject[]>;
  getById(id: ID): Promise<EmailProject | undefined>;
  getByPropertyId(propertyId: ID): Promise<EmailProject[]>;
  save(project: EmailProject): Promise<EmailProject>;
  delete(id: ID): Promise<void>;
  duplicate(id: ID, newName: string): Promise<EmailProject>;
}

class ApiEmailProjectService implements IEmailProjectService {
  private base = '/.netlify/functions/email-projects';

  private async request<T>(path = '', options: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base + path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getAll(): Promise<EmailProject[]> {
    return this.request<EmailProject[]>();
  }

  async getById(id: ID): Promise<EmailProject | undefined> {
    return this.request<EmailProject>('?id=' + encodeURIComponent(id));
  }

  async getByPropertyId(propertyId: ID): Promise<EmailProject[]> {
    return this.request<EmailProject[]>('?propertyId=' + encodeURIComponent(propertyId));
  }

  async save(project: EmailProject): Promise<EmailProject> {
    return this.request<EmailProject>('', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  async delete(id: ID): Promise<void> {
    await this.request<void>('?id=' + encodeURIComponent(id), { method: 'DELETE' });
  }

  async duplicate(id: ID, newName: string): Promise<EmailProject> {
    return this.request<EmailProject>('', {
      method: 'POST',
      body: JSON.stringify({ action: 'duplicate', id, newName }),
    });
  }
}

export const emailProjectService: IEmailProjectService = new ApiEmailProjectService();
