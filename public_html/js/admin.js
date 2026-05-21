const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : window.location.origin;
const API_BASE = `${SERVER_URL}/api`;

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const message = document.getElementById('loginMessage');

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (result.success) {
      localStorage.setItem('isAdminLoggedIn', 'true');
      sessionStorage.setItem('isAdminLoggedIn', 'true');
      document.cookie = "isAdminLoggedIn=true; path=/; max-age=86400";
      window.location.href = 'dashboard.html';
    } else {
      message.textContent = result.message || 'Login failed';
    }
  } catch (error) {
    message.textContent = 'Server connection error';
  }
});