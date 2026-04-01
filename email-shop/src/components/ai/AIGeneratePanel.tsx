import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { aiEmailGenerationService } from '@/ai/aiEmailGenerationService';
import {
  EMAIL_TYPE_OPTIONS,
  TONE_OPTIONS,
  AUDIENCE_OPTIONS,
  EXAMPLE_PROMPTS,
  DEFAULT_CONTENT_TOGGLES,
  URGENCY_LABELS,
} from '@/ai/constants';
import type { AIGenerationRequest, AIContentToggles, AIEmailType, AIAudience, AITone, AIUrgencyLevel } from '@/types/ai';
import { X, Sparkles, Wand2, ChevronDown, ChevronUp, Loader2, Lightbulb } from 'lucide-react';

export function AIGeneratePanel() {
  const setShowAIPanel = useEditorStore((s) => s.setShowAIPanel);
  const setAIStatus = useEditorStore((s) => s.setAIStatus);
  const setAIResult = useEditorStore((s) => s.setAIResult);
  const setAIRequest = useEditorStore((s) => s.setAIRequest);
  const activeBrandKit = useEditorStore((s) => s.activeBrandKit);
  const assets = useEditorStore((s) => s.assets);
  const propertyId = useEditorStore((s) => s.propertyId);
  const aiStatus = useEditorStore((s) => s.aiStatus);

  const [emailType, setEmailType] = useState<AIEmailType>('resident-communication');
  const [audience, setAudience] = useState<AIAudience>('current-residents');
  const [tone, setTone] = useState<AITone>('polished-professional');
  const [urgency, setUrgency] = useState<AIUrgencyLevel>('medium');
  const [prompt, setPrompt] = useState('');
  const [ctaPreference, setCtaPreference] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toggles, setToggles] = useState<AIContentToggles>({ ...DEFAULT_CONTENT_TOGGLES });

  const isGenerating = aiStatus === 'generating';

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const request: AIGenerationRequest = {
      propertyId,
      emailType,
      audience,
      prompt: prompt.trim(),
      tone,
      urgencyLevel: urgency,
      ctaPreference: ctaPreference.trim() || undefined,
      contentToggles: toggles,
    };

    setAIRequest(request);
    setAIStatus('generating');

    try {
      const result = await aiEmailGenerationService.generate(request, activeBrandKit, assets);
      setAIResult(result);
      setAIStatus('reviewing');
    } catch {
      setAIStatus('error');
    }
  };

  const applyExample = (example: typeof EXAMPLE_PROMPTS[0]) => {
    setPrompt(example.prompt);
    setEmailType(example.emailType);
    setAudience(example.audience);
    setTone(example.tone);
  };

  const toggleField = (key: keyof AIContentToggles) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[720px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-gradient-to-r from-primary-600 to-primary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI Email Generator</h2>
              <p className="text-sm text-primary-100">Generate a branded email draft from your prompt</p>
            </div>
          </div>
          <button onClick={() => setShowAIPanel(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Brand context banner */}
          {activeBrandKit && (
            <div className="flex items-center gap-3 p-3 bg-primary-50 rounded-xl border border-primary-100">
              <div className="flex gap-1">
                {activeBrandKit.colors.slice(0, 4).map((c) => (
                  <div key={c.id} className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c.hex }} />
                ))}
              </div>
              <span className="text-sm text-primary-700 font-medium">{activeBrandKit.propertyName} brand kit will be applied</span>
            </div>
          )}

          {/* Email Type */}
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-2">Email Type</label>
            <div className="grid grid-cols-3 gap-2">
              {EMAIL_TYPE_OPTIONS.slice(0, 9).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEmailType(opt.value)}
                  className={'px-3 py-2 rounded-lg text-xs font-medium border transition-all text-left ' + (
                    emailType === opt.value
                      ? 'border-primary-400 bg-primary-50 text-primary-700 ring-1 ring-primary-300'
                      : 'border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audience + Tone row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-2">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as AIAudience)}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as AITone)}
                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-2">Urgency Level</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high', 'critical'] as AIUrgencyLevel[]).map((level) => {
                const info = URGENCY_LABELS[level]!;
                return (
                  <button
                    key={level}
                    onClick={() => setUrgency(level)}
                    className={'px-4 py-2 rounded-lg text-xs font-medium border transition-all ' + (
                      urgency === level
                        ? info.color + ' border-current ring-1'
                        : 'border-surface-200 text-surface-500 hover:bg-surface-50'
                    )}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-2">Your Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Describe the email you want to create..."
              className="w-full px-4 py-3 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          </div>

          {/* Example prompts */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb size={14} className="text-amber-500" />
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Example Prompts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EXAMPLE_PROMPTS.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => applyExample(ex)}
                  className="text-left p-2.5 rounded-lg border border-surface-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                >
                  <div className="text-xs font-medium text-surface-700">{ex.label}</div>
                  <div className="text-xs text-surface-400 mt-0.5 line-clamp-2">{ex.prompt}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced options */}
          <div className="border border-surface-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 hover:bg-surface-100 text-sm font-medium text-surface-700"
            >
              <span>Advanced Options</span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showAdvanced && (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-1">CTA Preference</label>
                  <input
                    type="text"
                    value={ctaPreference}
                    onChange={(e) => setCtaPreference(e.target.value)}
                    placeholder="e.g., Schedule a Tour, Apply Now"
                    className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 mb-3">Content Sections</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['includeLogoHeader', 'Logo Header'],
                      ['includeHeroImage', 'Hero Image'],
                      ['includeCtaButton', 'CTA Button'],
                      ['includeFloorplanSection', 'Floor Plan'],
                      ['includeAmenitiesSection', 'Amenities'],
                      ['includePromoBanner', 'Promo Banner'],
                      ['includeTestimonial', 'Testimonial'],
                      ['includeFooter', 'Footer'],
                      ['includeContactBlock', 'Contact Block'],
                      ['includeSocialLinks', 'Social Links'],
                    ] as [keyof AIContentToggles, string][]).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={toggles[key]}
                          onChange={() => toggleField(key)}
                          className="w-4 h-4 rounded border-surface-300 text-primary-600"
                        />
                        <span className="text-sm text-surface-600">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between bg-surface-50">
          <button
            onClick={() => setShowAIPanel(false)}
            className="px-4 py-2 text-sm font-medium text-surface-500 hover:text-surface-700"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ' + (
              isGenerating
                ? 'bg-surface-200 text-surface-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-600/20'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Generate Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
