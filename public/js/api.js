const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('eduz_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) { localStorage.removeItem('eduz_token'); localStorage.removeItem('eduz_user'); window.location.href = '/login'; }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function login(email, password) {
  const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  localStorage.setItem('eduz_token', data.token);
  localStorage.setItem('eduz_user', JSON.stringify(data.user));
  return data;
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('eduz_user')); } catch { return null; }
}

function logout() {
  localStorage.removeItem('eduz_token');
  localStorage.removeItem('eduz_user');
  window.location.href = '/login';
}

function formatDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(d) {
  if (!d) return '-';
  const date = new Date(d);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
