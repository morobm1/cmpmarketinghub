// MPLR Clear List Functionality with Triple Confirmation

document.addEventListener('DOMContentLoaded', () => {
  const clearListBtn = document.getElementById('clearListBtn');
  
  if (clearListBtn) {
    clearListBtn.addEventListener('click', handleClearList);
  }
});

function handleClearList() {
  if (!currentProperty) {
    alert('No property selected');
    return;
  }
  
  const currentCount = leases.length;
  
  if (currentCount === 0) {
    alert('The list is already empty.');
    return;
  }
  
  // First confirmation
  const firstConfirm = confirm(
    `⚠️ WARNING: You are about to PERMANENTLY delete ALL lease data for ${currentProperty}.\n\n` +
    `This will delete ${currentCount} lease records from the database.\n\n` +
    `This data will be COMPLETELY REMOVED and CANNOT be recovered.\n\n` +
    `Are you absolutely sure you want to continue?`
  );
  
  if (!firstConfirm) {
    return;
  }
  
  // Second confirmation (double check)
  const secondConfirm = confirm(
    `⚠️ SECOND WARNING!\n\n` +
    `You are about to delete ${currentCount} lease records.\n\n` +
    `This action is PERMANENT and IRREVERSIBLE!\n\n` +
    `Click OK to proceed to final confirmation.`
  );
  
  if (!secondConfirm) {
    return;
  }
  
  // Third confirmation - require typing DELETE
  const userInput = prompt(
    `⚠️ FINAL CONFIRMATION\n\n` +
    `Type "DELETE" (all capital letters) to permanently delete all ${currentCount} lease records for ${currentProperty}:`
  );
  
  if (userInput !== 'DELETE') {
    alert('❌ Deletion cancelled. The text did not match "DELETE".');
    return;
  }
  
  // Proceed with complete deletion
  const deletedCount = leases.length;
  
  // Clear the array
  leases = [];
  
  // Delete from API
  if (typeof window.deleteMPLRData === 'function') {
    window.deleteMPLRData(currentProperty).then(() => {
      console.log('MPLR data deleted from server');
    }).catch(e => {
      console.error('Failed to delete MPLR data from server:', e);
    });
  }
  
  // Remove from localStorage completely
  const storageKey = `mplr_leases_${currentProperty}`;
  localStorage.removeItem(storageKey);
  
  // Update UI
  updateStats();
  updateFilterOptions();
  renderTable();
  
  // Clear any import preview
  const importPreview = document.getElementById('importPreview');
  const importFile = document.getElementById('importFile');
  if (importPreview) importPreview.style.display = 'none';
  if (importFile) importFile.value = '';
  
  alert(`✓ Successfully deleted ${deletedCount} lease records from ${currentProperty}.\n\nAll data has been permanently removed from storage.`);
}
