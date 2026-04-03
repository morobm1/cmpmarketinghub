import { useDraggable } from '@dnd-kit/core';
import { getBlocksByCategory, categoryLabels } from '@/blocks/registry';
import type { BlockDefinition, EmailBlockType } from '@/types';
import {
  LayoutTemplate, PanelBottom, MoveVertical, Minus,
  Type, RectangleHorizontal, MessageSquare, Quote,
  Image, ImagePlus, Share2,
  LayoutList, Columns2,
  Sparkles, Grid2x2, Megaphone,
  LayoutGrid, CalendarDays, ListOrdered, AlertTriangle,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutTemplate, PanelBottom, MoveVertical, Minus,
  Type, RectangleHorizontal, MessageSquare, Quote,
  Image, ImagePlus, Share2,
  LayoutList, Columns2,
  Sparkles, Grid2x2, Megaphone,
  LayoutGrid, CalendarDays, ListOrdered,
};

function DraggableBlock({ block }: { block: BlockDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${block.type}`,
    data: { type: 'palette-block', blockType: block.type },
  });

  const IconComponent = iconMap[block.icon];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: 'none' }}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-surface-200 bg-white cursor-grab hover:border-primary-300 hover:bg-primary-50 hover:shadow-sm transition-all select-none ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="w-8 h-8 rounded-md bg-surface-100 flex items-center justify-center text-surface-500 shrink-0">
        {IconComponent ? <IconComponent size={16} /> : <Type size={16} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-surface-800 truncate flex items-center gap-1">
          {block.label}
          {block.entrataWarning && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
        </div>
        <div className="text-xs text-surface-400 truncate">{block.description}</div>
        {block.entrataWarning && <div className="text-[10px] text-amber-500 mt-0.5 truncate">Not Entrata-compatible</div>}
      </div>
    </div>
  );
}

export function BlockPalette() {
  const grouped = getBlocksByCategory();

  return (
    <div className="p-3 space-y-4">
      <div className="px-1">
        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">
          Content Blocks
        </h3>
        <p className="text-xs text-surface-400">Drag blocks to the canvas to build your email</p>
      </div>

      {Object.entries(grouped).map(([category, blocks]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider px-1 mb-2">
            {categoryLabels[category] || category}
          </h4>
          <div className="space-y-1.5">
            {blocks.map((block) => (
              <DraggableBlock key={block.type} block={block} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
