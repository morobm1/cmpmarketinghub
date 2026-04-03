export interface CTACategory {
  id: string;
  name: string;
  reason: string;
  best_use: string[];
  ctas: string[];
}

export interface CTAFormula {
  name: string;
  reason: string;
  examples: string[];
}

export interface CTALibrary {
  categories: CTACategory[];
  formulas: CTAFormula[];
  power_words: { action_words: string[]; emotion_value_words: string[]; urgency_words: string[] };
  top_25: string[];
  best_by_channel: Record<string, string[]>;
}

export type FunnelStage = 'awareness' | 'consideration' | 'conversion' | 'retention' | 'sold_out_or_limited';
export type Audience = 'students' | 'parents' | 'current_residents' | 'friend_groups';
export type Channel = 'email_button' | 'email_body_link' | 'landing_page' | 'paid_ad' | 'social' | 'booth_or_flyer' | 'sms';

const FUNNEL_MAP: Record<FunnelStage, string[]> = {
  awareness: ['lifestyle_brand', 'location', 'amenity', 'social_media'],
  consideration: ['tour', 'virtual_tour', 'floorplan', 'contact_lead_capture'],
  conversion: ['apply_conversion', 'urgency_fomo', 'rate_special_promo', 'email_buttons'],
  retention: ['renewal_retention'],
  sold_out_or_limited: ['urgency_fomo', 'waitlist'],
};

const AUDIENCE_MAP: Record<Audience, string[]> = {
  students: ['general_leasing', 'tour', 'floorplan', 'amenity', 'location', 'lifestyle_brand', 'modern_student_housing'],
  parents: ['parent', 'contact_lead_capture', 'location', 'general_leasing'],
  current_residents: ['renewal_retention', 'roommate_group'],
  friend_groups: ['roommate_group', 'floorplan'],
};

const CHANNEL_MAP: Record<Channel, string[]> = {
  email_button: ['email_buttons', 'apply_conversion', 'tour', 'renewal_retention'],
  email_body_link: ['general_leasing', 'contact_lead_capture', 'virtual_tour', 'floorplan'],
  landing_page: ['general_leasing', 'tour', 'apply_conversion', 'location', 'amenity', 'lifestyle_brand'],
  paid_ad: ['urgency_fomo', 'tour', 'rate_special_promo', 'general_leasing'],
  social: ['social_media', 'modern_student_housing', 'lifestyle_brand'],
  booth_or_flyer: ['event_tabling', 'urgency_fomo', 'email_buttons'],
  sms: ['sms'],
};

