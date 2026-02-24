// MPLR Clear List Functionality with Double Confirmation

document.addEventListener('DOMContentLoaded', () => {
  const clearListBtn = document.getElementById('clearListBtn');
  
  if (clearListBtn) {
    clearListBtn.addEventListener('click', handleClearList);
  }
});

function handleClearList() {
  // First confirmation
  const firstConfirm = confirm(
    `⚠️ WARNING: You are about to delete ALL lease data for ${currentProperty}.\n\n` +
    `This will permanently delete ${leases.length} lease records.\n\n` +
    `Are you sure you want to continue?`
  );
  
  if (!firstConfirm) {
    return;
  }
  
  // Second confirmation (double check)
  const secondConfirm = confirm(
    `⚠️ FINAL WARNING!\n\n` +
    `This action CANNOT be undone!\n\n` +
    `Type "DELETE" in the next prompt to confirm deletion of all ${leases.length} leases.`
  );
  
  if (!secondConfirm) {
    return;
  }
  
  // Third confirmation - require typing DELETE
  const userInput = prompt(
    `Type "DELETE" (all caps) to permanently delete all lease data:`
  );
  
  if (userInput !== 'DELETE') {
    alert('Deletion cancelled. The text did not match "DELETE".');
    return;
  }
  
  // Proceed with deletion
  const deletedCount = leases.length;
  leases = [];
  saveLeases();
  updateStats();
  updateFilterOptions();
  renderTable();
  
  alert(`✓ Successfully deleted ${deletedCount} lease records from ${currentProperty}.`);
}
