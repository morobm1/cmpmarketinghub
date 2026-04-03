import { useState, useMemo } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { generateEmailHtml } from '@/engine/htmlGenerator';
import { ArrowLeft, LayoutTemplate, Plus, Eye, Pencil, Trash2, X } from 'lucide-react';
import type { EmailTemplate } from '@/types';

export function TemplatesView() {
  const templates = useEditorStore((s) => s.templates);
  const setView = useEditorStore((s) => s.setView);
  const setProject = useEditorStore((s) => s.setProject);
  const editTemplateAction = useEditorStore((s) => s.editTemplate);
  const deleteTemplateAction = useEditorStore((s) => s.deleteTemplate);

  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleEditTemplate = (template: EmailTemplate) => {
    editTemplateAction(template);
    setView('builder');
  };

  const handleDeleteTemplate = (template: EmailTemplate) => {
    if (window.confirm('Delete template "' + template.name + '"? This cannot be undone.')) {
      deleteTemplateAction(template.id);
    }
  };

  const useTemplate = (template: EmailTemplate) => {
    setProject({
      blocks: JSON.parse(JSON.stringify(template.blocks)),
      globalStyles: { ...template.globalStyles },
      name: 'New Email from ' + template.name,
      templateId: template.id,
    } as any);
    setView('builder');
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(templates.map((t: EmailTemplate) => t.category));
    return ['all', ...Array.from(cats)];
  }, [templates]);

  const filtered = filterCategory === 'all'
    ? templates
    : templates.filter((t: EmailTemplate) => t.category === filterCategory);

  const categoryColors: Record<string, string> = {
    onboarding: 'bg-green-100 text-green-700',
    retention: 'bg-blue-100 text-blue-700',
    marketing: 'bg-purple-100 text-purple-700',
    events: 'bg-orange-100 text-orange-700',
    operations: 'bg-amber-100 text-amber-700',
    newsletter: 'bg-indigo-100 text-indigo-700',
    leasing: 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 bg-[#1e293b] text-white flex items-center px-6 gap-4 shrink-0">
        <button onClick={() => setView('builder')} className="p-1.5 rounded-md hover:bg-surface-700">
          <ArrowLeft size={18} />
        </button>
        <LayoutTemplate size={20} />
        <h1 className="text-base font-semibold">Email Templates</h1>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-surface-800 mb-2">Templates</h2>
              <p className="text-surface-500">Start from a pre-built template or create from scratch</p>
            </div>
            <button
              onClick={() => { setProject({ blocks: [], name: 'Untitled Email' } as any); setView('builder'); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500 transition-colors"
            >
              <Plus size={16} /> Blank Email
            </button>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={'px-3 py-1.5 text-xs font-medium rounded-full transition-colors capitalize ' + (
                  filterCategory === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                )}
              >
                {cat === 'all' ? 'All Templates' : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((template: EmailTemplate) => (
              <TemplateCard
                key={template.id}
                template={template}
                categoryColor={categoryColors[template.category] || 'bg-surface-100 text-surface-600'}
                onUse={() => useTemplate(template)}
                onPreview={() => setPreviewTemplate(template)}
                onEdit={() => handleEditTemplate(template)}
                onDelete={() => handleDeleteTemplate(template)}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <LayoutTemplate size={40} className="mx-auto text-surface-300 mb-3" />
              <p className="text-surface-400">No templates in this category</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => { useTemplate(previewTemplate); setPreviewTemplate(null); }}
        />
      )}
    </div>
  );
}

// ---- Template Card with live iframe preview ----

function TemplateCard({ template, categoryColor, onUse, onPreview, onEdit, onDelete }: {
  template: EmailTemplate;
  categoryColor: string;
  onUse: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // Generate a live HTML preview for the thumbnail
  const previewHtml = useMemo(() => {
    return generateEmailHtml(template.blocks, template.globalStyles);
  }, [template.blocks, template.globalStyles]);

  return (
    <div className="rounded-xl border border-surface-200 bg-white overflow-hidden hover:shadow-lg hover:border-primary-300 transition-all group">
      {/* Live preview thumbnail */}
      <div className="relative h-64 bg-surface-50 overflow-hidden">
        <div className="absolute inset-0">
          <iframe
            srcDoc={previewHtml}
            className="border-0 pointer-events-none"
            style={{ width: '600px', height: '900px', transform: 'scale(0.48)', transformOrigin: 'top center', position: 'absolute', left: '50%', marginLeft: '-300px' }}
            title={'Preview: ' + template.name}
            sandbox="allow-same-origin"
            tabIndex={-1}
          />
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <button
            onClick={onPreview}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-surface-800 rounded-lg text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-50"
          >
            <Eye size={14} />
            Preview
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-surface-800 truncate">{template.name}</h3>
          <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ' + categoryColor}>
            {template.category}
          </span>
        </div>
        <p className="text-xs text-surface-500 mb-3 line-clamp-2">{template.description}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={onUse}
            className="flex-1 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors text-center"
          >
            Use Template
          </button>
          <button
            onClick={onEdit}
            title="Edit Template"
            className="px-3 py-2 text-sm font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onPreview}
            className="px-3 py-2 text-sm font-medium text-surface-500 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Delete Template"
            className="px-3 py-2 text-sm font-medium text-red-400 bg-red-50 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Full-size preview modal ----

function TemplatePreviewModal({ template, onClose, onUse }: {
  template: EmailTemplate;
  onClose: () => void;
  onUse: () => void;
}) {
  const previewHtml = useMemo(() => {
    return generateEmailHtml(template.blocks, template.globalStyles);
  }, [template.blocks, template.globalStyles]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-surface-800">{template.name}</h2>
            <p className="text-sm text-surface-500">{template.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUse}
              className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors"
            >
              Use Template
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-surface-200 flex justify-center p-6">
          <div className="w-[600px]">
            <iframe
              srcDoc={previewHtml}
              className="w-full bg-white shadow-lg rounded-lg border-0"
              style={{ minHeight: '800px' }}
              title={'Full preview: ' + template.name}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