export const ctaLibrary: CTALibrary = {
  categories: [
    { id: 'general_leasing', name: 'General Leasing', reason: 'Flexible CTAs for broad leasing interest, early-to-mid funnel.', best_use: ['website hero', 'email buttons', 'paid ads', 'ILS', 'property landing pages'], ctas: ['Apply Now', 'Lease Now', 'Sign Today', 'Start Your Application', 'Secure Your Spot', 'Reserve Your Space', 'Reserve Your Bed', 'Claim Your Room', 'Claim Your Space', 'Lock In Your Rate', 'Lock In Your Spot', 'Find Your Floorplan', 'Choose Your Floorplan', 'Pick Your Room', 'Pick Your Space', 'Find Your Home', 'Find Your Next Home', 'Make Your Move', 'Make Your Next Move', 'Live Here', 'Live Better', 'Lease Your Lifestyle', 'Get Started Today', "Don't Wait. Apply Today", 'Your Next Home Starts Here', 'Prelease Today', 'Prelease Your Spot', 'Join the Community', 'Move In With Us', 'Get Leasing', 'Start Living Here', 'Your Space Is Waiting', "Let's Get You Moved In"] },
    { id: 'urgency_fomo', name: 'Urgency / FOMO', reason: 'Drive action when availability is tight or deadlines near.', best_use: ['low inventory campaigns', 'deadline pushes', 'last chance emails', 'retargeting ads'], ctas: ["Apply Before It's Gone", 'Limited Spaces Left', 'Spots Are Filling Fast', 'Act Fast', "Don't Miss Out", "Secure Your Spot Before It's Gone", 'Last Chance to Lease', 'Final Spaces Available', 'Only a Few Spots Left', 'Limited Availability', 'Rooms Going Fast', "Rates Won't Last", "Lock In Today's Rate", 'Lease Before Rates Increase', 'Grab Your Spot Now', 'Time Is Running Out', 'Deadline Approaching', 'Beat the Rush', 'Get In Before Fall', 'Reserve Before Sell Out', "Don't Get Left Searching", 'Get Ahead of the Crowd', "This Floorplan Won't Last", 'Move Fast on This One', "Now Leasing. Don't Wait", "Sign Before It's Too Late", "Your Spot Won't Wait", 'Apply While Availability Lasts'] },
    { id: 'tour', name: 'Tour', reason: 'Middle-funnel — moves prospects from browsing to active consideration.', best_use: ['website', 'paid social', 'Google ads', 'retargeting', 'follow-up emails'], ctas: ['Schedule a Tour', 'Book a Tour', 'Tour Today', 'Tour Now', 'Schedule Your Visit', 'Come See It for Yourself', 'Take a Look Inside', 'Visit Us Today', 'Plan Your Tour', 'Tour Your Future Home', 'Book Your Spot on a Tour', 'See the Space', 'See Why Students Choose Us', 'Walk the Property', 'Tour in Person', 'Tour With Our Team', 'Experience the Community', 'Preview Your Next Home', 'Explore the Property', 'Tour Before You Lease', 'Stop By and Tour', 'Schedule a Personalized Tour', 'Find Your Fit. Tour Today', 'See It. Love It. Lease It', 'Come Home for a Tour'] },
    { id: 'virtual_tour', name: 'Virtual Tour / Online', reason: 'For out-of-state, international, or digital-first prospects.', best_use: ['virtual tour pages', 'international campaigns', 'out-of-market emails'], ctas: ['Take a Virtual Tour', 'Tour From Anywhere', 'Explore Online', 'View the Property', 'Walk Through Online', 'See Your Space Virtually', 'Start Your Search Online', 'Explore Our Floorplans', 'Browse Available Options', 'Tour Without Leaving Home', 'Get the Full Look Online', 'View Amenities and Floorplans', 'Explore Every Corner', 'See What Life Looks Like Here', 'Check Out the Community', 'Start Your Tour Now', 'Visit Virtually', 'Take the Online Tour', 'Find Your Space From Anywhere'] },
    { id: 'apply_conversion', name: 'Apply / Conversion', reason: 'Bottom-of-funnel — for prospects ready to complete application.', best_use: ['application reminder emails', 'abandoned app follow-up', 'landing page buttons'], ctas: ['Start Your Application', 'Complete Your Application', 'Finish Applying Today', 'Apply in Minutes', 'Take the Next Step', 'Submit Your Application', 'Get One Step Closer', 'Secure Your Lease Today', 'Take the First Step Home', 'Start Your Leasing Journey', 'Ready to Apply?', 'Apply for Your Favorite Floorplan', 'Apply Before Availability Changes', 'Complete Your Lease Online', 'Make It Official', 'Make Your Next Move Official', 'Finish What You Started', 'Continue Your Application', 'Finalize Your Spot', 'Save Your Space Today'] },
    { id: 'rate_special_promo', name: 'Rate / Special / Promo', reason: 'When price, perks, or limited-time offers are the hook.', best_use: ['special offer emails', 'promo banners', 'rate-drop campaigns', 'social ads'], ctas: ['Lock In Special Pricing', 'Get the Best Rate', 'Save Your Spot and Save Money', 'Claim This Limited-Time Offer', 'Lease and Save', 'Sign Now for Special Rates', 'Secure Your Deal Today', 'Get This Offer Before It Ends', 'Apply Now to Unlock Savings', "Don't Miss This Leasing Special", 'Limited-Time Leasing Offer', 'Score Big Savings', 'Get the Rate While It Lasts', 'Move In for Less', 'Grab This Special', 'Save on Your Next Move', 'Get More for Your Rate', 'Lock In Your Discount', 'Apply Today for Exclusive Savings', 'Tour Today, Save Today'] },
    { id: 'waitlist', name: 'Waitlist', reason: 'Keep demand alive when floorplans are sold out.', best_use: ['sold out pages', 'limited inventory emails'], ctas: ['Join the Waitlist', 'Add Yourself to the Waitlist', 'Save Your Place in Line', 'Get Notified When a Spot Opens', 'Be First to Know', 'Stay in the Loop', "Don't Miss the Next Opening", 'Get on the List', 'Join the Interest List', 'Reserve Your Place on the Waitlist', 'Be Ready When a Room Opens', 'Get First Access to Availability', 'Want In? Join the Waitlist', 'Hold Your Place in Line', 'Stay Ready for Openings'] },
    { id: 'contact_lead_capture', name: 'Contact / Lead Capture', reason: 'Lower friction for interested but not-ready prospects.', best_use: ['contact pages', 'chat prompts', 'soft-conversion campaigns'], ctas: ['Contact Us', 'Get in Touch', 'Message Us Today', 'Text Us Now', 'Call Our Team', 'Send Us a Message', 'Ask a Question', "Let's Chat", 'Connect With Leasing', 'Talk to Our Team', 'Need Help Finding a Fit?', 'Reach Out Today', "We're Here to Help", 'Connect With a Leasing Specialist', 'Get Your Questions Answered', 'Start the Conversation', 'Ask About Availability', 'Ask About Rates', 'Ask About Move-In Options', 'Get Leasing Help Today'] },
    { id: 'floorplan', name: 'Floorplan-Focused', reason: 'When room type or layout is the main decision driver.', best_use: ['floorplan pages', 'unit-specific campaigns', 'comparison tools'], ctas: ['Find Your Floorplan', 'Explore Floorplans', 'Compare Floorplans', 'Pick Your Perfect Layout', 'Discover Your Ideal Floorplan', 'Choose the Right Fit', 'See What Fits Your Style', 'Browse Available Floorplans', 'Find the Space That Fits You', 'View Available Layouts', 'Check Out Our 2 Bedrooms', 'Explore Studio Options', 'Find Your Private Bedroom', 'Choose Your Room Type', 'Find the Layout for Your Lifestyle', 'Discover Apartment Options', 'Pick the Plan That Works for You'] },
    { id: 'amenity', name: 'Amenity-Focused', reason: 'When features and lifestyle differentiation are key.', best_use: ['amenity spotlights', 'website modules', 'social creative'], ctas: ['See Everything Included', 'Explore the Amenities', 'Discover Student-Friendly Perks', 'Live With More', 'Upgrade Your Everyday', 'See What Comes With It', 'Check Out Community Perks', 'Experience Better Student Living', 'Explore What Sets Us Apart', 'Discover Your New Favorite Amenity', 'Tour the Amenities', 'Live Where It All Comes Together', 'Find Your Routine Here', 'Study, Relax, Recharge', 'Live Close to What Matters', 'See the Difference Amenities Make'] },
    { id: 'location', name: 'Location-Focused', reason: 'When proximity to campus is the strongest selling point.', best_use: ['location pages', 'map modules', 'Google ads'], ctas: ['Live Close to Campus', 'Walk to Class', 'Stay Near Everything', 'Live Steps From Campus', 'Make Your Commute Easy', 'Be Near What Matters', 'Put Yourself in the Center of It All', 'Live Near Campus, Food, and Fun', 'Stay Connected to Campus Life', 'Find Your Place Near It All', 'Live in the Right Location', 'Keep Campus Within Reach', 'Be Close to Class and Community', 'Live Where Students Want to Be', 'Make Campus Access Easy'] },
    { id: 'lifestyle_brand', name: 'Lifestyle / Brand', reason: 'Emotional, aspirational CTAs for brand-forward campaigns.', best_use: ['brand campaigns', 'hero banners', 'social content'], ctas: ['Live Your Best Student Life', 'Love Where You Live', 'Live the College Experience', 'Step Into Student Living', 'Build Your Routine Here', 'Start Fresh Here', 'Live Smarter', 'Live More Comfortably', 'Create Your College Home', 'Find Your Community', 'Make This Your Place', 'Feel at Home Here', 'Start Your Next Chapter Here', 'Live Where You Belong', 'Make Room for What Matters', 'Live With Confidence', 'Choose Better Student Living', 'Your College Home Starts Here', 'Live Well. Study Well. Stay Well', 'Find Your Vibe Here'] },
    { id: 'parent', name: 'Parent-Focused', reason: 'For parents influencing housing decisions — safety, value, convenience.', best_use: ['parent emails', 'family landing pages', 'orientation campaigns'], ctas: ['Give Your Student a Great Place to Live', 'Explore a Student-Focused Community', 'Find a Place Designed for Student Success', 'Support Their Next Chapter', 'Learn More About Student Living Options', 'Help Your Student Find the Right Fit', 'Explore Safe, Convenient Living', 'See Why Families Choose Us', 'Find Peace of Mind Near Campus', 'Learn About Individual Leasing Options', 'Talk With Our Team Today', 'Explore Flexible Housing Options', 'Help Them Feel at Home', 'Start Planning for Move-In', 'Find a Community Built for Students'] },
    { id: 'renewal_retention', name: 'Renewal / Retention', reason: 'For current residents during renewal season.', best_use: ['renewal campaigns', 'resident emails', 'text reminders'], ctas: ['Renew Today', 'Lock In Your Renewal', 'Keep Your Spot', 'Stay Another Year', 'Renew and Save', 'Secure Your Space for Next Year', "Don't Lose Your Room", 'Renew Before Rates Change', 'Renew Early for the Best Options', 'Keep Living With Us', 'Love It Here? Stay Here', 'Stay Close to What You Love', 'Make Next Year Easy', 'Re-sign Today', 'Return With Confidence', 'Renew Your Lease Today', 'Keep Your Community, Keep Your Space', 'Stay Put for Another Great Year'] },
    { id: 'roommate_group', name: 'Roommate / Group', reason: 'When roommate matching or friend-group leasing matters.', best_use: ['shared unit campaigns', 'roommate match pages', 'group leasing push'], ctas: ['Sign With Your Roommates', 'Find Your Roommate Match', 'Bring Your Group', 'Lease Together', 'Pick Your Roommates', 'Find the Right Room Setup', 'Match With Roommates', 'Start Your Search With Friends', 'Build Your Ideal Living Setup', 'Lock In Your Group Housing', 'Choose Your Crew, Choose Your Space', 'Grab a Spot With Friends', 'Plan Your Next Year Together', 'Find a Layout for Your Group'] },
    { id: 'social_media', name: 'Social Media', reason: 'Short, fast, casual — for scrolling social users.', best_use: ['Instagram', 'stories', 'TikTok', 'Reels', 'short-form ads'], ctas: ['Tap to Tour', 'Tap to Apply', 'DM Us', 'Message Us', 'Send Us a DM', 'Tour It', 'Claim It', 'See More', 'Learn More', 'Check It Out', 'Snag Your Spot', "Don't Wait", 'Come See Us', 'Ready to Move?', "Let's Get You Leased", 'Your New Place Is Calling', 'This Could Be Home', 'Start Here', 'Tour. Apply. Move In', 'Link in Bio to Lease'] },
    { id: 'event_tabling', name: 'Event / Housing Fair', reason: 'Face-to-face student engagement and real-time conversion.', best_use: ['housing fairs', 'tabling events', 'orientation', 'print signage'], ctas: ['Stop By Our Booth', 'Come Meet the Team', 'Ask About Availability', 'Tour and Apply Today', 'Spin to Win', 'Enter to Win', 'Learn More About Living Here', 'Grab Pricing and Availability', 'Ask About Leasing Specials', 'Scan to Tour', 'Scan to Apply', 'Check Out Our Floorplans', "Let's Find Your Fit", 'Start Your Housing Search Here', 'Get the Info You Need', 'Explore Your Options Today', 'Talk Housing With Us', 'Ready to Find Your Place?'] },
    { id: 'sms', name: 'Text Message', reason: 'Short, direct SMS CTAs prioritizing speed and clarity.', best_use: ['text follow-up', 'lead nurturing', 'tour reminders'], ctas: ['Apply now', 'Tour today', 'Want pricing? Reply here', "Ready to lease? Let's do it", 'Schedule your tour', 'Grab your spot now', 'Want to see availability?', 'Let us help you find a fit', 'Secure your room today', "Don't miss this special", 'Reply to book a tour', 'Ask about current rates', 'Start your app today', 'Want the next step? Text us', "Let's get you moved in"] },
    { id: 'email_buttons', name: 'Email Button CTAs', reason: 'Button-safe phrases for email layouts.', best_use: ['HTML email buttons', 'Entrata Message Center', 'drip campaigns'], ctas: ['Apply Now', 'Schedule a Tour', 'View Floorplans', 'Check Availability', 'Claim Your Spot', 'Lease Today', 'Explore Amenities', 'Contact Our Team', 'Start Your Application', 'Tour Virtually', 'See Current Rates', 'Join the Waitlist', 'Renew Now', 'View Specials', 'Find Your Floorplan', 'Get More Info', 'Compare Options', 'Reserve Your Bed'] },
    { id: 'modern_student_housing', name: 'Modern Student Housing', reason: 'Brand-friendly, student-housing specific CTAs for premium creative.', best_use: ['brand campaigns', 'modern websites', 'premium emails', 'hero sections'], ctas: ['Find Your Space', 'Claim Your Spot', 'Lock In Your Room', 'Tour Your Future Home', 'Start Your Next Chapter', 'Live Close. Live Easy', 'Step Into Better Student Living', 'Make Your Move', 'See Why Students Choose Us', 'Find the Floorplan That Fits', 'Your College Home Starts Here', 'Live Where You Want to Be', 'Start Here. Stay Here', 'This Is Student Living', 'Lease the Lifestyle', 'Get Closer to Campus', 'Make It Official', 'Find Your Fit', 'Live Ready', 'Room for What Matters'] },
  ],
  formulas: [
    { name: 'Action + urgency', reason: 'Immediate action, reduce hesitation.', examples: ['Apply Today', 'Tour Now', 'Sign Before Rates Increase'] },
    { name: 'Action + benefit', reason: 'Explains why the action matters.', examples: ['Tour to See Why Students Choose Us', 'Apply to Lock In Your Rate', 'Renew to Keep Your Spot'] },
    { name: 'Action + emotional outcome', reason: 'Aspirational for lifestyle campaigns.', examples: ["Find the Place You'll Love Coming Home To", 'Start Your Next Chapter', 'Choose a Home That Fits Your Life'] },
    { name: 'Action + location', reason: 'Campus access is the key value.', examples: ['Live Steps From Campus', 'Tour Our Community Near Campus', 'Stay Close to Class'] },
    { name: 'Action + scarcity', reason: 'Limited inventory, push faster decisions.', examples: ['Claim One of the Final Spots', 'Apply Before This Floorplan Sells Out', 'Join the Waitlist Before It Fills'] },
  ],
  power_words: {
    action_words: ['Apply', 'Tour', 'Lease', 'Sign', 'Reserve', 'Secure', 'Claim', 'Lock In', 'Discover', 'Explore', 'Find', 'Choose', 'Start', 'Join', 'Save', 'Renew', 'Contact', 'Message', 'Text', 'Visit'],
    emotion_value_words: ['Home', 'Space', 'Spot', 'Fit', 'Lifestyle', 'Community', 'Comfort', 'Convenience', 'Student Living', 'Access', 'Savings', 'Perks', 'Availability', 'Rate', 'Opportunity'],
    urgency_words: ['Today', 'Now', 'Limited', 'Final', "Before It's Gone", 'While It Lasts', 'Fast', 'Soon', 'This Week', 'Before Rates Rise'],
  },
  top_25: ['Apply Now', 'Schedule a Tour', 'Claim Your Spot', 'Lock In Your Rate', 'View Floorplans', 'Check Availability', 'Secure Your Space', 'Tour Today', 'Lease Now', 'Start Your Application', 'Reserve Your Bed', 'Find Your Floorplan', 'Limited Spots Left', "Apply Before It's Gone", 'Join the Waitlist', 'Tour Virtually', 'Contact Our Team', 'Explore Amenities', 'Make Your Move', 'Renew Today', 'Live Steps From Campus', 'See Why Students Choose Us', 'Start Your Next Chapter', 'Your College Home Starts Here', 'Find Your Space'],
  best_by_channel: {
    website_hero: ['Apply Now', 'Schedule a Tour', 'View Floorplans', 'Check Availability'],
    paid_ads: ['Tour Today', 'Lock In Your Rate', 'Claim Your Spot', "Apply Before It's Gone"],
    instagram_caption: ['Tap the link in bio to tour', 'DM us for rates', 'Apply now before spots fill', 'Ready to make your move?'],
    email_campaign: ['Start Your Application', 'View Current Availability', 'Schedule Your Tour', 'Lease Today'],
    flyer_signage: ['Now Leasing', 'Tour Today', 'Scan to Apply', 'Limited Spots Left'],
    retargeting: ['Still Looking? Tour Today', 'Your Space Is Waiting', 'Come Back and Apply', "Don't Miss Your Floorplan"],
  },
};

