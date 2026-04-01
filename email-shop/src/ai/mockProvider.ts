import type {
  IAIEmailProvider,
  AIEnrichedRequest,
  AIGenerationResponse,
  AIGeneratedBlock,
} from '@/types/ai';

interface MockCopy {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  promoHeading?: string;
  promoSub?: string;
}

function getCopy(emailType: string, prop: string): MockCopy {
  switch (emailType) {
    case 'marketing-leasing':
      return {
        heading: 'Your New Home Awaits at ' + prop,
        body: 'Looking for the perfect place to call home? ' + prop + ' offers modern living with unmatched amenities and a vibrant community atmosphere. Tour today and discover why our residents love living here.',
        ctaLabel: 'Schedule a Tour',
        ctaUrl: '#',
        promoHeading: 'Limited Time: Reduced Rates!',
        promoSub: 'Sign before the end of the month and save.',
      };
    case 'renewal-reminder':
      return {
        heading: 'Your Lease Renewal at ' + prop,
        body: 'Your current lease is approaching its renewal date, and we would love for you to continue being part of our community. Please review your renewal options and reach out with any questions.',
        ctaLabel: 'View Renewal Options',
        ctaUrl: '#',
      };
    case 'renewal-urgency':
      return {
        heading: 'Action Required: Renewal Deadline Approaching',
        body: 'This is a reminder that your lease renewal offer must be signed within 2 business days to secure your current rate. Please log into your resident portal to complete the renewal process immediately.',
        ctaLabel: 'Sign Renewal Now',
        ctaUrl: '#',
        promoHeading: 'Do Not Miss Your Deadline',
        promoSub: 'Secure your renewal rate before it expires.',
      };
    case 'event-promotion':
      return {
        heading: 'You Are Invited! Community Event at ' + prop,
        body: 'Join us for an exciting community event! This is a great opportunity to meet your neighbors, enjoy complimentary refreshments, and have a wonderful time. Mark your calendars and RSVP today.',
        ctaLabel: 'RSVP Now',
        ctaUrl: '#',
      };
    case 'rate-drop-special':
      return {
        heading: 'Special Rate Alert at ' + prop,
        body: 'Great news! We have just reduced rates on select floor plans. This is a limited-time offer, so do not wait. Schedule a tour today to see your new home and lock in this incredible rate.',
        ctaLabel: 'View Available Units',
        ctaUrl: '#',
        promoHeading: 'Rates Just Dropped!',
        promoSub: 'Select floor plans now available at reduced rates.',
      };
    case 'maintenance-notice':
      return {
        heading: 'Scheduled Maintenance Notice',
        body: 'We want to inform you about upcoming scheduled maintenance at ' + prop + '. Please review the details below for timing and any actions you may need to take. We appreciate your patience.',
        ctaLabel: 'View Details',
        ctaUrl: '#',
      };
    case 'move-in-communication':
      return {
        heading: 'Welcome to ' + prop + '!',
        body: 'Congratulations on your new home! We are thrilled to welcome you to our community. Below you will find important move-in information and helpful resources to get you settled.',
        ctaLabel: 'Move-In Checklist',
        ctaUrl: '#',
      };
    case 'waitlist-communication':
      return {
        heading: 'Waitlist Update from ' + prop,
        body: 'Thank you for your continued interest in ' + prop + '. We wanted to provide you with an update on your waitlist status and share some exciting availability news.',
        ctaLabel: 'Check Availability',
        ctaUrl: '#',
      };
    case 'announcement':
      return {
        heading: 'Community Announcement',
        body: 'We have an important announcement to share with the ' + prop + ' community. Please take a moment to read the details below.',
        ctaLabel: 'Learn More',
        ctaUrl: '#',
      };
    default:
      return {
        heading: 'Important Update from ' + prop,
        body: 'Dear Residents, we wanted to reach out with an important update regarding your community at ' + prop + '. Please take a moment to review the information below. If you have any questions, please contact our leasing office.',
        ctaLabel: 'Contact Us',
        ctaUrl: '#',
      };
  }
}

