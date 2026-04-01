import type { Asset, AssetCategory, ID } from '@/types';

/**
 * Asset Library Service - abstraction for asset/image data access.
 * Assets represent Entrata-hosted image URLs.
 */
export interface IAssetLibraryService {
  getAll(): Promise<Asset[]>;
  getByPropertyId(propertyId: ID): Promise<Asset[]>;
  getByCategory(propertyId: ID, category: AssetCategory): Promise<Asset[]>;
  search(propertyId: ID, query: string): Promise<Asset[]>;
  save(asset: Asset): Promise<Asset>;
  delete(id: ID): Promise<void>;
}

class ApiAssetLibraryService implements IAssetLibraryService {
  private base = '/.netlify/functions/email-assets';

  private async request<T>(path = '', options: RequestInit = {}): Promise<T> {
    const res = await fetch(this.base + path, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async getAll(): Promise<Asset[]> {
    return this.request<Asset[]>();
  }

  async getByPropertyId(propertyId: ID): Promise<Asset[]> {
    return this.request<Asset[]>('?propertyId=' + encodeURIComponent(propertyId));
  }

  async getByCategory(propertyId: ID, category: AssetCategory): Promise<Asset[]> {
    return this.request<Asset[]>(
      '?propertyId=' + encodeURIComponent(propertyId) + '&category=' + encodeURIComponent(category),
    );
  }

  async search(propertyId: ID, query: string): Promise<Asset[]> {
    return this.request<Asset[]>(
      '?propertyId=' + encodeURIComponent(propertyId) + '&q=' + encodeURIComponent(query),
    );
  }

  async save(asset: Asset): Promise<Asset> {
    return this.request<Asset>('', {
      method: 'POST',
      body: JSON.stringify(asset),
    });
  }

  async delete(id: ID): Promise<void> {
    await this.request<void>('?id=' + encodeURIComponent(id), { method: 'DELETE' });
  }
}

export const assetLibraryService: IAssetLibraryService = new ApiAssetLibraryService();
