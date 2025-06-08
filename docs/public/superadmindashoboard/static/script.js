document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const logoutBtn = document.getElementById('logout-btn');
    const addAdminBtn = document.getElementById('add-admin-btn');
    const adminForm = document.getElementById('admin-form');
    const cancelAdminBtn = document.getElementById('cancel-admin');
    const newAdminForm = document.getElementById('new-admin-form');
    const adminSearch = document.getElementById('admin-search');
    const sortAdmins = document.getElementById('sort-admins');
    const adminsContainer = document.getElementById('admins-container');
    const pagination = document.getElementById('pagination');
    let currentOpenDropdown = null;

    let currentPage = 1;
    const limit = 10;
    let totalAdmins = 0;
    let currentAdmins = [];
    
    initTheme();
    checkAuth();
    
    themeToggle.addEventListener('click', toggleTheme);
    logoutBtn.addEventListener('click', handleLogout);
    addAdminBtn.addEventListener('click', () => adminForm.classList.remove('hidden'));
    cancelAdminBtn.addEventListener('click', () => adminForm.classList.add('hidden'));
    newAdminForm.addEventListener('submit', handleCreateAdmin);
    adminSearch.addEventListener('input', debounce(loadAdmins, 300));
    sortAdmins.addEventListener('change', loadAdmins);
    
    function checkAuth() {
        const token = localStorage.getItem('token');
        if (!token) {
            redirectToLogin();
        } else {
            loadAdmins();
        }
    }
    
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    }
    
    function updateThemeIcon(theme) {
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    async function loadAdmins() {
        try {
            adminsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading admins...</div>';
            
            const email = adminSearch.value.trim();
            const sort = sortAdmins.value;
            
            const queryParams = new URLSearchParams({
                page: currentPage,
                limit: limit,
                ...(email && { email }),
                sort
            });
            
            const response = await fetch(`http://localhost:5000/api/superAdmin/get?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                currentAdmins = data.data;
                totalAdmins = data.pagination.total;
                renderAdmins(currentAdmins);
                renderPagination();
            } else {
                throw new Error(data.message || 'Failed to fetch admins');
            }
        } catch (error) {
            console.error('Error loading admins:', error);
            adminsContainer.innerHTML = `<div class="error">Error loading admins: ${error.message}</div>`;
        }
    }
    
    function renderAdmins(admins) {
        if (admins.length === 0) {
            adminsContainer.innerHTML = '<div class="no-results">No admins found</div>';
            return;
        }
        
        const actionsTemplate = document.getElementById('admin-actions-template').content;
        adminsContainer.innerHTML = '';
        
        admins.forEach(admin => {
            const adminItem = document.createElement('div');
            adminItem.className = 'admin-item';
            adminItem.innerHTML = `
                <div class="email">${admin.email}</div>
                <div class="date">${new Date(admin.createdAt).toLocaleDateString()}</div>
                <div class="actions"></div>
            `;
            
            const actionsContainer = adminItem.querySelector('.actions');
            const actionsClone = document.importNode(actionsTemplate, true);
            
            const dropdownMenu = actionsClone.querySelector('.dropdown-menu');
            const editBtn = actionsClone.querySelector('.edit-permissions');
            const deleteBtn = actionsClone.querySelector('.delete-admin');
            const dropdownToggle = actionsClone.querySelector('.dropdown-toggle');
            
            editBtn.addEventListener('click', () => openPermissionsModal(admin));
            deleteBtn.addEventListener('click', () => confirmDeleteAdmin(admin._id));
            
            dropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentOpenDropdown && currentOpenDropdown !== dropdownMenu) {
                    currentOpenDropdown.classList.remove('show');
                }
                dropdownMenu.classList.toggle('show');
                currentOpenDropdown = dropdownMenu.classList.contains('show') ? dropdownMenu : null;
            });
            
            actionsContainer.appendChild(actionsClone);
            adminsContainer.appendChild(adminItem);
        });
    }
    
    document.addEventListener('click', function(e) {
        if (currentOpenDropdown && !currentOpenDropdown.contains(e.target)) {
            currentOpenDropdown.classList.remove('show');
            currentOpenDropdown = null;
        }
    });
    
    function renderPagination() {
        const totalPages = Math.ceil(totalAdmins / limit);
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        paginationHTML += `<button ${currentPage === 1 ? 'disabled' : ''} class="prev-page"><i class="fas fa-chevron-left"></i></button>`;
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `<button ${i === currentPage ? 'class="active"' : ''} data-page="${i}">${i}</button>`;
        }
        
        paginationHTML += `<button ${currentPage === totalPages ? 'disabled' : ''} class="next-page"><i class="fas fa-chevron-right"></i></button>`;
        pagination.innerHTML = paginationHTML;
        
        document.querySelectorAll('#pagination button[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page);
                loadAdmins();
            });
        });
        
        document.querySelector('.prev-page')?.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadAdmins();
            }
        });
        
        document.querySelector('.next-page')?.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadAdmins();
            }
        });
    }
    
    async function handleCreateAdmin(e) {
        e.preventDefault();
        const email = document.getElementById('admin-email').value.trim();
        const password = document.getElementById('admin-password').value;
        const permissions = {
            canManageTrips: document.getElementById('can-manage-trips').checked,
            canManageUsers: document.getElementById('can-manage-users').checked,
            canManageBookings: document.getElementById('can-manage-bookings').checked,
            canManageContent: document.getElementById('can-manage-content').checked
        };
        
        try {
            const response = await fetch('http://localhost:5000/api/superAdmin/add-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ email, password, permissions })
            });
            
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            
            const data = await response.json();
            if (data.success) {
                alert('Admin created successfully!');
                adminForm.classList.add('hidden');
                newAdminForm.reset();
                loadAdmins();
            } else {
                throw new Error(data.message || 'Failed to create admin');
            }
        } catch (error) {
            console.error('Error creating admin:', error);
            alert(`Error: ${error.message}`);
        }
    }
    
    function openPermissionsModal(admin) {
        const modalTemplate = document.getElementById('permissions-modal-template').content;
        const modalClone = document.importNode(modalTemplate, true);
        const modalOverlay = modalClone.querySelector('.modal-overlay');
        const permissionsForm = modalClone.querySelector('.permissions-form');
        const cancelBtn = modalClone.querySelector('.cancel-permissions');
        
        const canManageTripsCheckbox = modalClone.getElementById('edit-can-manage-trips');
        const canManageUsersCheckbox = modalClone.getElementById('edit-can-manage-users');
        const canManageBookingsCheckbox = modalClone.getElementById('edit-can-manage-bookings');
        const canManageContentCheckbox = modalClone.getElementById('edit-can-manage-content');
        
        canManageTripsCheckbox.checked = admin.permissions.canManageTrips;
        canManageUsersCheckbox.checked = admin.permissions.canManageUsers;
        canManageBookingsCheckbox.checked = admin.permissions.canManageBookings;
        canManageContentCheckbox.checked = admin.permissions.canManageContent;
        
        permissionsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatedPermissions = {
                canManageTrips: canManageTripsCheckbox.checked,
                canManageUsers: canManageUsersCheckbox.checked,
                canManageBookings: canManageBookingsCheckbox.checked,
                canManageContent: canManageContentCheckbox.checked
            };
            
            try {
                const response = await fetch(`http://localhost:5000/api/superAdmin/update/${admin._id}/permissions`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ permissions: updatedPermissions })
                });
                
                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }
                
                const data = await response.json();
                if (data.success) {
                    alert('Permissions updated successfully!');
                    document.body.removeChild(modalOverlay);
                    loadAdmins();
                } else {
                    throw new Error(data.message || 'Failed to update permissions');
                }
            } catch (error) {
                console.error('Error updating permissions:', error);
                alert(`Error: ${error.message}`);
            }
        });
        
        cancelBtn.addEventListener('click', () => document.body.removeChild(modalOverlay));
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) document.body.removeChild(modalOverlay);
        });
        
        document.body.appendChild(modalOverlay);
    }
    
    function confirmDeleteAdmin(adminId) {
        if (confirm('Are you sure you want to delete this admin?')) {
            deleteAdmin(adminId);
        }
    }
    
    async function deleteAdmin(adminId) {
        try {
            const response = await fetch(`http://localhost:5000/api/superAdmin/delete/${adminId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.status === 401) {
                redirectToLogin();
                return;
            }
            
            const data = await response.json();
            if (data.success) {
                alert('Admin deleted successfully!');
                loadAdmins();
            } else {
                throw new Error(data.message || 'Failed to delete admin');
            }
        } catch (error) {
            console.error('Error deleting admin:', error);
            alert(`Error: ${error.message}`);
        }
    }
    
    function handleLogout() {
        localStorage.removeItem('token');
        redirectToLogin();
    }
    
    function redirectToLogin() {
        window.location.href = '/login.html';
    }
    
    function debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }
});