import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { brandKitService, templateService, emailProjectService, assetLibraryService } from '@/services';
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
  const setAssets = useEditorStore((s) => s.setAssets);

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
        const [apiKits, apiTemplates, apiProjects, apiAssets] = await Promise.all([
          brandKitService.getAll().catch(() => []),
          templateService.getAll().catch(() => []),
          emailProjectService.getAll().catch(() => []),
          assetLibraryService.getAll().catch(() => []),
        ]);

        // The API already filters brand kits by user's properties + shared access.
        // No additional client-side filtering needed.
        const userProps = user?.properties || [];
        const isAdminUser = user?.role === 'admin' || userProps.includes('*');
        const filteredKits = apiKits;

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

        // Filter assets by user's accessible properties
        const filteredAssets = isAdminUser
          ? apiAssets
          : apiAssets.filter((a) => userProps.includes(a.propertyId));

        // Merge brand kit images into the asset library so they appear
        // in the Image Library view. Brand kits store logos/images/floorplans
        // inline, but the Asset Library reads from the separate assets store.
        const existingAssetIds = new Set(filteredAssets.map((a) => a.id));
        const brandKitAssets: typeof filteredAssets = [];
        for (const kit of filteredKits) {
          for (const asset of [...kit.logos, ...kit.images, ...kit.floorplans]) {
            if (asset.sourceUrl && !existingAssetIds.has(asset.id)) {
              existingAssetIds.add(asset.id);
              brandKitAssets.push(asset);
            }
          }
        }

        setAssets([...filteredAssets, ...brandKitAssets]);
      } catch (err) {
        console.error('Failed to load Creative Studio data:', err);
        // Fallback: at least load built-in templates
        setTemplates([...templateLibrary]);
      }
    };
    load();
  }, [setBrandKits, setActiveBrandKit, setTemplates, setProjects, setAssets]);

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
