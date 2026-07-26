import CONFIG from './config.js';
import { getSessionUser, clearSessionUser } from './auth.js';

// DOM elements
const elements = {
    // Sidebar items
    sidebarBtnUsers: document.getElementById('sidebar-btn-users'),
    sidebarBtnLessons: document.getElementById('sidebar-btn-lessons'),
    sidebarBtnWords: document.getElementById('sidebar-btn-words'),
    sidebarBtnExit: document.getElementById('sidebar-btn-exit'),
    sidebarBtnLogout: document.getElementById('sidebar-btn-logout'),
    
    // Views
    panelUsers: document.getElementById('admin-panel-users'),
    panelLessons: document.getElementById('admin-panel-lessons'),
    panelWords: document.getElementById('admin-panel-words'),
    
    // Tables
    usersTableBody: document.getElementById('users-table-body'),
    lessonsTableBody: document.getElementById('lessons-table-body'),
    wordsTableBody: document.getElementById('words-table-body'),
    
    // Forms
    addLessonForm: document.getElementById('add-lesson-form'),
    addWordForm: document.getElementById('add-word-form'),
    addUserForm: document.getElementById('admin-add-user-form'),
    
    // Select inputs
    lessonSelect: document.getElementById('word-lesson-id'),
    
    // Modals
    editUserModal: document.getElementById('edit-user-modal'),
    editLessonModal: document.getElementById('edit-lesson-modal'),
    editWordModal: document.getElementById('edit-word-modal'),
    
    // Modal Forms
    editUserForm: document.getElementById('edit-user-form'),
    editLessonForm: document.getElementById('edit-lesson-form'),
    editWordForm: document.getElementById('edit-word-form'),

    // Top Header items
    headerPoints: document.getElementById('header-points'),
    profileAvatar: document.getElementById('profile-avatar'),
    profileDropdown: document.getElementById('profile-dropdown'),
    dropdownAvatar: document.getElementById('dropdown-avatar'),
    dropdownUsername: document.getElementById('dropdown-username'),
    dropdownRole: document.getElementById('dropdown-role'),
    dropdownPoints: document.getElementById('dropdown-points'),
    btnLogoutHeader: document.getElementById('btn-logout')
};

// Check authentication immediately
function checkAuth() {
    const user = getSessionUser();
    if (!user || !user.role || user.role.toLowerCase() !== 'admin') {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

export function setupAdminView() {
    if (!checkAuth()) return;
    
    // Wire up mobile menu toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
            sidebarToggle.classList.toggle('active');
        });
        
        // Close sidebar drawer when clicking outside it on mobile
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !sidebarToggle.contains(e.target)) {
                sidebar.classList.remove('open');
                sidebarToggle.classList.remove('active');
            }
        });
    }
    
    // Wire up admin sidebar links
    if (elements.sidebarBtnUsers) elements.sidebarBtnUsers.addEventListener('click', () => switchAdminView('users'));
    if (elements.sidebarBtnLessons) elements.sidebarBtnLessons.addEventListener('click', () => switchAdminView('lessons'));
    if (elements.sidebarBtnWords) elements.sidebarBtnWords.addEventListener('click', () => switchAdminView('words'));
    
    if (elements.sidebarBtnExit) {
        elements.sidebarBtnExit.addEventListener('click', () => {
            window.location.href = 'index.html?view=user';
        });
    }
    
    const logoutAction = () => {
        if (confirm('Are you sure you want to log out?')) {
            clearSessionUser();
            window.location.href = 'index.html';
        }
    };

    if (elements.sidebarBtnLogout) elements.sidebarBtnLogout.addEventListener('click', logoutAction);
    if (elements.btnLogoutHeader) elements.btnLogoutHeader.addEventListener('click', logoutAction);
    
    // Attach event listeners for admin forms
    if (elements.addUserForm) {
        elements.addUserForm.addEventListener('submit', handleAddUser);
    }
    if (elements.addLessonForm) {
        elements.addLessonForm.addEventListener('submit', handleAddLesson);
    }
    if (elements.addWordForm) {
        elements.addWordForm.addEventListener('submit', handleAddWord);
    }
    
    // Attach modal close/cancel listeners
    setupModalListeners();
    setupProfileDropdown();
}

