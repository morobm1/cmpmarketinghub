import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { Search, ImageIcon } from 'lucide-react';
import type { Asset, AssetCategory } from '@/types';

const categories: { value: AssetCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'logo', label: 'Logos' },
  { value: 'photo', label: 'Photos' },
  { value: 'floorplan', label: 'Floor Plans' },
  { value: 'banner', label: 'Banners' },
];

export function AssetPanel() {
  const assets = useEditorStore((s) => s.assets);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | 'all'>('all');

  const filtered = assets.filter((a: Asset) => {
    const matchesCat = category === 'all' || a.category === category;
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="px-1">
        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">
          Property Assets
        </h3>
        <p className="text-xs text-surface-400">Click an asset to copy its URL, then paste into image fields</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets..."
          className="w-full pl-8 pr-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              category === cat.value
                ? 'bg-primary-100 text-primary-700'
                : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.map((asset: Asset) => (
          <button
            key={asset.id}
            onClick={() => copyUrl(asset.sourceUrl)}
            className="group relative rounded-lg overflow-hidden border border-surface-200 hover:border-primary-300 hover:shadow-sm transition-all text-left"
            title={`Click to copy URL: ${asset.sourceUrl}`}
          >
            <div className="aspect-video bg-surface-100 overflow-hidden">
              <img
                src={asset.thumbnailUrl}
                alt={asset.altText}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="p-1.5">
              <div className="text-xs font-medium text-surface-700 truncate">{asset.name}</div>
              <div className="text-xs text-surface-400">{asset.category}</div>
            </div>
            <div className="absolute inset-0 bg-primary-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium px-2 py-1 bg-primary-700 rounded">
                Copy URL
              </span>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <ImageIcon size={24} className="mx-auto text-surface-300 mb-2" />
          <p className="text-sm text-surface-400">No assets found</p>
        </div>
      )}
    </div>
  );
}