export function getCTAsByCategory(categoryId: string): string[] {
  return ctaLibrary.categories.find((c) => c.id === categoryId)?.ctas || [];
}

export function getCTAsByFunnel(stage: FunnelStage): CTACategory[] {
  const catIds = FUNNEL_MAP[stage] || [];
  return ctaLibrary.categories.filter((c) => catIds.includes(c.id));
}

export function getCTAsByAudience(audience: Audience): CTACategory[] {
  const catIds = AUDIENCE_MAP[audience] || [];
  return ctaLibrary.categories.filter((c) => catIds.includes(c.id));
}

export function getCTAsByChannel(channel: Channel): CTACategory[] {
  const catIds = CHANNEL_MAP[channel] || [];
  return ctaLibrary.categories.filter((c) => catIds.includes(c.id));
}

export function searchCTAs(query: string): Array<{ cta: string; category: CTACategory }> {
  const q = query.toLowerCase();
  const results: Array<{ cta: string; category: CTACategory }> = [];
  for (const cat of ctaLibrary.categories) {
    for (const cta of cat.ctas) {
      if (cta.toLowerCase().includes(q)) {
        results.push({ cta, category: cat });
      }
    }
  }
  return results;
}

export function getEmailButtonCTAs(): string[] {
  return getCTAsByCategory('email_buttons');
}

export function getTop25(): string[] {
  return ctaLibrary.top_25;
}