function setupProfileDropdown() {
    if (!elements.profileAvatar || !elements.profileDropdown) return;
    
    elements.profileAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.profileDropdown.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (!elements.profileDropdown.contains(e.target) && e.target !== elements.profileAvatar) {
            elements.profileDropdown.classList.remove('active');
        }
    });
}

function switchAdminView(viewName) {
    // Close sidebar on mobile after clicking item
    const sidebar = document.querySelector('.admin-sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if (sidebarToggle) sidebarToggle.classList.remove('active');
    }

    // Reset active sidebar items
    [elements.sidebarBtnUsers, elements.sidebarBtnLessons, elements.sidebarBtnWords].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    
    // Hide all view panels
    [elements.panelUsers, elements.panelLessons, elements.panelWords].forEach(panel => {
        if (panel) panel.classList.remove('active');
    });
    
    // Set active
    if (viewName === 'users') {
        if (elements.sidebarBtnUsers) elements.sidebarBtnUsers.classList.add('active');
        if (elements.panelUsers) elements.panelUsers.classList.add('active');
        refreshUsersList();
    } else if (viewName === 'lessons') {
        if (elements.sidebarBtnLessons) elements.sidebarBtnLessons.classList.add('active');
        if (elements.panelLessons) elements.panelLessons.classList.add('active');
        refreshLessonsList();
    } else if (viewName === 'words') {
        if (elements.sidebarBtnWords) elements.sidebarBtnWords.classList.add('active');
        if (elements.panelWords) elements.panelWords.classList.add('active');
        refreshWordsList();
    }
}

export async function loadAdminData() {
    const user = getSessionUser();
    if (!user || user.role !== 'admin') return;

    // Sync header profile details
    if (elements.headerPoints) elements.headerPoints.textContent = user.points;
    if (elements.profileAvatar) elements.profileAvatar.textContent = user.username.charAt(0).toUpperCase();
    if (elements.dropdownAvatar) elements.dropdownAvatar.textContent = user.username.charAt(0).toUpperCase();
    if (elements.dropdownUsername) elements.dropdownUsername.textContent = user.username;
    if (elements.dropdownRole) elements.dropdownRole.textContent = user.role;
    if (elements.dropdownPoints) elements.dropdownPoints.textContent = user.points;

    // Sync admin metadata inside sidebar
    const avatarMenu = document.getElementById('sidebar-avatar-menu');
    const usernameEl = document.getElementById('sidebar-username-menu');
    if (avatarMenu) avatarMenu.textContent = user.username.charAt(0).toUpperCase();
    if (usernameEl) usernameEl.textContent = user.username;

    await refreshUsersList();
    await refreshLessonsList();
    await refreshWordsList();
}

// ================= USER MANAGEMENT =================

async function refreshUsersList() {
    const user = getSessionUser();
    if (!user || user.role !== 'admin') return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/users`, {
            headers: { 'X-User-Role': user.role }
        });
        if (!response.ok) throw new Error('Failed to load users');
        const users = await response.json();
        
        if (elements.usersTableBody) {
            elements.usersTableBody.innerHTML = '';
            users.forEach(u => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${escapeHtml(u.username)}</strong></td>
                    <td>
                        <span class="user-role-badge role-${u.role}">${escapeHtml(u.role.toUpperCase())}</span>
                    </td>
                    <td><span style="font-weight: 700; color: #fbbf24;">🔥 ${u.points}</span></td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button class="btn-edit-row btn-action-edit" data-id="${u.id}">Edit</button>
                        <button class="btn-delete-row btn-action-delete" data-id="${u.id}" ${u.id === user.id ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>Delete</button>
                    </td>
                `;
                
                // Attach event listeners
                row.querySelector('.btn-edit-row').addEventListener('click', () => openEditUserModal(u));
                if (u.id !== user.id) {
                    row.querySelector('.btn-delete-row').addEventListener('click', () => deleteUser(u.id, u.username));
                }
                
                elements.usersTableBody.appendChild(row);
            });
        }
    } catch (e) {
        console.error('Error fetching users:', e);
    }
}

