---
title: "Email Design Best Practices for Student Housing"
category: "Company Wide"
tags: ["creative-studio"]
created: 2026-04-03
---

# SOP: Email Design Best Practices for Student Housing

**Department:** Marketing  
**System:** Creative Studio  
**Effective Date:** April 3, 2026  
**Category:** Company Wide  

---

## Purpose

This SOP is your go-to guide for designing **effective, professional emails** for student housing marketing. These best practices will help you create emails that look great, work across all email clients (including Entrata), and actually get results. Bookmark this one — you'll come back to it often!

---

## When to Use This Process

- Every time you create an email in Creative Studio
- When reviewing an email before sending
- When troubleshooting display issues in email clients
- As a reference for training new team members on email design

---

## Best Practices

### 1. Email Width: Stick to 600px Max

- **Always** set your email width to **600px or less**
- This is the universal standard for email clients
- Wider emails will get cut off or display improperly on many devices
- Creative Studio defaults to 600px — don't change it unless you have a specific reason

> **Why?** Most email clients (Gmail, Outlook, Apple Mail) display emails in a pane that's about 600px wide. Going wider means your email gets clipped.

---

### 2. Font Choices That Work

Not all fonts work in email. Stick to these **web-safe fonts** for maximum compatibility:

| Font | Style | Best For |
|------|-------|----------|
| **Arial** | Clean, modern | Body text, CTAs |
| **Helvetica** | Clean, classic | Body text, headers |
| **Georgia** | Elegant serif | Headers, formal emails |
| **Times New Roman** | Traditional | Rarely used, but universally supported |
| **Verdana** | Wide, readable | Body text, great for small sizes |
| **Trebuchet MS** | Modern | Headers, subheadings |

- If you use a **Google Font** or custom font, always set a **fallback** (e.g., `'Montserrat', Arial, sans-serif`)
- Some email clients will ignore custom fonts and show the fallback instead — that's normal!

> **Tip:** When in doubt, use **Arial** for body text and **Georgia** for headers. Simple and effective.

---

### 3. Image Best Practices

Images make your emails pop, but they need to be handled correctly:

- **Use hosted image URLs** — Never embed images directly. Use URLs from your image hosting service or the Creative Studio asset library.
- **Always add alt text** — Describe the image (e.g., `alt="Aerial view of pool and sundeck"`). This shows when images are blocked and helps with accessibility.
- **Optimize file size** — Keep images under **200KB** each. Large images slow down loading and may get clipped by email clients.
- **Recommended dimensions:**
  - Full-width hero images: **600px wide**
  - Half-width images: **300px wide**
  - Logo: **200–300px wide**
- **Use JPG** for photos, **PNG** for logos/graphics with transparency

> **Note:** Some email clients (like Outlook) block images by default. Your email should still make sense even without images — that's why alt text matters!

---

### 4. CTA Button Best Practices

Your **Call to Action (CTA)** button is the most important element in your email. Make it count!

- **Use action-oriented text:** "Apply Now," "Schedule a Tour," "Claim Your Spot" — not "Click Here" or "Learn More"
- **Make it big enough to tap** — at least **44px tall** for mobile friendliness
- **Use a contrasting color** — The button should stand out from the rest of the email
- **One primary CTA per email** — Don't confuse readers with too many buttons. One main action, maybe one secondary.
- **Test the link!** — Always verify the URL behind the button actually works
- **Use bulletproof buttons** — Creative Studio generates buttons using HTML/CSS (not images), which means they display even when images are blocked

---

### 5. Mobile Responsiveness Tips

More than **60% of emails** are opened on mobile devices. Here's how to make sure yours looks great:

- **Keep subject lines short** — 30–40 characters max (mobile screens cut off long subjects)
- **Use a single-column layout** — Multi-column layouts can break on small screens
- **Make text readable** — Body text should be at least **14px**, headings at least **20px**
- **Size buttons for thumbs** — Minimum 44px × 44px tap target
- **Don't rely on hover effects** — Mobile doesn't have hover!
- **Test on a phone** — Send yourself a test and check it on your actual phone

---

### 6. Subject Line and Preheader Text

These are the first things people see — make them count!

#### Subject Line
- **Keep it short:** 30–50 characters
- **Be specific:** "Your Spring Lease Special: 20% Off" beats "Exciting News!"
- **Create urgency:** "Only 3 Days Left" or "Limited Spots Available"
- **Avoid spam triggers:** Don't use ALL CAPS, excessive exclamation marks!!!, or words like "FREE"

#### Preheader Text
- This is the preview text that appears after the subject line in the inbox
- **Keep it 40–90 characters**
- **Don't repeat the subject line** — Use it to add more context
- Example: Subject: "Fall Move-In Specials" → Preheader: "Save $500 when you sign before August 1st"

---

### 7. Testing Before Sending

**Never** send an email without testing it first!

1. **Send a test email** to yourself from Entrata
2. **Check it on desktop AND mobile**
3. **Click every link and button** — make sure they go to the right places
4. **Check images** — Do they load? Is the alt text correct?
5. **Proofread** — Read it out loud for typos and awkward phrasing
6. **Have a colleague review it** — Fresh eyes catch things you'll miss
7. **Check the subject line and preheader** — How do they look in the inbox?

> **Tip:** Send your test to both Gmail and Outlook if possible — they render emails differently.

---

### 8. Entrata-Specific Tips

Entrata's email system has some quirks. Here's what you need to know:

#### What Works Well in Entrata
- Simple, single-column layouts
- HTML buttons (bulletproof buttons)
- Inline-styled text
- Standard web-safe fonts
- Hosted images with absolute URLs

#### What Can Be Tricky
- Complex multi-column layouts may shift
- Custom fonts may revert to defaults
- Very long emails may get clipped
- Background images on containers (not consistently supported)

#### Blocks to Be Careful With

| Block | Status | Notes |
|-------|--------|-------|
| **Virtual Tour** | ⚠️ Use with caution | Embedded iframes may not render in all email clients. Consider using an image with a link to the virtual tour instead. |
| **Branded Header** | ⚠️ Use with caution | Complex branded headers with multiple elements may not display consistently. Use a simple logo + background color header for best results. |
| **Video Embed** | ⚠️ Not recommended | Video doesn't play in most email clients. Use a thumbnail image with a play button that links to the video. |

---

## Quick Checklist Before You Send

Use this checklist for every email:

- [ ] Email width is 600px or less
- [ ] Fonts are web-safe (or have proper fallbacks)
- [ ] All images have alt text
- [ ] Images are optimized (under 200KB each)
- [ ] CTA button is clear, prominent, and linked correctly
- [ ] Tested on desktop and mobile
- [ ] All links and buttons work
- [ ] Subject line is short and compelling
- [ ] Preheader text is set and adds context
- [ ] Proofread by at least one other person
- [ ] Brand kit is applied (colors, logo, fonts match property)
- [ ] No Virtual Tour or Video Embed blocks (use image+link instead)

---

## Expected Results

Following these best practices will help you create emails that:
- Display correctly across all major email clients
- Look professional and on-brand
- Drive engagement and clicks
- Work smoothly when imported into Entrata
