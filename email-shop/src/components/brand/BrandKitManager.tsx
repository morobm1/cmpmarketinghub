import { useState, useRef } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { brandKitService } from '@/services';
import { getAuthUser } from '@/services/authContext';
import {
  downloadBrandKitTemplate,
  parseExcelToPendingKits,
  reassignPendingKit,
  fetchProperties,
  type PendingBrandKit,
  type KnownProperty,
} from '@/services/bulkBrandKitService';
import { ArrowLeft, Palette, Plus, Trash2, Edit3, Check, X, Copy, Loader2, ImageIcon, Eye, Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Search, Link2, Share2 } from 'lucide-react';
import { ShareModal } from '@/components/sharing/ShareModal';
import type { BrandKit, BrandColor, BrandFont, ButtonStyle, ContentSnippet, BrandLink, BrandLinkCategory, Asset, AssetCategory } from '@/types';

// Tag presets for image management
const PHOTO_TAG_PRESETS = ['Building', 'Exterior', 'Interior', 'Lobby', 'Pool', 'Gym', 'Kitchen', 'Bedroom', 'Bathroom', 'Living Room', 'Bike Storage', 'Events', 'Community', 'Study Lounge', 'Rooftop', 'Parking', 'Laundry', 'Pet Area'];
const LOGO_TAG_PRESETS = ['Primary', 'Secondary', 'White', 'Dark', 'Icon', 'Full'];
const FLOORPLAN_TAG_PRESETS = ['Studio', '1BR', '2BR', '3BR', '4BR', 'Penthouse', 'Townhome'];

// ---- Helper to create a new empty brand kit ----
function createEmptyBrandKit(propertyId: string, propertyName: string): BrandKit {
  const now = new Date().toISOString();
  return {
    id: 'bk-' + Date.now(),
    propertyId: propertyId || 'prop-' + Date.now(),
    propertyName: propertyName || 'New Property',
    logos: [],
    images: [],
    floorplans: [],
    colors: [],
    fonts: [{ id: 'f-' + Date.now(), name: 'Primary', family: 'Arial', fallback: 'Helvetica, sans-serif' }],
    buttonStyles: [],
    snippets: [],
    links: [],
    contactInfo: { phone: '', email: '', address: '', website: '' },
    createdAt: now,
    updatedAt: now,
  };
}

