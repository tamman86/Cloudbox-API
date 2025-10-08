document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const usernameInput = document.getElementById('register-username');
    const passwordInput = document.getElementById('register-password');
    const authError = document.getElementById('auth-error');

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast ${type}';
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000)
    }

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.textContent = ''; // Clear previous errors

        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                showToast('Registration successful! Redirecting to login...');
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 1500);
            } else {
                const errorText = await response.text();
                showToast(`Registration failed: ${errorText}`, 'error');
            }
        } catch (error) {
            showToast('An error occurred. Please try again.', 'error');
            console.error('Registration error:', error);
        }
    });
});