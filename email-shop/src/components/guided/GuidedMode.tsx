import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { blockDefaults } from '@/blocks/defaults';
import type { EmailBlock, EmailBlockType } from '@/types';
import { generateEmailHtml } from '@/engine/htmlGenerator';
import { defaultGlobalStyles } from '@/services/mockData';
import {
  X, ArrowRight, ArrowLeft, Check, Sparkles,
  LayoutTemplate, ImageIcon, Type, MousePointer,
  Star, ListChecks, Eye,
} from 'lucide-react';

type GuidedStep = 'purpose' | 'header' | 'hero' | 'content' | 'cta' | 'extras' | 'ending' | 'review';

const STEPS: { id: GuidedStep; label: string; icon: React.ReactNode }[] = [
  { id: 'purpose', label: 'Purpose', icon: <LayoutTemplate size={16} /> },
  { id: 'header', label: 'Header', icon: <ImageIcon size={16} /> },
  { id: 'hero', label: 'Hero Image', icon: <ImageIcon size={16} /> },
  { id: 'content', label: 'Content', icon: <Type size={16} /> },
  { id: 'cta', label: 'Call to Action', icon: <MousePointer size={16} /> },
  { id: 'extras', label: 'Extra Sections', icon: <Star size={16} /> },
  { id: 'ending', label: 'Ending', icon: <ListChecks size={16} /> },
  { id: 'review', label: 'Review', icon: <Eye size={16} /> },
];

const EMAIL_PURPOSES = [
  { value: 'marketing', label: 'Marketing / Leasing', desc: 'Attract new prospects and fill vacancies' },
  { value: 'resident', label: 'Resident Communication', desc: 'Updates, notices, and information for current residents' },
  { value: 'renewal', label: 'Lease Renewal', desc: 'Renewal reminders and offers' },
  { value: 'event', label: 'Event Promotion', desc: 'Community events, socials, gatherings' },
  { value: 'maintenance', label: 'Maintenance / Operations', desc: 'Scheduled maintenance, operational updates' },
  { value: 'welcome', label: 'Welcome / Move-In', desc: 'New resident welcome and move-in info' },
  { value: 'special', label: 'Rate Drop / Special Offer', desc: 'Limited-time pricing, promotions' },
  { value: 'newsletter', label: 'Newsletter / Update', desc: 'Monthly updates, community news' },
];

interface GuidedState {
  purpose: string;
  headerColor: string;
  headerLogoUrl: string;
  includeHero: boolean;
  heroImageUrl: string;
  headingText: string;
  bodyText: string;
  headingColor: string;
  includeButton: boolean;
  buttonLabel: string;
  buttonUrl: string;
  buttonColor: string;
  buttonTextColor: string;
  includeAmenities: boolean;
  includeFloorplan: boolean;
  includeTestimonial: boolean;
  includePromo: boolean;
  promoHeading: string;
  promoSubheading: string;
  promoColor: string;
  endingBarColor: string;
}

const initialState: GuidedState = {
  purpose: '',
  headerColor: '#1e40af',
  headerLogoUrl: '',
  includeHero: true,
  heroImageUrl: '',
  headingText: '',
  bodyText: '',
  headingColor: '#1a1a1a',
  includeButton: true,
  buttonLabel: 'Learn More',
  buttonUrl: '#',
  buttonColor: '#1e40af',
  buttonTextColor: '#ffffff',
  includeAmenities: false,
  includeFloorplan: false,
  includeTestimonial: false,
  includePromo: false,
  promoHeading: 'Special Offer!',
  promoSubheading: 'Limited time only.',
  promoColor: '#1e40af',
  endingBarColor: '#1e40af',
};

