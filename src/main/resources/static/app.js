// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {

    // --- State Management ---
    const state = {
        token: localStorage.getItem('authToken') || null,
    };

    // --- UI Element Selectors ---
    const authView = document.getElementById('auth-view');
    const mainView = document.getElementById('main-view');
    const loginForm = document.getElementById('login-form');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const authError = document.getElementById('auth-error');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const fileListBody = document.getElementById('file-list');
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressBar = document.getElementById('progress-bar');

    // --- API Helper ---
    const API_BASE_URL = 'http://localhost:8080/api';

    async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const config = {
            method,
            headers,
        };
        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'API request failed');
        }

        // Handle responses that might not have a JSON body (like delete)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            return response.text();
        }
    }


    // --- UI Update Functions ---
    function showAuthView() {
        authView.style.display = 'block';
        mainView.style.display = 'none';
    }

    function showMainView() {
        authView.style.display = 'none';
        mainView.style.display = 'block';
        fetchAndRenderFiles();
    }

    function renderFileList(files) {
        fileListBody.innerHTML = ''; // Clear existing list
        if (files.length === 0) {
            fileListBody.innerHTML = '<tr><td colspan="4">No files uploaded yet.</td></tr>';
            return;
        }

        files.forEach(file => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><a href="${API_BASE_URL}/files/${file.fileName}" target="_blank">${file.fileName}</a></td>
                <td>${file.fileSize}</td>
                <td>${new Date(file.uploadTimestamp).toLocaleString()}</td>
                <td><button class="delete-btn" data-id="${file.id}">Delete</button></td>
            `;
            fileListBody.appendChild(row);
        });
    }

    // --- Event Handlers ---
    async function handleLogin(e) {
        e.preventDefault();
        authError.textContent = '';
        try {
            const username = loginUsernameInput.value;
            const password = loginPasswordInput.value;
            const response = await apiRequest('/auth/login', 'POST', { username, password });

            state.token = response.token;
            localStorage.setItem('authToken', state.token);

            loginForm.reset();
            showMainView();
        } catch (error) {
            authError.textContent = 'Login failed. Please check your credentials.';
            console.error('Login error:', error);
        }
    }

    function handleLogout() {
        state.token = null;
        localStorage.removeItem('authToken');
        showAuthView();
    }

    async function fetchAndRenderFiles() {
        try {
            const files = await apiRequest('/files', 'GET', null, state.token);
            renderFileList(files);
        } catch (error) {
            console.error('Failed to fetch files:', error);
            // If token is invalid (e.g., expired), log the user out
            if (error.message.includes('403')) {
                handleLogout();
            }
        }
    }

    async function handleUpload(e) {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        // Use XMLHttpRequest to get upload progress
        const xhr = new XMLHttpRequest();

        // Listen for progress events
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressBar.textContent = percentComplete + '%';
            }
        });

        // Listen for completion
        xhr.addEventListener('load', () => {
            progressBarContainer.style.display = 'none';
            progressBar.style.width = '0%'; // Reset for next time
            progressBar.textContent = '0%';

            if (xhr.status === 200) {
                uploadForm.reset();
                fetchAndRenderFiles();
            } else {
                alert(`Upload failed: ${xhr.responseText}`);
            }
        });

        // Listen for errors
        xhr.addEventListener('error', () => {
            progressBarContainer.style.display = 'none';
            alert('An error occurred during the upload. Please try again.');
        });

        // Configure and send the request
        xhr.open('POST', `${API_BASE_URL}/files/upload`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);

        progressBarContainer.style.display = 'block';
        xhr.send(formData);
    }

    async function handleDelete(e) {
        if (e.target.classList.contains('delete-btn')) {
            const fileId = e.target.dataset.id;
            if (confirm('Are you sure you want to delete this file?')) {
                try {
                    await apiRequest(`/files/${fileId}`, 'DELETE', null, state.token);
                    fetchAndRenderFiles();
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('Failed to delete file.');
                }
            }
        }
    }

    // --- Initial App Logic ---
    function initializeApp() {
        if (state.token) {
            showMainView();
        } else {
            showAuthView();
        }
    }

    // --- Event Listeners ---
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    uploadForm.addEventListener('submit', handleUpload);
    fileListBody.addEventListener('click', handleDelete);

    initializeApp();
});