async function handleAddUser(event) {
    event.preventDefault();
    const user = getSessionUser();
    if (!user) return;
    
    const usernameInput = document.getElementById('admin-user-username');
    const passwordInput = document.getElementById('admin-user-password');
    const roleInput = document.getElementById('admin-user-role');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const role = roleInput.value;
    
    if (!username || !password) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify({ username, password, role })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create user');
        
        usernameInput.value = '';
        passwordInput.value = '';
        roleInput.value = 'user';
        
        await refreshUsersList();
        closeAdminModal('create-user-modal');
        alert('User created successfully!');
    } catch (e) {
        alert(e.message);
    }
}

async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete the user account "${username}"?`)) return;
    
    const user = getSessionUser();
    if (!user) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: { 'X-User-Role': user.role }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to delete user');
        
        await refreshUsersList();
        alert('User account deleted successfully.');
    } catch (e) {
        alert(e.message);
    }
}

// ================= LESSONS MANAGEMENT =================

async function refreshLessonsList() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/lessons`);
        if (!response.ok) throw new Error('Failed to load lessons');
        const lessons = await response.json();
        
        // Populate the dropdown in word form
        if (elements.lessonSelect) {
            elements.lessonSelect.innerHTML = '<option value="">-- Select a Lesson --</option>';
            lessons.forEach(lesson => {
                const opt = document.createElement('option');
                opt.value = lesson.id;
                opt.textContent = lesson.title;
                elements.lessonSelect.appendChild(opt);
            });
        }
        
        // Populate lessons table
        if (elements.lessonsTableBody) {
            elements.lessonsTableBody.innerHTML = '';
            if (lessons.length === 0) {
                elements.lessonsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">No lessons available. Add one above!</td></tr>';
            } else {
                lessons.forEach(lesson => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${escapeHtml(lesson.title)}</strong></td>
                        <td>${escapeHtml(lesson.description || '-')}</td>
                        <td style="text-align: right; white-space: nowrap;">
                            <button class="btn-edit-row btn-action-edit" data-id="${lesson.id}">Edit</button>
                            <button class="btn-delete-row btn-action-delete" data-id="${lesson.id}">Delete</button>
                        </td>
                    `;
                    // Attach event listeners
                    row.querySelector('.btn-edit-row').addEventListener('click', () => openEditLessonModal(lesson));
                    row.querySelector('.btn-delete-row').addEventListener('click', () => deleteLesson(lesson.id, lesson.title));
                    
                    elements.lessonsTableBody.appendChild(row);
                });
            }
        }
    } catch (e) {
        console.error('Error listing lessons:', e);
    }
}

async function handleAddLesson(event) {
    event.preventDefault();
    const user = getSessionUser();
    if (!user) return;

    const titleInput = document.getElementById('lesson-title');
    const descInput = document.getElementById('lesson-desc');
    
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    
    if (!title) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/lessons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify({ title, description })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create lesson');
        }
        
        titleInput.value = '';
        descInput.value = '';
        await refreshLessonsList();
        closeAdminModal('create-lesson-modal');
        alert('Lesson Card added successfully!');
    } catch (error) {
        alert(error.message);
    }
}

async function deleteLesson(lessonId, lessonTitle) {
    if (!confirm(`Are you sure you want to delete the lesson "${lessonTitle}"? This will ALSO delete all Chinese words associated with this lesson!`)) {
        return;
    }
    
    const user = getSessionUser();
    if (!user) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/lessons/${lessonId}`, {
            method: 'DELETE',
            headers: {
                'X-User-Role': user.role
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete lesson');
        }
        
        await refreshLessonsList();
        await refreshWordsList();
    } catch (e) {
        alert(e.message);
    }
}

// ================= WORDS MANAGEMENT =================

async function refreshWordsList() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/words`);
        if (!response.ok) throw new Error('Failed to fetch words');
        const words = await response.json();
        
        if (elements.wordsTableBody) {
            elements.wordsTableBody.innerHTML = '';
            
            if (words.length === 0) {
                elements.wordsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No words available. Add one above!</td></tr>';
                return;
            }
            
            words.forEach(word => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><span style="font-family: var(--font-chinese); font-size: 1.15rem; font-weight: bold;">${escapeHtml(word.chinese)}</span></td>
                    <td><span style="color: var(--pink-primary); font-weight: 500;">${escapeHtml(word.pinyin)}</span></td>
                    <td><strong>${escapeHtml(word.english)}</strong></td>
                    <td><span style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(word.lesson_title || 'Unassigned')}</span></td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button class="btn-edit-row btn-action-edit" data-id="${word.id}">Edit</button>
                        <button class="btn-delete-row btn-action-delete" data-id="${word.id}">Delete</button>
                    </td>
                `;
                // Attach event listeners
                row.querySelector('.btn-edit-row').addEventListener('click', () => openEditWordModal(word));
                row.querySelector('.btn-delete-row').addEventListener('click', () => deleteWord(word.id, word.chinese));
                
                elements.wordsTableBody.appendChild(row);
            });
        }
    } catch (e) {
        console.error('Error listing words:', e);
    }
}

