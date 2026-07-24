const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#db2777'];
const BAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

let dashboardData = null;

async function loadDashboard() {
  try {
    dashboardData = await apiRequest('/universities/dashboard');
    updateOverview();
    updateApplicationsChart();
    updateStagesChart();
    updateDocumentsChart();
    renderApplicationsTable();
    renderDocumentsTable();
    renderScholarships();
    document.getElementById('lastUpdated').textContent = 'Updated ' + formatTime(new Date());
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function updateOverview() {
  const o = dashboardData.overview;
  document.getElementById('statUniversities').textContent = o.totalUniversities ?? '-';
  document.getElementById('statCapacity').textContent = o.totalCapacity ?? '-';
  document.getElementById('statApplications').textContent = o.totalApplications ?? '-';
  document.getElementById('statFillRate').textContent = (o.fillRate ?? '-') + '%';
  document.getElementById('statDocuments').textContent = o.totalDocuments ?? '-';
  document.getElementById('statScholarships').textContent = o.totalScholarships ?? '-';
}

function updateApplicationsChart() {
  const data = dashboardData.applicationsByUniversity || [];
  const container = document.getElementById('uniApplicationsChart');
  container.innerHTML = '';
  const max = Math.max(...data.map(d => d.count), 1);
  data.forEach((d, i) => {
    const pct = (d.count / max) * 100;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(pct, 4)}%`;
    bar.style.background = BAR_COLORS[i % BAR_COLORS.length];
    bar.innerHTML = `<div class="bar-value">${d.count}</div><div class="bar-label">${d.name}</div>`;
    container.appendChild(bar);
  });
}

function createPieChart(containerId, data, labelKey, valueKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const total = data.reduce((s, d) => s + d[valueKey], 0) || 1;
  data.forEach((d, i) => {
    const item = document.createElement('div');
    item.className = 'pie-item';
    const pct = Math.round((d[valueKey] / total) * 100);
    item.innerHTML = `
      <div class="pie-color" style="background:${PIE_COLORS[i % PIE_COLORS.length]}"></div>
      <div class="pie-label">${d[labelKey]}</div>
      <div class="pie-value">${d[valueKey]} (${pct}%)</div>
    `;
    container.appendChild(item);
  });
}

function updateStagesChart() {
  const data = dashboardData.applicationStages || [];
  createPieChart('stagesChart', data, 'status', 'count');
}

function updateDocumentsChart() {
  const data = dashboardData.documentsByUniversity || [];
  const transformed = data.map(d => ({ name: d.name, count: d.uploaded }));
  createPieChart('documentsChart', transformed.length > 0 ? transformed : [{ name: 'No Data', count: 1 }], 'name', 'count');
}

function renderApplicationsTable() {
  const tbody = document.getElementById('applicationsBody');
  tbody.innerHTML = '';
  const data = dashboardData.applicationsByUniversity || [];
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No application data</td></tr>';
    return;
  }
  data.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.name}</strong></td>
      <td>${d.count}</td>
      <td><span class="badge badge-success">${d.accepted || 0}</span></td>
      <td><span class="badge badge-warning">${d.pending || 0}</span></td>
      <td><span class="badge badge-danger">${d.rejected || 0}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderDocumentsTable() {
  const tbody = document.getElementById('documentsBody');
  tbody.innerHTML = '';
  const data = dashboardData.documentsByUniversity || [];
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No document data</td></tr>';
    return;
  }
  data.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${d.name}</strong></td>
      <td>${d.uploaded || 0}</td>
      <td><span class="badge badge-success">${d.verified || 0}</span></td>
      <td><span class="badge badge-warning">${d.pending || 0}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderScholarships() {
  const container = document.getElementById('scholarshipsList');
  container.innerHTML = '';
  const data = dashboardData.matchingScholarships || [];
  if (data.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;">No scholarships available</p>';
    return;
  }
  data.forEach(s => {
    const card = document.createElement('div');
    card.className = 'scholarship-card';
    const unis = (s.eligibleUniversities || []).join(', ') || 'Multiple';
    card.innerHTML = `
      <h4>${s.name}</h4>
      <p><strong>Amount:</strong> ${s.amount || 'N/A'}</p>
      <p><strong>Deadline:</strong> ${s.deadline || 'N/A'}</p>
      <p><strong>Eligible:</strong> ${unis}</p>
      <p><strong>Match Rate:</strong> <span class="badge badge-success">${s.matchRate || 0}%</span></p>
    `;
    container.appendChild(card);
  });
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(`section-${item.dataset.section}`).classList.add('active');
    document.getElementById('pageTitle').textContent = item.textContent.trim();
  });
});

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

const user = getUser();
if (user) { document.getElementById('universityName').textContent = user.displayName || 'University'; document.getElementById('universityEmail').textContent = user.email || ''; }

loadDashboard();