export function BrandKitManager() {
  const brandKits = useEditorStore((s) => s.brandKits);
  const activeBrandKit = useEditorStore((s) => s.activeBrandKit);
  const setActiveBrandKit = useEditorStore((s) => s.setActiveBrandKit);
  const addBrandKit = useEditorStore((s) => s.addBrandKit);
  const updateBrandKit = useEditorStore((s) => s.updateBrandKit);
  const deleteBrandKit = useEditorStore((s) => s.deleteBrandKit);
  const setView = useEditorStore((s) => s.setView);

  const [editingKit, setEditingKit] = useState<BrandKit | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [pendingKits, setPendingKits] = useState<PendingBrandKit[] | null>(null);
  const [knownProperties, setKnownProperties] = useState<KnownProperty[]>([]);
  const [sharingKit, setSharingKit] = useState<BrandKit | null>(null);

  // Step 1: Parse Excel → show confirmation dialog
  const handleBulkImportFile = async (file: File) => {
    setBulkImporting(true);
    setBulkResult(null);
    try {
      const props = await fetchProperties();
      setKnownProperties(props);
      const pending = await parseExcelToPendingKits(file, props);
      if (pending.length === 0) {
        setBulkResult({ success: 0, errors: ['No valid brand kits found in the file.'] });
        setBulkImporting(false);
        return;
      }
      setPendingKits(pending);
      setBulkImporting(false);
    } catch (err) {
      setBulkResult({ success: 0, errors: [err instanceof Error ? err.message : 'Failed to parse file'] });
      setBulkImporting(false);
    }
  };

  // Step 2: Admin confirms → save all kits
  const handleConfirmImport = async () => {
    if (!pendingKits) return;
    setBulkImporting(true);
    let success = 0;
    const errors: string[] = [];
    const addAsset = useEditorStore.getState().addAsset;
    const existingAssetIds = new Set(useEditorStore.getState().assets.map((a) => a.id));

    for (const pk of pendingKits) {
      try {
        const saved = await brandKitService.save(pk.brandKit);
        addBrandKit(saved);

        // Sync brand kit images into the asset library store so they
        // appear in the Image Library view immediately after import
        for (const asset of [...saved.logos, ...saved.images, ...saved.floorplans]) {
          if (asset.sourceUrl && !existingAssetIds.has(asset.id)) {
            existingAssetIds.add(asset.id);
            addAsset(asset);
          }
        }

        success++;
      } catch (err) {
        errors.push(`Failed to save "${pk.kitName}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    setBulkResult({ success, errors });
    setPendingKits(null);
    setBulkImporting(false);
  };

  const handleCancelImport = () => {
    setPendingKits(null);
    setBulkImporting(false);
  };

  const handleReassignKit = (index: number, property: KnownProperty) => {
    if (!pendingKits) return;
    const updated = [...pendingKits];
    const kit = updated[index];
    if (!kit) return;
    updated[index] = reassignPendingKit(kit, property);
    setPendingKits(updated);
  };

  const handleCreate = () => {
    const newKit = createEmptyBrandKit('', '');
    setEditingKit(newKit);
    setIsCreating(true);
    setSaveError(null);
  };

  const handleEdit = (kit: BrandKit) => {
    setEditingKit(JSON.parse(JSON.stringify(kit)));
    setIsCreating(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!editingKit) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const kitToSave = isCreating
        ? editingKit
        : { ...editingKit, updatedAt: new Date().toISOString() };
      const saved = await brandKitService.save(kitToSave);
      if (isCreating) {
        addBrandKit(saved);
        // Auto-activate newly created brand kit
        setActiveBrandKit(saved);
      } else {
        updateBrandKit(saved);
      }

      // Sync brand kit images into the asset library store
      const addAssetToStore = useEditorStore.getState().addAsset;
      const existingIds = new Set(useEditorStore.getState().assets.map((a) => a.id));
      for (const asset of [...saved.logos, ...saved.images, ...saved.floorplans]) {
        if (asset.sourceUrl && !existingIds.has(asset.id)) {
          existingIds.add(asset.id);
          addAssetToStore(asset);
        }
      }

      setEditingKit(null);
      setIsCreating(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save brand kit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this brand kit?')) {
      try {
        await brandKitService.delete(id);
        deleteBrandKit(id);
      } catch (err) {
        console.error('Failed to delete brand kit:', err);
        alert('Failed to delete brand kit. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setEditingKit(null);
    setIsCreating(false);
    setSaveError(null);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 bg-[#1e293b] text-white flex items-center px-6 gap-4 shrink-0">
        <button onClick={() => setView('builder')} className="p-1.5 rounded-md hover:bg-surface-700">
          <ArrowLeft size={18} />
        </button>
        <Palette size={20} />
        <h1 className="text-base font-semibold">Brand Kit Manager</h1>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          {editingKit ? (
            <BrandKitEditor
              kit={editingKit}
              setKit={setEditingKit}
              onSave={handleSave}
              onCancel={handleCancel}
              isCreating={isCreating}
              isSaving={isSaving}
              saveError={saveError}
            />
          ) : (
            <BrandKitList
              kits={brandKits}
              activeKit={activeBrandKit}
              onSelect={setActiveBrandKit}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onCreate={handleCreate}
              onBulkImport={handleBulkImportFile}
              bulkImporting={bulkImporting}
              bulkResult={bulkResult}
              onDismissBulkResult={() => setBulkResult(null)}
              onShare={(kit) => setSharingKit(kit)}
            />
          )}
        </div>
      </div>

      {/* ── Share Brand Kit Modal ── */}
      {sharingKit && (
        <ShareModal
          title="Share Brand Kit"
          itemName={sharingKit.propertyName}
          currentSharedWith={(sharingKit as any).sharedWith || []}
          onClose={() => setSharingKit(null)}
          onSave={async (sharedWith) => {
            const updated = { ...sharingKit, sharedWith } as any;
            try {
              await brandKitService.save(updated);
              updateBrandKit(updated);
            } catch (err) {
              console.error('Failed to update sharing:', err);
            }
            setSharingKit(null);
          }}
        />
      )}

      {/* ── Bulk Import Confirmation Modal ── */}
      {pendingKits && (
        <BulkImportConfirmDialog
          pendingKits={pendingKits}
          knownProperties={knownProperties}
          onReassign={handleReassignKit}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelImport}
          importing={bulkImporting}
        />
      )}
    </div>
  );
}

// ── Bulk Import Confirmation Dialog ──
function BulkImportConfirmDialog({
  pendingKits, knownProperties, onReassign, onConfirm, onCancel, importing,
}: {
  pendingKits: PendingBrandKit[];
  knownProperties: KnownProperty[];
  onReassign: (index: number, property: KnownProperty) => void;
  onConfirm: () => void;
  onCancel: () => void;
  importing: boolean;
}) {
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const getFilteredProperties = (index: number) => {
    const term = (searchTerms[index] || '').toLowerCase();
    if (!term) return knownProperties;
    return knownProperties.filter((p) => p.name.toLowerCase().includes(term));
  };

  const allMatched = pendingKits.every((pk) => pk.matchConfidence !== 'none');
  const totalImages = pendingKits.reduce((sum, pk) =>
    sum + pk.brandKit.logos.length + pk.brandKit.images.length + pk.brandKit.floorplans.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200 flex items-center gap-3">
          <FileSpreadsheet size={22} className="text-primary-600" />
          <div>
            <h2 className="text-lg font-bold text-surface-800">Confirm Brand Kit Import</h2>
            <p className="text-sm text-surface-500">
              {pendingKits.length} kit{pendingKits.length !== 1 ? 's' : ''} found
              {totalImages > 0 && ` · ${totalImages} image${totalImages !== 1 ? 's' : ''}`}
              {' — Review property matches below'}
            </p>
          </div>
        </div>

        {/* Kit list */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {pendingKits.map((pk, idx) => (
            <div key={idx} className={'rounded-xl border-2 p-4 transition-all ' + (
              pk.matchConfidence === 'exact' ? 'border-emerald-200 bg-emerald-50/50' :
              pk.matchConfidence === 'close' ? 'border-amber-200 bg-amber-50/50' :
              'border-red-200 bg-red-50/50'
            )}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-surface-800 truncate">{pk.kitName}</span>
                    {pk.matchConfidence === 'exact' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                    {pk.matchConfidence === 'close' && <AlertTriangle size={16} className="text-amber-500 shrink-0" />}
                    {pk.matchConfidence === 'none' && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-2 text-xs text-surface-500 mb-2">
                    {pk.brandKit.logos.length > 0 && <span className="px-2 py-0.5 bg-white rounded-full border border-surface-200">{pk.brandKit.logos.length} logos</span>}
                    {pk.brandKit.images.length > 0 && <span className="px-2 py-0.5 bg-white rounded-full border border-surface-200">{pk.brandKit.images.length} photos</span>}
                    {pk.brandKit.floorplans.length > 0 && <span className="px-2 py-0.5 bg-white rounded-full border border-surface-200">{pk.brandKit.floorplans.length} floorplans</span>}
                    {pk.brandKit.colors.length > 0 && <span className="px-2 py-0.5 bg-white rounded-full border border-surface-200">{pk.brandKit.colors.length} colors</span>}
                    {pk.brandKit.fonts.length > 0 && <span className="px-2 py-0.5 bg-white rounded-full border border-surface-200">{pk.brandKit.fonts.length} fonts</span>}
                    {pk.brandKit.buttonStyles.length > 0 && <span className="px-2 py-0.5 bg-white rounded-full border border-surface-200">{pk.brandKit.buttonStyles.length} buttons</span>}
                    {pk.brandKit.snippets.length > 0 && <span className="px-2 py-0.5 bg-white rounded-full border border-surface-200">{pk.brandKit.snippets.length} snippets</span>}
                  </div>

                  {/* Property match */}
                  <div className="text-sm">
                    <span className="text-surface-500">Excel name: </span>
                    <span className="font-medium text-surface-700">"{pk.propertyNameFromExcel}"</span>
                    <span className="text-surface-400 mx-1.5">→</span>
                    {pk.matchConfidence === 'exact' && (
                      <span className="text-emerald-700 font-medium">Matched to "{pk.matchedPropertyName}"</span>
                    )}
                    {pk.matchConfidence === 'close' && (
                      <span className="text-amber-700 font-medium">Best match: "{pk.matchedPropertyName}" (confirm or change below)</span>
                    )}
                    {pk.matchConfidence === 'none' && (
                      <span className="text-red-700 font-medium">No match found — select a property below</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Property selector for close/none matches */}
              {pk.matchConfidence !== 'exact' && (
                <div className="mt-3 relative">
                  <div className="flex items-center gap-2">
                    <Search size={14} className="text-surface-400 shrink-0" />
                    <input
                      type="text"
                      value={searchTerms[idx] || ''}
                      onChange={(e) => {
                        setSearchTerms({ ...searchTerms, [idx]: e.target.value });
                        setOpenDropdown(idx);
                      }}
                      onFocus={() => setOpenDropdown(idx)}
                      placeholder="Search properties..."
                      className="flex-1 px-3 py-1.5 text-sm border border-surface-300 rounded-lg focus:border-primary-400 focus:outline-none"
                    />
                    {pk.matchConfidence === 'close' && (
                      <button
                        onClick={() => {
                          // Accept the close match as-is
                          const matched = knownProperties.find((p) => p.id === pk.matchedPropertyId);
                          if (matched) onReassign(idx, matched);
                        }}
                        className="px-3 py-1.5 text-xs bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 font-medium whitespace-nowrap"
                      >
                        Accept "{pk.matchedPropertyName}"
                      </button>
                    )}
                  </div>
                  {openDropdown === idx && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-40 overflow-auto">
                      {getFilteredProperties(idx).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            onReassign(idx, p);
                            setOpenDropdown(null);
                            setSearchTerms({ ...searchTerms, [idx]: '' });
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 transition-colors"
                        >
                          {p.name}
                        </button>
                      ))}
                      {getFilteredProperties(idx).length === 0 && (
                        <div className="px-3 py-2 text-sm text-surface-400">No properties found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between">
          <p className="text-xs text-surface-400">
            Import is additive — existing brand kits will not be affected.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={importing}
              className="px-4 py-2 text-sm text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={importing || !allMatched}
              className="px-5 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {importing ? 'Importing...' : `Import ${pendingKits.length} Kit${pendingKits.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Brand Kit List View ----
function BrandKitList({
  kits, activeKit, onSelect, onEdit, onDelete, onCreate, onBulkImport, bulkImporting, bulkResult, onDismissBulkResult, onShare,
}: {
  kits: BrandKit[];
  activeKit: BrandKit | null;
  onSelect: (kit: BrandKit) => void;
  onEdit: (kit: BrandKit) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onBulkImport: (file: File) => void;
  bulkImporting: boolean;
  bulkResult: { success: number; errors: string[] } | null;
  onDismissBulkResult: () => void;
  onShare: (kit: BrandKit) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = getAuthUser();
  const isAdmin = user?.role === 'admin';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onBulkImport(file);
      e.target.value = ''; // reset so same file can be re-uploaded
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-surface-800 mb-2">Property Brand Kits</h2>
          <p className="text-surface-500">Manage colors, logos, fonts, and assets for each property</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => downloadBrandKitTemplate()}
                className="flex items-center gap-2 px-3 py-2.5 bg-surface-100 text-surface-700 rounded-lg text-sm font-medium hover:bg-surface-200 transition-colors"
                title="Download Excel template for bulk import"
              >
                <Download size={16} /> Template
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={bulkImporting}
                className="flex items-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
                title="Upload filled Excel template to bulk-import brand kits"
              >
                {bulkImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {bulkImporting ? 'Importing...' : 'Bulk Import'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </>
          )}
          <button
            onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500 transition-colors"
          >
            <Plus size={16} /> New Brand Kit
          </button>
        </div>
      </div>

      {/* Bulk import result banner */}
      {bulkResult && (
        <div className={'mb-6 rounded-xl border p-4 flex items-start gap-3 ' + (
          bulkResult.errors.length > 0 && bulkResult.success === 0
            ? 'bg-red-50 border-red-200'
            : bulkResult.errors.length > 0
            ? 'bg-amber-50 border-amber-200'
            : 'bg-emerald-50 border-emerald-200'
        )}>
          <FileSpreadsheet size={20} className={
            bulkResult.errors.length > 0 && bulkResult.success === 0
              ? 'text-red-500'
              : bulkResult.errors.length > 0
              ? 'text-amber-500'
              : 'text-emerald-500'
          } />
          <div className="flex-1">
            {bulkResult.success > 0 && (
              <p className="text-sm font-medium text-surface-800">
                Successfully imported {bulkResult.success} brand kit{bulkResult.success !== 1 ? 's' : ''}
              </p>
            )}
            {bulkResult.errors.map((err, i) => (
              <p key={i} className="text-sm text-red-600 mt-1">{err}</p>
            ))}
            {bulkResult.success > 0 && bulkResult.errors.length === 0 && (
              <p className="text-xs text-surface-500 mt-1">
                Kits are ready to use. Add logos and images by editing each kit.
              </p>
            )}
          </div>
          <button onClick={onDismissBulkResult} className="p-1 rounded-md hover:bg-surface-200 text-surface-400">
            <X size={16} />
          </button>
        </div>
      )}

      {kits.length === 0 && (
        <div className="text-center py-16">
          <Palette size={40} className="mx-auto text-surface-300 mb-3" />
          <h3 className="text-lg font-semibold text-surface-600 mb-1">No brand kits yet</h3>
          <p className="text-sm text-surface-400 mb-4">Create your first brand kit to get started</p>
          {isAdmin && (
            <p className="text-sm text-surface-400 mb-4">
              Or <button onClick={() => downloadBrandKitTemplate()} className="text-primary-600 underline hover:text-primary-500">download the Excel template</button> to bulk-import multiple properties at once.
            </p>
          )}
          <button onClick={onCreate} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500">
            Create Brand Kit
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kits.map((kit) => (
          <div
            key={kit.id}
            className={'rounded-xl border-2 p-6 transition-all ' + (
              activeKit?.id === kit.id ? 'border-primary-500 bg-primary-50' : 'border-surface-200 bg-white'
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-surface-800">{kit.propertyName}</h3>
                <p className="text-sm text-surface-400">
                  {kit.logos.length} logos &middot; {kit.images.length} photos &middot; {kit.colors.length} colors
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onShare(kit)} className="p-1.5 rounded-md hover:bg-[#446472]/10 text-surface-400 hover:text-[#446472]" title="Share">
                  <Share2 size={16} />
                </button>
                <button onClick={() => onEdit(kit)} className="p-1.5 rounded-md hover:bg-surface-100 text-surface-400 hover:text-primary-600" title="Edit">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => onDelete(kit.id)} className="p-1.5 rounded-md hover:bg-red-50 text-surface-400 hover:text-red-500" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Color swatches */}
            {kit.colors.length > 0 && (
              <div className="flex gap-1.5 mb-4">
                {kit.colors.map((c) => (
                  <div key={c.id} className="w-8 h-8 rounded-lg border border-surface-200" style={{ backgroundColor: c.hex }} title={c.name + ': ' + c.hex} />
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-2 py-1 bg-surface-100 rounded-full text-surface-500">{kit.fonts.length} fonts</span>
              <span className="text-xs px-2 py-1 bg-surface-100 rounded-full text-surface-500">{kit.buttonStyles.length} button styles</span>
              <span className="text-xs px-2 py-1 bg-surface-100 rounded-full text-surface-500">{kit.snippets.length} snippets</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelect(kit)}
                className={'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ' + (
                  activeKit?.id === kit.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-primary-100 hover:text-primary-700'
                )}
              >
                {activeKit?.id === kit.id ? 'Active' : 'Set Active'}
              </button>
              <button onClick={() => onEdit(kit)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-100 text-surface-600 hover:bg-surface-200 transition-colors">
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ---- Brand Kit Editor ----
function BrandKitEditor({
  kit, setKit, onSave, onCancel, isCreating, isSaving, saveError,
}: {
  kit: BrandKit;
  setKit: (kit: BrandKit | null) => void;
  onSave: () => void;
  onCancel: () => void;
  isCreating: boolean;
  isSaving?: boolean;
  saveError?: string | null;
}) {
  const update = (partial: Partial<BrandKit>) => setKit({ ...kit, ...partial });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-surface-800">
          {isCreating ? 'Create New Brand Kit' : 'Edit Brand Kit'}
        </h2>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-surface-500 bg-surface-100 rounded-lg hover:bg-surface-200 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onSave} disabled={isSaving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isSaving ? 'Saving...' : 'Save Brand Kit'}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="space-y-6">
        {/* Property Info with dropdown */}
        <Section title="Property Information">
          <PropertySelector kit={kit} update={update} />
        </Section>

        {/* Contact Info */}
        <Section title="Contact Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" value={kit.contactInfo?.phone || ''} onChange={(v) => update({ contactInfo: { ...kit.contactInfo, phone: v } })} placeholder="(555) 123-4567" />
            <Field label="Email" value={kit.contactInfo?.email || ''} onChange={(v) => update({ contactInfo: { ...kit.contactInfo, email: v } })} placeholder="leasing@property.com" />
            <Field label="Address" value={kit.contactInfo?.address || ''} onChange={(v) => update({ contactInfo: { ...kit.contactInfo, address: v } })} placeholder="123 Main St, City, ST 12345" />
            <Field label="Website" value={kit.contactInfo?.website || ''} onChange={(v) => update({ contactInfo: { ...kit.contactInfo, website: v } })} placeholder="www.property.com" />
          </div>
        </Section>

        {/* Colors */}
        <Section title="Brand Colors">
          <div className="space-y-2">
            {kit.colors.map((color, i) => (
              <div key={color.id} className="flex items-center gap-3">
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => {
                    const newColors = [...kit.colors];
                    newColors[i] = { ...color, hex: e.target.value };
                    update({ colors: newColors });
                  }}
                  className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer p-0"
                />
                <input
                  type="text"
                  value={color.name}
                  onChange={(e) => {
                    const newColors = [...kit.colors];
                    newColors[i] = { ...color, name: e.target.value };
                    update({ colors: newColors });
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-surface-200 rounded-lg"
                  placeholder="Color name"
                />
                <input
                  type="text"
                  value={color.hex}
                  onChange={(e) => {
                    const newColors = [...kit.colors];
                    newColors[i] = { ...color, hex: e.target.value };
                    update({ colors: newColors });
                  }}
                  className="w-28 px-3 py-2 text-sm border border-surface-200 rounded-lg font-mono"
                  placeholder="#000000"
                />
                <button
                  onClick={() => update({ colors: kit.colors.filter((_, j) => j !== i) })}
                  className="p-2 text-surface-400 hover:text-red-500 rounded-md hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => update({ colors: [...kit.colors, { id: 'c-' + Date.now(), name: 'New Color', hex: '#3b82f6' }] })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              <Plus size={14} /> Add Color
            </button>
          </div>
        </Section>

        {/* Fonts */}
        <Section title="Fonts">
          <div className="space-y-2">
            {kit.fonts.map((font, i) => (
              <div key={font.id} className="flex items-center gap-3">
                <input
                  type="text"
                  value={font.name}
                  onChange={(e) => {
                    const newFonts = [...kit.fonts];
                    newFonts[i] = { ...font, name: e.target.value };
                    update({ fonts: newFonts });
                  }}
                  className="w-32 px-3 py-2 text-sm border border-surface-200 rounded-lg"
                  placeholder="Label"
                />
                <input
                  type="text"
                  value={font.family}
                  onChange={(e) => {
                    const newFonts = [...kit.fonts];
                    newFonts[i] = { ...font, family: e.target.value };
                    update({ fonts: newFonts });
                  }}
                  className="flex-1 px-3 py-2 text-sm border border-surface-200 rounded-lg"
                  placeholder="Font family"
                />
                <input
                  type="text"
                  value={font.fallback}
                  onChange={(e) => {
                    const newFonts = [...kit.fonts];
                    newFonts[i] = { ...font, fallback: e.target.value };
                    update({ fonts: newFonts });
                  }}
                  className="w-48 px-3 py-2 text-sm border border-surface-200 rounded-lg"
                  placeholder="Fallback"
                />
                <button
                  onClick={() => update({ fonts: kit.fonts.filter((_, j) => j !== i) })}
                  className="p-2 text-surface-400 hover:text-red-500 rounded-md hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => update({ fonts: [...kit.fonts, { id: 'f-' + Date.now(), name: 'New Font', family: 'Arial', fallback: 'Helvetica, sans-serif' }] })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              <Plus size={14} /> Add Font
            </button>
          </div>
        </Section>

        {/* Logos */}
        <Section title="Logos">
          <ImageAssetList
            items={kit.logos}
            tagPresets={LOGO_TAG_PRESETS}
            category="logo"
            onUpdate={(logos) => update({ logos })}
          />
        </Section>

        {/* Property Photos */}
        <Section title="Property Photos">
          <ImageAssetList
            items={kit.images}
            tagPresets={PHOTO_TAG_PRESETS}
            category="photo"
            onUpdate={(images) => update({ images })}
          />
        </Section>

        {/* Floorplans */}
        <Section title="Floor Plans">
          <ImageAssetList
            items={kit.floorplans}
            tagPresets={FLOORPLAN_TAG_PRESETS}
            category="floorplan"
            onUpdate={(floorplans) => update({ floorplans })}
          />
        </Section>

        {/* Button Styles */}
        <Section title="Button Styles">
          <div className="space-y-3">
            {kit.buttonStyles.map((btn, i) => (
              <div key={btn.id} className="p-4 border border-surface-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={btn.name}
                    onChange={(e) => {
                      const s = [...kit.buttonStyles];
                      s[i] = { ...btn, name: e.target.value };
                      update({ buttonStyles: s });
                    }}
                    className="text-sm font-medium border-0 bg-transparent focus:outline-none"
                    placeholder="Style name"
                  />
                  <button
                    onClick={() => update({ buttonStyles: kit.buttonStyles.filter((_, j) => j !== i) })}
                    className="p-1.5 text-surface-400 hover:text-red-500 rounded-md hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">BG Color</label>
                    <div className="flex items-center gap-1">
                      <input type="color" value={btn.backgroundColor} onChange={(e) => { const s = [...kit.buttonStyles]; s[i] = { ...btn, backgroundColor: e.target.value }; update({ buttonStyles: s }); }} className="w-8 h-8 rounded border border-surface-200 p-0" />
                      <input type="text" value={btn.backgroundColor} onChange={(e) => { const s = [...kit.buttonStyles]; s[i] = { ...btn, backgroundColor: e.target.value }; update({ buttonStyles: s }); }} className="w-full px-2 py-1 text-xs border border-surface-200 rounded font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Text Color</label>
                    <div className="flex items-center gap-1">
                      <input type="color" value={btn.textColor} onChange={(e) => { const s = [...kit.buttonStyles]; s[i] = { ...btn, textColor: e.target.value }; update({ buttonStyles: s }); }} className="w-8 h-8 rounded border border-surface-200 p-0" />
                      <input type="text" value={btn.textColor} onChange={(e) => { const s = [...kit.buttonStyles]; s[i] = { ...btn, textColor: e.target.value }; update({ buttonStyles: s }); }} className="w-full px-2 py-1 text-xs border border-surface-200 rounded font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Radius</label>
                    <input type="number" value={btn.borderRadius} onChange={(e) => { const s = [...kit.buttonStyles]; s[i] = { ...btn, borderRadius: Number(e.target.value) }; update({ buttonStyles: s }); }} className="w-full px-2 py-1 text-xs border border-surface-200 rounded" min={0} max={50} />
                  </div>
                  <div>
                    <label className="block text-xs text-surface-400 mb-1">Font Size</label>
                    <input type="number" value={btn.fontSize} onChange={(e) => { const s = [...kit.buttonStyles]; s[i] = { ...btn, fontSize: Number(e.target.value) }; update({ buttonStyles: s }); }} className="w-full px-2 py-1 text-xs border border-surface-200 rounded" min={10} max={32} />
                  </div>
                </div>
                {/* Preview */}
                <div className="flex justify-center pt-2">
                  <span style={{ backgroundColor: btn.backgroundColor, color: btn.textColor, padding: btn.paddingY + 'px ' + btn.paddingX + 'px', borderRadius: btn.borderRadius, fontSize: btn.fontSize, fontWeight: btn.fontWeight, display: 'inline-block' }}>
                    Sample Button
                  </span>
                </div>
              </div>
            ))}
            <button
              onClick={() => update({ buttonStyles: [...kit.buttonStyles, { id: 'bs-' + Date.now(), name: 'New Style', backgroundColor: '#2563eb', textColor: '#ffffff', borderRadius: 6, paddingX: 32, paddingY: 14, fontSize: 16, fontWeight: 700 }] })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              <Plus size={14} /> Add Button Style
            </button>
          </div>
        </Section>

        {/* Snippets */}
        <Section title="Content Snippets">
          <div className="space-y-2">
            {kit.snippets.map((snippet, i) => (
              <div key={snippet.id} className="flex items-start gap-3 p-3 border border-surface-200 rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={snippet.name}
                      onChange={(e) => {
                        const s = [...kit.snippets];
                        s[i] = { ...snippet, name: e.target.value };
                        update({ snippets: s });
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-surface-200 rounded-lg"
                      placeholder="Snippet name"
                    />
                    <select
                      value={snippet.category}
                      onChange={(e) => {
                        const s = [...kit.snippets];
                        s[i] = { ...snippet, category: e.target.value as ContentSnippet['category'] };
                        update({ snippets: s });
                      }}
                      className="px-3 py-1.5 text-sm border border-surface-200 rounded-lg bg-white"
                    >
                      <option value="footer">Footer</option>
                      <option value="contact">Contact</option>
                      <option value="legal">Legal</option>
                      <option value="promo">Promo</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <textarea
                    value={snippet.content}
                    onChange={(e) => {
                      const s = [...kit.snippets];
                      s[i] = { ...snippet, content: e.target.value };
                      update({ snippets: s });
                    }}
                    rows={2}
                    className="w-full px-3 py-1.5 text-sm border border-surface-200 rounded-lg resize-y"
                    placeholder="Snippet content..."
                  />
                </div>
                <button
                  onClick={() => update({ snippets: kit.snippets.filter((_, j) => j !== i) })}
                  className="p-2 text-surface-400 hover:text-red-500 rounded-md hover:bg-red-50 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => update({ snippets: [...kit.snippets, { id: 'sn-' + Date.now(), name: 'New Snippet', category: 'custom', content: '' }] })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              <Plus size={14} /> Add Snippet
            </button>
          </div>
        </Section>

        {/* Links */}
        <Section title="Stored Links">
          <p className="text-xs text-surface-400 mb-3">Store property URLs so they can be quickly inserted into buttons and links throughout your emails.</p>
          <div className="space-y-2">
            {(kit.links || []).map((link, i) => (
              <div key={link.id} className="flex items-center gap-3 p-3 border border-surface-200 rounded-lg">
                <Link2 size={16} className="text-surface-400 shrink-0" />
                <input
                  type="text"
                  value={link.label}
                  onChange={(e) => {
                    const l = [...(kit.links || [])];
                    l[i] = { ...link, label: e.target.value };
                    update({ links: l });
                  }}
                  className="w-36 px-3 py-1.5 text-sm border border-surface-200 rounded-lg"
                  placeholder="Label"
                />
                <select
                  value={link.category}
                  onChange={(e) => {
                    const l = [...(kit.links || [])];
                    l[i] = { ...link, category: e.target.value as BrandLinkCategory };
                    update({ links: l });
                  }}
                  className="px-3 py-1.5 text-sm border border-surface-200 rounded-lg bg-white"
                >
                  <option value="website">Website</option>
                  <option value="prospect-portal">Prospect Portal</option>
                  <option value="resident-portal">Resident Portal</option>
                  <option value="apply">Apply</option>
                  <option value="tour">Tour</option>
                  <option value="survey">Survey</option>
                  <option value="google-form">Google Form</option>
                  <option value="social">Social</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => {
                    const l = [...(kit.links || [])];
                    l[i] = { ...link, url: e.target.value };
                    update({ links: l });
                  }}
                  className="flex-1 px-3 py-1.5 text-sm border border-surface-200 rounded-lg font-mono"
                  placeholder="https://..."
                />
                <button
                  onClick={() => update({ links: (kit.links || []).filter((_, j) => j !== i) })}
                  className="p-2 text-surface-400 hover:text-red-500 rounded-md hover:bg-red-50 shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => update({ links: [...(kit.links || []), { id: 'lnk-' + Date.now(), label: '', url: '', category: 'website' as BrandLinkCategory }] })}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              <Plus size={14} /> Add Link
            </button>
          </div>
        </Section>
      </div>
    </>
  );
}

// ---- Reusable components ----

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-surface-50 border-b border-surface-200">
        <h3 className="text-sm font-semibold text-surface-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  );
}

// ---- Property Selector ----
function PropertySelector({ kit, update }: { kit: BrandKit; update: (partial: Partial<BrandKit>) => void }) {
  const user = getAuthUser();
  const userProps = user?.properties || [];
  const isAdminUser = user?.role === 'admin' || userProps.includes('*');
  const brandKits = useEditorStore((s) => s.brandKits);

  // Build property options from existing brand kits + user properties
  const knownProperties = new Map<string, string>();
  brandKits.forEach((bk) => {
    if (bk.propertyId && bk.propertyName) knownProperties.set(bk.propertyId, bk.propertyName);
  });
  userProps.forEach((pid) => {
    if (pid !== '*' && !knownProperties.has(pid)) knownProperties.set(pid, pid);
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Property Name</label>
        <input
          type="text"
          value={kit.propertyName}
          onChange={(e) => update({ propertyName: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="e.g., Meridian on Main"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Property ID</label>
        {isAdminUser ? (
          <input
            type="text"
            value={kit.propertyId}
            onChange={(e) => update({ propertyId: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., prop-123"
          />
        ) : (
          <select
            value={kit.propertyId}
            onChange={(e) => {
              const pid = e.target.value;
              const pName = knownProperties.get(pid) || pid;
              update({ propertyId: pid, propertyName: pName !== pid ? pName : kit.propertyName });
            }}
            className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Select property...</option>
            {Array.from(knownProperties.entries()).map(([pid, pName]) => (
              <option key={pid} value={pid}>{pName} ({pid})</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

// ---- Image Asset List (for logos, photos, floorplans) ----
function ImageAssetList({
  items, tagPresets, category, onUpdate,
}: {
  items: Asset[];
  tagPresets: string[];
  category: AssetCategory;
  onUpdate: (items: Asset[]) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const addItem = () => {
    const now = new Date().toISOString();
    const newAsset: Asset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: '',
      category,
      thumbnailUrl: '',
      sourceUrl: '',
      altText: '',
      propertyId: '',
      tags: [],
      createdAt: now,
    };
    onUpdate([...items, newAsset]);
  };

  const updateItem = (index: number, partial: Partial<Asset>) => {
    const updated = [...items];
    const existing = updated[index];
    if (!existing) return;
    const merged = { ...existing, ...partial };
    // Sync thumbnailUrl with sourceUrl for simplicity
    if (partial.sourceUrl !== undefined) {
      merged.thumbnailUrl = partial.sourceUrl;
    }
    updated[index] = merged;
    onUpdate(updated);
  };

  const removeItem = (index: number) => {
    onUpdate(items.filter((_, i) => i !== index));
  };

  const toggleTag = (index: number, tag: string) => {
    const item = items[index];
    if (!item) return;
    const tags = item.tags.includes(tag)
      ? item.tags.filter((t) => t !== tag)
      : [...item.tags, tag];
    updateItem(index, { tags });
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.id} className="border border-surface-200 rounded-xl overflow-hidden">
          <div className="flex gap-3 p-4">
            {/* Preview */}
            <div className="w-24 h-24 shrink-0 bg-surface-100 rounded-lg overflow-hidden border border-surface-200 flex items-center justify-center">
              {item.sourceUrl ? (
                <img
                  src={item.sourceUrl}
                  alt={item.altText || item.name}
                  className="max-w-full max-h-full object-contain cursor-pointer"
                  onClick={() => setPreviewUrl(item.sourceUrl)}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <ImageIcon size={20} className="text-surface-300" />
              )}
            </div>

            {/* Fields */}
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  className="px-3 py-1.5 text-sm border border-surface-200 rounded-lg"
                  placeholder="Name"
                />
                <input
                  type="text"
                  value={item.altText}
                  onChange={(e) => updateItem(i, { altText: e.target.value })}
                  className="px-3 py-1.5 text-sm border border-surface-200 rounded-lg"
                  placeholder="Alt text"
                />
              </div>
              <input
                type="url"
                value={item.sourceUrl}
                onChange={(e) => updateItem(i, { sourceUrl: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-surface-200 rounded-lg font-mono"
                placeholder="Paste Entrata image URL..."
              />

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {tagPresets.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(i, tag)}
                    className={'px-2 py-0.5 text-xs rounded-full transition-colors ' +
                      (item.tags.includes(tag)
                        ? 'bg-primary-100 text-primary-700 font-medium'
                        : 'bg-surface-100 text-surface-400 hover:bg-surface-200')}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 shrink-0">
              {item.sourceUrl && (
                <button
                  onClick={() => setPreviewUrl(item.sourceUrl)}
                  className="p-1.5 text-surface-400 hover:text-primary-600 rounded-md hover:bg-primary-50"
                  title="Preview"
                >
                  <Eye size={14} />
                </button>
              )}
              <button
                onClick={() => removeItem(i)}
                className="p-1.5 text-surface-400 hover:text-red-500 rounded-md hover:bg-red-50"
                title="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={addItem}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
      >
        <Plus size={14} /> Add {category === 'logo' ? 'Logo' : category === 'floorplan' ? 'Floor Plan' : 'Photo'}
      </button>

      {/* Full preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewUrl(null)}>
          <div className="max-w-3xl max-h-[80vh] bg-white rounded-xl p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end mb-1">
              <button onClick={() => setPreviewUrl(null)} className="p-1 rounded-md hover:bg-surface-100">
                <X size={18} className="text-surface-400" />
              </button>
            </div>
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}
