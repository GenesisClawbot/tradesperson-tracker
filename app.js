/* ===========================
   TradeTracker - App Logic
   Data: localStorage
   =========================== */

'use strict';

// ===========================
// Storage helpers
// ===========================

const KEYS = {
  clients: 'tt_clients',
  jobs: 'tt_jobs',
  settings: 'tt_settings',
  invoiceCount: 'tt_invoice_count',
};

const FREE_INVOICE_LIMIT = 3;
const STRIPE_URL = 'https://buy.stripe.com/PLACEHOLDER';

function load(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || null;
  } catch (e) {
    return null;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getClients() { return load(KEYS.clients) || []; }
function saveClients(c) { save(KEYS.clients, c); }

function getJobs() { return load(KEYS.jobs) || []; }
function saveJobs(j) { save(KEYS.jobs, j); }

function getSettings() {
  return load(KEYS.settings) || {
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    vatNumber: '',
  };
}
function saveSettings(s) { save(KEYS.settings, s); }

function getInvoiceCount() { return parseInt(localStorage.getItem(KEYS.invoiceCount) || '0', 10); }
function incrementInvoiceCount() {
  const n = getInvoiceCount() + 1;
  localStorage.setItem(KEYS.invoiceCount, String(n));
  return n;
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ===========================
// Tab navigation
// ===========================

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + target).classList.add('active');
  });
});

// ===========================
// Modal
// ===========================

const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

function openModal(title, bodyHtml, onSubmit) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const form = modalBody.querySelector('form');
  if (form && onSubmit) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      onSubmit(form);
    });
  }

  // Focus first input
  setTimeout(() => {
    const first = modalBody.querySelector('input, select, textarea');
    if (first) first.focus();
  }, 100);
}

