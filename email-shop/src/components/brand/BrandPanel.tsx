import { useEditorStore } from '@/store/useEditorStore';
import { Palette, Type } from 'lucide-react';

/** Brand panel in the left sidebar - quick access to brand kit colors and fonts */
export function BrandPanel() {
  const activeBrandKit = useEditorStore((s) => s.activeBrandKit);

  if (!activeBrandKit) {
    return (
      <div className="p-4 text-center">
        <Palette size={24} className="mx-auto text-surface-300 mb-2" />
        <p className="text-sm text-surface-400">No brand kit selected</p>
        <p className="text-xs text-surface-300 mt-1">Select a property to load its brand kit</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      <div className="px-1">
        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Brand Kit</h3>
        <p className="text-sm font-medium text-surface-800">{activeBrandKit.propertyName}</p>
      </div>

      {/* Colors */}
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
    </div>
  );
}
