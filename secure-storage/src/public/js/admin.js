class Admin {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const registerSubmit = document.getElementById('register-submit');
        const registerForm = document.getElementById('register-form');

        if (registerSubmit && registerForm) {
            registerSubmit.addEventListener('click', () => {
                this.registerUser(new FormData(registerForm));
            });
        }
    }

    async loadUsers() {
        if (!auth.isAdmin()) return;

        try {
            const response = await fetch('/api/auth/users', {
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to load users');
            }

            const users = await response.json();
            this.displayUsers(users);
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        }
    }

    displayUsers(users) {
        const tbody = document.getElementById('users-list');
        if (!tbody) return;

        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            
            const statusBadge = user.active 
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-danger">Inactive</span>';

            row.innerHTML = `
                <td>${user.username}</td>
                <td><span class="badge bg-primary">${user.role}</span></td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-warning action-btn" onclick="admin.toggleUserStatus('${user.username}', ${!user.active})">
                        <i class="fas fa-power-off"></i>
                    </button>
                    <button class="btn btn-sm btn-info action-btn" onclick="admin.resetPassword('${user.username}')">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-sm btn-danger action-btn" onclick="admin.deleteUser('${user.username}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });
    }

    async registerUser(formData) {
        if (!auth.isAdmin()) return;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: auth.getAuthHeaders(),
                body: JSON.stringify({
                    username: formData.get('username'),
                    password: formData.get('password'),
                    role: formData.get('role')
                })
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'User registered successfully',
                timer: 2000,
                showConfirmButton: false
            });

            // Close modal and refresh user list
            bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
            this.loadUsers();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: error.message
            });
        }
    }

    async toggleUserStatus(username, newStatus) {
        if (!auth.isAdmin()) return;

        try {
            const response = await fetch(`/api/auth/users/${username}/status`, {
                method: 'PUT',
                headers: auth.getAuthHeaders(),
                body: JSON.stringify({ active: newStatus })
            });

            if (!response.ok) {
                throw new Error('Failed to update user status');
            }

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
                timer: 2000,
                showConfirmButton: false
            });

            this.loadUsers();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Status Update Failed',
                text: error.message
            });
        }
    }

    async resetPassword(username) {
        if (!auth.isAdmin()) return;

        try {
            const { value: newPassword } = await Swal.fire({
                title: 'Reset Password',
                input: 'password',
                inputLabel: 'New Password',
                inputPlaceholder: 'Enter new password',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value) {
                        return 'Password cannot be empty';
                    }
                }
            });

            if (!newPassword) return;

            const response = await fetch(`/api/auth/users/${username}/password`, {
                method: 'PUT',
                headers: auth.getAuthHeaders(),
                body: JSON.stringify({ password: newPassword })
            });

            if (!response.ok) {
                throw new Error('Failed to reset password');
            }

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Password reset successfully',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Password Reset Failed',
                text: error.message
            });
        }
    }

    async deleteUser(username) {
        if (!auth.isAdmin()) return;

        try {
            const { isConfirmed } = await Swal.fire({
                icon: 'warning',
                title: 'Delete User',
                text: `Are you sure you want to delete ${username}?`,
                showCancelButton: true,
                confirmButtonText: 'Delete',
                confirmButtonColor: '#dc3545'
            });

            if (!isConfirmed) return;

            const response = await fetch(`/api/auth/users/${username}`, {
                method: 'DELETE',
                headers: auth.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'User deleted successfully',
                timer: 2000,
                showConfirmButton: false
            });

            this.loadUsers();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: error.message
            });
        }
    }
}

const admin = new Admin(); 