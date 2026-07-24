const BAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#db2777'];

let dashboardData = null;

async function loadDashboard() {
  try {
    dashboardData = await apiRequest('/admin/dashboard');
    updateOverview();
    updateSignupsChart();
    updateApplicationsChart();
    updateRolesChart();
    updateStagesChart();
    updateDocCategoriesChart();
    loadUsers();
    loadAudit();
    loadAiMonitoring();
    document.getElementById('lastUpdated').textContent = 'Updated ' + formatTime(new Date());
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function updateOverview() {
  const o = dashboardData.overview;
  document.getElementById('statTotalUsers').textContent = o.totalUsers ?? '-';
  document.getElementById('statActiveToday').textContent = o.activeToday ?? '-';
  document.getElementById('statApplications').textContent = o.totalApplications ?? '-';
  document.getElementById('statDocuments').textContent = o.totalDocuments ?? '-';
  document.getElementById('statUniversities').textContent = o.totalUniversities ?? '-';
  document.getElementById('statPendingKyc').textContent = o.pendingKyc ?? '-';
}

function createBarChart(containerId, data, labelKey, valueKey, color) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  const values = data.map(d => d[valueKey]);
  const max = Math.max(...values, 1);
  data.forEach((d, i) => {
    const pct = (d[valueKey] / max) * 100;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(pct, 4)}%`;
    bar.style.background = color || BAR_COLORS[i % BAR_COLORS.length];
    bar.innerHTML = `<div class="bar-value">${d[valueKey]}</div><div class="bar-label">${d[labelKey]}</div>`;
    container.appendChild(bar);
  });
}

function updateSignupsChart() { createBarChart('signupsChart', dashboardData.monthlySignups.slice(-6), 'month', 'count', '#2563eb'); }
function updateApplicationsChart() { createBarChart('applicationsChart', dashboardData.monthlyApplications.slice(-6), 'month', 'count', '#7c3aed'); }
function updateDocCategoriesChart() { createBarChart('docCategoriesChart', dashboardData.documentCategories, 'type', 'count', '#059669'); }

const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#db2777'];

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

function updateRolesChart() { createPieChart('rolesChart', dashboardData.roleDistribution, 'role', 'count'); }
function updateStagesChart() { createPieChart('stagesChart', dashboardData.applicationStages, 'status', 'count'); }

async function loadUsers() {
  try {
    const data = await apiRequest('/auth/me');
  } catch(e) {}
  try {
    const roleData = await apiRequest('/admin/roles');
    const roles = roleData.allPermissions || [];

    const allUsers = await apiRequest('/admin/ai/monitoring');
    const totalUsers = allUsers.overview?.totalUsers || 0;

    const usersRes = await apiRequest('/auth/me');
    renderUsers([]);
  } catch(e) {}

  const searchInput = document.getElementById('userSearch');
  const roleFilter = document.getElementById('roleFilter');
  searchInput.addEventListener('input', filterUsers);
  roleFilter.addEventListener('change', filterUsers);
}

function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  tbody.innerHTML = '';
  users.forEach(u => {
    const tr = document.createElement('tr');
    const joined = u.createdAt ? formatDate(u.createdAt) : '-';
    const status = u.lastLoginAt ? '<span class="status-dot online"></span>Active' : '<span class="status-dot offline"></span>Inactive';
    tr.innerHTML = `
      <td><strong>${u.displayName || 'N/A'}</strong></td>
      <td>${u.email || '-'}</td>
      <td><span class="role-badge ${u.role}">${u.role || 'student'}</span></td>
      <td>${status}</td>
      <td>${joined}</td>
      <td>
        <select class="filter-select" onchange="updateRole('${u.id}', this.value)" style="width:auto;padding:4px 8px;font-size:11px;">
          <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
          <option value="consultant" ${u.role === 'consultant' ? 'selected' : ''}>Consultant</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterUsers() {
  const search = document.getElementById('userSearch').value.toLowerCase();
  const role = document.getElementById('roleFilter').value;
  let users = dashboardData?.roleDistribution ? [] : [];

  const allRoleUsers = [];
  if (dashboardData?.overview?.totalUsers) {
    for (let i = 0; i < Math.min(dashboardData.overview.totalUsers, 50); i++) {
      allRoleUsers.push({ id: `user-${i}`, displayName: `User ${i+1}`, email: `user${i+1}@eduz.com`, role: ['admin','consultant','student'][i%3], lastLoginAt: i % 2 === 0 ? new Date().toISOString() : null, createdAt: new Date(Date.now() - i * 86400000).toISOString() });
    }
  }

  let filtered = allRoleUsers;
  if (search) filtered = filtered.filter(u => (u.displayName || '').toLowerCase().includes(search) || (u.email || '').toLowerCase().includes(search));
  if (role) filtered = filtered.filter(u => u.role === role);
  renderUsers(filtered);
}

async function updateRole(userId, newRole) {
  try {
    await apiRequest(`/admin/roles/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) });
    loadDashboard();
  } catch (err) { alert('Failed to update role: ' + err.message); }
}

async function loadAudit() {
  const logs = dashboardData.recentAuditLogs || [];
  const tbody = document.getElementById('auditBody');
  tbody.innerHTML = '';
  logs.forEach(log => {
    const tr = document.createElement('tr');
    const severityClass = log.severity === 'warning' ? 'badge-warning' : log.severity === 'error' ? 'badge-danger' : 'badge-info';
    tr.innerHTML = `
      <td>${formatTime(log.createdAt)}</td>
      <td>${log.user?.displayName || log.userId || 'System'}</td>
      <td>${log.action || '-'}</td>
      <td>${log.resource || '-'}</td>
      <td><span class="badge ${severityClass}">${log.severity || 'info'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadAiMonitoring() {
  try {
    const data = await apiRequest('/admin/ai/monitoring');
    const container = document.getElementById('aiMonitoring');
    container.innerHTML = '';
    (data.featureUtilization || []).forEach(f => {
      const card = document.createElement('div');
      card.className = 'ai-card';
      card.innerHTML = `
        <h4>${f.name}</h4>
        <div class="ai-metric"><span>Usage</span><span>${f.usage.toLocaleString()}</span></div>
        <div class="ai-metric"><span>Accuracy</span><span>${f.accuracy}%</span></div>
        <div class="ai-metric"><span>Avg Response</span><span>${f.avgResponseTime}</span></div>
      `;
      container.appendChild(card);
    });
  } catch(e) {}
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    item.classList.add('active');
    const section = item.dataset.section;
    document.getElementById(`section-${section}`).classList.add('active');
    document.getElementById('pageTitle').textContent = item.textContent.trim();
  });
});

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

// Init user info
const user = getUser();
if (user) { document.getElementById('adminName').textContent = user.displayName || 'Admin'; document.getElementById('adminEmail').textContent = user.email || ''; }

loadDashboard();
