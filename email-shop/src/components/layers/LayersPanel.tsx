import { useEditorStore } from '@/store/useEditorStore';
import { getBlockDefinition } from '@/blocks/registry';
import { GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';
import type { EmailBlock } from '@/types';

export function LayersPanel() {
  const blocks = useEditorStore((s) => s.blocks);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const updateBlockData = useEditorStore((s) => s.updateBlockData);

  if (blocks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-surface-400">No blocks yet</p>
        <p className="text-xs text-surface-300 mt-1">Add blocks from the Blocks tab</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      <div className="px-2 py-1">
        <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
          Layers ({blocks.length})
        </h3>
      </div>
      {blocks.map((block: EmailBlock, index: number) => {
        const def = getBlockDefinition(block.type);
        return (
          <div
            key={block.id}
            onClick={() => selectBlock(block.id)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
              selectedBlockId === block.id
                ? 'bg-primary-50 border border-primary-200'
                : 'hover:bg-surface-50 border border-transparent'
            } ${!block.data.visible ? 'opacity-50' : ''}`}
          >
            <span className="text-xs text-surface-300 w-5 text-right shrink-0">{index + 1}</span>
            <span className="text-sm text-surface-700 flex-1 truncate">{def?.label || block.type}</span>
            <button
              onClick={(e) => { e.stopPropagation(); updateBlockData(block.id, { visible: !block.data.visible } as any); }}
              className="p-0.5 text-surface-400 hover:text-surface-600"
            >
              {block.data.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
              className="p-0.5 text-surface-400 hover:text-red-500"
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