function closeModal() {
  modalOverlay.style.display = 'none';
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ===========================
// Confirm dialog
// ===========================

const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitle = document.getElementById('confirmTitle');
const confirmText = document.getElementById('confirmText');
const confirmOk = document.getElementById('confirmOk');
const confirmCancel = document.getElementById('confirmCancel');

function openConfirm(title, text, onOk) {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  confirmOverlay.style.display = 'flex';
  confirmOverlay.classList.add('centered');
  document.body.style.overflow = 'hidden';

  const handler = () => {
    confirmOverlay.style.display = 'none';
    document.body.style.overflow = '';
    onOk();
    confirmOk.removeEventListener('click', handler);
  };
  confirmOk.addEventListener('click', handler);
}

confirmCancel.addEventListener('click', () => {
  confirmOverlay.style.display = 'none';
  document.body.style.overflow = '';
});

confirmOverlay.addEventListener('click', (e) => {
  if (e.target === confirmOverlay) {
    confirmOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }
});

// ===========================
// Paywall
// ===========================

const paywallOverlay = document.getElementById('paywallOverlay');
const paywallClose = document.getElementById('paywallClose');

function showPaywall() {
  paywallOverlay.style.display = 'flex';
  paywallOverlay.classList.add('centered');
  document.body.style.overflow = 'hidden';
}

paywallClose.addEventListener('click', () => {
  paywallOverlay.style.display = 'none';
  document.body.style.overflow = '';
});

paywallOverlay.addEventListener('click', (e) => {
  if (e.target === paywallOverlay) {
    paywallOverlay.style.display = 'none';
    document.body.style.overflow = '';
  }
});

// ===========================
// Clients
// ===========================

function renderClients() {
  const clients = getClients();
  const list = document.getElementById('clientsList');

  if (clients.length === 0) {
    list.innerHTML = '<p class="empty-state">No clients yet. Add your first one.</p>';
    return;
  }

  list.innerHTML = clients.map(c => `
    <div class="card" data-client-id="${c.id}">
      <div class="client-card-header">
        <div>
          <div class="client-name">${escHtml(c.name)}</div>
          <div class="client-meta">
            ${c.phone ? escHtml(c.phone) + '<br>' : ''}
            ${c.email ? escHtml(c.email) + '<br>' : ''}
            ${c.address ? escHtml(c.address) : ''}
          </div>
        </div>
        <div class="client-actions">
          <button class="btn btn-ghost btn-sm" onclick="editClient('${c.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteClient('${c.id}', '${escAttr(c.name)}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function clientFormHtml(c = {}) {
  return `
    <form id="clientForm">
      <div class="form-group">
        <label class="form-label" for="f_name">Name *</label>
        <input type="text" id="f_name" name="name" class="form-input" value="${escAttr(c.name || '')}" required autocomplete="name">
      </div>
      <div class="form-group">
        <label class="form-label" for="f_phone">Phone</label>
        <input type="tel" id="f_phone" name="phone" class="form-input" value="${escAttr(c.phone || '')}" autocomplete="tel">
      </div>
      <div class="form-group">
        <label class="form-label" for="f_email">Email</label>
        <input type="email" id="f_email" name="email" class="form-input" value="${escAttr(c.email || '')}" autocomplete="email">
      </div>
      <div class="form-group">
        <label class="form-label" for="f_address">Address</label>
        <textarea id="f_address" name="address" class="form-input form-textarea" rows="2" autocomplete="street-address">${escHtml(c.address || '')}</textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `;
}

document.getElementById('addClientBtn').addEventListener('click', () => {
  openModal('Add Client', clientFormHtml(), (form) => {
    const clients = getClients();
    clients.push({
      id: genId(),
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
      createdAt: Date.now(),
    });
    saveClients(clients);
    closeModal();
    renderClients();
  });
});

function editClient(id) {
  const clients = getClients();
  const c = clients.find(x => x.id === id);
  if (!c) return;

  openModal('Edit Client', clientFormHtml(c), (form) => {
    const idx = clients.findIndex(x => x.id === id);
    clients[idx] = {
      ...clients[idx],
      name: form.name.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      address: form.address.value.trim(),
    };
    saveClients(clients);
    closeModal();
    renderClients();
  });
}

function deleteClient(id, name) {
  openConfirm(
    'Delete client?',
    `"${name}" and all their data will be removed. This can't be undone.`,
    () => {
      const clients = getClients().filter(c => c.id !== id);
      saveClients(clients);
      // also remove their jobs
      const jobs = getJobs().filter(j => j.clientId !== id);
      saveJobs(jobs);
      renderClients();
      renderJobs();
    }
  );
}

// ===========================
// Jobs
// ===========================

function statusLabel(status) {
  const map = { 'pending': 'Pending', 'in-progress': 'In Progress', 'done': 'Done' };
  return map[status] || status;
}

function renderJobs() {
  const jobs = getJobs();
  const clients = getClients();
  const list = document.getElementById('jobsList');

  if (jobs.length === 0) {
    list.innerHTML = '<p class="empty-state">No jobs yet. Add your first one.</p>';
    return;
  }

  // Sort: newest first
  const sorted = [...jobs].sort((a, b) => b.createdAt - a.createdAt);

  list.innerHTML = sorted.map(j => {
    const client = clients.find(c => c.id === j.clientId);
    const clientName = client ? client.name : 'Unknown client';
    const price = parseFloat(j.price) || 0;
    return `
      <div class="card" data-job-id="${j.id}">
        <div class="job-card-header">
          <div class="job-info">
            <div class="job-client">${escHtml(clientName)}</div>
            <div class="job-description">${escHtml(j.description)}</div>
            <div class="job-price">£${price.toFixed(2)}</div>
          </div>
          <span class="status-badge status-${j.status}">${statusLabel(j.status)}</span>
        </div>
        <div class="job-actions">
          <button class="btn btn-ghost btn-sm" onclick="editJob('${j.id}')">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteJob('${j.id}')">Delete</button>
          <button class="btn btn-primary btn-sm" onclick="generateInvoice('${j.id}')">Invoice PDF</button>
        </div>
      </div>
    `;
  }).join('');
}

function jobFormHtml(j = {}) {
  const clients = getClients();
  const clientOptions = clients.map(c =>
    `<option value="${c.id}" ${j.clientId === c.id ? 'selected' : ''}>${escHtml(c.name)}</option>`
  ).join('');

  return `
    <form id="jobForm">
      <div class="form-group">
        <label class="form-label" for="f_client">Client *</label>
        <select id="f_client" name="clientId" class="form-input" required>
          <option value="">Select a client</option>
          ${clientOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="f_desc">Description *</label>
        <textarea id="f_desc" name="description" class="form-input form-textarea" rows="2" required placeholder="e.g. Fix boiler, replace radiator valve">${escHtml(j.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="f_price">Price (£) *</label>
        <input type="number" id="f_price" name="price" class="form-input" value="${j.price || ''}" min="0" step="0.01" required placeholder="0.00" inputmode="decimal">
      </div>
      <div class="form-group">
        <label class="form-label" for="f_status">Status</label>
        <select id="f_status" name="status" class="form-input">
          <option value="pending" ${(j.status || 'pending') === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="in-progress" ${j.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${j.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save</button>
      </div>
    </form>
  `;
}

document.getElementById('addJobBtn').addEventListener('click', () => {
  const clients = getClients();
  if (clients.length === 0) {
    openModal('Add Job', '<p style="color:var(--gray-500);font-size:14px;padding:8px 0;">Add a client first before creating a job.</p><div class="form-actions"><button class="btn btn-ghost" onclick="closeModal()">Close</button></div>', null);
    return;
  }

  openModal('Add Job', jobFormHtml(), (form) => {
    const jobs = getJobs();
    jobs.push({
      id: genId(),
      clientId: form.clientId.value,
      description: form.description.value.trim(),
      price: parseFloat(form.price.value) || 0,
      status: form.status.value,
      createdAt: Date.now(),
    });
    saveJobs(jobs);
    closeModal();
    renderJobs();
  });
});

function editJob(id) {
  const jobs = getJobs();
  const j = jobs.find(x => x.id === id);
  if (!j) return;

  openModal('Edit Job', jobFormHtml(j), (form) => {
    const idx = jobs.findIndex(x => x.id === id);
    jobs[idx] = {
      ...jobs[idx],
      clientId: form.clientId.value,
      description: form.description.value.trim(),
      price: parseFloat(form.price.value) || 0,
      status: form.status.value,
    };
    saveJobs(jobs);
    closeModal();
    renderJobs();
  });
}

function deleteJob(id) {
  openConfirm(
    'Delete job?',
    "This will permanently remove the job. Can't be undone.",
    () => {
      const jobs = getJobs().filter(j => j.id !== id);
      saveJobs(jobs);
      renderJobs();
    }
  );
}

// ===========================
// Invoice PDF (jsPDF)
// ===========================

function generateInvoice(jobId) {
  // Paywall check
  const count = getInvoiceCount();
  if (count >= FREE_INVOICE_LIMIT) {
    showPaywall();
    return;
  }

  const jobs = getJobs();
  const clients = getClients();
  const settings = getSettings();

  const job = jobs.find(j => j.id === jobId);
  if (!job) return;
  const client = clients.find(c => c.id === job.clientId);
  if (!client) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = 210;
  const margin = 20;
  const colRight = pageW - margin;
  let y = margin;

  // Helper functions
  function text(str, x, yPos, opts) {
    doc.text(str || '', x, yPos, opts);
  }

  function line(y1) {
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y1, colRight, y1);
  }

  // ---- Header band ----
  doc.setFillColor(37, 99, 235); // blue
  doc.rect(0, 0, pageW, 30, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  text('INVOICE', margin, 19);

  // Invoice number + date (right aligned)
  const invoiceNum = 'INV-' + job.id.toUpperCase().slice(-6);
  const invoiceDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  text(invoiceNum, colRight, 14, { align: 'right' });
  text(invoiceDate, colRight, 20, { align: 'right' });

  y = 42;

  // ---- From / To ----
  doc.setTextColor(30, 30, 30);

  // FROM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  text('FROM', margin, y);

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  text(settings.businessName || 'Your Business', margin, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const fromLines = [];
  if (settings.businessAddress) fromLines.push(...settings.businessAddress.split('\n'));
  if (settings.businessPhone) fromLines.push(settings.businessPhone);
  if (settings.businessEmail) fromLines.push(settings.businessEmail);
  if (settings.vatNumber) fromLines.push('VAT: ' + settings.vatNumber);

  fromLines.forEach(l => {
    text(l.trim(), margin, y);
    y += 4.5;
  });

  // TO (right column)
  let yTo = 42;
  const colMid = pageW / 2 + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  text('BILL TO', colMid, yTo);

  yTo += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  text(client.name, colMid, yTo);

  yTo += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);

  const toLines = [];
  if (client.address) toLines.push(...client.address.split('\n'));
  if (client.phone) toLines.push(client.phone);
  if (client.email) toLines.push(client.email);

  toLines.forEach(l => {
    text(l.trim(), colMid, yTo);
    yTo += 4.5;
  });

  // Move y past both columns
  y = Math.max(y, yTo) + 10;

  // ---- Line items table ----
  line(y);
  y += 6;

  // Table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  text('DESCRIPTION', margin, y);
  text('AMOUNT', colRight, y, { align: 'right' });

  y += 3;
  line(y);
  y += 7;

  // Line item
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);

  const descLines = doc.splitTextToSize(job.description, 120);
  descLines.forEach(l => {
    text(l, margin, y);
    y += 5;
  });

  const price = parseFloat(job.price) || 0;
  const priceStr = '£' + price.toFixed(2);

  // Price on same row as first desc line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  // rewrite price at correct y (first line y)
  const firstLineY = y - (descLines.length * 5);
  text(priceStr, colRight, firstLineY, { align: 'right' });

  y += 4;
  line(y);
  y += 7;

  // Subtotal / Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  text('Subtotal', colRight - 40, y);
  text(priceStr, colRight, y, { align: 'right' });

  y += 5;

  if (settings.vatNumber) {
    const vat = price * 0.20;
    text('VAT (20%)', colRight - 40, y);
    text('£' + vat.toFixed(2), colRight, y, { align: 'right' });
    y += 5;
    line(y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    text('TOTAL', colRight - 40, y);
    text('£' + (price + vat).toFixed(2), colRight, y, { align: 'right' });
  } else {
    line(y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    text('TOTAL', colRight - 40, y);
    text(priceStr, colRight, y, { align: 'right' });
  }

  y += 14;

  // Payment terms
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  text('Payment terms: Due within 14 days', margin, y);

  // Footer
  const footerY = 285;
  doc.setFillColor(245, 245, 245);
  doc.rect(0, footerY - 5, pageW, 15, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  text('Thank you for your business.', pageW / 2, footerY + 2, { align: 'center' });

  // Save
  incrementInvoiceCount();
  doc.save('invoice-' + jobId + '.pdf');
}

// ===========================
// Settings
// ===========================

function loadSettingsForm() {
  const s = getSettings();
  document.getElementById('settingBusinessName').value = s.businessName || '';
  document.getElementById('settingBusinessAddress').value = s.businessAddress || '';
  document.getElementById('settingBusinessPhone').value = s.businessPhone || '';
  document.getElementById('settingBusinessEmail').value = s.businessEmail || '';
  document.getElementById('settingVatNumber').value = s.vatNumber || '';
}

document.getElementById('saveSettingsBtn').addEventListener('click', () => {
  const s = {
    businessName: document.getElementById('settingBusinessName').value.trim(),
    businessAddress: document.getElementById('settingBusinessAddress').value.trim(),
    businessPhone: document.getElementById('settingBusinessPhone').value.trim(),
    businessEmail: document.getElementById('settingBusinessEmail').value.trim(),
    vatNumber: document.getElementById('settingVatNumber').value.trim(),
  };
  saveSettings(s);

  const saved = document.getElementById('settingsSaved');
  saved.style.display = 'block';
  setTimeout(() => { saved.style.display = 'none'; }, 2000);
});

// ===========================
// Escape helpers
// ===========================

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===========================
// Init
// ===========================

function init() {
  renderClients();
  renderJobs();
  loadSettingsForm();
}

init();
