document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const usernameInput = document.getElementById('register-username');
    const passwordInput = document.getElementById('register-password');
    const authError = document.getElementById('auth-error');

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
                // On successful registration, redirect to the login page
                window.location.href = '/index.html';
            } else {
                const errorText = await response.text();
                authError.textContent = `Registration failed: ${errorText}`;
            }
        } catch (error) {
            authError.textContent = 'An error occurred. Please try again.';
            console.error('Registration error:', error);
        }
    });
});