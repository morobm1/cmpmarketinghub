# SOP Library

## Overview

The **SOP Library** is a document viewer and management system for Standard Operating Procedures (SOPs) at Capstone Management Partners. It provides a clean, searchable interface for viewing markdown-formatted SOP documents.

## Features

### Document Viewing
- **Markdown Rendering**: SOPs are written in Markdown format and rendered with proper formatting
- **Searchable**: Full-text search across all SOP documents
- **Category Filtering**: Filter SOPs by category (Leasing, Marketing, Operations, etc.)
- **Print Support**: Print individual SOPs with proper formatting
- **Download**: Download original markdown files

### User Interface
- **Two-Panel Layout**: Document list on the left, viewer on the right
- **Responsive Design**: Works on desktop and mobile devices
- **Consistent Branding**: Matches the Marketing Hub design system
- **Authentication**: Integrated with the existing JWT-based auth system

## File Structure

```
cmpmarketinghub/
├── sop_library.html                          # Main SOP Library page
├── SOP/                                       # SOP documents directory
│   ├── entrata_remove_primary_promote_coapplicant.md
│   └── README.md                              # This file
```

## Adding New SOPs

### 1. Create a Markdown File

Create a new `.md` file in the `SOP/` directory with the following structure:

```markdown
# SOP: [Title]

**Property:** [Property Name or "All Properties"]  
**Department:** [Team/Role]  
**Effective Date:** [Date]  
**Last Reviewed:** [Date]  
**Policy Reference:** [Link to internal policy]

---

## Purpose

[Description of what this SOP covers]

## Scope

[When and where this SOP applies]

## Procedure

### Step 1: [Step Name]

[Detailed instructions]

### Step 2: [Step Name]

[Detailed instructions]

## Troubleshooting

[Common issues and solutions]

## Related Procedures

[Links to related SOPs]
```

### 2. Register the SOP

Edit `sop_library.html` and add your SOP to the `SAMPLE_SOPS` array:

```javascript
const SAMPLE_SOPS = [
  {
    id: 'unique_id',
    title: 'Your SOP Title',
    category: 'Leasing', // or Marketing, Operations, etc.
    department: 'Leasing Team',
    effectiveDate: '2024-01-15',
    lastReviewed: '2024-01-15',
    filename: 'your_sop_file.md',
    description: 'Brief description of what this SOP covers'
  },
  // ... other SOPs
];
```

### 3. Categories

Available categories:
- **Leasing**: Leasing processes, applications, tours
- **Marketing**: Marketing campaigns, social media, events
- **Operations**: Day-to-day property operations
- **Maintenance**: Maintenance procedures and work orders
- **Resident Services**: Resident support and communication
- **Compliance**: Fair housing, legal requirements
- **Technology**: Software systems, Entrata, etc.
- **Finance**: Billing, collections, reporting
- **Other**: Miscellaneous procedures

## Markdown Formatting Guide

### Headers
```markdown
# H1 - Main Title
## H2 - Major Section
### H3 - Subsection
#### H4 - Minor Heading
```

### Lists
```markdown
- Bullet point
- Another bullet
  - Nested bullet

1. Numbered item
2. Another numbered item
```

### Checklists
```markdown
- [ ] Unchecked item
- [x] Checked item
```

### Tables
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
```

### Code Blocks
```markdown
```
Code block content
```
```

### Links
```markdown
[Link Text](https://example.com)
```

### Emphasis
```markdown
**Bold text**
*Italic text*
***Bold and italic***
```

### Blockquotes
```markdown
> Important note or quote
```

## Differences from Leasing SOP Page

The platform now has **two** SOP-related pages:

### Leasing SOP (`leasing_sop.html`)
- **Purpose**: Create and manage simple, form-based SOPs
- **Storage**: Property-specific, stored in database
- **Format**: Structured form fields (Title, Category, Steps, etc.)
- **Use Case**: Quick reference guides, checklists, simple procedures

### SOP Library (`sop_library.html`)
- **Purpose**: View comprehensive, formatted documentation
- **Storage**: Markdown files in `/SOP` directory
- **Format**: Full markdown with rich formatting
- **Use Case**: Detailed procedures, training materials, policy documents

## Future Enhancements

### Backend Integration
Currently, the SOP Library uses a static list of documents. Future enhancements could include:

1. **Database Storage**: Store SOP metadata in MongoDB
2. **File Upload**: Allow admins to upload markdown files through the UI
3. **Version Control**: Track changes and revisions to SOPs
4. **Approval Workflow**: Require manager approval for new/updated SOPs
5. **Property-Specific SOPs**: Filter SOPs by assigned properties
6. **Search Indexing**: Full-text search across all SOP content
7. **Comments/Feedback**: Allow users to comment on SOPs
8. **Analytics**: Track which SOPs are viewed most frequently

### Backend Endpoint Structure

```javascript
// netlify/functions/sop-library.js

// GET /api/sop-library - List all SOPs
// GET /api/sop-library/:id - Get specific SOP content
// POST /api/sop-library - Create new SOP (admin only)
// PUT /api/sop-library/:id - Update SOP (admin only)
// DELETE /api/sop-library/:id - Delete SOP (admin only)
```

## Maintenance

### Regular Reviews
- Review SOPs quarterly for accuracy
- Update "Last Reviewed" date when verified
- Archive outdated procedures

### Quality Standards
- Use clear, concise language
- Include screenshots where helpful
- Test procedures before publishing
- Get feedback from end users

### Naming Conventions
- Use lowercase with underscores: `procedure_name.md`
- Be descriptive: `entrata_remove_primary_promote_coapplicant.md`
- Avoid special characters except underscore and hyphen

## Support

For questions or issues with the SOP Library:
1. Contact your Property Manager
2. Submit feedback through the Marketing Hub
3. Email the development team

---

**Last Updated:** 2024-01-15  
**Maintained By:** Marketing Hub Development Team
