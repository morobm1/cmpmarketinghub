import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '@/store/useEditorStore';
import { SortableBlock } from './SortableBlock';
import { Mail, Plus, Sparkles, ListChecks } from 'lucide-react';

interface CanvasProps {
  activeDragId?: string | null;
}

export function Canvas({ activeDragId }: CanvasProps) {
  const blocks = useEditorStore((s) => s.blocks);
  const previewMode = useEditorStore((s) => s.previewMode);
  const globalStyles = useEditorStore((s) => s.globalStyles);
  const addBlock = useEditorStore((s) => s.addBlock);
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);

  const canvasWidth = previewMode === 'mobile' ? '375px' : globalStyles.contentWidth + 'px';

  // Make the canvas a droppable target for palette blocks
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: 'canvas-drop-zone',
  });

  return (
    <div
      className="flex-1 overflow-auto bg-surface-200 flex justify-center p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) selectBlock(null);
      }}
    >
      <div
        className="transition-all duration-300 ease-in-out"
        style={{
          width: canvasWidth,
          maxWidth: '100%',
          minHeight: '600px',
        }}
      >
        {/* Email canvas */}
        <div
          ref={setDropRef}
          className={'bg-white shadow-xl rounded-lg overflow-hidden transition-all ' + (
            isOver ? 'ring-2 ring-primary-400 ring-offset-2' : ''
          )}
          style={{
            backgroundColor: globalStyles.contentBackgroundColor,
            fontFamily: globalStyles.fontFamily + ', ' + globalStyles.fontFallback,
          }}
        >
          {blocks.length === 0 ? (
            <EmptyCanvas onAddBlock={() => addBlock('text')} isOver={isOver} />
          ) : (
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isSelected={block.id === selectedBlockId}
                  onSelect={() => selectBlock(block.id)}
                />
              ))}
            </SortableContext>
          )}

          {/* Add block button at bottom */}
          {blocks.length > 0 && (
            <button
              onClick={() => addBlock('text')}
              className="w-full py-4 flex items-center justify-center gap-2 text-surface-400 hover:text-primary-500 hover:bg-primary-50 transition-colors border-t border-dashed border-surface-200"
            >
              <Plus size={16} />
              <span className="text-sm font-medium">Add Block</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyCanvas({ onAddBlock, isOver }: { onAddBlock: () => void; isOver?: boolean }) {
  const setShowAIPanel = useEditorStore((s) => s.setShowAIPanel);
  const setShowGuidedMode = useEditorStore((s) => s.setShowGuidedMode);

  return (
    <div className={'flex flex-col items-center justify-center py-24 px-8 text-center transition-all ' + (
      isOver ? 'bg-primary-50' : ''
    )}>
      {isOver ? (
        <>
          <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
            <Plus size={28} className="text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-primary-700 mb-2">Drop Here to Add Block</h3>
          <p className="text-sm text-primary-500">Release to add this block to your email</p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <Mail size={28} className="text-surface-400" />
          </div>
          <h3 className="text-lg font-semibold text-surface-700 mb-2">Start Building Your Email</h3>
          <p className="text-sm text-surface-500 max-w-sm mb-6">
            Drag content blocks from the left sidebar, use AI to generate a draft, or click below to add your first block.
          </p>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={() => setShowGuidedMode(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-medium hover:from-emerald-500 hover:to-teal-500 transition-all shadow-lg shadow-emerald-600/20"
            >
              <ListChecks size={16} />
              Guided Mode
            </button>
            <button
              onClick={() => setShowAIPanel(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-violet-500 hover:to-purple-500 transition-all shadow-lg shadow-purple-600/20"
            >
              <Sparkles size={16} />
              AI Generate
            </button>
            <button
              onClick={onAddBlock}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Block
            </button>
          </div>
        </>
      )}
    </div>
  );
}
