// MPLR Import Functionality
let importedData = [];

// Wait for DOM and XLSX library to be ready
function initImport() {
  const importFile = document.getElementById('importFile');
  const importBtn = document.getElementById('importBtn');
  const downloadBtn = document.getElementById('downloadTemplateBtn');
  
  if (importFile) importFile.addEventListener('change', handleFileSelect);
  if (importBtn) importBtn.addEventListener('click', processImport);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadTemplate);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImport);
} else {
  initImport();
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Check if XLSX library is loaded
  if (typeof XLSX === 'undefined') {
    showImportStatus('Error: Excel library not loaded. Please refresh the page and try again.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet);
      
      importedData = parseImportData(jsonData);
      showImportPreview(importedData);
      showImportStatus(`Loaded ${importedData.length} rows. Review and click "Import Data" to add to database.`, 'success');
    } catch (err) {
      showImportStatus('Error reading file: ' + err.message, 'error');
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseImportData(jsonData) {
  return jsonData.map(row => {
    const approvedDate = parseExcelDate(row['Approved Date']);
    const leaseStart = parseExcelDate(row['Lease Start']);
    const leaseEnd = parseExcelDate(row['Lease End']);
    
    const floorPlan = String(row['Apt/Bed'] || row['Floor Plan'] || '').trim();
    
    let leaseType = String(row['Lease Type'] || '').trim();
    
    return {
      approvedDate,
      unitType: String(row['Unit Type'] || '').trim(),
      leaseType,
      floorPlan,
      firstName: String(row['First Name'] || '').trim(),
      lastName: String(row['Last Name'] || '').trim(),
      leaseStart,
      leaseEnd,
      upfrontRent: parseFloat(row['Upfront Rent'] || 0) || 0,
      monthlyRent: parseFloat(row['Monthly Base Rent'] || row['Monthly Rent'] || 0) || 0,
      monthlyUtilities: parseFloat(row['Monthly Parking Fee'] || row['Monthly Utilities'] || 0) || 0,
      liabilityInsurance: parseFloat(row['Liability Insurance Premium'] || row['Liability Insurance'] || 0) || 0,
      securityDeposit: parseFloat(row['Security Deposit'] || 0) || 0
    };
  }).filter(row => {
    return row.firstName && row.lastName && row.floorPlan;
  });
}

function parseExcelDate(value) {
  if (!value) return '';
  
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
    return '';
  }
  
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  return '';
}

function showImportPreview(data) {
  if (!data || !data.length) {
    document.getElementById('importPreview').style.display = 'none';
    return;
  }

  const preview = data.slice(0, 5);
  const table = document.getElementById('previewTable');
  
  table.querySelector('thead').innerHTML = `
    <tr>
      <th style="padding:8px;border-bottom:2px solid var(--border)">Approved</th>
      <th style="padding:8px;border-bottom:2px solid var(--border)">Unit Type</th>
      <th style="padding:8px;border-bottom:2px solid var(--border)">Lease Type</th>
      <th style="padding:8px;border-bottom:2px solid var(--border)">Floor Plan</th>
      <th style="padding:8px;border-bottom:2px solid var(--border)">Name</th>
      <th style="padding:8px;border-bottom:2px solid var(--border)">Lease Start</th>
      <th style="padding:8px;border-bottom:2px solid var(--border)">Monthly Rent</th>
    </tr>
  `;
  
  table.querySelector('tbody').innerHTML = preview.map(row => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid var(--border)">${formatDate(row.approvedDate)}</td>
      <td style="padding:8px;border-bottom:1px solid var(--border)">${esc(row.unitType)}</td>
      <td style="padding:8px;border-bottom:1px solid var(--border)">${esc(row.leaseType)}</td>
      <td style="padding:8px;border-bottom:1px solid var(--border)"><strong>${esc(row.floorPlan)}</strong></td>
      <td style="padding:8px;border-bottom:1px solid var(--border)">${esc(row.firstName)} ${esc(row.lastName)}</td>
      <td style="padding:8px;border-bottom:1px solid var(--border)">${formatDate(row.leaseStart)}</td>
      <td style="padding:8px;border-bottom:1px solid var(--border)">${formatCurrency(row.monthlyRent)}</td>
    </tr>
  `).join('');
  
  document.getElementById('importPreview').style.display = 'block';
}

function showImportStatus(message, type) {
  const statusEl = document.getElementById('importStatus');
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  statusEl.style.padding = '12px';
  statusEl.style.borderRadius = '8px';
  statusEl.style.fontWeight = '600';
  
  if (type === 'success') {
    statusEl.style.background = '#dcfce7';
    statusEl.style.color = '#166534';
    statusEl.style.border = '1px solid #bbf7d0';
  } else if (type === 'error') {
    statusEl.style.background = '#fee2e2';
    statusEl.style.color = '#991b1b';
    statusEl.style.border = '1px solid #fecaca';
  } else {
    statusEl.style.background = '#dbeafe';
    statusEl.style.color = '#1e40af';
    statusEl.style.border = '1px solid #bfdbfe';
  }
}

function processImport() {
  if (!importedData || !importedData.length) {
    alert('Please select a file to import first');
    return;
  }

  if (!confirm(`Import ${importedData.length} leases into ${currentProperty}? This will add to existing data.`)) {
    return;
  }

  importedData.forEach(data => {
    leases.push({ id: rid(), ...data });
  });

  saveLeases();
  updateStats();
  updateFilterOptions();
  renderTable();

  showImportStatus(`Successfully imported ${importedData.length} leases!`, 'success');
  
  importedData = [];
  document.getElementById('importFile').value = '';
  document.getElementById('importPreview').style.display = 'none';
  
  setTimeout(() => {
    document.getElementById('importStatus').style.display = 'none';
  }, 5000);
}

function downloadTemplate() {
  const headers = [
    'Approved Date', 'Unit Type', 'Lease Type', 'Apt/Bed', 'First Name', 'Last Name',
    'Lease Start', 'Lease End', 'Monthly Base Rent', 'Monthly Parking Fee', 
    'Liability Insurance Premium', 'Security Deposit'
  ];

  const sampleRow = [
    '2025-10-01', '2BR/2BA', 'R', '2207-A', 'John', 'Doe',
    '2026-08-17', '2027-07-31', '875.00', '50.00', '15.00', '1750.00'
  ];

  const csvContent = [
    headers.join(','),
    sampleRow.join(',')
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'MPLR_Import_Template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
