const BAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
let dashboardData = null;

async function loadDashboard() {
  try {
    const students = await apiRequest('/consultant/crm/students');
    const insights = await apiRequest('/consultant/insights');
    const pendingDocs = await apiRequest('/consultant/documents/pending');
    dashboardData = { students, insights, pendingDocs };

    updateOverview();
    updateRevenueChart();
    renderSchedule();
    renderNewRequests();
    renderProgress();
    document.getElementById('pendingCount').textContent = `${getPendingRequestCount()} Pending`;
    document.getElementById('lastUpdated').textContent = 'Updated ' + formatTime(new Date());
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function updateOverview() {
  const students = dashboardData.students?.students || [];
  const activeStudents = students.filter(s => s.status === 'active').length;
  const pendingRequests = dashboardData.pendingDocs?.queue?.length || 0;
  const monthlyRevenue = dashboardData.insights?.monthlyRevenue || 5800;
  const meetings = dashboardData.insights?.todayMeetings || 5;

  document.getElementById('statMeetings').textContent = meetings;
  document.getElementById('statRevenue').textContent = `$${monthlyRevenue.toLocaleString()}`;
  document.getElementById('statPendingRequests').textContent = pendingRequests;
  document.getElementById('statActiveStudents').textContent = activeStudents;
}

function getPendingRequestCount() {
  return dashboardData.pendingDocs?.queue?.length || 8;
}

function createBarChart(containerId, data, labelKey, valueKey, color) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const values = data.map(d => Number(d[valueKey]) || 0);
  const max = Math.max(...values, 1);
  data.forEach((d, i) => {
    const pct = (Number(d[valueKey]) / max) * 100;
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = `${Math.max(pct, 4)}%`;
    bar.style.background = color || BAR_COLORS[i % BAR_COLORS.length];
    bar.innerHTML = `<div class="bar-value">${d[valueKey]}</div><div class="bar-label">${d[labelKey]}</div>`;
    container.appendChild(bar);
  });
}

function updateRevenueChart() {
  const revenueHistory = dashboardData.insights?.revenueHistory || [
    { month: 'Jan', count: 3200 },
    { month: 'Feb', count: 3400 },
    { month: 'Mar', count: 3600 },
    { month: 'Apr', count: 4200 },
    { month: 'May', count: 4600 },
    { month: 'Jun', count: 5800 }
  ];
  createBarChart('revenueChart', revenueHistory, 'month', 'count', '#2563eb');
}

function renderSchedule() {
  const schedule = dashboardData.insights?.schedule || [
    { title: 'Sarah Johnson', time: '10:00 AM', type: 'Video Call', status: 'upcoming' },
    { title: 'Rahul Gupta', time: '12:00 PM', type: 'Online', status: 'upcoming' },
    { title: 'Emma Clarke', time: '2:00 PM', type: 'In-Person', status: 'pending' },
    { title: 'Li Wei', time: '4:00 PM', type: 'Video Call', status: 'upcoming' },
    { title: 'Fatima Al-Zahra', time: '5:30 PM', type: 'Online', status: 'upcoming' }
  ];
  const container = document.getElementById('scheduleList');
  container.innerHTML = '';
  schedule.forEach(item => {
    const div = document.createElement('div');
    div.className = 'schedule-item';
    div.innerHTML = `
      <div>
        <strong>${item.title}</strong>
        <small>${item.time} · ${item.type}</small>
      </div>
      <span class="status-chip">${item.status}</span>
    `;
    container.appendChild(div);
  });
}

function renderNewRequests() {
  const requests = dashboardData.students?.requests || [
    { name: 'Alex Thompson', detail: 'MBA in Australia', time: '2h ago' },
    { name: 'Ananya Singh', detail: 'UK Student Visa', time: '4h ago' },
    { name: 'Carlos Reyes', detail: 'Canada PR Pathway', time: '1d ago' }
  ];
  const container = document.getElementById('newRequests');
  container.innerHTML = '';
  requests.forEach(req => {
    const item = document.createElement('div');
    item.className = 'request-item';
    item.innerHTML = `<strong>${req.name}</strong><span>${req.detail}</span><small>${req.time}</small>`;
    container.appendChild(item);
  });
}

function renderProgress() {
  const students = dashboardData.students?.students || [
    { name: 'Sarah Johnson', detail: 'Univ. of Melbourne', progress: 80, status: 'In Review' },
    { name: 'Rahul Gupta', detail: 'UCL London', progress: 92, status: 'Offer Received' },
    { name: 'Emma Clarke', detail: 'Univ. of Toronto', progress: 62, status: 'Docs Pending' },
    { name: 'Li Wei', detail: 'ETH Zurich', progress: 100, status: 'Visa Applied' }
  ];
  const container = document.getElementById('progressList');
  container.innerHTML = '';
  students.slice(0, 4).forEach(student => {
    const item = document.createElement('div');
    item.className = 'progress-item';
    item.innerHTML = `
      <div class="progress-details">
        <strong>${student.name}</strong>
        <small>${student.status}</small>
      </div>
      <span>${student.detail}</span>
      <div class="progress-bar"><div class="progress-fill" style="width:${student.progress}%;"></div></div>
    `;
    container.appendChild(item);
  });
}

function safeSetActiveSection(section) {
  const sectionEl = document.getElementById(`section-${section}`);
  if (!sectionEl) return;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  sectionEl.classList.add('active');
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    safeSetActiveSection(item.dataset.section);
  });
});

document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

const user = getUser();
if (user) {
  document.getElementById('consultantName').textContent = user.displayName || 'Consultant';
  document.getElementById('consultantEmail').textContent = user.email || '';
}

loadDashboard();
