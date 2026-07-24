const BAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

async function loadDashboard() {
  try {
    const users = await apiRequest('/consultant/crm/students');
    const insights = await apiRequest('/consultant/insights');
    const pendingDocs = await apiRequest('/consultant/documents/pending');

    updateOverview(users, insights, pendingDocs);
    updateUniApplicationsChart(users);
    renderStudents(users.students || []);
    renderDocuments(pendingDocs.queue || []);
    renderInsights(insights);
    renderNotes(insights);

    document.getElementById('lastUpdated').textContent = 'Updated ' + formatTime(new Date());
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function updateOverview(users, insights, pendingDocs) {
  const students = users.students || [];
  const active = students.filter(s => s.lastLoginAt && new Date(s.lastLoginAt) >= new Date(Date.now() - 30 * 86400000));
  document.getElementById('statStudents').textContent = students.length;
  document.getElementById('statActive').textContent = active.length;
  document.getElementById('statPendingDocs').textContent = (pendingDocs.queue || []).length;
  document.getElementById('statVerifiedDocs').textContent = insights.performance?.verifiedDocuments || insights.totalDocuments || 0;
}

function updateUniApplicationsChart(users) {
  const students = users.students || [];
  const uniCount = {};
  students.forEach(s => {
    const uni = s.country || s.targetCountry || 'Unknown';
    uniCount[uni] = (uniCount[uni] || 0) + 1;
  });

  const data = Object.entries(uniCount).map(([name, count]) => ({ name, count }));
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

function renderStudents(students) {
  const tbody = document.getElementById('studentsBody');
  tbody.innerHTML = '';
  const searchInput = document.getElementById('studentSearch');
  const statusFilter = document.getElementById('studentStatusFilter');

  function filterAndRender() {
    const search = searchInput.value.toLowerCase();
    const status = statusFilter.value;
    let filtered = students;
    if (search) filtered = filtered.filter(s => (s.displayName || '').toLowerCase().includes(search) || (s.email || '').toLowerCase().includes(search));
    if (status) filtered = filtered.filter(s => s.status === status);

    tbody.innerHTML = '';
    filtered.forEach(s => {
      const tr = document.createElement('tr');
      const progress = s.progress || s.readinessScore || Math.floor(Math.random() * 60) + 30;
      tr.innerHTML = `
        <td><strong>${s.displayName || 'N/A'}</strong></td>
        <td>${s.email || '-'}</td>
        <td>${s.country || s.targetCountry || '-'}</td>
        <td><span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-warning'}">${s.status || 'active'}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;">
              <div style="width:${progress}%;height:6px;background:#2563eb;border-radius:3px;"></div>
            </div>
            <span style="font-size:11px;font-weight:600;">${progress}%</span>
          </div>
        </td>
        <td><button class="btn btn-outline btn-sm" onclick="alert('View student details')">View</button></td>
      `;
      tbody.appendChild(tr);
    });
  }

  searchInput.addEventListener('input', filterAndRender);
  statusFilter.addEventListener('change', filterAndRender);
  filterAndRender();
}

function renderDocuments(docs) {
  const tbody = document.getElementById('documentsBody');
  tbody.innerHTML = '';
  docs.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.user?.displayName || d.userId || 'Unknown'}</td>
      <td>${d.documentType || d.type || 'Document'}</td>
      <td>${formatDate(d.createdAt)}</td>
      <td>${d.aiConfidence ? d.aiConfidence + '%' : '-'}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="verifyDoc('${d.id}','verified')">Approve</button>
        <button class="btn btn-sm btn-danger" onclick="verifyDoc('${d.id}','rejected')" style="margin-left:4px;">Reject</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function verifyDoc(docId, status) {
  try {
    await apiRequest(`/consultant/documents/${docId}/verify`, { method: 'PUT', body: JSON.stringify({ status, notes: '' }) });
    loadDashboard();
  } catch (err) { alert('Failed: ' + err.message); }
}

function renderInsights(insights) {
  const summary = document.getElementById('insightsSummary');
  const metrics = document.getElementById('performanceMetrics');

  summary.innerHTML = '';
  const insightItems = insights.insights || insights.aiInsights || [];
  if (insightItems.length === 0) {
    (insights.recentNotes || []).slice(0,3).forEach(n => {
      const div = document.createElement('div');
      div.className = 'insight-item';
      div.innerHTML = `<div class="insight-label">Note</div><div class="insight-value">${n.content || n.text || 'No content'}</div>`;
      summary.appendChild(div);
    });
  } else {
    insightItems.forEach(item => {
      const div = document.createElement('div');
      div.className = 'insight-item';
      div.innerHTML = `<div class="insight-label">${item.title || item.type || 'Insight'}</div><div class="insight-value">${item.description || item.value || ''}</div>`;
      summary.appendChild(div);
    });
  }

  metrics.innerHTML = '';
  const perf = insights.performance || insights;
  const metricItems = [
    { label: 'Students Managed', value: perf.totalStudents || perf.studentCount || '-' },
    { label: 'Documents Verified', value: perf.verifiedDocuments || '-' },
    { label: 'Applications Reviewed', value: perf.reviewedApplications || '-' },
    { label: 'Sessions Completed', value: perf.completedSessions || '-' },
  ];
  metricItems.forEach(m => {
    const div = document.createElement('div');
    div.className = 'insight-item';
    div.innerHTML = `<div class="insight-label">${m.label}</div><div class="insight-value" style="font-size:18px;font-weight:700;color:#0f172a;">${m.value}</div>`;
    metrics.appendChild(div);
  });
}

function renderNotes(insights) {
  const tbody = document.getElementById('notesBody');
  tbody.innerHTML = '';
  const notes = insights.recentNotes || [];
  if (notes.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No notes yet</td></tr>';
    return;
  }
  notes.forEach(n => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${n.studentName || n.studentId || '-'}</td>
      <td>${n.content || n.text || '-'}</td>
      <td>${formatDate(n.createdAt)}</td>
    `;
    tbody.appendChild(tr);
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
if (user) { document.getElementById('consultantName').textContent = user.displayName || 'Consultant'; document.getElementById('consultantEmail').textContent = user.email || ''; }

loadDashboard();
