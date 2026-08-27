# Leasing Team Staff Board - Documentation Plan

## Purpose
Create comprehensive documentation for the `leasing_staff_list.html` page that explains:
- What the page does (for non-technical users)
- How it was built (for technical users with medium knowledge)
- The logic flow and architecture
- Key features and functionality

## Target Audiences
1. **Non-technical users**: Need to understand what the page does, its features, and how information flows
2. **Medium-technical users**: Need to understand the code structure, technologies used, and how to maintain/modify it

## Documentation Structure

### 1. Executive Overview (Non-Technical)
- Brief description of the page's purpose
- Who uses it and why
- Main benefits and capabilities
- Simple workflow diagram

### 2. User Interface Guide (Non-Technical)
- Tab structure and navigation
- Main views:
  - Open Tasks view
  - Board view (day/month modes)
  - Staff management
  - Templates
  - Deleted Tasks (admin only)
- Key controls and filters
- Visual layout explanation

### 3. Core Features (Non-Technical)
- Task management (create, edit, delete, complete)
- Staff assignment and management
- Template-based task creation
- Status and priority tracking
- File attachments
- Notes and comments
- Email reminders
- Budget tracking
- Export to Excel
- Bulk task creation (admin only)

### 4. Data Flow (Both Audiences)
- How data moves through the system
- User actions → API calls → Database → UI updates
- Real-time polling mechanism
- Save indicators

### 5. Technical Architecture (Technical)
- Single-page application structure
- HTML structure and semantic layout
- CSS architecture:
  - CSS Custom Properties (variables)
  - CSS Grid layout system
  - Responsive design approach
  - Print styles
- JavaScript architecture:
  - State management
  - Event handling
  - API communication
  - Modal system
  - Component rendering

### 6. Technologies Used (Technical)
- HTML5
- CSS3 (Grid, Flexbox, Custom Properties)
- Vanilla JavaScript (ES6+)
- External libraries:
  - SheetJS (xlsx) for Excel export
  - Adobe Typekit fonts
  - Google Fonts
- REST API communication
- No framework dependencies

### 7. Code Structure (Technical)
- File organization (single HTML file)
- CSS sections and purposes
- JavaScript sections:
  - State variables
  - Initialization and authentication
  - Board rendering logic
  - CRUD operations
  - Event handlers
  - Utility functions
- Key functions and their purposes

### 8. Data Models (Technical)
- Task object structure
- Staff object structure
- Group object structure
- Template object structure
- Property object structure
- API endpoints and payloads

### 9. Logic Flow Diagrams (Both Audiences)
- Page initialization flow
- Task creation/editing flow
- Template loading flow
- Board rendering logic
- Filter and view toggling
- File upload process
- Bulk task creation process

### 10. Key Implementation Details (Technical)
- Authentication and session management
- Deep linking support (URL parameters)
- Polling mechanism for real-time updates
- Multi-select component implementation
- Popup positioning logic
- Collapsed group state management
- Date mode switching (day vs month)
- Export functionality

### 11. Feature Details

#### A. Board View
- Day vs Month view modes
- Group-based organization
- Collapsible groups
- Color-coded accent bars
- Quick add functionality
- In-line status/priority editing
- Completed vs Active task toggle
- Footer summaries

#### B. Open Tasks View
- Property-based filtering
- Shows all incomplete tasks (no date filter)
- Sorted by due date
- Overdue task highlighting
- Cross-property task visibility

#### C. Staff Management
- Add staff from property users
- Multi-property staff assignment
- Active/Inactive status
- Personal task links
- Edit and remove capabilities

#### D. Templates
- System vs Custom templates
- Task batch creation
- Template duplication
- Group assignment

#### E. File Management
- Upload to tasks
- View and remove files
- File size display
- Base64 encoding for upload

#### F. Notes System
- Multiple notes per task
- Resolve/unresolve functionality
- Timestamp and author tracking
- Legacy note support

#### G. Task History
- Change tracking
- Before/after values
- Action types
- User attribution

### 12. Admin-Specific Features (Technical)
- Bulk task creation across properties
- Deleted tasks view
- Task restoration
- Full property access
- Multi-property staff assignment

### 13. Accessibility and UX Considerations
- Keyboard navigation
- Click-outside-to-close modals
- Save indicators
- Confirmation dialogs
- Error handling and user feedback
- Print-friendly layout

### 14. API Integration (Technical)
- RESTful API communication
- Endpoint structure
- Request/response patterns
- Error handling
- Credentials and authentication
- Common API operations

### 15. Maintenance and Extension Points (Technical)
- How to add new groups
- How to modify status/priority options
- How to add new columns to board
- How to extend template functionality
- CSS variable customization
- Adding new modal dialogs

## Implementation Instructions

### File to Create
`Leasing_Staff_Board_Documentation.md` in the project root

### Content Requirements

Each section should include:
- **Executive Overview**: Explain purpose, users, benefits, and basic workflow
- **User Interface Guide**: Describe all 5 tabs with screenshots descriptions
- **Core Features**: Detail all 11 major features with examples
- **Data Flow**: Show complete flow from user action to UI update
- **Technical Architecture**: Explain SPA design, CSS Grid, state management
- **Technologies**: List all libraries and APIs used with examples
- **Code Structure**: Map out the 1374 lines with section purposes
- **Data Models**: Document all object structures with field explanations
- **Logic Flows**: Provide step-by-step flows for 8 key processes
- **Feature Implementation**: Deep dive on board view, multi-select, popups, search
- **Admin Features**: Document bulk tasks, deleted tasks, multi-property
- **API Integration**: List all 30+ endpoints with request/response examples
- **Glossary**: Define 60+ terms for both audiences

### Code Examples to Include
- API wrapper function (lines 497)
- Multi-select component (lines 629-632)
- Board rendering logic (lines 634-771)
- Modal system pattern
- Event delegation examples
- CSS Grid configuration
- State management pattern

### Key File Locations Referenced
- HTML structure: lines 1-461
- CSS styles: lines 14-188
- JavaScript: lines 487-1371
- State variables: line 489
- Init/auth: lines 502-570
- Board view: lines 634-771
- Templates: lines 799-814
- Staff management: lines 816-903
- Bulk tasks: lines 1299-1368

## Deliverables
- Single comprehensive markdown document (~8000-10000 lines)
- Table of contents with anchor links
- Organized with clear headings for easy navigation
- Code snippets with syntax highlighting markers
- Visual descriptions of UI elements
- Flow diagrams in text format using ASCII or step lists
- Glossary of 60+ technical and functional terms
- Examples for every major feature

## Validation Checklist
- [ ] All 15 main sections completed
- [ ] All 11 subsections under Feature Details included
- [ ] All API endpoints documented with examples
- [ ] Both technical and non-technical explanations provided
- [ ] Code snippets included for key functions
- [ ] Data models fully documented
- [ ] Logic flows complete with step-by-step breakdowns
- [ ] Glossary includes all technical terms used
- [ ] Document is self-contained and understandable

## Notes
- Document should be self-contained
- Use clear, concise language
- Avoid unnecessary jargon for non-technical sections
- Provide context for technical concepts
- Include both "what" and "why" explanations
- Target length: comprehensive but readable (aim for ~200KB markdown file)
- Format: GitHub-flavored markdown with code fences
