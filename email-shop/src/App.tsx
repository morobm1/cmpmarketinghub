import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { brandKitService, templateService, emailProjectService } from '@/services';
import { getAuthUser, fetchAuthUser } from '@/services/authContext';
import { templateLibrary } from '@/templates/templateLibrary';
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
  const setActiveBrandKit = useEditorStore((s) => s.setActiveBrandKit);
  const setTemplates = useEditorStore((s) => s.setTemplates);
  const setProjects = useEditorStore((s) => s.setProjects);

  // Load initial data — user-scoped, filtered by assigned properties
  useEffect(() => {
    const load = async () => {
      // Try to get user from host injection, fallback to API fetch
      let user = getAuthUser();
      if (!user) {
        user = await fetchAuthUser();
      }

      // Even without auth, load built-in templates so the app works in dev
      try {
        const [apiKits, apiTemplates, apiProjects] = await Promise.all([
          brandKitService.getAll().catch(() => []),
          templateService.getAll().catch(() => []),
          emailProjectService.getAll().catch(() => []),
        ]);

        // Filter brand kits by user's assigned properties
        const userProps = user?.properties || [];
        const isAdminUser = user?.role === 'admin' || userProps.includes('*');
        const filteredKits = isAdminUser
          ? apiKits
          : apiKits.filter((kit) => userProps.includes(kit.propertyId));

        setBrandKits(filteredKits);

        // Auto-select first brand kit as active if available
        if (filteredKits.length > 0 && filteredKits[0]) {
          setActiveBrandKit(filteredKits[0]);
        }

        // Merge API templates with built-in library templates
        // Built-in templates serve as defaults; API templates take priority by ID
        const apiTemplateIds = new Set(apiTemplates.map((t) => t.id));
        const builtInTemplates = templateLibrary.filter((t) => !apiTemplateIds.has(t.id));
        setTemplates([...builtInTemplates, ...apiTemplates]);

        setProjects(apiProjects);
      } catch (err) {
        console.error('Failed to load Creative Studio data:', err);
        // Fallback: at least load built-in templates
        setTemplates([...templateLibrary]);
      }
    };
    load();
  }, [setBrandKits, setActiveBrandKit, setTemplates, setProjects]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-100 flex flex-col">
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
