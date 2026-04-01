import { useEditorStore } from '@/store/useEditorStore';
import { X, Check, RefreshCw, Sparkles, AlertTriangle, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function AIResultsPanel() {
  const aiResult = useEditorStore((s) => s.aiResult);
  const aiSelectedSubjectLine = useEditorStore((s) => s.aiSelectedSubjectLine);
  const aiSelectedPreviewText = useEditorStore((s) => s.aiSelectedPreviewText);
  const setAISelectedSubjectLine = useEditorStore((s) => s.setAISelectedSubjectLine);
  const setAISelectedPreviewText = useEditorStore((s) => s.setAISelectedPreviewText);
  const applyAIResult = useEditorStore((s) => s.applyAIResult);
  const setShowAIPanel = useEditorStore((s) => s.setShowAIPanel);
  const setAIStatus = useEditorStore((s) => s.setAIStatus);
  const resetAI = useEditorStore((s) => s.resetAI);

  const [showWarnings, setShowWarnings] = useState(true);

  if (!aiResult || !aiResult.response) return null;

  const { response, parsedBlocks, validationWarnings } = aiResult;

  const handleApply = () => {
    applyAIResult();
  };

  const handleRegenerate = () => {
    setAIStatus('configuring');
  };

  const handleClose = () => {
    resetAI();
    setShowAIPanel(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[720px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-gradient-to-r from-green-600 to-green-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Email Generated!</h2>
              <p className="text-sm text-green-100">
                {parsedBlocks?.length || 0} blocks created &middot; Review and apply
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary */}
          <div className="p-4 bg-surface-50 rounded-xl">
            <h3 className="text-sm font-semibold text-surface-700 mb-1">{response.emailTitle}</h3>
            <p className="text-xs text-surface-500">{response.emailSummary}</p>
          </div>

          {/* Subject Lines */}
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-2">Subject Line Options</label>
            <div className="space-y-2">
              {response.subjectLines.map((line, i) => (
                <button
                  key={i}
                  onClick={() => setAISelectedSubjectLine(line)}
                  className={'w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ' + (
                    aiSelectedSubjectLine === line
                      ? 'border-primary-400 bg-primary-50 text-primary-800 ring-1 ring-primary-300'
                      : 'border-surface-200 text-surface-700 hover:border-surface-300 hover:bg-surface-50'
                  )}
                >
                  <span className="font-medium">{line}</span>
                  {aiSelectedSubjectLine === line && (
                    <Check size={14} className="inline ml-2 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Texts */}
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-2">Preview Text Options</label>
            <div className="space-y-2">
              {response.previewTexts.map((text, i) => (
                <button
                  key={i}
                  onClick={() => setAISelectedPreviewText(text)}
                  className={'w-full text-left px-4 py-3 rounded-lg border transition-all text-sm ' + (
                    aiSelectedPreviewText === text
                      ? 'border-primary-400 bg-primary-50 text-primary-800 ring-1 ring-primary-300'
                      : 'border-surface-200 text-surface-700 hover:border-surface-300 hover:bg-surface-50'
                  )}
                >
                  {text}
                  {aiSelectedPreviewText === text && (
                    <Check size={14} className="inline ml-2 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Block preview */}
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-2">
              Generated Blocks ({parsedBlocks?.length || 0})
            </label>
            <div className="space-y-1.5">
              {parsedBlocks?.map((block, i) => (
                <div key={block.id} className="flex items-center gap-3 px-3 py-2 bg-surface-50 rounded-lg">
                  <span className="text-xs text-surface-400 w-5 text-right">{i + 1}</span>
                  <span className="text-sm font-medium text-surface-700 capitalize">
                    {block.type.replace(/-/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {validationWarnings.length > 0 && (
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowWarnings(!showWarnings)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 text-sm font-medium text-amber-700"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} />
                  {validationWarnings.length} Warning{validationWarnings.length > 1 ? 's' : ''}
                </div>
                <ChevronDown size={14} className={showWarnings ? 'rotate-180' : ''} />
              </button>
              {showWarnings && (
                <div className="px-4 py-3 space-y-1">
                  {validationWarnings.map((w, i) => (
                    <p key={i} className="text-xs text-amber-600">&bull; {w}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generation metadata */}
          <div className="text-xs text-surface-400 flex items-center gap-3">
            <span>Provider: {response.generationMetadata.provider}</span>
            <span>&middot;</span>
            <span>Generated: {new Date(response.generationMetadata.generatedAt).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between bg-surface-50">
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-surface-600 bg-white border border-surface-200 rounded-lg hover:bg-surface-100 transition-colors"
          >
            <RefreshCw size={14} />
            Regenerate
          </button>
          <button
            onClick={handleApply}
            disabled={!parsedBlocks || parsedBlocks.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={16} />
            Apply to Builder
          </button>
        </div>
      </div>
    </div>
  );
}
