import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { generateEmailHtml, generateEmailBodyHtml } from '@/engine/htmlGenerator';
import { X, Copy, Download, Check, Code2 } from 'lucide-react';

export function ExportModal() {
  const blocks = useEditorStore((s) => s.blocks);
  const globalStyles = useEditorStore((s) => s.globalStyles);
  const projectName = useEditorStore((s) => s.projectName);
  const setShowExportModal = useEditorStore((s) => s.setShowExportModal);
  const [copied, setCopied] = useState(false);
  const [exportType, setExportType] = useState<'full' | 'body'>('full');

  const html = exportType === 'full'
    ? generateEmailHtml(blocks, globalStyles)
    : generateEmailBodyHtml(blocks, globalStyles);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Validation warnings
  const warnings: string[] = [];
  blocks.forEach((block) => {
    const data = block.data as Record<string, any>;
    if (block.type === 'hero-image' && !data.imageUrl) warnings.push(`Hero Image block has no image URL`);
    if (block.type === 'logo' && !data.imageUrl) warnings.push(`Logo block has no image URL`);
    if (block.type === 'button' && (!data.url || data.url === '#')) warnings.push(`Button "${data.label}" has no URL`);
    if (data.altText === '' || data.imageAlt === '' || data.logoAlt === '') warnings.push(`Block "${block.type}" is missing alt text`);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div>
            <h2 className="text-lg font-semibold text-surface-800">Export Email HTML</h2>
            <p className="text-sm text-surface-500">Copy the HTML and paste into Entrata Message Center</p>
          </div>
          <button onClick={() => setShowExportModal(false)} className="p-2 rounded-lg hover:bg-surface-100">
            <X size={20} className="text-surface-400" />
          </button>
        </div>

        {/* Export type toggle */}
        <div className="px-6 py-3 border-b border-surface-100 flex items-center gap-2">
          <span className="text-sm text-surface-500 mr-2">Export:</span>
          <button
            onClick={() => setExportType('full')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              exportType === 'full' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
            }`}
          >
            Full HTML Document
          </button>
          <button
            onClick={() => setExportType('body')}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              exportType === 'body' ? 'bg-primary-100 text-primary-700' : 'bg-surface-100 text-surface-500 hover:bg-surface-200'
            }`}
          >
            Body Only (for Entrata paste)
          </button>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
            <p className="text-xs font-semibold text-amber-700 mb-1">Validation Warnings:</p>
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-600">• {w}</p>
            ))}
          </div>
        )}

        {/* HTML preview */}
        <div className="flex-1 overflow-auto p-6">
          <pre className="bg-surface-900 text-surface-200 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[400px] whitespace-pre-wrap break-all">
            {html}
          </pre>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between">
          <div className="text-xs text-surface-400">
            {html.length.toLocaleString()} characters • {blocks.length} blocks
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
            >
              <Download size={16} />
              Download .html
            </button>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-primary-600 text-white hover:bg-primary-500'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy HTML'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
