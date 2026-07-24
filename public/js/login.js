document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');

  try {
    const data = await login(email, password);
    const role = data.user.role;
    if (role === 'admin') window.location.href = '/admin/dashboard';
    else if (role === 'consultant') window.location.href = '/consultant/dashboard';
    else window.location.href = '/university/dashboard';
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  }
});
