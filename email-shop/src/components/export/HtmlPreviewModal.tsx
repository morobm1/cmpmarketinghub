import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { generateEmailHtml } from '@/engine/htmlGenerator';
import { X, Eye, Code2, Copy, Check } from 'lucide-react';

export function HtmlPreviewModal() {
  const blocks = useEditorStore((s) => s.blocks);
  const globalStyles = useEditorStore((s) => s.globalStyles);
  const setShowHtmlPreview = useEditorStore((s) => s.setShowHtmlPreview);
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const html = generateEmailHtml(blocks, globalStyles);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-surface-800">HTML Preview</h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-surface-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('preview')}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md font-medium ${
                  view === 'preview' ? 'bg-white text-surface-800 shadow-sm' : 'text-surface-500'
                }`}
              >
                <Eye size={14} /> Preview
              </button>
              <button
                onClick={() => setView('code')}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md font-medium ${
                  view === 'code' ? 'bg-white text-surface-800 shadow-sm' : 'text-surface-500'
                }`}
              >
                <Code2 size={14} /> Code
              </button>
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg font-medium ${
                copied ? 'bg-green-600 text-white' : 'bg-primary-600 text-white hover:bg-primary-500'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => setShowHtmlPreview(false)} className="p-2 rounded-lg hover:bg-surface-100">
              <X size={20} className="text-surface-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {view === 'preview' ? (
            <div className="flex justify-center p-6 bg-surface-200">
              <iframe
                srcDoc={html}
                className="w-[600px] min-h-[600px] bg-white shadow-lg rounded-lg border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <pre className="p-6 bg-surface-900 text-surface-200 text-xs font-mono whitespace-pre-wrap break-all overflow-auto">
              {html}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
