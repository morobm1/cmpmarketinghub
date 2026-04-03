import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { emailProjectService } from '@/services';
import { ArrowLeft, FolderOpen, Plus, Clock, Tag, Share2 } from 'lucide-react';
import { ShareModal } from '@/components/sharing/ShareModal';
import type { EmailProject } from '@/types';

const statusColors: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700',
  complete: 'bg-emerald-100 text-emerald-700',
  template: 'bg-purple-100 text-purple-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-surface-100 text-surface-500',
};

export function ProjectsView() {
  const projects = useEditorStore((s) => s.projects);
  const setView = useEditorStore((s) => s.setView);
  const setProject = useEditorStore((s) => s.setProject);
  const newProject = useEditorStore((s) => s.newProject);
  const propertyId = useEditorStore((s) => s.propertyId);
  const propertyName = useEditorStore((s) => s.propertyName);
  const setProjects = useEditorStore((s) => s.setProjects);

  const [sharingProject, setSharingProject] = useState<EmailProject | null>(null);

  const openProject = (project: EmailProject) => {
    setProject(project);
    setView('builder');
  };

  const createNew = () => {
    newProject(propertyId, propertyName);
    setView('builder');
  };

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 bg-[#1e293b] text-white flex items-center px-6 gap-4 shrink-0">
        <button onClick={() => setView('builder')} className="p-1.5 rounded-md hover:bg-surface-700">
          <ArrowLeft size={18} />
        </button>
        <FolderOpen size={20} />
        <h1 className="text-base font-semibold">Email Projects</h1>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-surface-800 mb-2">My Projects</h2>
              <p className="text-surface-500">Manage your email projects and drafts</p>
            </div>
            <button
              onClick={createNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500 transition-colors"
            >
              <Plus size={16} /> New Email
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen size={40} className="mx-auto text-surface-300 mb-3" />
              <h3 className="text-lg font-semibold text-surface-600 mb-1">No projects yet</h3>
              <p className="text-sm text-surface-400 mb-4">Create your first email to get started</p>
              <button onClick={createNew} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-500">
                Create Email
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project: EmailProject) => (
                <div
                  key={project.id}
                  onClick={() => openProject(project)}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-surface-200 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                    <FolderOpen size={20} className="text-surface-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-surface-800 truncate">{project.name}</h3>
                    <p className="text-xs text-surface-400">{project.propertyName} • by {project.createdBy}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[project.status] || ''}`}>
                      {project.status}
                    </span>
                    <div className="text-xs text-surface-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                    {project.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag size={12} className="text-surface-300" />
                        {project.tags.map((tag: string) => (
                          <span key={tag} className="text-xs text-surface-400">{tag}</span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setSharingProject(project); }}
                      className="p-1.5 rounded-md hover:bg-[#446472]/10 text-surface-400 hover:text-[#446472] transition-colors"
                      title="Share project"
                    >
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Project Modal */}
      {sharingProject && (
        <ShareModal
          title="Share Project"
          itemName={sharingProject.name}
          currentSharedWith={(sharingProject as any).sharedWith || []}
          onClose={() => setSharingProject(null)}
          onSave={async (sharedWith) => {
            const updated = { ...sharingProject, sharedWith } as any;
            try {
              await emailProjectService.save(updated);
              // Update in local store
              setProjects(projects.map(p => p.id === updated.id ? updated : p));
            } catch (err) {
              console.error('Failed to update sharing:', err);
            }
            setSharingProject(null);
          }}
        />
      )}
    </div>
  );
}
