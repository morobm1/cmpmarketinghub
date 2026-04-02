import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { assetLibraryService } from '@/services';
import { ArrowLeft, ImageIcon, Search, Check, Copy, Plus, Trash2, Edit3, X, Eye, Loader2 } from 'lucide-react';
import type { Asset, AssetCategory } from '@/types';

const CATEGORIES: { value: AssetCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Assets' },
  { value: 'logo', label: 'Logos' },
  { value: 'photo', label: 'Photos' },
  { value: 'floorplan', label: 'Floor Plans' },
  { value: 'icon', label: 'Icons' },
  { value: 'banner', label: 'Banners' },
  { value: 'other', label: 'Other' },
];

const TAG_PRESETS = [
  'Building', 'Exterior', 'Interior', 'Lobby', 'Pool', 'Gym', 'Kitchen',
  'Bedroom', 'Bathroom', 'Living Room', 'Bike Storage', 'Events', 'Community',
  'Study Lounge', 'Rooftop', 'Parking', 'Laundry', 'Pet Area', 'Hero',
];

function createEmptyAsset(propertyId: string): Asset {
  return {
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name: '',
    category: 'photo',
    thumbnailUrl: '',
    sourceUrl: '',
    altText: '',
    propertyId,
    tags: [],
    createdAt: new Date().toISOString(),
  };
}

