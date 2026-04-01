import type { BrandKit, ID } from '@/types';

/**
 * Brand Kit Service - abstraction layer for brand kit data access.
 */
export interface IBrandKitService {
  getAll(): Promise<BrandKit[]>;
  getById(id: ID): Promise<BrandKit | undefined>;
  getByPropertyId(propertyId: ID): Promise<BrandKit | undefined>;
  save(brandKit: BrandKit): Promise<BrandKit>;
  delete(id: ID): Promise<void>;
}

class ApiBrandKitService implements IBrandKitService {
  private base = '/.netlify/functions/email-brand-kits';

  private async request<T>(path = '', options: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base + path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getAll(): Promise<BrandKit[]> {
    return this.request<BrandKit[]>();
  }

  async getById(id: ID): Promise<BrandKit | undefined> {
    return this.request<BrandKit>('?id=' + encodeURIComponent(id));
  }

  async getByPropertyId(propertyId: ID): Promise<BrandKit | undefined> {
    return this.request<BrandKit>('?propertyId=' + encodeURIComponent(propertyId));
  }

  async save(brandKit: BrandKit): Promise<BrandKit> {
    return this.request<BrandKit>('', {
      method: 'POST',
      body: JSON.stringify(brandKit),
    });
  }

  async delete(id: ID): Promise<void> {
    await this.request<void>('?id=' + encodeURIComponent(id), { method: 'DELETE' });
  }
}

export const brandKitService: IBrandKitService = new ApiBrandKitService();