async function handleAddWord(event) {
    event.preventDefault();
    const user = getSessionUser();
    if (!user) return;

    const lessonId = parseInt(elements.lessonSelect.value);
    const chinese = document.getElementById('word-chinese-input').value.trim();
    const pinyin = document.getElementById('word-pinyin-input').value.trim();
    const english = document.getElementById('word-english-input').value.trim();
    
    const opt1 = document.getElementById('word-opt-1').value.trim();
    const opt2 = document.getElementById('word-opt-2').value.trim();
    const opt3 = document.getElementById('word-opt-3').value.trim();
    const opt4 = document.getElementById('word-opt-4').value.trim();
    
    if (!lessonId) {
        alert('Please select a lesson.');
        return;
    }
    if (!chinese || !pinyin || !english || !opt1 || !opt2 || !opt3 || !opt4) {
        alert('Please fill out all fields, including the 4 multiple choice options.');
        return;
    }
    
    const options = [opt1, opt2, opt3, opt4];
    // Ensure English is one of the options
    if (!options.map(o => o.toLowerCase()).includes(english.toLowerCase())) {
        alert(`Warning: The English answer ("${english}") must be one of the four multiple-choice options!`);
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/words`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify({
                lesson_id: lessonId,
                chinese,
                pinyin,
                english,
                options
            })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create word');
        }
        
        document.getElementById('word-chinese-input').value = '';
        document.getElementById('word-pinyin-input').value = '';
        document.getElementById('word-english-input').value = '';
        document.getElementById('word-opt-1').value = '';
        document.getElementById('word-opt-2').value = '';
        document.getElementById('word-opt-3').value = '';
        document.getElementById('word-opt-4').value = '';
        
        await refreshWordsList();
        closeAdminModal('create-word-modal');
        alert('Word definition added successfully!');
    } catch (error) {
        alert(error.message);
    }
}

async function deleteWord(wordId, chineseWord) {
    if (!confirm(`Are you sure you want to delete the word "${chineseWord}"?`)) {
        return;
    }
    
    const user = getSessionUser();
    if (!user) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/words/${wordId}`, {
            method: 'DELETE',
            headers: {
                'X-User-Role': user.role
            }
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to delete word');
        }
        
        await refreshWordsList();
    } catch (e) {
        alert(e.message);
    }
}

// ================= MODALS MANAGEMENT (EDIT/UPDATE ACTIONS) =================

