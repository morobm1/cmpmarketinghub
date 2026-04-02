import { useEditorStore } from '@/store/useEditorStore';
import { Palette, Type, ChevronDown, Wand2 } from 'lucide-react';
import { useState } from 'react';

/** Brand panel in the left sidebar - quick access to brand kit colors, fonts, and rebrand */
export function BrandPanel() {
  const brandKits = useEditorStore((s) => s.brandKits);
  const activeBrandKit = useEditorStore((s) => s.activeBrandKit);
  const setActiveBrandKit = useEditorStore((s) => s.setActiveBrandKit);
  const rebrandDraft = useEditorStore((s) => s.rebrandDraft);
  const blocks = useEditorStore((s) => s.blocks);
  const [showDropdown, setShowDropdown] = useState(false);
  const [rebrandConfirm, setRebrandConfirm] = useState(false);

  const handleRebrand = () => {
    if (!rebrandConfirm) {
      setRebrandConfirm(true);
      return;
    }
    rebrandDraft();
    setRebrandConfirm(false);
  };

  if (brandKits.length === 0) {
    return (
      <div className="p-4 text-center">
        <Palette size={24} className="mx-auto text-surface-300 mb-2" />
        <p className="text-sm text-surface-400">No brand kits available</p>
        <p className="text-xs text-surface-300 mt-1">Create a brand kit in the Brand Kit Manager</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {/* Kit Switcher */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors"
        >
          <div className="text-left min-w-0">
            <div className="text-xs text-surface-400 uppercase tracking-wider">Active Brand Kit</div>
            <div className="text-sm font-semibold text-surface-800 truncate">
              {activeBrandKit?.propertyName || 'Select a kit...'}
            </div>
          </div>
          <ChevronDown size={16} className={'text-surface-400 transition-transform ' + (showDropdown ? 'rotate-180' : '')} />
        </button>

        {showDropdown && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-auto">
            {brandKits.map((kit) => (
              <button
                key={kit.id}
                onClick={() => {
                  setActiveBrandKit(kit);
                  setShowDropdown(false);
                }}
                className={'w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 transition-colors flex items-center gap-2 ' +
                  (activeBrandKit?.id === kit.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-surface-700')}
              >
                {kit.colors.length > 0 && (
                  <div className="flex gap-0.5 shrink-0">
                    {kit.colors.slice(0, 3).map((c) => (
                      <div key={c.id} className="w-3 h-3 rounded-full border border-surface-200" style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                )}
                <span className="truncate">{kit.propertyName}</span>
                {activeBrandKit?.id === kit.id && <span className="ml-auto text-xs text-primary-500">Active</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rebrand button */}
      {activeBrandKit && blocks.length > 0 && (
        <button
          onClick={handleRebrand}
          onMouseLeave={() => setRebrandConfirm(false)}
          className={'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
            (rebrandConfirm
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-primary-600 text-white hover:bg-primary-500')}
        >
          <Wand2 size={15} />
          {rebrandConfirm ? 'Click again to confirm rebrand' : 'Rebrand My Draft'}
        </button>
      )}

      {!activeBrandKit && (
        <div className="p-3 text-center">
          <p className="text-sm text-surface-400">Select a brand kit above</p>
        </div>
      )}

      {activeBrandKit && (
        <>
          {/* Colors */}
          {activeBrandKit.colors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Colors</h4>
              <div className="grid grid-cols-3 gap-2">
                {activeBrandKit.colors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => navigator.clipboard.writeText(color.hex)}
                    className="group text-center"
                    title={`Copy: ${color.hex}`}
                  >
                    <div
                      className="w-full aspect-square rounded-lg border border-surface-200 group-hover:ring-2 ring-primary-400 transition-all"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="text-xs text-surface-600 mt-1 truncate">{color.name}</div>
                    <div className="text-xs text-surface-400 font-mono">{color.hex}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Logos */}
          {activeBrandKit.logos.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Logos</h4>
              <div className="grid grid-cols-2 gap-2">
                {activeBrandKit.logos.map((logo) => (
                  <button
                    key={logo.id}
                    onClick={() => navigator.clipboard.writeText(logo.sourceUrl)}
                    className="group rounded-lg border border-surface-200 overflow-hidden hover:border-primary-300 transition-all"
                    title={`Copy URL: ${logo.name}`}
                  >
                    <div className="aspect-video bg-surface-50 flex items-center justify-center p-2">
                      <img src={logo.sourceUrl} alt={logo.altText || logo.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="px-2 py-1.5 text-xs text-surface-600 truncate">{logo.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Property Photos */}
          {activeBrandKit.images.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Photos</h4>
              <div className="grid grid-cols-2 gap-2">
                {activeBrandKit.images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => navigator.clipboard.writeText(img.sourceUrl)}
                    className="group rounded-lg border border-surface-200 overflow-hidden hover:border-primary-300 transition-all"
                    title={`Copy URL: ${img.name}`}
                  >
                    <div className="aspect-video bg-surface-100 overflow-hidden">
                      <img src={img.sourceUrl} alt={img.altText || img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="px-2 py-1">
                      <div className="text-xs text-surface-600 truncate">{img.name}</div>
                      {img.tags.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                          {img.tags.slice(0, 2).map((t) => (
                            <span key={t} className="text-[10px] px-1 py-0.5 bg-surface-100 rounded text-surface-400">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fonts */}
          {activeBrandKit.fonts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Fonts</h4>
              <div className="space-y-2">
                {activeBrandKit.fonts.map((font) => (
                  <div key={font.id} className="flex items-center gap-2 p-2 bg-surface-50 rounded-lg">
                    <Type size={14} className="text-surface-400 shrink-0" />
                    <div>
                      <div className="text-sm font-medium" style={{ fontFamily: font.family }}>{font.family}</div>
                      <div className="text-xs text-surface-400">{font.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Button Styles */}
          {activeBrandKit.buttonStyles.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Button Styles</h4>
              <div className="space-y-2">
                {activeBrandKit.buttonStyles.map((btn) => (
                  <div key={btn.id} className="p-3 bg-surface-50 rounded-lg">
                    <div className="text-xs text-surface-400 mb-1.5">{btn.name}</div>
                    <span
                      className="inline-block text-center text-sm"
                      style={{
                        backgroundColor: btn.backgroundColor,
                        color: btn.textColor,
                        padding: `${btn.paddingY}px ${btn.paddingX}px`,
                        borderRadius: btn.borderRadius,
                        fontSize: btn.fontSize,
                        fontWeight: btn.fontWeight,
                      }}
                    >
                      Sample Button
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info */}
          {activeBrandKit.contactInfo && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Contact Info</h4>
              <div className="p-3 bg-surface-50 rounded-lg text-xs text-surface-600 space-y-1">
                {activeBrandKit.contactInfo.phone && <p>{activeBrandKit.contactInfo.phone}</p>}
                {activeBrandKit.contactInfo.email && <p>{activeBrandKit.contactInfo.email}</p>}
                {activeBrandKit.contactInfo.address && <p>{activeBrandKit.contactInfo.address}</p>}
                {activeBrandKit.contactInfo.website && <p>{activeBrandKit.contactInfo.website}</p>}
              </div>
            </div>
          )}

          {/* Snippets */}
          {activeBrandKit.snippets.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">Snippets</h4>
              <div className="space-y-2">
                {activeBrandKit.snippets.map((snippet) => (
                  <button
                    key={snippet.id}
                    onClick={() => navigator.clipboard.writeText(snippet.content)}
                    className="w-full text-left p-2 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
                    title="Click to copy"
                  >
                    <div className="text-xs font-medium text-surface-600">{snippet.name}</div>
                    <div className="text-xs text-surface-400 truncate mt-0.5">{snippet.content}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
