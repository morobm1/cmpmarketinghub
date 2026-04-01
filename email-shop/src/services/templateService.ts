import type { EmailTemplate, ID } from '@/types';

/**
 * Template Service - abstraction for email template access.
 */
export interface ITemplateService {
  getAll(): Promise<EmailTemplate[]>;
  getById(id: ID): Promise<EmailTemplate | undefined>;
  getByCategory(category: string): Promise<EmailTemplate[]>;
  getByPropertyId(propertyId: ID): Promise<EmailTemplate[]>;
  getDefaults(): Promise<EmailTemplate[]>;
  save(template: EmailTemplate): Promise<EmailTemplate>;
  delete(id: ID): Promise<void>;
}

class ApiTemplateService implements ITemplateService {
  private base = '/.netlify/functions/email-templates';

  private async request<T>(path = '', options: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base + path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getAll(): Promise<EmailTemplate[]> {
    return this.request<EmailTemplate[]>();
  }

  async getById(id: ID): Promise<EmailTemplate | undefined> {
    return this.request<EmailTemplate>('?id=' + encodeURIComponent(id));
  }

  async getByCategory(category: string): Promise<EmailTemplate[]> {
    return this.request<EmailTemplate[]>('?category=' + encodeURIComponent(category));
  }

  async getByPropertyId(propertyId: ID): Promise<EmailTemplate[]> {
    return this.request<EmailTemplate[]>('?propertyId=' + encodeURIComponent(propertyId));
  }

  async getDefaults(): Promise<EmailTemplate[]> {
    return this.request<EmailTemplate[]>('?defaults=true');
  }

  async save(template: EmailTemplate): Promise<EmailTemplate> {
    return this.request<EmailTemplate>('', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async delete(id: ID): Promise<void> {
    await this.request<void>('?id=' + encodeURIComponent(id), { method: 'DELETE' });
  }
}

export const templateService: ITemplateService = new ApiTemplateService();