function setupModalListeners() {
    // Open creation modal buttons
    const btnOpenUser = document.getElementById('open-create-user-btn');
    const btnOpenLesson = document.getElementById('open-create-lesson-btn');
    const btnOpenWord = document.getElementById('open-create-word-btn');
    
    if (btnOpenUser) btnOpenUser.addEventListener('click', () => openAdminModal('create-user-modal'));
    if (btnOpenLesson) btnOpenLesson.addEventListener('click', () => openAdminModal('create-lesson-modal'));
    if (btnOpenWord) btnOpenWord.addEventListener('click', () => openAdminModal('create-word-modal'));
    
    // Close on cancel buttons
    const c1 = document.getElementById('cancel-edit-user-btn');
    const c2 = document.getElementById('cancel-edit-lesson-btn');
    const c3 = document.getElementById('cancel-edit-word-btn');
    const c4 = document.getElementById('cancel-create-user-btn');
    const c5 = document.getElementById('cancel-create-lesson-btn');
    const c6 = document.getElementById('cancel-create-word-btn');
    
    if (c1) c1.addEventListener('click', () => closeAdminModal('edit-user-modal'));
    if (c2) c2.addEventListener('click', () => closeAdminModal('edit-lesson-modal'));
    if (c3) c3.addEventListener('click', () => closeAdminModal('edit-word-modal'));
    if (c4) c4.addEventListener('click', () => closeAdminModal('create-user-modal'));
    if (c5) c5.addEventListener('click', () => closeAdminModal('create-lesson-modal'));
    if (c6) c6.addEventListener('click', () => closeAdminModal('create-word-modal'));
    
    // Close on &times; buttons
    const x1 = document.getElementById('close-edit-user-btn');
    const x2 = document.getElementById('close-edit-lesson-btn');
    const x3 = document.getElementById('close-edit-word-btn');
    const x4 = document.getElementById('close-create-user-btn');
    const x5 = document.getElementById('close-create-lesson-btn');
    const x6 = document.getElementById('close-create-word-btn');
    
    if (x1) x1.addEventListener('click', () => closeAdminModal('edit-user-modal'));
    if (x2) x2.addEventListener('click', () => closeAdminModal('edit-lesson-modal'));
    if (x3) x3.addEventListener('click', () => closeAdminModal('edit-word-modal'));
    if (x4) x4.addEventListener('click', () => closeAdminModal('create-user-modal'));
    if (x5) x5.addEventListener('click', () => closeAdminModal('create-lesson-modal'));
    if (x6) x6.addEventListener('click', () => closeAdminModal('create-word-modal'));
    
    // Bind submits
    if (elements.editUserForm) elements.editUserForm.addEventListener('submit', handleEditUser);
    if (elements.editLessonForm) elements.editLessonForm.addEventListener('submit', handleEditLesson);
    if (elements.editWordForm) elements.editWordForm.addEventListener('submit', handleEditWord);
    
    // Close modals when clicking overlay
    const modalIds = [
        'edit-user-modal', 'edit-lesson-modal', 'edit-word-modal',
        'create-user-modal', 'create-lesson-modal', 'create-word-modal'
    ];
    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
    });
}

function openAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function openEditUserModal(user) {
    if (!elements.editUserModal) return;
    
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-username').value = user.username;
    document.getElementById('edit-user-password').value = '';
    document.getElementById('edit-user-points').value = user.points;
    document.getElementById('edit-user-role').value = user.role;
    
    elements.editUserModal.style.display = 'flex';
}