function getSubjectLines(emailType: string, prop: string): string[] {
  switch (emailType) {
    case 'marketing-leasing':
      return [
        'Discover Your New Home at ' + prop,
        prop + ' - Tour Today & Save!',
        'Your Perfect Apartment Awaits at ' + prop,
      ];
    case 'renewal-reminder':
      return [
        'Your Lease Renewal Options Are Ready',
        'Time to Renew at ' + prop,
        'Renew Your Lease and Keep Your Home',
      ];
    case 'renewal-urgency':
      return [
        'Action Required: Renewal Deadline in 2 Days',
        'Do Not Miss Your Renewal Deadline at ' + prop,
        'Last Chance to Secure Your Renewal Rate',
      ];
    case 'event-promotion':
      return [
        'You Are Invited! Join Us at ' + prop,
        'Community Event This Week at ' + prop,
        'Save the Date: Exclusive Resident Event',
      ];
    case 'rate-drop-special':
      return [
        'Rates Just Dropped at ' + prop + '!',
        'Limited Time: Special Pricing on Select Units',
        'New Lower Rates Available Now',
      ];
    default:
      return [
        'Important Update from ' + prop,
        'News from Your Community at ' + prop,
        prop + ' Community Update',
      ];
  }
}

function getPreviewTexts(emailType: string, prop: string): string[] {
  switch (emailType) {
    case 'marketing-leasing':
      return [
        'Tour today and discover modern living at ' + prop,
        'Special move-in offers available for a limited time',
      ];
    case 'renewal-urgency':
      return [
        'Your renewal must be signed within 2 business days',
        'Act now to secure your current rate at ' + prop,
      ];
    default:
      return [
        'Important information from ' + prop,
        'Read this update from your community team',
      ];
  }
}

