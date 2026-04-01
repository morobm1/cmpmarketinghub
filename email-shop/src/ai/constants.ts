import type {
  AIEmailTypeOption,
  AIToneOption,
  AIAudienceOption,
  AIExamplePrompt,
  AIContentToggles,
} from '@/types/ai';

export const EMAIL_TYPE_OPTIONS: AIEmailTypeOption[] = [
  { value: 'resident-communication', label: 'Resident Communication', description: 'General updates and notices for current residents', icon: 'MessageSquare' },
  { value: 'marketing-leasing', label: 'Marketing / Leasing', description: 'Promotional emails to attract new prospects', icon: 'Megaphone' },
  { value: 'renewal-reminder', label: 'Renewal Reminder', description: 'Friendly reminders about upcoming lease renewals', icon: 'Clock' },
  { value: 'renewal-urgency', label: 'Renewal Urgency', description: 'Time-sensitive renewal action required', icon: 'AlertTriangle' },
  { value: 'event-promotion', label: 'Event Promotion', description: 'Community events, socials, and gatherings', icon: 'Calendar' },
  { value: 'rate-drop-special', label: 'Rate Drop / Special', description: 'Special pricing, limited offers, and rate changes', icon: 'TrendingDown' },
  { value: 'maintenance-notice', label: 'Maintenance Notice', description: 'Scheduled maintenance and operational updates', icon: 'Wrench' },
  { value: 'move-in-communication', label: 'Move-In Communication', description: 'Welcome and move-in instructions', icon: 'Home' },
  { value: 'waitlist-communication', label: 'Waitlist Communication', description: 'Updates for waitlisted prospects', icon: 'ListOrdered' },
  { value: 'announcement', label: 'Announcement', description: 'General community announcements', icon: 'Bell' },
  { value: 'custom', label: 'Custom', description: 'Define your own email purpose', icon: 'Edit3' },
];

export const TONE_OPTIONS: AIToneOption[] = [
  { value: 'polished-professional', label: 'Polished Professional', description: 'Clean, corporate-friendly tone' },
  { value: 'upbeat-marketing', label: 'Upbeat Marketing', description: 'Energetic and promotional' },
  { value: 'urgent-professional', label: 'Urgent but Professional', description: 'Time-sensitive with authority' },
  { value: 'warm-resident-friendly', label: 'Warm & Resident-Friendly', description: 'Approachable and community-focused' },
  { value: 'luxury-elevated', label: 'Luxury / Elevated', description: 'Premium, sophisticated feel' },
  { value: 'concise-operational', label: 'Concise Operational', description: 'Brief, clear, action-oriented' },
];

export const AUDIENCE_OPTIONS: AIAudienceOption[] = [
  { value: 'current-residents', label: 'Current Residents' },
  { value: 'prospects', label: 'Prospects' },
  { value: 'guarantors', label: 'Guarantors' },
  { value: 'waitlist-prospects', label: 'Waitlist Prospects' },
  { value: 'renewals', label: 'Renewals' },
  { value: 'student-audience', label: 'Student Audience' },
  { value: 'parents', label: 'Parents' },
  { value: 'custom', label: 'Custom Audience' },
];

export const DEFAULT_CONTENT_TOGGLES: AIContentToggles = {
  includeHeroImage: true,
  includeLogoHeader: true,
  includeCtaButton: true,
  includeFloorplanSection: false,
  includeAmenitiesSection: false,
  includeFooter: true,
  includeContactBlock: false,
  includeSocialLinks: false,
  includeTestimonial: false,
  includePromoBanner: false,
};

export const EXAMPLE_PROMPTS: AIExamplePrompt[] = [
  {
    label: 'Portal Login Issue Notice',
    prompt: 'Create a polished resident notice about temporary resident portal login issues using our brand colors and a professional tone.',
    emailType: 'resident-communication',
    audience: 'current-residents',
    tone: 'polished-professional',
  },
  {
    label: 'Rate Drop Promo',
    prompt: 'Create a leasing email promoting our limited-time rate drop for studio floorplans with urgency and a strong CTA.',
    emailType: 'rate-drop-special',
    audience: 'prospects',
    tone: 'urgent-professional',
  },
  {
    label: 'Community Event',
    prompt: "Create a resident event email promoting a community s'mores night with a warm and inviting tone.",
    emailType: 'event-promotion',
    audience: 'current-residents',
    tone: 'warm-resident-friendly',
  },
  {
    label: 'Renewal Deadline',
    prompt: 'Create a renewal reminder email that explains signatures must be completed within 2 business days to secure the renewal offer.',
    emailType: 'renewal-urgency',
    audience: 'renewals',
    tone: 'urgent-professional',
  },
  {
    label: 'Move-In Welcome',
    prompt: 'Create a warm welcome email for new residents moving in this month with move-in checklist highlights and community amenity teasers.',
    emailType: 'move-in-communication',
    audience: 'current-residents',
    tone: 'warm-resident-friendly',
  },
  {
    label: 'Leasing Marketing',
    prompt: 'Create a high-energy leasing email showcasing our best 2-bedroom floorplan with amenities, pricing, and a tour scheduling CTA.',
    emailType: 'marketing-leasing',
    audience: 'prospects',
    tone: 'upbeat-marketing',
  },
];

export const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
};
