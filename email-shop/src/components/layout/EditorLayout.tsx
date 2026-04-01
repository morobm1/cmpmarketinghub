import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { TopToolbar } from './TopToolbar';
import { LeftSidebar } from './LeftSidebar';
import { Canvas } from '../canvas/Canvas';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { useEditorStore } from '@/store/useEditorStore';
import type { EmailBlockType } from '@/types';

/**
 * Main editor layout: toolbar + left sidebar + canvas + right properties panel.
 * DndContext wraps sidebar + canvas so palette blocks can be dragged into the canvas.
 */
export function EditorLayout() {
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId);
  const blocks = useEditorStore((s) => s.blocks);
  const addBlock = useEditorStore((s) => s.addBlock);
  const reorderBlocks = useEditorStore((s) => s.reorderBlocks);
  const setDragging = useEditorStore((s) => s.setDragging);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    setDragging(true);
    document.body.classList.add('is-dragging');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setDragging(false);
    document.body.classList.remove('is-dragging');

    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;

    // Dropping a palette block into the canvas
    if (activeData?.type === 'palette-block') {
      const blockType = activeData.blockType as EmailBlockType;
      // If dropped on a specific block, insert before it; otherwise append
      const overStr = String(over.id);
      if (overStr === 'canvas-drop-zone') {
        addBlock(blockType);
      } else {
        const overIndex = blocks.findIndex((b) => b.id === overStr);
        addBlock(blockType, overIndex >= 0 ? overIndex : undefined);
      }
      return;
    }

    // Reordering existing blocks within the canvas
    if (active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === String(active.id));
      const newIndex = blocks.findIndex((b) => b.id === String(over.id));
      if (oldIndex >= 0 && newIndex >= 0) {
        const newBlocks = [...blocks];
        const [moved] = newBlocks.splice(oldIndex, 1);
        if (moved) {
          newBlocks.splice(newIndex, 0, moved);
          reorderBlocks(newBlocks);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopToolbar />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveDragId(null);
          setDragging(false);
          document.body.classList.remove('is-dragging');
        }}
      >
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <Canvas activeDragId={activeDragId} />
          {selectedBlockId && <PropertiesPanel />}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeDragId ? (
            <div className="bg-white shadow-2xl rounded-lg border-2 border-primary-400 px-4 py-3 opacity-90 pointer-events-none">
              <span className="text-sm font-medium text-primary-700">
                {activeDragId.startsWith('palette-')
                  ? activeDragId.replace('palette-', '').replace(/-/g, ' ')
                  : 'Block'}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