async function handleEditUser(event) {
    event.preventDefault();
    const user = getSessionUser();
    if (!user) return;
    
    const userId = document.getElementById('edit-user-id').value;
    const username = document.getElementById('edit-user-username').value.trim();
    const password = document.getElementById('edit-user-password').value;
    const points = parseInt(document.getElementById('edit-user-points').value);
    const role = document.getElementById('edit-user-role').value;
    
    if (!username) return;
    
    const payload = { username, points, role };
    if (password) payload.password = password;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update user');
        
        closeAdminModal('edit-user-modal');
        await refreshUsersList();
        
        // If we updated ourselves, refresh header
        if (parseInt(userId) === user.id) {
            const selfResp = await fetch(`${CONFIG.API_URL}/users/${user.id}`);
            if (selfResp.ok) {
                const selfData = await selfResp.json();
                localStorage.setItem('quiz_me_user', JSON.stringify(selfData));
                loadAdminData();
            }
        }
        
        alert('User updated successfully!');
    } catch (e) {
        alert(e.message);
    }
}

function openEditLessonModal(lesson) {
    if (!elements.editLessonModal) return;
    
    document.getElementById('edit-lesson-id').value = lesson.id;
    document.getElementById('edit-lesson-title').value = lesson.title;
    document.getElementById('edit-lesson-desc').value = lesson.description || '';
    
    elements.editLessonModal.style.display = 'flex';
}

async function handleEditLesson(event) {
    event.preventDefault();
    const user = getSessionUser();
    if (!user) return;
    
    const lessonId = document.getElementById('edit-lesson-id').value;
    const title = document.getElementById('edit-lesson-title').value.trim();
    const description = document.getElementById('edit-lesson-desc').value.trim();
    
    if (!title) return;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/lessons/${lessonId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify({ title, description })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update lesson');
        
        closeAdminModal('edit-lesson-modal');
        await refreshLessonsList();
        alert('Lesson Card updated successfully!');
    } catch (e) {
        alert(e.message);
    }
}

function openEditWordModal(word) {
    if (!elements.editWordModal) return;
    
    document.getElementById('edit-word-id').value = word.id;
    document.getElementById('edit-word-lesson-id').value = word.lesson_id;
    document.getElementById('edit-word-chinese').value = word.chinese;
    document.getElementById('edit-word-pinyin').value = word.pinyin;
    document.getElementById('edit-word-english').value = word.english;
    
    let options = [];
    try {
        options = typeof word.options === 'string' ? JSON.parse(word.options) : word.options;
    } catch (e) {
        options = [word.english, '', '', ''];
    }
    
    document.getElementById('edit-word-opt-1').value = options[0] || '';
    document.getElementById('edit-word-opt-2').value = options[1] || '';
    document.getElementById('edit-word-opt-3').value = options[2] || '';
    document.getElementById('edit-word-opt-4').value = options[3] || '';
    
    elements.editWordModal.style.display = 'flex';
}

async function handleEditWord(event) {
    event.preventDefault();
    const user = getSessionUser();
    if (!user) return;
    
    const wordId = document.getElementById('edit-word-id').value;
    const chinese = document.getElementById('edit-word-chinese').value.trim();
    const pinyin = document.getElementById('edit-word-pinyin').value.trim();
    const english = document.getElementById('edit-word-english').value.trim();
    
    const opt1 = document.getElementById('edit-word-opt-1').value.trim();
    const opt2 = document.getElementById('edit-word-opt-2').value.trim();
    const opt3 = document.getElementById('edit-word-opt-3').value.trim();
    const opt4 = document.getElementById('edit-word-opt-4').value.trim();
    
    if (!chinese || !pinyin || !english || !opt1 || !opt2 || !opt3 || !opt4) {
        alert('All fields are required.');
        return;
    }
    
    const options = [opt1, opt2, opt3, opt4];
    if (!options.map(o => o.toLowerCase()).includes(english.toLowerCase())) {
        alert(`Warning: The English answer ("${english}") must be one of the four options!`);
        return;
    }
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/words/${wordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify({ chinese, pinyin, english, options })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update word');
        
        closeAdminModal('edit-word-modal');
        await refreshWordsList();
        alert('Word definition updated successfully!');
    } catch (e) {
        alert(e.message);
    }
}

// Simple HTML escaper to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    return text
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Auto-run when module is loaded
setupAdminView();
loadAdminData();
