import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { ArrowLeft, ImageIcon, Search, Check, Copy } from 'lucide-react';
import type { Asset, AssetCategory } from '@/types';

export function AssetLibraryView() {
  const assets = useEditorStore((s) => s.assets);
  const setView = useEditorStore((s) => s.setView);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories: { value: AssetCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Assets' },
    { value: 'logo', label: 'Logos' },
    { value: 'photo', label: 'Photos' },
    { value: 'floorplan', label: 'Floor Plans' },
  ];

  const filtered = assets.filter((a: Asset) => {
    const matchesCat = category === 'all' || a.category === category;
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tags.some((t: string) => t.includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const copyUrl = (asset: Asset) => {
    navigator.clipboard.writeText(asset.sourceUrl);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 bg-surface-900 text-white flex items-center px-6 gap-4 shrink-0">
        <button onClick={() => setView('builder')} className="p-1.5 rounded-md hover:bg-surface-700">
          <ArrowLeft size={18} />
        </button>
        <ImageIcon size={20} />
        <h1 className="text-base font-semibold">Asset Library</h1>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-surface-800 mb-2">Property Assets</h2>
          <p className="text-surface-500 mb-6">Entrata-hosted images for your email campaigns. Click to copy URL.</p>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets..."
                className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    category === cat.value
                      ? 'bg-primary-100 text-primary-700 border border-primary-200'
                      : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((asset: Asset) => (
              <div
                key={asset.id}
                onClick={() => copyUrl(asset)}
                className="group cursor-pointer rounded-xl border border-surface-200 bg-white overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all"
              >
                <div className="aspect-video bg-surface-100 overflow-hidden relative">
                  <img src={asset.thumbnailUrl} alt={asset.altText} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-primary-600/0 group-hover:bg-primary-600/70 transition-colors flex items-center justify-center">
                    {copiedId === asset.id ? (
                      <span className="flex items-center gap-1 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <Check size={16} /> Copied!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        <Copy size={16} /> Copy URL
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="text-sm font-medium text-surface-800 truncate">{asset.name}</h4>
                  <p className="text-xs text-surface-400 mt-0.5">{asset.category} • {asset.tags.join(', ')}</p>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <ImageIcon size={32} className="mx-auto text-surface-300 mb-3" />
              <p className="text-surface-400">No assets match your search</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
