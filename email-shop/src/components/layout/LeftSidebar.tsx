import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { BlockPalette } from '../blocks/BlockPalette';
import { AssetPanel } from '../assets/AssetPanel';
import { BrandPanel } from '../brand/BrandPanel';
import { LayersPanel } from '../layers/LayersPanel';
import { Blocks, ImageIcon, Palette, Layers } from 'lucide-react';
import type { SidebarTab } from '@/types';

const tabs: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  { id: 'blocks', label: 'Blocks', icon: <Blocks size={18} /> },
  { id: 'assets', label: 'Assets', icon: <ImageIcon size={18} /> },
  { id: 'brand', label: 'Brand', icon: <Palette size={18} /> },
  { id: 'layers', label: 'Layers', icon: <Layers size={18} /> },
];

export function LeftSidebar() {
  const sidebarTab = useEditorStore((s) => s.sidebarTab);
  const setSidebarTab = useEditorStore((s) => s.setSidebarTab);

  return (
    <div className="w-72 bg-white border-r border-surface-200 flex flex-col shrink-0 shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-surface-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              sidebarTab === tab.id
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'blocks' && <BlockPalette />}
        {sidebarTab === 'assets' && <AssetPanel />}
        {sidebarTab === 'brand' && <BrandPanel />}
        {sidebarTab === 'layers' && <LayersPanel />}
      </div>
    </div>
  );
}
