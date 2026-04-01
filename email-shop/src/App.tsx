import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { brandKitService, templateService, emailProjectService } from '@/services';
import { getAuthUser } from '@/services/authContext';
import { EditorLayout } from '@/components/layout/EditorLayout';
import { BrandKitManager } from '@/components/brand/BrandKitManager';
import { AssetLibraryView } from '@/components/assets/AssetLibraryView';
import { TemplatesView } from '@/components/templates/TemplatesView';
import { ProjectsView } from '@/components/projects/ProjectsView';
import { ExportModal } from '@/components/export/ExportModal';
import { HtmlPreviewModal } from '@/components/export/HtmlPreviewModal';
import { AIGeneratePanel } from '@/components/ai/AIGeneratePanel';
import { AIResultsPanel } from '@/components/ai/AIResultsPanel';
import { GuidedMode } from '@/components/guided/GuidedMode';

// Read user context from host page (creative_studio.html injects this)
declare global {
  interface Window {
    __EMAIL_SHOP_USER__?: { username: string; role: string; properties: string[] };
  }
}

export default function App() {
  const currentView = useEditorStore((s) => s.currentView);
  const showExportModal = useEditorStore((s) => s.showExportModal);
  const showHtmlPreview = useEditorStore((s) => s.showHtmlPreview);
  const showAIPanel = useEditorStore((s) => s.showAIPanel);
  const aiStatus = useEditorStore((s) => s.aiStatus);
  const showGuidedMode = useEditorStore((s) => s.showGuidedMode);
  const setBrandKits = useEditorStore((s) => s.setBrandKits);
  const setTemplates = useEditorStore((s) => s.setTemplates);
  const setProjects = useEditorStore((s) => s.setProjects);

  // Load initial data — user-scoped, no property required
  useEffect(() => {
    const user = getAuthUser();
    if (!user) return;

    const load = async () => {
      try {
        const [kits, templates, projects] = await Promise.all([
          brandKitService.getAll(),
          templateService.getAll(),
          emailProjectService.getAll(),
        ]);
        setBrandKits(kits);
        setTemplates(templates);
        setProjects(projects);
      } catch (err) {
        console.error('Failed to load Creative Studio data:', err);
      }
    };
    load();
  }, [setBrandKits, setTemplates, setProjects]);

  return (
    <div className="h-full w-full overflow-hidden bg-surface-100 flex flex-col">
      {currentView === 'builder' && <EditorLayout />}
      {currentView === 'brand-kit' && <BrandKitManager />}
      {currentView === 'assets' && <AssetLibraryView />}
      {currentView === 'templates' && <TemplatesView />}
      {currentView === 'projects' && <ProjectsView />}

      {showExportModal && <ExportModal />}
      {showHtmlPreview && <HtmlPreviewModal />}
      {showAIPanel && aiStatus !== 'reviewing' && <AIGeneratePanel />}
      {showAIPanel && aiStatus === 'reviewing' && <AIResultsPanel />}
      {showGuidedMode && <GuidedMode />}
    </div>
  );
}
