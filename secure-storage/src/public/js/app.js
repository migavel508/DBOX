class App {
    constructor() {
        this.currentPage = null;
        this.setupEventListeners();
        this.initializeApp();
    }

    setupEventListeners() {
        // Navigation links
        document.querySelectorAll('[data-page]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(e.target.dataset.page);
            });
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.showPage(e.state.page, false);
            }
        });
    }

    initializeApp() {
        // Check authentication status
        if (auth.isAuthenticated()) {
            auth.updateUI();
            this.showPage('files');
        } else {
            this.showPage('login');
        }

        // Setup global AJAX error handling
        this.setupAjaxErrorHandling();
    }

    showPage(pageName, pushState = true) {
        // Validate authentication
        if (pageName !== 'login' && !auth.isAuthenticated()) {
            this.showPage('login');
            return;
        }

        // Validate admin access
        if (pageName === 'admin' && !auth.isAdmin()) {
            this.showPage('files');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('d-none');
        });

        // Show requested page
        const page = document.getElementById(`${pageName}-page`);
        if (page) {
            page.classList.remove('d-none');
            this.currentPage = pageName;

            // Update browser history
            if (pushState) {
                window.history.pushState({ page: pageName }, '', `#${pageName}`);
            }

            // Load page-specific data
            this.loadPageData(pageName);
        }
    }

    loadPageData(pageName) {
        switch (pageName) {
            case 'files':
                files.loadFiles();
                break;
            case 'admin':
                admin.loadUsers();
                break;
        }
    }

    setupAjaxErrorHandling() {
        // Handle unauthorized responses
        let isHandlingUnauth = false;

        window.addEventListener('unhandledrejection', async (event) => {
            if (event.reason instanceof Response && event.reason.status === 401) {
                event.preventDefault();

                if (!isHandlingUnauth) {
                    isHandlingUnauth = true;
                    auth.logout();
                    isHandlingUnauth = false;
                }
            }
        });

        // Add request interceptor for expired tokens
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                if (response.status === 401) {
                    auth.logout();
                    throw response;
                }
                
                return response;
            } catch (error) {
                throw error;
            }
        };
    }

    showLoading() {
        Swal.fire({
            title: 'Loading...',
            html: '<div class="spinner"></div>',
            showConfirmButton: false,
            allowOutsideClick: false
        });
    }

    hideLoading() {
        Swal.close();
    }

    showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message
        });
    }

    showSuccess(message) {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            timer: 2000,
            showConfirmButton: false
        });
    }
}

const app = new App(); 