export function GuidedMode() {
  const setShowGuidedMode = useEditorStore((s) => s.setShowGuidedMode);
  const setProject = useEditorStore((s) => s.setProject);
  const setView = useEditorStore((s) => s.setView);
  const activeBrandKit = useEditorStore((s) => s.activeBrandKit);

  const [currentStep, setCurrentStep] = useState<GuidedStep>('purpose');
  const [state, setState] = useState<GuidedState>(() => {
    const s = { ...initialState };
    if (activeBrandKit) {
      const primary = activeBrandKit.colors[0]?.hex;
      if (primary) {
        s.headerColor = primary;
        s.buttonColor = primary;
        s.promoColor = primary;
        s.endingBarColor = primary;
      }
      if (activeBrandKit.logos[0]) {
        s.headerLogoUrl = activeBrandKit.logos[0].sourceUrl;
      }
      if (activeBrandKit.images[0]) {
        s.heroImageUrl = activeBrandKit.images[0].sourceUrl;
      }
    }
    return s;
  });

  const update = (partial: Partial<GuidedState>) => setState((prev) => ({ ...prev, ...partial }));

  const stepIdx = STEPS.findIndex((s) => s.id === currentStep);
  const canNext = stepIdx < STEPS.length - 1;
  const canPrev = stepIdx > 0;

  const goNext = () => { if (canNext) setCurrentStep(STEPS[stepIdx + 1]!.id); };
  const goPrev = () => { if (canPrev) setCurrentStep(STEPS[stepIdx - 1]!.id); };

  const buildBlocks = (): EmailBlock[] => {
    const blocks: EmailBlock[] = [];
    let id = 0;
    const bid = () => 'guided-' + (++id);
    const base = (bg?: string) => ({ backgroundColor: bg || '', paddingTop: 16, paddingBottom: 16, paddingLeft: 32, paddingRight: 32, textAlign: 'center' as const });

    // Header
    blocks.push({ id: bid(), type: 'header', data: { ...(blockDefaults['header'] as any), style: { ...base(state.headerColor) }, logoUrl: state.headerLogoUrl, logoAlt: 'Logo', logoWidth: 180, backgroundColor: state.headerColor } });

    // Hero
    if (state.includeHero) {
      blocks.push({ id: bid(), type: 'hero-image', data: { ...(blockDefaults['hero-image'] as any), imageUrl: state.heroImageUrl, altText: 'Email banner' } });
    }

    // Heading
    if (state.headingText) {
      blocks.push({ id: bid(), type: 'text', data: { ...(blockDefaults['text'] as any), style: { ...base(), textAlign: 'left', textColor: state.headingColor }, content: state.headingText, fontSize: 24, fontWeight: 700, lineHeight: 1.3 } });
    }

    // Body
    if (state.bodyText) {
      blocks.push({ id: bid(), type: 'text', data: { ...(blockDefaults['text'] as any), style: { ...base(), textAlign: 'left', textColor: '#555555', paddingTop: 8 }, content: state.bodyText, fontSize: 15, fontWeight: 400, lineHeight: 1.7 } });
    }

    // CTA Button
    if (state.includeButton) {
      blocks.push({ id: bid(), type: 'button', data: { ...(blockDefaults['button'] as any), style: { ...base() }, label: state.buttonLabel, url: state.buttonUrl, backgroundColor: state.buttonColor, textColor: state.buttonTextColor } });
    }

    // Promo Banner
    if (state.includePromo) {
      blocks.push({ id: bid(), type: 'promo-banner', data: { ...(blockDefaults['promo-banner'] as any), heading: state.promoHeading, subheading: state.promoSubheading, backgroundColor: state.promoColor, textColor: '#ffffff' } });
    }

    // Amenities
    if (state.includeAmenities) {
      blocks.push({ id: bid(), type: 'amenities', data: { ...(blockDefaults['amenities'] as any) } });
    }

    // Floorplan
    if (state.includeFloorplan) {
      blocks.push({ id: bid(), type: 'floorplan-spotlight', data: { ...(blockDefaults['floorplan-spotlight'] as any) } });
    }

    // Testimonial
    if (state.includeTestimonial) {
      blocks.push({ id: bid(), type: 'testimonial', data: { ...(blockDefaults['testimonial'] as any) } });
    }

    // End bar
    blocks.push({ id: bid(), type: 'color-bar', data: { ...(blockDefaults['color-bar'] as any), color: state.endingBarColor } });

    return blocks;
  };

  const handleApply = () => {
    const blocks = buildBlocks();
    const purposeLabel = EMAIL_PURPOSES.find((p) => p.value === state.purpose)?.label || 'Custom';
    setProject({
      blocks,
      globalStyles: { ...defaultGlobalStyles },
      name: purposeLabel + ' Email',
    } as any);
    setShowGuidedMode(false);
    setView('builder');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Guided Email Builder</h2>
              <p className="text-sm text-emerald-100">Step {stepIdx + 1} of {STEPS.length}: {STEPS[stepIdx]?.label}</p>
            </div>
          </div>
          <button onClick={() => setShowGuidedMode(false)} className="p-2 rounded-lg hover:bg-white/10 text-white/80">
            <X size={20} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex px-6 py-3 border-b border-surface-100 bg-surface-50 gap-1">
          {STEPS.map((step, i) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ' + (
                i === stepIdx
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                  : i < stepIdx
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-surface-100 text-surface-400'
              )}
            >
              {i < stepIdx ? <Check size={10} /> : step.icon}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 'purpose' && (
            <StepPurpose value={state.purpose} onChange={(v) => update({ purpose: v })} />
          )}
          {currentStep === 'header' && (
            <StepHeader state={state} update={update} />
          )}
          {currentStep === 'hero' && (
            <StepHero state={state} update={update} />
          )}
          {currentStep === 'content' && (
            <StepContent state={state} update={update} />
          )}
          {currentStep === 'cta' && (
            <StepCTA state={state} update={update} />
          )}
          {currentStep === 'extras' && (
            <StepExtras state={state} update={update} />
          )}
          {currentStep === 'ending' && (
            <StepEnding state={state} update={update} />
          )}
          {currentStep === 'review' && (
            <StepReview blocks={buildBlocks()} />
          )}
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between bg-surface-50">
          <button
            onClick={goPrev}
            disabled={!canPrev}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-surface-500 hover:text-surface-700 disabled:opacity-30"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex gap-2">
            {currentStep === 'review' ? (
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
              >
                <Check size={16} /> Build My Email
              </button>
            ) : (
              <button
                onClick={goNext}
                disabled={!canNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                Next <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Step Components ----

function StepPurpose({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-surface-800 mb-2">What kind of email are you creating?</h3>
      <p className="text-sm text-surface-500 mb-5">Select the purpose that best matches your email. This helps us suggest the right structure.</p>
      <div className="grid grid-cols-2 gap-3">
        {EMAIL_PURPOSES.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={'w-full text-left p-4 rounded-xl border-2 transition-all ' + (
              value === p.value
                ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300'
                : 'border-surface-200 hover:border-surface-300 hover:bg-surface-50'
            )}
          >
            <div className="text-sm font-semibold text-surface-800">{p.label}</div>
            <div className="text-xs text-surface-500 mt-0.5">{p.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepHeader({ state, update }: { state: GuidedState; update: (p: Partial<GuidedState>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-surface-800">Email Header</h3>
      <p className="text-sm text-surface-500">Set up your header with your property logo and brand color.</p>
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Header Background Color</label>
        <div className="flex items-center gap-2">
          <input type="color" value={state.headerColor} onChange={(e) => update({ headerColor: e.target.value })} className="w-10 h-10 rounded border p-0 cursor-pointer" />
          <input type="text" value={state.headerColor} onChange={(e) => update({ headerColor: e.target.value })} className="px-3 py-2 text-sm border border-surface-200 rounded-lg font-mono w-32" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Logo Image URL</label>
        <input type="text" value={state.headerLogoUrl} onChange={(e) => update({ headerLogoUrl: e.target.value })} placeholder="https://entrata-hosted-url..." className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
        {state.headerLogoUrl && <img src={state.headerLogoUrl} alt="Logo preview" className="mt-2 max-h-16 object-contain" />}
      </div>
      {/* Preview */}
      <div className="rounded-lg overflow-hidden border border-surface-200">
        <div style={{ backgroundColor: state.headerColor, padding: '20px', textAlign: 'center' }}>
          {state.headerLogoUrl ? <img src={state.headerLogoUrl} alt="Logo" style={{ maxWidth: 180, margin: '0 auto' }} /> : <span className="text-white/60 text-sm">Your logo here</span>}
        </div>
      </div>
    </div>
  );
}

function StepHero({ state, update }: { state: GuidedState; update: (p: Partial<GuidedState>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-surface-800">Hero Image</h3>
      <p className="text-sm text-surface-500">A hero image grabs attention at the top of your email.</p>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={state.includeHero} onChange={(e) => update({ includeHero: e.target.checked })} className="w-5 h-5 rounded text-emerald-600" />
        <span className="text-sm font-medium text-surface-700">Include a hero image</span>
      </label>
      {state.includeHero && (
        <div>
          <label className="block text-xs font-medium text-surface-500 mb-1">Hero Image URL</label>
          <input type="text" value={state.heroImageUrl} onChange={(e) => update({ heroImageUrl: e.target.value })} placeholder="https://entrata-hosted-url..." className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
          {state.heroImageUrl && <img src={state.heroImageUrl} alt="Hero preview" className="mt-2 w-full max-h-48 object-cover rounded-lg" />}
        </div>
      )}
    </div>
  );
}

function StepContent({ state, update }: { state: GuidedState; update: (p: Partial<GuidedState>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-surface-800">Email Content</h3>
      <p className="text-sm text-surface-500">Write your main heading and body message.</p>
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Heading</label>
        <input type="text" value={state.headingText} onChange={(e) => update({ headingText: e.target.value })} placeholder="e.g., Welcome to Your New Home!" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Heading Color</label>
        <div className="flex gap-2">
          <input type="color" value={state.headingColor} onChange={(e) => update({ headingColor: e.target.value })} className="w-8 h-8 rounded border p-0" />
          <input type="text" value={state.headingColor} onChange={(e) => update({ headingColor: e.target.value })} className="px-2 py-1 text-sm border border-surface-200 rounded font-mono w-28" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Body Text</label>
        <textarea value={state.bodyText} onChange={(e) => update({ bodyText: e.target.value })} rows={5} placeholder="Write your main email message here..." className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg resize-y" />
      </div>
    </div>
  );
}

function StepCTA({ state, update }: { state: GuidedState; update: (p: Partial<GuidedState>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-surface-800">Call to Action</h3>
      <p className="text-sm text-surface-500">Add a button to drive your reader to take action.</p>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={state.includeButton} onChange={(e) => update({ includeButton: e.target.checked })} className="w-5 h-5 rounded text-emerald-600" />
        <span className="text-sm font-medium text-surface-700">Include a CTA button</span>
      </label>
      {state.includeButton && (
        <>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Button Label</label>
            <input type="text" value={state.buttonLabel} onChange={(e) => update({ buttonLabel: e.target.value })} className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 mb-1">Button URL</label>
            <input type="text" value={state.buttonUrl} onChange={(e) => update({ buttonUrl: e.target.value })} placeholder="https://" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Button Color</label>
              <div className="flex gap-2">
                <input type="color" value={state.buttonColor} onChange={(e) => update({ buttonColor: e.target.value })} className="w-8 h-8 rounded border p-0" />
                <input type="text" value={state.buttonColor} onChange={(e) => update({ buttonColor: e.target.value })} className="flex-1 px-2 py-1 text-sm border border-surface-200 rounded font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 mb-1">Text Color</label>
              <div className="flex gap-2">
                <input type="color" value={state.buttonTextColor} onChange={(e) => update({ buttonTextColor: e.target.value })} className="w-8 h-8 rounded border p-0" />
                <input type="text" value={state.buttonTextColor} onChange={(e) => update({ buttonTextColor: e.target.value })} className="flex-1 px-2 py-1 text-sm border border-surface-200 rounded font-mono" />
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="text-center pt-2">
            <span style={{ backgroundColor: state.buttonColor, color: state.buttonTextColor, padding: '12px 28px', borderRadius: 6, fontSize: 14, fontWeight: 700, display: 'inline-block' }}>
              {state.buttonLabel || 'Button'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function StepExtras({ state, update }: { state: GuidedState; update: (p: Partial<GuidedState>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-surface-800">Extra Sections</h3>
      <p className="text-sm text-surface-500">Add optional sections to enrich your email. You can edit details after building.</p>
      <div className="space-y-3">
        <ToggleCard label="Promo Banner" desc="Highlighted promotional section with bold text" checked={state.includePromo} onChange={(v) => update({ includePromo: v })} />
        {state.includePromo && (
          <div className="pl-8 space-y-2 pb-2">
            <input type="text" value={state.promoHeading} onChange={(e) => update({ promoHeading: e.target.value })} placeholder="Promo heading" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
            <input type="text" value={state.promoSubheading} onChange={(e) => update({ promoSubheading: e.target.value })} placeholder="Promo subheading" className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg" />
            <div className="flex gap-2 items-center">
              <input type="color" value={state.promoColor} onChange={(e) => update({ promoColor: e.target.value })} className="w-8 h-8 rounded border p-0" />
              <span className="text-xs text-surface-400">Banner color</span>
            </div>
          </div>
        )}
        <ToggleCard label="Community Amenities" desc="Grid of amenities with descriptions" checked={state.includeAmenities} onChange={(v) => update({ includeAmenities: v })} />
        <ToggleCard label="Floor Plan Spotlight" desc="Featured floor plan with pricing and details" checked={state.includeFloorplan} onChange={(v) => update({ includeFloorplan: v })} />
        <ToggleCard label="Resident Testimonial" desc="Quote from a happy resident with star rating" checked={state.includeTestimonial} onChange={(v) => update({ includeTestimonial: v })} />
      </div>
    </div>
  );
}

function StepEnding({ state, update }: { state: GuidedState; update: (p: Partial<GuidedState>) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-surface-800">Email Ending</h3>
      <p className="text-sm text-surface-500">Choose the color for the ending bar. Entrata will add its own footer below.</p>
      <div>
        <label className="block text-xs font-medium text-surface-500 mb-1">Ending Bar Color</label>
        <div className="flex gap-2 items-center">
          <input type="color" value={state.endingBarColor} onChange={(e) => update({ endingBarColor: e.target.value })} className="w-10 h-10 rounded border p-0 cursor-pointer" />
          <input type="text" value={state.endingBarColor} onChange={(e) => update({ endingBarColor: e.target.value })} className="px-3 py-2 text-sm border border-surface-200 rounded-lg font-mono w-32" />
        </div>
      </div>
      <div className="rounded-lg overflow-hidden border border-surface-200">
        <div style={{ backgroundColor: state.endingBarColor, height: 8 }} />
      </div>
    </div>
  );
}

function StepReview({ blocks }: { blocks: EmailBlock[] }) {
  const html = generateEmailHtml(blocks, defaultGlobalStyles);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-surface-800">Review Your Email</h3>
      <p className="text-sm text-surface-500">Here is a preview of your email. Click "Build My Email" to load it into the editor where you can fine-tune everything.</p>
      <div className="bg-surface-200 rounded-xl p-4 flex justify-center">
        <iframe srcDoc={html} className="w-[600px] min-h-[500px] bg-white shadow-lg rounded-lg border-0" title="Email preview" sandbox="allow-same-origin" />
      </div>
      <p className="text-xs text-surface-400 text-center">{blocks.length} blocks generated. You can edit all content after building.</p>
    </div>
  );
}

function ToggleCard({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ' + (
      checked ? 'border-emerald-400 bg-emerald-50' : 'border-surface-200 hover:border-surface-300'
    )}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-5 h-5 rounded text-emerald-600 mt-0.5" />
      <div>
        <div className="text-sm font-semibold text-surface-800">{label}</div>
        <div className="text-xs text-surface-500">{desc}</div>
      </div>
    </label>
  );
}