export class MockAIEmailProvider implements IAIEmailProvider {
  name = 'mock';

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async generate(request: AIEnrichedRequest): Promise<AIGenerationResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1500));

    const bk = request.brandKit;
    const prop = bk?.propertyName || 'Your Property';
    const primary = bk?.colors[0]?.hex || '#1e40af';
    const logoUrl = bk?.logos[0]?.sourceUrl || '';
    const heroUrl = bk?.images[0]?.sourceUrl || '';
    const contact = bk?.contactInfo;
    const btnStyle = bk?.buttonStyles[0];

    const copy = getCopy(request.emailType, prop);
    const blocks: AIGeneratedBlock[] = [];
    const warnings: string[] = [];

    // Header
    if (request.contentToggles.includeLogoHeader) {
      blocks.push({
        type: 'header',
        data: {
          style: { backgroundColor: '#ffffff', paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, textAlign: 'center' },
          visible: true,
          logoUrl: logoUrl,
          logoAlt: prop + ' Logo',
          logoWidth: 180,
          preheaderText: '',
          backgroundColor: '#ffffff',
        },
      });
      if (!logoUrl) warnings.push('No logo found in brand kit. Add a logo URL to the header block.');
    }

    // Hero image
    if (request.contentToggles.includeHeroImage) {
      blocks.push({
        type: 'hero-image',
        data: {
          style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' },
          visible: true,
          imageUrl: heroUrl,
          altText: prop + ' community',
        },
      });
      if (!heroUrl) warnings.push('No hero image found in assets. Add an image URL to the hero block.');
    }

    // Heading text
    blocks.push({
      type: 'text',
      data: {
        style: { backgroundColor: '', textColor: '#1a1a1a', paddingTop: 28, paddingBottom: 8, paddingLeft: 32, paddingRight: 32, textAlign: 'left' },
        visible: true,
        content: copy.heading,
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 1.3,
      },
    });

    // Body text
    blocks.push({
      type: 'text',
      data: {
        style: { backgroundColor: '', textColor: '#555555', paddingTop: 8, paddingBottom: 20, paddingLeft: 32, paddingRight: 32, textAlign: 'left' },
        visible: true,
        content: copy.body,
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.6,
      },
    });

    // CTA button
    if (request.contentToggles.includeCtaButton) {
      blocks.push({
        type: 'button',
        data: {
          style: { backgroundColor: '', paddingTop: 8, paddingBottom: 28, paddingLeft: 32, paddingRight: 32, textAlign: 'center' },
          visible: true,
          label: request.ctaPreference || copy.ctaLabel,
          url: copy.ctaUrl,
          backgroundColor: btnStyle?.backgroundColor || primary,
          textColor: btnStyle?.textColor || '#ffffff',
          borderRadius: btnStyle?.borderRadius ?? 6,
          fontSize: btnStyle?.fontSize ?? 16,
          fontWeight: btnStyle?.fontWeight ?? 700,
          paddingX: btnStyle?.paddingX ?? 32,
          paddingY: btnStyle?.paddingY ?? 14,
          alignment: 'center',
          fullWidth: false,
        },
      });
    }

    // Promo banner
    if (request.contentToggles.includePromoBanner && copy.promoHeading) {
      blocks.push({
        type: 'promo-banner',
        data: {
          style: { backgroundColor: '', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, textAlign: 'center' },
          visible: true,
          heading: copy.promoHeading,
          subheading: copy.promoSub || '',
          backgroundColor: primary,
          textColor: '#ffffff',
          buttonLabel: 'Learn More',
          buttonUrl: '#',
        },
      });
    }

    // Floorplan
    if (request.contentToggles.includeFloorplanSection) {
      const fpUrl = bk?.floorplans[0]?.sourceUrl || '';
      blocks.push({
        type: 'floorplan-spotlight',
        data: {
          style: { backgroundColor: '#f8fafc', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' },
          visible: true,
          heading: 'Featured Floor Plan',
          floorplanImageUrl: fpUrl,
          floorplanImageAlt: 'Floor plan layout',
          unitName: '2 Bed / 2 Bath',
          bedsBaths: '2 BD / 2 BA',
          sqft: '950',
          price: 'Starting at $1,299/mo',
          buttonLabel: 'Check Availability',
          buttonUrl: '#',
        },
      });
      if (!fpUrl) warnings.push('No floorplan image found. Add a floorplan URL.');
    }

    // Amenities
    if (request.contentToggles.includeAmenitiesSection) {
      blocks.push({
        type: 'amenities',
        data: {
          style: { backgroundColor: '', paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, textAlign: 'center' },
          visible: true,
          heading: 'Community Amenities',
          items: [
            { label: 'Pool & Spa', description: 'Resort-style pool' },
            { label: 'Fitness Center', description: '24/7 gym' },
            { label: 'Study Lounge', description: 'Quiet study spaces' },
            { label: 'Game Room', description: 'Entertainment area' },
          ],
          columns: 2,
        },
      });
    }

    // Testimonial
    if (request.contentToggles.includeTestimonial) {
      blocks.push({
        type: 'testimonial',
        data: {
          style: { backgroundColor: '#f8fafc', textColor: '#333333', paddingTop: 24, paddingBottom: 24, paddingLeft: 32, paddingRight: 32, textAlign: 'center' },
          visible: true,
          quote: 'Living here has been an amazing experience. The staff is incredibly helpful and the amenities are top-notch!',
          authorName: 'Happy Resident',
          authorTitle: 'Current Resident',
          rating: 5,
        },
      });
    }

    // Divider before footer
    blocks.push({
      type: 'divider',
      data: {
        style: { backgroundColor: '', paddingTop: 8, paddingBottom: 8, paddingLeft: 24, paddingRight: 24, textAlign: 'center' },
        visible: true,
        color: '#e2e8f0',
        thickness: 1,
        widthPercent: 90,
        lineStyle: 'solid',
      },
    });

    // Footer
    if (request.contentToggles.includeFooter) {
      blocks.push({
        type: 'footer',
        data: {
          style: { backgroundColor: '#1e293b', textColor: '#94a3b8', paddingTop: 32, paddingBottom: 32, paddingLeft: 24, paddingRight: 24, textAlign: 'center' },
          visible: true,
          companyName: prop,
          address: contact?.address || '123 Main Street, City, ST 12345',
          phone: contact?.phone || '',
          email: contact?.email || '',
          website: contact?.website || '',
          socialLinks: [],
          legalText: 'You are receiving this email because you opted in to our mailing list.',
        },
      });
    }

    return {
      subjectLines: getSubjectLines(request.emailType, prop),
      previewTexts: getPreviewTexts(request.emailType, prop),
      emailTitle: copy.heading,
      emailSummary: 'AI-generated ' + request.emailType + ' email for ' + prop,
      blocks,
      recommendedAssets: [],
      warnings,
      generationMetadata: {
        provider: 'mock',
        model: 'mock-v1',
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
