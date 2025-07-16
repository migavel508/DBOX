class Auth {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        const logoutBtn = document.getElementById('logout');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.login(new FormData(loginForm));
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    async login(formData) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.get('username'),
                    password: formData.get('password'),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            this.token = data.token;
            this.user = data.user;

            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));

            this.updateUI();
            app.showPage('files');

            Swal.fire({
                icon: 'success',
                title: 'Welcome back!',
                text: `Logged in as ${this.user.username}`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: error.message
            });
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        this.updateUI();
        app.showPage('login');

        Swal.fire({
            icon: 'success',
            title: 'Logged out successfully',
            timer: 1500,
            showConfirmButton: false
        });
    }

    updateUI() {
        const isLoggedIn = !!this.token;
        const isAdmin = this.user?.role === 'admin';

        // Update navigation visibility
        document.getElementById('nav-login').classList.toggle('d-none', isLoggedIn);
        document.getElementById('nav-files').classList.toggle('d-none', !isLoggedIn);
        document.getElementById('nav-admin').classList.toggle('d-none', !isAdmin);
        document.getElementById('nav-logout').classList.toggle('d-none', !isLoggedIn);
    }

    isAuthenticated() {
        return !!this.token;
    }

    isAdmin() {
        return this.user?.role === 'admin';
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }
}

const auth = new Auth(); 