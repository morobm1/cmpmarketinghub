import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '@/store/useEditorStore';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { getBlockDefinition } from '@/blocks/registry';
import { GripVertical, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import type { EmailBlock } from '@/types';

interface SortableBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
}

export function SortableBlock({ block, isSelected, onSelect }: SortableBlockProps) {
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const duplicateBlock = useEditorStore((s) => s.duplicateBlock);
  const updateBlockData = useEditorStore((s) => s.updateBlockData);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const definition = getBlockDefinition(block.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${
        isSelected ? 'ring-2 ring-primary-500 ring-offset-1' : ''
      } ${!block.data.visible ? 'opacity-40' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Hover toolbar - inside the block, at top */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-1 z-10 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)' }}
      >
        {/* Left: drag handle + label */}
        <div className="flex items-center gap-1">
          <button
            {...attributes}
            {...listeners}
            style={{ touchAction: 'none' }}
            className="w-6 h-6 rounded bg-surface-800/80 text-white flex items-center justify-center hover:bg-surface-700 cursor-grab active:cursor-grabbing select-none"
            title="Drag to reorder"
          >
            <GripVertical size={12} />
          </button>
          <span className="text-[10px] bg-surface-800/80 text-white px-1.5 py-0.5 rounded font-medium">
            {definition?.label || block.type}
          </span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateBlockData(block.id, { visible: !block.data.visible } as any);
            }}
            className="w-6 h-6 rounded bg-surface-800/80 text-white flex items-center justify-center hover:bg-surface-600"
            title={block.data.visible ? 'Hide' : 'Show'}
          >
            {block.data.visible ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicateBlock(block.id);
            }}
            className="w-6 h-6 rounded bg-surface-800/80 text-white flex items-center justify-center hover:bg-surface-600"
            title="Duplicate"
          >
            <Copy size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
            className="w-6 h-6 rounded bg-red-600/80 text-white flex items-center justify-center hover:bg-red-500"
            title="Delete"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Block content */}
      <BlockRenderer block={block} />
    </div>
  );
}