export function AssetLibraryView() {
  const assets = useEditorStore((s) => s.assets);
  const addAsset = useEditorStore((s) => s.addAsset);
  const updateAsset = useEditorStore((s) => s.updateAsset);
  const deleteAsset = useEditorStore((s) => s.deleteAsset);
  const propertyId = useEditorStore((s) => s.propertyId);
  const setView = useEditorStore((s) => s.setView);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | 'all'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const filtered = assets.filter((a: Asset) => {
    const matchesCat = category === 'all' || a.category === category;
    const matchesSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const copyUrl = (asset: Asset) => {
    navigator.clipboard.writeText(asset.sourceUrl);
    setCopiedId(asset.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = () => {
    setEditingAsset(createEmptyAsset(propertyId));
    setIsCreating(true);
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset({ ...asset });
    setIsCreating(false);
  };

  const handleSave = async () => {
    if (!editingAsset) return;
    setIsSaving(true);
    try {
      // Sync thumbnail with source URL
      const assetToSave = { ...editingAsset, thumbnailUrl: editingAsset.sourceUrl || editingAsset.thumbnailUrl };
      const saved = await assetLibraryService.save(assetToSave);
      if (isCreating) {
        addAsset(saved);
      } else {
        updateAsset(saved);
      }
      setEditingAsset(null);
      setIsCreating(false);
    } catch (err) {
      console.error('Failed to save asset:', err);
      // Still add to local store
      if (isCreating) {
        addAsset(editingAsset);
      } else {
        updateAsset(editingAsset);
      }
      setEditingAsset(null);
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Delete "${asset.name || 'this image'}"?`)) return;
    try {
      await assetLibraryService.delete(asset.id);
    } catch (err) {
      console.error('Failed to delete asset from API:', err);
    }
    deleteAsset(asset.id);
  };

  const toggleTag = (tag: string) => {
    if (!editingAsset) return;
    const tags = editingAsset.tags.includes(tag)
      ? editingAsset.tags.filter((t) => t !== tag)
      : [...editingAsset.tags, tag];
    setEditingAsset({ ...editingAsset, tags });
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 bg-surface-900 text-white flex items-center px-6 gap-4 shrink-0">
        <button onClick={() => setView('builder')} className="p-1.5 rounded-md hover:bg-surface-700">
          <ArrowLeft size={18} />
        </button>
        <ImageIcon size={20} />
        <h1 className="text-base font-semibold">Image Library</h1>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-surface-800 mb-2">Image Library</h2>
              <p className="text-surface-500">Manage Entrata-hosted images for your email campaigns. Click an image to copy its URL.</p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500 transition-colors"
            >
              <Plus size={16} /> Add Image
            </button>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or tag..."
                className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
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

          {/* Asset Editor Modal */}
          {editingAsset && (
            <div className="mb-6 bg-white border-2 border-primary-200 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-800">
                  {isCreating ? 'Add New Image' : 'Edit Image'}
                </h3>
                <button onClick={() => { setEditingAsset(null); setIsCreating(false); }} className="p-1.5 rounded-md hover:bg-surface-100">
                  <X size={18} className="text-surface-400" />
                </button>
              </div>

              <div className="flex gap-6">
                {/* Preview */}
                <div className="w-48 h-48 shrink-0 bg-surface-100 rounded-xl border-2 border-dashed border-surface-300 overflow-hidden flex items-center justify-center">
                  {editingAsset.sourceUrl ? (
                    <img
                      src={editingAsset.sourceUrl}
                      alt={editingAsset.altText || 'Preview'}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon size={32} className="mx-auto text-surface-300 mb-2" />
                      <p className="text-xs text-surface-400">Paste URL to preview</p>
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-500 mb-1">Name</label>
                      <input
                        type="text"
                        value={editingAsset.name}
                        onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg"
                        placeholder="e.g., Pool Area Photo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-500 mb-1">Category</label>
                      <select
                        value={editingAsset.category}
                        onChange={(e) => setEditingAsset({ ...editingAsset, category: e.target.value as AssetCategory })}
                        className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white"
                      >
                        <option value="logo">Logo</option>
                        <option value="photo">Photo</option>
                        <option value="floorplan">Floor Plan</option>
                        <option value="icon">Icon</option>
                        <option value="banner">Banner</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Image URL</label>
                    <input
                      type="url"
                      value={editingAsset.sourceUrl}
                      onChange={(e) => setEditingAsset({ ...editingAsset, sourceUrl: e.target.value, thumbnailUrl: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg font-mono"
                      placeholder="https://medialibrarycf.entrata.com/..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Alt Text</label>
                    <input
                      type="text"
                      value={editingAsset.altText}
                      onChange={(e) => setEditingAsset({ ...editingAsset, altText: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg"
                      placeholder="Descriptive text for accessibility"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-500 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TAG_PRESETS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={'px-2.5 py-1 text-xs rounded-full transition-colors ' +
                            (editingAsset.tags.includes(tag)
                              ? 'bg-primary-100 text-primary-700 font-medium'
                              : 'bg-surface-100 text-surface-400 hover:bg-surface-200')}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder="Add custom tags (comma separated)..."
                      className="w-full px-3 py-1.5 text-sm border border-surface-200 rounded-lg mt-2"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const input = (e.target as HTMLInputElement);
                          const newTags = input.value.split(',').map((t) => t.trim()).filter(Boolean);
                          const merged = [...new Set([...editingAsset.tags, ...newTags])];
                          setEditingAsset({ ...editingAsset, tags: merged });
                          input.value = '';
                        }
                      }}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editingAsset.sourceUrl}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      {isSaving ? 'Saving...' : 'Save Image'}
                    </button>
                    <button
                      onClick={() => { setEditingAsset(null); setIsCreating(false); }}
                      className="px-4 py-2 text-sm font-medium text-surface-500 bg-surface-100 rounded-lg hover:bg-surface-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Asset Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((asset: Asset) => (
              <div
                key={asset.id}
                className="group cursor-pointer rounded-xl border border-surface-200 bg-white overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all"
              >
                <div className="aspect-video bg-surface-100 overflow-hidden relative" onClick={() => copyUrl(asset)}>
                  <img src={asset.thumbnailUrl || asset.sourceUrl} alt={asset.altText} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-surface-800 truncate">{asset.name || 'Untitled'}</h4>
                      <p className="text-xs text-surface-400 mt-0.5">{asset.category}</p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewUrl(asset.sourceUrl); }}
                        className="p-1 rounded hover:bg-surface-100 text-surface-400 hover:text-primary-600"
                        title="Preview"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(asset); }}
                        className="p-1 rounded hover:bg-surface-100 text-surface-400 hover:text-primary-600"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                        className="p-1 rounded hover:bg-red-50 text-surface-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {asset.tags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-surface-100 rounded-full text-surface-500">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && !editingAsset && (
            <div className="text-center py-16">
              <ImageIcon size={32} className="mx-auto text-surface-300 mb-3" />
              <h3 className="text-lg font-semibold text-surface-600 mb-1">
                {assets.length === 0 ? 'No images yet' : 'No images match your search'}
              </h3>
              <p className="text-sm text-surface-400 mb-4">
                {assets.length === 0 ? 'Add your first image to get started' : 'Try a different search or category'}
              </p>
              {assets.length === 0 && (
                <button onClick={handleCreate} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500">
                  Add First Image
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewUrl(null)}>
          <div className="max-w-4xl max-h-[85vh] bg-white rounded-xl p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-1">
              <button onClick={() => setPreviewUrl(null)} className="p-1 rounded-md hover:bg-surface-100">
                <X size={18} className="text-surface-400" />
              </button>
            </div>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
