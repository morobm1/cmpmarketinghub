// MPLR UI Enhancement - Collapsible Sections

// Add collapsible functionality to all cards
document.addEventListener('DOMContentLoaded', () => {
  initializeCollapsibleCards();
});

function initializeCollapsibleCards() {
  // Make card headers clickable to collapse/expand
  const cards = document.querySelectorAll('.card');
  
  cards.forEach((card, index) => {
    const header = card.querySelector('h3');
    const content = card.querySelector('.content, .table-container');
    
    if (!header || !content) return;
    
    // Add collapse icon
    const icon = document.createElement('span');
    icon.className = 'collapse-icon';
    icon.innerHTML = '▼';
    icon.style.cssText = 'margin-left:auto;transition:transform 0.2s;cursor:pointer;font-size:12px;';
    header.appendChild(icon);
    
    // Make header clickable
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    
    // Load collapsed state from localStorage
    const cardKey = `mplr_card_collapsed_${index}`;
    const isCollapsed = localStorage.getItem(cardKey) === 'true';
    
    if (isCollapsed) {
      content.style.display = 'none';
      icon.style.transform = 'rotate(-90deg)';
      card.classList.add('collapsed');
    }
    
    // Toggle on click
    header.addEventListener('click', (e) => {
      // Don't collapse if clicking on a button or input
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        return;
      }
      
      const isCurrentlyCollapsed = content.style.display === 'none';
      
      if (isCurrentlyCollapsed) {
        content.style.display = '';
        icon.style.transform = 'rotate(0deg)';
        card.classList.remove('collapsed');
        localStorage.setItem(cardKey, 'false');
      } else {
        content.style.display = 'none';
        icon.style.transform = 'rotate(-90deg)';
        card.classList.add('collapsed');
        localStorage.setItem(cardKey, 'true');
      }
    });
  });
  
  // Add expand/collapse all buttons
  addExpandCollapseButtons();
}

function addExpandCollapseButtons() {
  const container = document.getElementById('appContainer');
  if (!container) return;
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;justify-content:flex-end;';
  
  // Expand All button
  const expandBtn = document.createElement('button');
  expandBtn.className = 'btn sm';
  expandBtn.innerHTML = '▼ Expand All';
  expandBtn.onclick = () => toggleAllCards(false);
  
  // Collapse All button
  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'btn sm';
  collapseBtn.innerHTML = '▶ Collapse All';
  collapseBtn.onclick = () => toggleAllCards(true);
  
  buttonContainer.appendChild(collapseBtn);
  buttonContainer.appendChild(expandBtn);
  
  // Insert after stats grid
  const statsGrid = container.querySelector('.stats-grid');
  if (statsGrid) {
    statsGrid.after(buttonContainer);
  }
}

function toggleAllCards(collapse) {
  const cards = document.querySelectorAll('.card');
  
  cards.forEach((card, index) => {
    const content = card.querySelector('.content, .table-container');
    const icon = card.querySelector('.collapse-icon');
    
    if (!content || !icon) return;
    
    const cardKey = `mplr_card_collapsed_${index}`;
    
    if (collapse) {
      content.style.display = 'none';
      icon.style.transform = 'rotate(-90deg)';
      card.classList.add('collapsed');
      localStorage.setItem(cardKey, 'true');
    } else {
      content.style.display = '';
      icon.style.transform = 'rotate(0deg)';
      card.classList.remove('collapsed');
      localStorage.setItem(cardKey, 'false');
    }
  });
}

// Add section numbers to cards
function addSectionNumbers() {
  const cards = document.querySelectorAll('.card h3');
  const sectionNames = [
    '1. Property Configuration',
    '2. Floor Plan Tracker',
    '3. Tier Pricing Tracker',
    '4. Import Data',
    '5. Lease Registry'
  ];
  
  cards.forEach((header, index) => {
    if (index < sectionNames.length && !header.textContent.match(/^\d+\./)) {
      const currentText = header.textContent.trim();
      // Only add number if it doesn't already have one
      if (!currentText.match(/^\d+\./)) {
        header.childNodes[0].textContent = sectionNames[index] || `${index + 1}. ${currentText}`;
      }
    }
  });
}

// Initialize section numbers after a short delay to ensure DOM is ready
setTimeout(addSectionNumbers, 100);
