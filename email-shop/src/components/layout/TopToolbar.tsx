import { useEditorStore } from '@/store/useEditorStore';
import type { EditorView, PreviewMode } from '@/types';
import { useState } from 'react';
import {
  Undo2,
  Redo2,
  Monitor,
  Smartphone,
  Code2,
  Download,
  Save,
  FolderOpen,
  LayoutTemplate,
  Palette,
  ImageIcon,
  FileText,
  ChevronDown,
  Sparkles,
  BookmarkPlus,
  X,
  Loader2,
  CheckCircle2,
  Copy,
  Share2,
} from 'lucide-react';

export function TopToolbar() {
  const projectName = useEditorStore((s) => s.projectName);
  const propertyName = useEditorStore((s) => s.propertyName);
  const currentView = useEditorStore((s) => s.currentView);
  const previewMode = useEditorStore((s) => s.previewMode);
  const isDirty = useEditorStore((s) => s.isDirty);
  const setView = useEditorStore((s) => s.setView);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
  const setShowHtmlPreview = useEditorStore((s) => s.setShowHtmlPreview);
  const setShowExportModal = useEditorStore((s) => s.setShowExportModal);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const setShowAIPanel = useEditorStore((s) => s.setShowAIPanel);
  const blocks = useEditorStore((s) => s.blocks);
  const saveAsTemplate = useEditorStore((s) => s.saveAsTemplate);
  const saveProject = useEditorStore((s) => s.saveProject);
  const isSavingProject = useEditorStore((s) => s.isSavingProject);
  const lastSaveError = useEditorStore((s) => s.lastSaveError);
  const editingTemplateId = useEditorStore((s) => s.editingTemplateId);
  const saveEditedTemplate = useEditorStore((s) => s.saveEditedTemplate);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [tmplName, setTmplName] = useState('');
  const [tmplDesc, setTmplDesc] = useState('');
  const [tmplCat, setTmplCat] = useState('marketing');

  const handleSaveTemplate = () => {
    if (tmplName.trim()) {
      saveAsTemplate(tmplName.trim(), tmplDesc.trim(), tmplCat);
      setShowSaveDialog(false);
      setTmplName('');
      setTmplDesc('');
    }
  };

  const navItems: { view: EditorView; label: string; icon: React.ReactNode }[] = [
    { view: 'builder', label: 'Builder', icon: <FileText size={16} /> },
    { view: 'templates', label: 'Templates', icon: <LayoutTemplate size={16} /> },
    { view: 'brand-kit', label: 'Brand Kit', icon: <Palette size={16} /> },
    { view: 'assets', label: 'Image Library', icon: <ImageIcon size={16} /> },
    { view: 'projects', label: 'Projects', icon: <FolderOpen size={16} /> },
  ];

  const previewModes: { mode: PreviewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'desktop', icon: <Monitor size={16} />, label: 'Desktop' },
    { mode: 'mobile', icon: <Smartphone size={16} />, label: 'Mobile' },
  ];

  return (
    <header className="h-12 bg-[#1e293b] text-white flex items-center px-3 gap-1.5 shrink-0 shadow-lg z-50">
      {/* Logo / App Name */}
      <div className="flex items-center gap-2 mr-2 shrink-0">
        <div className="w-7 h-7 rounded-md bg-[#446472] flex items-center justify-center text-white font-bold text-xs">
          CS
        </div>
        <div className="hidden lg:block leading-none">
          <div className="text-xs font-semibold whitespace-nowrap text-[#52d5ff]">Creative Studio</div>
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-surface-700 mx-1 shrink-0" />

      {/* Navigation */}
      <nav className="flex items-center gap-0.5">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setView(item.view)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              currentView === item.view
                ? 'bg-primary-600 text-white'
                : 'text-surface-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            {item.icon}
            <span className="hidden xl:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1 min-w-4" />

      {/* Project Name (editable) */}
      <div className="flex items-center gap-1.5 mr-2 max-w-56 shrink-0">
        <input
          type="text"
          value={projectName}
          onChange={(e) => useEditorStore.getState().setProject({ name: e.target.value } as any)}
          className="text-xs text-surface-400 bg-transparent border-0 border-b border-transparent hover:border-surface-600 focus:border-primary-400 focus:text-white outline-none truncate w-full px-0.5 py-0.5"
          title="Click to rename project"
        />
        {editingTemplateId && (
          <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-semibold shrink-0">Editing Template</span>
        )}
        {isDirty && !editingTemplateId && (
          <span className="text-[10px] text-amber-400 font-semibold shrink-0">Unsaved</span>
        )}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-surface-700 mx-1 shrink-0" />

      {/* Preview Mode Toggle */}
      {currentView === 'builder' && (
        <div className="flex items-center bg-surface-800 rounded-md p-0.5 mr-1 shrink-0">
          {previewModes.map((pm) => (
            <button
              key={pm.mode}
              onClick={() => setPreviewMode(pm.mode)}
              className={`flex items-center px-2 py-1 rounded text-xs transition-colors ${
                previewMode === pm.mode
                  ? 'bg-surface-600 text-white'
                  : 'text-surface-500 hover:text-white'
              }`}
              title={pm.label}
            >
              {pm.icon}
            </button>
          ))}
        </div>
      )}

      {/* Undo/Redo */}
      {currentView === 'builder' && (
        <div className="flex items-center gap-0.5 mr-1 shrink-0">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="p-1.5 rounded text-surface-500 hover:text-white hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo"
          >
            <Redo2 size={15} />
          </button>
        </div>
      )}

      {/* Separator */}
      <div className="w-px h-6 bg-surface-700 mx-1 shrink-0" />

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0 relative">
        {/* Save Draft / Save Complete dropdown */}
        {blocks.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowSaveMenu(!showSaveMenu)}
              onBlur={() => setTimeout(() => setShowSaveMenu(false), 150)}
              disabled={isSavingProject}
              className={'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ' +
                (savedFlash ? 'text-emerald-400' : isDirty ? 'text-amber-400 hover:text-white hover:bg-surface-700' : 'text-surface-400 hover:text-white hover:bg-surface-700')}
              title="Save Project"
            >
              {isSavingProject ? <Loader2 size={14} className="animate-spin" /> : savedFlash ? <CheckCircle2 size={14} /> : <Save size={14} />}
              <span className="hidden xl:inline">{savedFlash || 'Save'}</span>
              {!savedFlash && <ChevronDown size={10} />}
            </button>
            {showSaveMenu && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white rounded-lg shadow-xl border border-surface-200 py-1 z-50">
                <button
                  onClick={async () => {
                    setShowSaveMenu(false);
                    try {
                      await saveProject('draft');
                      setSavedFlash('Draft Saved');
                    } catch {
                      setSavedFlash('Save Error');
                    }
                    setTimeout(() => setSavedFlash(null), 2500);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2"
                >
                  <Save size={14} className="text-amber-500" />
                  Save Draft
                </button>
                <button
                  onClick={async () => {
                    setShowSaveMenu(false);
                    try {
                      await saveProject('complete');
                      setSavedFlash('Saved');
                    } catch {
                      setSavedFlash('Save Error');
                    }
                    setTimeout(() => setSavedFlash(null), 2500);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  Save Complete
                </button>
                {editingTemplateId && (
                  <>
                    <div className="border-t border-surface-100 my-1" />
                    <button
                      onClick={() => {
                        setShowSaveMenu(false);
                        saveEditedTemplate();
                        setSavedFlash('Template Updated');
                        setTimeout(() => setSavedFlash(null), 2500);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2"
                    >
                      <LayoutTemplate size={14} className="text-amber-500" />
                      Update Template
                    </button>
                  </>
                )}
                <div className="border-t border-surface-100 my-1" />
                <button
                  onClick={async () => {
                    setShowSaveMenu(false);
                    // Clear projectId to force a new save
                    useEditorStore.setState({ projectId: null, projectName: projectName + ' (Copy)' });
                    try {
                      await saveProject('draft');
                      setSavedFlash('New Copy Saved');
                    } catch {
                      setSavedFlash('Save Error');
                    }
                    setTimeout(() => setSavedFlash(null), 2500);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2"
                >
                  <Copy size={14} className="text-blue-500" />
                  Save As New Copy
                </button>
                <button
                  onClick={() => {
                    setShowSaveMenu(false);
                    const pid = useEditorStore.getState().projectId;
                    if (pid) {
                      const shareUrl = window.location.origin + '/creative_studio.html?project=' + pid;
                      navigator.clipboard.writeText(shareUrl);
                      setSavedFlash('Link Copied');
                      setTimeout(() => setSavedFlash(null), 2500);
                    } else {
                      setSavedFlash('Save first');
                      setTimeout(() => setSavedFlash(null), 2500);
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2"
                >
                  <Share2 size={14} className="text-purple-500" />
                  Copy Share Link
                </button>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => setShowAIPanel(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 transition-all shadow-sm whitespace-nowrap"
          title="AI Generate Email"
        >
          <Sparkles size={14} />
          <span className="hidden xl:inline">AI Generate</span>
        </button>
        {blocks.length > 0 && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-white hover:bg-surface-700 transition-colors whitespace-nowrap"
            title="Save as Template"
          >
            <BookmarkPlus size={14} />
          </button>
        )}
        <button
          onClick={() => setShowHtmlPreview(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-surface-400 hover:text-white hover:bg-surface-700 transition-colors whitespace-nowrap"
          title="View HTML"
        >
          <Code2 size={14} />
          <span className="hidden xl:inline">HTML</span>
        </button>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary-600 text-white hover:bg-primary-500 transition-colors whitespace-nowrap"
        >
          <Download size={14} />
          <span className="hidden xl:inline">Export</span>
        </button>

        {/* Save as Template dialog */}
        {showSaveDialog && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-surface-200 p-4 z-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-surface-800">Save as Template</h3>
              <button onClick={() => setShowSaveDialog(false)} className="text-surface-400 hover:text-surface-600">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Template Name</label>
                <input type="text" value={tmplName} onChange={(e) => setTmplName(e.target.value)} placeholder="My Email Template" className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Description</label>
                <input type="text" value={tmplDesc} onChange={(e) => setTmplDesc(e.target.value)} placeholder="Brief description..." className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 mb-1">Category</label>
                <select value={tmplCat} onChange={(e) => setTmplCat(e.target.value)} className="w-full px-2.5 py-1.5 text-sm border border-surface-200 rounded-md bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none">
                  <option value="marketing">Marketing</option>
                  <option value="leasing">Leasing</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="retention">Retention</option>
                  <option value="events">Events</option>
                  <option value="operations">Operations</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <button onClick={handleSaveTemplate} disabled={!tmplName.trim()} className="w-full py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Save Template
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
