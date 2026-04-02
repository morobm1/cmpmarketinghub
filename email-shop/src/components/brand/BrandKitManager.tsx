import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { brandKitService } from '@/services';
import { ArrowLeft, Palette, Plus, Trash2, Edit3, Check, X, Copy, Loader2 } from 'lucide-react';
import type { BrandKit, BrandColor, BrandFont, ButtonStyle, ContentSnippet } from '@/types';

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
      } else {
        updateBrandKit(saved);
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
      <header className="h-14 bg-surface-900 text-white flex items-center px-6 gap-4 shrink-0">
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
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Brand Kit List View ----
function BrandKitList({
  kits, activeKit, onSelect, onEdit, onDelete, onCreate,
}: {
  kits: BrandKit[];
  activeKit: BrandKit | null;
  onSelect: (kit: BrandKit) => void;
  onEdit: (kit: BrandKit) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-surface-800 mb-2">Property Brand Kits</h2>
          <p className="text-surface-500">Manage colors, logos, fonts, and assets for each property</p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500 transition-colors"
        >
          <Plus size={16} /> New Brand Kit
        </button>
      </div>

      {kits.length === 0 && (
        <div className="text-center py-16">
          <Palette size={40} className="mx-auto text-surface-300 mb-3" />
          <h3 className="text-lg font-semibold text-surface-600 mb-1">No brand kits yet</h3>
          <p className="text-sm text-surface-400 mb-4">Create your first brand kit to get started</p>
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
        {/* Property Info */}
        <Section title="Property Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Property Name" value={kit.propertyName} onChange={(v) => update({ propertyName: v })} />
            <Field label="Property ID" value={kit.propertyId} onChange={(v) => update({ propertyId: v })} placeholder="e.g., prop-123" />
          </div>
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
