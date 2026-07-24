const BAR_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#db2777'];
const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#db2777'];
let dashboardData = null;

async function loadDashboard() {
  try {
    dashboardData = await apiRequest('/admin/dashboard');
    updateOverview();
    updateMiniStats();
    updateRevenueGrowthChart();
    updateTopCountries();
    renderRecentActivity();
    renderPopularPrograms();
    document.getElementById('lastUpdated').textContent = 'Updated ' + formatTime(new Date());
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function updateOverview() {
  const o = dashboardData?.overview || {};
  document.getElementById('statTotalUsers').textContent = o.totalUsers ?? '7,640';
  document.getElementById('statUniversities').textContent = o.totalUniversities ?? '248';
  document.getElementById('statConsultants').textContent = o.totalConsultants ?? '182';
  document.getElementById('statRevenue').textContent = o.monthlyRevenue ? `$${o.monthlyRevenue.toLocaleString()}` : '$44,200';
}

function updateMiniStats() {
  const o = dashboardData?.overview || {};
  document.getElementById('statApplications').textContent = o.activeApplications ?? '1,248';
  document.getElementById('statSessionsToday').textContent = o.sessionsToday ?? '89';
  document.getElementById('statSupportTickets').textContent = o.supportTickets ?? '14';
  document.getElementById('statRating').textContent = o.avgRating ?? '4.8★';
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

function updateRevenueGrowthChart() {
  const data = dashboardData?.monthlySignups?.slice(-6) || [
    { month: 'Jan', count: 18000 },
    { month: 'Feb', count: 22000 },
    { month: 'Mar', count: 21000 },
    { month: 'Apr', count: 26000 },
    { month: 'May', count: 30000 },
    { month: 'Jun', count: 33500 }
  ];
  createBarChart('signupsChart', data, 'month', 'count', '#2563eb');
}

function updateTopCountries() {
  const countries = dashboardData?.topCountries || [
    { name: 'India', value: 1840, percent: 88 },
    { name: 'China', value: 1420, percent: 68 },
    { name: 'Nepal', value: 980, percent: 47 },
    { name: 'Pakistan', value: 760, percent: 36 },
    { name: 'Bangladesh', value: 540, percent: 25 },
    { name: 'Other', value: 2100, percent: 100 }
  ];
  const container = document.getElementById('topCountries');
  if (!container) return;
  container.innerHTML = '';
  countries.forEach(country => {
    const item = document.createElement('div');
    item.className = 'country-item';
    item.innerHTML = `
      <div>
        <div class="country-name">${country.name}</div>
        <div class="country-value">${country.value.toLocaleString()} users</div>
      </div>
      <div class="country-bar"><div class="country-bar-fill" style="width:${Math.min(country.percent, 100)}%;background:${BAR_COLORS[0]};"></div></div>
    `;
    container.appendChild(item);
  });
}

function renderRecentActivity() {
  const events = dashboardData?.recentActivity || [
    { title: 'Sarah Johnson registered as a new student', time: '2 min ago' },
    { title: 'University of Toronto listed 3 new programs', time: '15 min ago' },
    { title: 'Payment of $75.00 processed for Dr. Priya Sharma', time: '32 min ago' },
    { title: 'Rahul Gupta accepted offer from Univ. of Melbourne', time: '1 hr ago' },
    { title: 'James Williams verified as a new consultant', time: '2 hrs ago' },
  ];
  const container = document.getElementById('recentActivity');
  if (!container) return;
  container.innerHTML = '';
  events.forEach(event => {
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `<strong>${event.title}</strong><span>${event.time}</span>`;
    container.appendChild(item);
  });
}

function renderPopularPrograms() {
  const programs = dashboardData?.popularPrograms || [
    { name: 'MBA Programs', count: 312 },
    { name: 'MSc Computer Science', count: 248 },
    { name: 'Engineering', count: 196 },
    { name: 'Data Science', count: 184 },
    { name: 'Medicine', count: 142 }
  ];
  const container = document.getElementById('popularPrograms');
  if (!container) return;
  container.innerHTML = '';
  programs.forEach(program => {
    const item = document.createElement('div');
    item.className = 'program-item';
    item.innerHTML = `<span>${program.name}</span><strong>${program.count} apps</strong>`;
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
  document.getElementById('adminName').textContent = user.displayName || 'Admin';
  document.getElementById('adminEmail').textContent = user.email || '';
}

loadDashboard();
