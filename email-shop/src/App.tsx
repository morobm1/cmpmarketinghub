import { useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { brandKitService, assetLibraryService, templateService, emailProjectService } from '@/services';
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

// Read property context from host page (email_shop.html injects this)
interface HostProperty { id: string; name: string; }
declare global {
  interface Window {
    __EMAIL_SHOP_PROPERTY__?: HostProperty;
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
  const setAssets = useEditorStore((s) => s.setAssets);
  const setTemplates = useEditorStore((s) => s.setTemplates);
  const setProjects = useEditorStore((s) => s.setProjects);
  const propertyId = useEditorStore((s) => s.propertyId);
  const newProject = useEditorStore((s) => s.newProject);

  // Initialize property from host page context
  useEffect(() => {
    const hostProp = window.__EMAIL_SHOP_PROPERTY__;
    const user = getAuthUser();

    if (hostProp && hostProp.id) {
      // Set from host page (email_shop.html)
      newProject(hostProp.id, hostProp.name);
    } else if (user && user.properties.length > 0 && user.properties[0] !== '*') {
      // Fallback: use first property from user
      newProject(user.properties[0]!, 'Property');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for property changes from host page
  useEffect(() => {
    const hostProp = window.__EMAIL_SHOP_PROPERTY__;
    if (hostProp && hostProp.id && hostProp.id !== propertyId) {
      newProject(hostProp.id, hostProp.name);
    }
  });

  // Load initial data from services
  useEffect(() => {
    if (!propertyId) return;

    const load = async () => {
      try {
        const [kits, assets, templates, projects] = await Promise.all([
          brandKitService.getAll(),
          assetLibraryService.getByPropertyId(propertyId),
          templateService.getAll(),
          emailProjectService.getAll(),
        ]);
        setBrandKits(kits);
        setAssets(assets);
        setTemplates(templates);
        setProjects(projects);

        // Set active brand kit for current property
        const activeKit = kits.find((k) => k.propertyId === propertyId);
        if (activeKit) setActiveBrandKit(activeKit);
      } catch (err) {
        console.error('Failed to load email shop data:', err);
      }
    };
    load();
  }, [propertyId, setBrandKits, setActiveBrandKit, setAssets, setTemplates, setProjects]);

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
