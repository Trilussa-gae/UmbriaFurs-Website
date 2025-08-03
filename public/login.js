async function checkAuthStatus() {
    try {
        const response = await fetch('/api/check-auth', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            data.authenticated ? updateUIForAuthenticated() : updateUIForGuest();
            return data.authenticated;
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
    updateUIForGuest();
    return false;
}

function updateUIForAuthenticated() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.querySelector('.login-btn').textContent = 'Logout';
    document.querySelectorAll('.form-group').forEach(el => el.style.display = 'none');
}

function updateUIForGuest() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.querySelector('.login-btn').textContent = 'Accedi';
    document.querySelectorAll('.form-group').forEach(el => el.style.display = 'block');
    
    const emailField = document.getElementById('email1');
    if (emailField) {
        emailField.focus();
    }
}

function setupAuthHandlers() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('.login-btn');
        btn.textContent === 'Logout' ? await handleLogout() : await handleLogin();
    });
}

async function handleLogin() {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                email: document.getElementById('email1').value,
                password: document.getElementById('password').value
            })
        });
        const data = await response.json();
        data.success ? window.location.href = '/index.html' : showError(data.message || 'Login fallito');
    } catch (error) {
        showError('Errore di connessione');
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        response.ok ? window.location.href = '/index.html' : showError('Logout fallito');
    } catch (error) {
        console.error('Logout error:', error);
        showError('Errore durante il logout');
    }
}

function showError(message) {
    const errorElement = document.getElementById('message-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

window.onload = async function() {
    await checkAuthStatus();
    setupAuthHandlers();
};