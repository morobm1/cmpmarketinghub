---
title: "Exporting and Importing into Entrata Message Center"
category: "Company Wide"
tags: ["creative-studio"]
created: 2026-04-03
---

# SOP: Exporting and Importing into Entrata Message Center

**Department:** Marketing  
**System:** Creative Studio / Entrata  
**Effective Date:** April 3, 2026  
**Category:** Company Wide  

---

## Purpose

This SOP explains how to **export** a finished email from Creative Studio and **import** it into Entrata's Message Center. This is how you get your beautifully designed email from Creative Studio into Entrata so you can actually send it to residents or prospects.

---

## When to Use This Process

- Your email is finished and ready to send through Entrata
- You need to paste your Creative Studio email into the Entrata Message Center
- You're setting up a new email template in Entrata using Creative Studio HTML

---

## Step-by-Step Instructions

### Step 1: Finish Your Email in Creative Studio

1. Make sure your email is complete — all content, images, links, and branding are in place
2. Do a final review: check spelling, verify links, and confirm the CTA works
3. Save your project (click the **Save** button in the top toolbar)

> **Tip:** Always save before exporting, so you have a copy in case you need to make changes later.

---

### Step 2: Open the Export Panel

1. Click the **Export** button in the top toolbar (look for the download icon or "HTML" button)
2. The Export modal will open with your options

---

### Step 3: Choose Your Export Format

You'll see two main options:

#### Option A: Entrata Paste-In (Recommended)
- This generates **clean HTML** optimized specifically for Entrata's Message Center
- It strips out any code that might cause issues in Entrata
- **Use this option for most Entrata emails**

#### Option B: Full HTML
- This exports the complete, standalone HTML file
- Useful if you need the email for other platforms or want a backup
- May include extra code that Entrata doesn't need

> **Tip:** For Entrata, always choose **"Entrata Paste-In"** — it's designed to work smoothly with Entrata's editor.

---

### Step 4: Copy the HTML Code

1. After selecting your format, the HTML code will appear in a text box
2. Click the **"Copy"** button (or **"Copy to Clipboard"**)
3. The HTML is now on your clipboard, ready to paste

> **Note:** Don't try to edit the HTML manually — just copy and paste it as-is. Creative Studio has already formatted it correctly.

---

### Step 5: Open Entrata Message Center

1. Log into **Entrata**
2. Navigate to **Message Center** (usually under the Communication or Messaging tab)
3. Click **"Create New Message"** or open an existing message template

---

### Step 6: Switch to HTML / Source View

1. In the Entrata email editor, find the **"Source"** or **"HTML"** button
   - This is usually a small button labeled `< >` or `Source` in the editor toolbar
2. Click it to switch from the visual editor to the **HTML source code view**
3. You'll see raw HTML code (or an empty code area if it's a new message)

> **Important:** You MUST switch to Source/HTML view before pasting. If you paste into the visual editor, the formatting will break.

---

### Step 7: Paste the Code

1. **Select all** existing code in the Source view (Ctrl+A / Cmd+A)
2. **Delete** it (if there's any existing content)
3. **Paste** your Creative Studio HTML (Ctrl+V / Cmd+V)
4. Click **"Source"** or **"HTML"** again to switch back to the visual preview
5. Your email should appear fully formatted!

---

### Step 8: Test and Preview

1. Before sending, click **"Preview"** or **"Send Test"** in Entrata
2. Send a test email to yourself and at least one colleague
3. Check on both **desktop and mobile** to make sure it looks good
4. Verify all **links work** — click every button and link in the test email
5. Check that **images load** properly

> **Tip:** If images aren't showing, make sure they're hosted online (not local files). Creative Studio uses hosted image URLs, so this usually isn't an issue.

---

## Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| **Formatting looks broken** | Pasted into visual editor instead of Source view | Switch to Source view, delete everything, and paste again |
| **Images not showing** | Image URLs are broken or blocked | Check that image URLs are publicly accessible; re-upload if needed |
| **Email looks different in Entrata** | Entrata's editor adds its own styling | Use the "Entrata Paste-In" export option which accounts for this |
| **Fonts look different** | Entrata may not support all fonts | Stick to web-safe fonts (Arial, Helvetica, Georgia, etc.) |
| **Email is too wide** | Email width exceeds 600px | Set your email width to 600px in Creative Studio's global styles |
| **Button not clickable** | Link URL is missing or malformed | Check the button's link in Creative Studio and re-export |
| **Extra spacing or gaps** | Entrata sometimes adds padding | Try removing Spacer blocks or reducing padding in Creative Studio |

---

## Expected Results

After completing these steps, you should have:
- Your Creative Studio email fully loaded into Entrata Message Center
- All formatting, images, and links working correctly
- A tested email ready to send to your audience

---

## Best Practices

- **Always use "Entrata Paste-In"** — It's specifically built for Entrata compatibility.
- **Test before sending** — Never send a mass email without testing first.
- **Keep a copy in Creative Studio** — Save your project so you can make changes and re-export later.
- **Check mobile rendering** — A large percentage of residents read email on their phones.
- **Use web-safe fonts** — Fancy fonts may not display correctly in all email clients.
