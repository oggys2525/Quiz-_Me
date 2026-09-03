import CONFIG from './config.js';
import { getSessionUser, clearSessionUser } from './auth.js';

// DOM elements
const elements = {
    // Sidebar items
    sidebarBtnUsers: document.getElementById('sidebar-btn-users'),
    sidebarBtnLessons: document.getElementById('sidebar-btn-lessons'),
    sidebarBtnWords: document.getElementById('sidebar-btn-words'),
    sidebarBtnAiImporter: document.getElementById('sidebar-btn-ai-importer'),
    sidebarBtnExit: document.getElementById('sidebar-btn-exit'),
    sidebarBtnLogout: document.getElementById('sidebar-btn-logout'),
    
    // Views
    panelUsers: document.getElementById('admin-panel-users'),
    panelLessons: document.getElementById('admin-panel-lessons'),
    panelWords: document.getElementById('admin-panel-words'),
    panelAiImporter: document.getElementById('admin-panel-ai-importer'),
    
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
    aiLessonSelect: document.getElementById('ai-importer-lesson-id'),
    
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
    btnLogoutHeader: document.getElementById('btn-logout'),

    // Image Upload - Create Lesson
    lessonImageFile: document.getElementById('lesson-image-file'),
    lessonImageDropzone: document.getElementById('lesson-image-dropzone'),
    lessonImageIdle: document.getElementById('lesson-image-idle'),
    lessonImagePreviewWrap: document.getElementById('lesson-image-preview-wrap'),
    lessonImagePreview: document.getElementById('lesson-image-preview'),
    btnClearLessonImage: document.getElementById('btn-clear-lesson-image'),
    lessonImageUrlInput: document.getElementById('lesson-image-url-input'),
    lessonImageUrlHidden: document.getElementById('lesson-image-url'),

    // Image Upload - Edit Lesson
    editLessonImageFile: document.getElementById('edit-lesson-image-file'),
    editLessonImageDropzone: document.getElementById('edit-lesson-image-dropzone'),
    editLessonImageIdle: document.getElementById('edit-lesson-image-idle'),
    editLessonImagePreviewWrap: document.getElementById('edit-lesson-image-preview-wrap'),
    editLessonImagePreview: document.getElementById('edit-lesson-image-preview'),
    btnClearEditLessonImage: document.getElementById('btn-clear-edit-lesson-image'),
    editLessonImageUrlInput: document.getElementById('edit-lesson-image-url-input'),
    editLessonImageUrlHidden: document.getElementById('edit-lesson-image-url'),

    // AI Importer Elements
    aiPasteTextarea: document.getElementById('ai-paste-textarea'),
    aiBtnParse: document.getElementById('ai-btn-parse'),
    aiBtnClear: document.getElementById('ai-btn-clear'),
    aiBtnLoadExample: document.getElementById('ai-btn-load-example'),
    aiToggleCreateCourse: document.getElementById('ai-toggle-create-course'),
    aiCancelNewCourse: document.getElementById('ai-cancel-new-course'),
    aiSelectCourseBox: document.getElementById('ai-select-course-box'),
    aiCreateCourseBox: document.getElementById('ai-create-course-box'),
    aiNewCourseTitle: document.getElementById('ai-new-course-title'),
    aiNewCourseDesc: document.getElementById('ai-new-course-desc'),
    aiPreviewEmpty: document.getElementById('ai-preview-empty'),
    aiPreviewTableContainer: document.getElementById('ai-preview-table-container'),
    aiPreviewTableBody: document.getElementById('ai-preview-table-body'),
    aiDetectedCountBadge: document.getElementById('ai-detected-count-badge'),
    aiBtnSaveAll: document.getElementById('ai-btn-save-all'),
    aiBtnSaveAllBottom: document.getElementById('ai-btn-save-all-bottom'),
    aiSaveFooter: document.getElementById('ai-save-footer'),
    aiPreviewSummaryText: document.getElementById('ai-preview-summary-text'),
    btnGotoAiImporter: document.getElementById('btn-goto-ai-importer')
};

// Global cache for smart distractor generation
let cachedWordsPool = [];
let currentParsedWords = [];
let allLessonsList = [];

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
    if (elements.sidebarBtnAiImporter) elements.sidebarBtnAiImporter.addEventListener('click', () => switchAdminView('ai-importer'));
    if (elements.btnGotoAiImporter) elements.btnGotoAiImporter.addEventListener('click', () => switchAdminView('ai-importer'));
    
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
    if (elements.addUserForm) elements.addUserForm.addEventListener('submit', handleAddUser);
    if (elements.addLessonForm) elements.addLessonForm.addEventListener('submit', handleAddLesson);
    if (elements.addWordForm) elements.addWordForm.addEventListener('submit', handleAddWord);
    
    // Attach modal close/cancel listeners
    setupModalListeners();
    setupProfileDropdown();
    setupDropzones();
    setupAiImporter();
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
    [elements.sidebarBtnUsers, elements.sidebarBtnLessons, elements.sidebarBtnWords, elements.sidebarBtnAiImporter].forEach(btn => {
        if (btn) btn.classList.remove('active');
    });
    
    // Hide all view panels
    [elements.panelUsers, elements.panelLessons, elements.panelWords, elements.panelAiImporter].forEach(panel => {
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
    } else if (viewName === 'ai-importer') {
        if (elements.sidebarBtnAiImporter) elements.sidebarBtnAiImporter.classList.add('active');
        if (elements.panelAiImporter) elements.panelAiImporter.classList.add('active');
        refreshLessonsList();
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
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        
        if (elements.usersTableBody) {
            elements.usersTableBody.innerHTML = '';
            
            if (users.length === 0) {
                elements.usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No user accounts found.</td></tr>';
                return;
            }
            
            users.forEach(u => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${escapeHtml(u.username)}</strong></td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role.toUpperCase()}</span></td>
                    <td><strong>${u.points}</strong> pts</td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button class="btn-edit-row btn-action-edit" data-id="${u.id}">Edit</button>
                        <button class="btn-delete-row btn-action-delete" data-id="${u.id}">Delete</button>
                    </td>
                `;
                row.querySelector('.btn-edit-row').addEventListener('click', () => openEditUserModal(u));
                row.querySelector('.btn-delete-row').addEventListener('click', () => deleteUser(u.id, u.username));
                
                elements.usersTableBody.appendChild(row);
            });
        }
    } catch (e) {
        console.error('Error loading users:', e);
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

// ================= IMAGE UPLOAD HANDLING =================

async function uploadImageFile(file) {
    const user = getSessionUser();
    if (!user) throw new Error('Unauthorized');
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${CONFIG.API_URL}/upload`, {
        method: 'POST',
        headers: { 'X-User-Role': user.role },
        body: formData
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to upload image file');
    return data.url;
}

function setupDropzones() {
    // 1. Create Lesson Dropzone
    setupSingleDropzone({
        fileInput: elements.lessonImageFile,
        dropzone: elements.lessonImageDropzone,
        idleWrap: elements.lessonImageIdle,
        previewWrap: elements.lessonImagePreviewWrap,
        previewImg: elements.lessonImagePreview,
        clearBtn: elements.btnClearLessonImage,
        urlInput: elements.lessonImageUrlInput,
        hiddenUrl: elements.lessonImageUrlHidden
    });

    // 2. Edit Lesson Dropzone
    setupSingleDropzone({
        fileInput: elements.editLessonImageFile,
        dropzone: elements.editLessonImageDropzone,
        idleWrap: elements.editLessonImageIdle,
        previewWrap: elements.editLessonImagePreviewWrap,
        previewImg: elements.editLessonImagePreview,
        clearBtn: elements.btnClearEditLessonImage,
        urlInput: elements.editLessonImageUrlInput,
        hiddenUrl: elements.editLessonImageUrlHidden
    });
}

function setupSingleDropzone(cfg) {
    if (!cfg.dropzone || !cfg.fileInput) return;

    cfg.dropzone.addEventListener('click', (e) => {
        if (e.target === cfg.clearBtn || cfg.clearBtn.contains(e.target)) return;
        cfg.fileInput.click();
    });

    cfg.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        cfg.dropzone.classList.add('dragover');
    });

    cfg.dropzone.addEventListener('dragleave', () => {
        cfg.dropzone.classList.remove('dragover');
    });

    cfg.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        cfg.dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            cfg.fileInput.files = e.dataTransfer.files;
            handleFileSelect(e.dataTransfer.files[0], cfg);
        }
    });

    cfg.fileInput.addEventListener('change', () => {
        if (cfg.fileInput.files && cfg.fileInput.files[0]) {
            handleFileSelect(cfg.fileInput.files[0], cfg);
        }
    });

    if (cfg.clearBtn) {
        cfg.clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetDropzone(cfg);
        });
    }

    if (cfg.urlInput) {
        cfg.urlInput.addEventListener('input', () => {
            const url = cfg.urlInput.value.trim();
            if (url) {
                cfg.previewImg.src = url;
                cfg.previewWrap.style.display = 'flex';
                cfg.idleWrap.style.display = 'none';
                cfg.hiddenUrl.value = url;
            } else {
                resetDropzone(cfg);
            }
        });
    }
}

function handleFileSelect(file, cfg) {
    const objectUrl = URL.createObjectURL(file);
    cfg.previewImg.src = objectUrl;
    cfg.previewWrap.style.display = 'flex';
    cfg.idleWrap.style.display = 'none';
    if (cfg.urlInput) cfg.urlInput.value = '';
}

function resetDropzone(cfg) {
    if (cfg.fileInput) cfg.fileInput.value = '';
    if (cfg.urlInput) cfg.urlInput.value = '';
    if (cfg.hiddenUrl) cfg.hiddenUrl.value = '';
    if (cfg.previewImg) cfg.previewImg.src = '';
    if (cfg.previewWrap) cfg.previewWrap.style.display = 'none';
    if (cfg.idleWrap) cfg.idleWrap.style.display = 'flex';
}

// ================= LESSONS MANAGEMENT =================

async function refreshLessonsList() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/lessons`);
        if (!response.ok) throw new Error('Failed to load lessons');
        const lessons = await response.json();
        allLessonsList = lessons;
        
        // Populate dropdowns in single-word form and AI importer
        [elements.lessonSelect, elements.aiLessonSelect].forEach(sel => {
            if (sel) {
                const currentVal = sel.value;
                sel.innerHTML = '<option value="">-- Choose a Course / Lesson --</option>';
                lessons.forEach(lesson => {
                    const opt = document.createElement('option');
                    opt.value = lesson.id;
                    opt.textContent = `${lesson.title} (${lesson.word_count || 0} words)`;
                    sel.appendChild(opt);
                });
                if (currentVal) sel.value = currentVal;
            }
        });
        
        // Populate lessons table
        if (elements.lessonsTableBody) {
            elements.lessonsTableBody.innerHTML = '';
            if (lessons.length === 0) {
                elements.lessonsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No lessons available. Add one above!</td></tr>';
            } else {
                lessons.forEach(lesson => {
                    const row = document.createElement('tr');
                    
                    const thumbHtml = lesson.image_url 
                        ? `<img src="${escapeHtml(lesson.image_url)}" class="admin-lesson-thumb" onerror="this.outerHTML='<div class=\\'admin-lesson-thumb-fallback\\'>📖</div>';" />`
                        : `<div class="admin-lesson-thumb-fallback">📖</div>`;
                        
                    row.innerHTML = `
                        <td>${thumbHtml}</td>
                        <td><strong>${escapeHtml(lesson.title)}</strong></td>
                        <td style="color: var(--text-muted); font-size: 0.85rem; max-width: 250px;">${escapeHtml(lesson.description || '-')}</td>
                        <td><span style="background: rgba(255, 42, 116, 0.12); color: var(--pink-primary); border: 1px solid rgba(255, 42, 116, 0.25); padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 0.75rem;">${lesson.word_count || 0} Words</span></td>
                        <td style="text-align: right; white-space: nowrap;">
                            <button class="btn-action-addwords" data-id="${lesson.id}"><span>✨</span> + Add Words (AI)</button>
                            <button class="btn-edit-row btn-action-edit" data-id="${lesson.id}">Edit</button>
                            <button class="btn-delete-row btn-action-delete" data-id="${lesson.id}">Delete</button>
                        </td>
                    `;
                    
                    // Attach event listeners
                    row.querySelector('.btn-action-addwords').addEventListener('click', () => {
                        switchAdminView('ai-importer');
                        if (elements.aiLessonSelect) {
                            elements.aiLessonSelect.value = lesson.id;
                        }
                        if (elements.aiPasteTextarea) {
                            elements.aiPasteTextarea.focus();
                        }
                    });
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
    const submitBtn = document.getElementById('btn-submit-create-lesson');
    
    const title = titleInput.value.trim();
    const description = descInput.value.trim();
    
    if (!title) return;
    
    let imageUrl = '';
    
    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving Course...';
        }

        // Upload file if selected
        if (elements.lessonImageFile && elements.lessonImageFile.files && elements.lessonImageFile.files[0]) {
            imageUrl = await uploadImageFile(elements.lessonImageFile.files[0]);
        } else if (elements.lessonImageUrlInput && elements.lessonImageUrlInput.value.trim()) {
            imageUrl = elements.lessonImageUrlInput.value.trim();
        }
        
        const response = await fetch(`${CONFIG.API_URL}/lessons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify({ title, description, image_url: imageUrl })
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to create lesson');
        }
        
        titleInput.value = '';
        descInput.value = '';
        resetDropzone({
            fileInput: elements.lessonImageFile,
            urlInput: elements.lessonImageUrlInput,
            hiddenUrl: elements.lessonImageUrlHidden,
            previewImg: elements.lessonImagePreview,
            previewWrap: elements.lessonImagePreviewWrap,
            idleWrap: elements.lessonImageIdle
        });
        
        await refreshLessonsList();
        closeAdminModal('create-lesson-modal');
        alert('Lesson Card created successfully!');
    } catch (error) {
        alert(error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Lesson Card';
        }
    }
}

function openEditLessonModal(lesson) {
    if (!elements.editLessonModal) return;
    
    document.getElementById('edit-lesson-id').value = lesson.id;
    document.getElementById('edit-lesson-title').value = lesson.title;
    document.getElementById('edit-lesson-desc').value = lesson.description || '';
    
    // Set existing image preview if available
    const existingUrl = lesson.image_url || '';
    if (elements.editLessonImageUrlHidden) elements.editLessonImageUrlHidden.value = existingUrl;
    if (elements.editLessonImageUrlInput) elements.editLessonImageUrlInput.value = existingUrl;
    
    if (existingUrl) {
        elements.editLessonImagePreview.src = existingUrl;
        elements.editLessonImagePreviewWrap.style.display = 'flex';
        elements.editLessonImageIdle.style.display = 'none';
    } else {
        resetDropzone({
            fileInput: elements.editLessonImageFile,
            urlInput: elements.editLessonImageUrlInput,
            hiddenUrl: elements.editLessonImageUrlHidden,
            previewImg: elements.editLessonImagePreview,
            previewWrap: elements.editLessonImagePreviewWrap,
            idleWrap: elements.editLessonImageIdle
        });
    }
    
    elements.editLessonModal.style.display = 'flex';
}

async function handleEditLesson(event) {
    event.preventDefault();
    const user = getSessionUser();
    if (!user) return;
    
    const lessonId = document.getElementById('edit-lesson-id').value;
    const title = document.getElementById('edit-lesson-title').value.trim();
    const description = document.getElementById('edit-lesson-desc').value.trim();
    const submitBtn = document.getElementById('btn-submit-edit-lesson');
    
    if (!title) return;
    
    let imageUrl = elements.editLessonImageUrlHidden ? elements.editLessonImageUrlHidden.value : '';
    
    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';
        }

        // Check if new file selected
        if (elements.editLessonImageFile && elements.editLessonImageFile.files && elements.editLessonImageFile.files[0]) {
            imageUrl = await uploadImageFile(elements.editLessonImageFile.files[0]);
        } else if (elements.editLessonImageUrlInput && elements.editLessonImageUrlInput.value.trim()) {
            imageUrl = elements.editLessonImageUrlInput.value.trim();
        }
        
        const response = await fetch(`${CONFIG.API_URL}/lessons/${lessonId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify({ title, description, image_url: imageUrl })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update lesson');
        
        closeAdminModal('edit-lesson-modal');
        await refreshLessonsList();
        alert('Lesson Card updated successfully!');
    } catch (e) {
        alert(e.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        }
    }
}

async function deleteLesson(lessonId, lessonTitle) {
    if (!confirm(`Are you sure you want to delete "${lessonTitle}"? This will ALSO delete all vocabulary words in this lesson!`)) {
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
        
        // Cache pool of definitions for distractor generation
        cachedWordsPool = words.map(w => w.english).filter(Boolean);
        
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

// ================= AI SMART IMPORTER (CHAT AI PASTE) =================

function setupAiImporter() {
    if (elements.aiBtnParse) {
        elements.aiBtnParse.addEventListener('click', handleAiParse);
    }

    if (elements.aiBtnClear) {
        elements.aiBtnClear.addEventListener('click', () => {
            if (elements.aiPasteTextarea) elements.aiPasteTextarea.value = '';
            clearAiPreview();
        });
    }

    if (elements.aiBtnLoadExample) {
        elements.aiBtnLoadExample.addEventListener('click', () => {
            if (elements.aiPasteTextarea) {
                elements.aiPasteTextarea.value = 
`早上好 | zǎoshang hǎo | Good morning (អរុណសួស្តី)
晚上好 | wǎnshang hǎo | Good evening (រាត្រីសួស្តី)
谢谢 (xièxie) - Thank you (អរគុណ)
不客气 (bú kèqi) - You're welcome (មិនអីទេ)
1. 苹果 / píngguǒ / Apple (ផ្លែប៉ោម)
2. 西瓜 / xīguā / Watermelon (ឪឡឹក)
3. 喝茶 / hē chá / Drink tea (ផឹកតែ)`;
                handleAiParse();
            }
        });
    }

    if (elements.aiToggleCreateCourse) {
        elements.aiToggleCreateCourse.addEventListener('click', () => {
            elements.aiSelectCourseBox.style.display = 'none';
            elements.aiCreateCourseBox.style.display = 'block';
            elements.aiToggleCreateCourse.style.display = 'none';
        });
    }

    if (elements.aiCancelNewCourse) {
        elements.aiCancelNewCourse.addEventListener('click', () => {
            elements.aiSelectCourseBox.style.display = 'block';
            elements.aiCreateCourseBox.style.display = 'none';
            elements.aiToggleCreateCourse.style.display = 'inline-block';
        });
    }

    const saveAction = () => handleAiSaveAll();
    if (elements.aiBtnSaveAll) elements.aiBtnSaveAll.addEventListener('click', saveAction);
    if (elements.aiBtnSaveAllBottom) elements.aiBtnSaveAllBottom.addEventListener('click', saveAction);
}

function clearAiPreview() {
    currentParsedWords = [];
    if (elements.aiPreviewEmpty) elements.aiPreviewEmpty.style.display = 'block';
    if (elements.aiPreviewTableContainer) elements.aiPreviewTableContainer.style.display = 'none';
    if (elements.aiDetectedCountBadge) elements.aiDetectedCountBadge.style.display = 'none';
    if (elements.aiBtnSaveAll) elements.aiBtnSaveAll.style.display = 'none';
    if (elements.aiSaveFooter) elements.aiSaveFooter.style.display = 'none';
    if (elements.aiPreviewTableBody) elements.aiPreviewTableBody.innerHTML = '';
}

function parseVocabularyLine(rawLine) {
    let line = rawLine.trim();
    if (!line) return null;

    // Remove leading list numbers e.g. "1.", "1)", "- ", "* ", "• "
    line = line.replace(/^[\d]+[\.\)]\s*/, '').replace(/^[-*•]\s*/, '').trim();
    if (!line) return null;

    let chinese = '';
    let pinyin = '';
    let english = '';

    // Strategy 1: Check for explicit delimiters: | or \t or /
    const delimiters = ['|', '\t', '/'];
    for (const d of delimiters) {
        if (line.includes(d)) {
            const parts = line.split(d).map(p => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                chinese = parts[0];
                pinyin = parts[1];
                english = parts.slice(2).join(' / ');
                return { chinese, pinyin, english };
            } else if (parts.length === 2) {
                chinese = parts[0];
                english = parts[1];
                // Pinyin might be in parentheses inside chinese or english
                const pyMatch = (chinese + ' ' + english).match(/\(([^)]+)\)/);
                if (pyMatch) {
                    pinyin = pyMatch[1];
                    chinese = chinese.replace(/\([^)]+\)/, '').trim();
                    english = english.replace(/\([^)]+\)/, '').trim();
                }
                return { chinese, pinyin, english };
            }
        }
    }

    // Strategy 2: Chinese characters extraction using Unicode regex [\u4e00-\u9fa5]+
    const chineseMatch = line.match(/[\u4e00-\u9fa5]{1,10}/);
    if (chineseMatch) {
        chinese = chineseMatch[0];
        
        // Remove Chinese from line to parse remaining
        let remainder = line.replace(chinese, ' ').trim();
        
        // Check for pinyin in parentheses: (nǐ hǎo) or [nǐ hǎo]
        const pinyinBracketMatch = remainder.match(/[\(\[]([a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s]+)[\)\]]/i);
        if (pinyinBracketMatch) {
            pinyin = pinyinBracketMatch[1].trim();
            remainder = remainder.replace(pinyinBracketMatch[0], ' ').trim();
        }

        // Clean up separators like -, :, =, etc. from remaining text
        remainder = remainder.replace(/^[\s\-:=—]+/, '').trim();

        // If pinyin still empty, check if first token of remainder is Latin pinyin
        if (!pinyin) {
            const tokens = remainder.split(/\s+/);
            if (tokens.length >= 2 && /^[a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/i.test(tokens[0])) {
                pinyin = tokens[0];
                remainder = tokens.slice(1).join(' ');
            }
        }

        english = remainder.replace(/^[\s\-:=—]+/, '').trim();
        return { chinese, pinyin, english };
    }

    return null;
}

function handleAiParse() {
    if (!elements.aiPasteTextarea) return;
    const text = elements.aiPasteTextarea.value.trim();
    if (!text) {
        alert('Please paste some vocabulary words first!');
        return;
    }

    const lines = text.split('\n');
    const parsed = [];

    lines.forEach(rawLine => {
        const item = parseVocabularyLine(rawLine);
        if (item && item.chinese && item.english) {
            // Normalize pinyin if missing
            if (!item.pinyin) item.pinyin = item.chinese;
            parsed.push(item);
        }
    });

    if (parsed.length === 0) {
        alert('Could not detect vocabulary words from the text. Try using formats like:\n\n你好 | nǐ hǎo | hello\n谢谢 (xièxie) - thank you');
        return;
    }

    // Generate smart quiz options for each parsed word
    const batchEnglishList = parsed.map(p => p.english);
    const combinedCandidatePool = Array.from(new Set([...cachedWordsPool, ...batchEnglishList]));

    parsed.forEach((item, idx) => {
        const otherDistractors = combinedCandidatePool.filter(ans => ans.toLowerCase() !== item.english.toLowerCase());
        let distractors = [];
        
        // Pick 3 random distractors
        const shuffled = [...otherDistractors].sort(() => 0.5 - Math.random());
        distractors = shuffled.slice(0, 3);
        
        // Fallbacks if pool is too small
        const defaultFallbacks = ['Yes', 'No', 'Good', 'Water', 'Friend', 'Book', 'Go'];
        for (const fb of defaultFallbacks) {
            if (distractors.length >= 3) break;
            if (fb.toLowerCase() !== item.english.toLowerCase() && !distractors.includes(fb)) {
                distractors.push(fb);
            }
        }

        const options = [item.english, ...distractors].sort(() => 0.5 - Math.random());
        item.options = options;
    });

    currentParsedWords = parsed;
    renderAiPreview(parsed);
}

function renderAiPreview(words) {
    if (!elements.aiPreviewTableBody) return;

    elements.aiPreviewTableBody.innerHTML = '';

    words.forEach((w, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="color: var(--text-muted); font-size: 0.8rem;">${idx + 1}</td>
            <td><span style="font-family: var(--font-chinese); font-size: 1.25rem; font-weight: bold; color: var(--text-white);">${escapeHtml(w.chinese)}</span></td>
            <td><span style="color: var(--pink-primary); font-weight: 600;">${escapeHtml(w.pinyin)}</span></td>
            <td><strong>${escapeHtml(w.english)}</strong></td>
            <td>
                <div class="options-preview-wrap">
                    ${w.options.map(opt => `
                        <span class="quiz-opt-pill ${opt.toLowerCase() === w.english.toLowerCase() ? 'correct' : ''}">
                            ${opt.toLowerCase() === w.english.toLowerCase() ? '✓ ' : ''}${escapeHtml(opt)}
                        </span>
                    `).join('')}
                </div>
            </td>
            <td style="text-align: right;">
                <button type="button" class="btn-remove-preview" data-index="${idx}" style="position: static; width: 22px; height: 22px; font-size: 0.9rem;" title="Remove this word">&times;</button>
            </td>
        `;

        row.querySelector('.btn-remove-preview').addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            currentParsedWords.splice(index, 1);
            renderAiPreview(currentParsedWords);
        });

        elements.aiPreviewTableBody.appendChild(row);
    });

    // Update UI headers & counts
    if (elements.aiPreviewEmpty) elements.aiPreviewEmpty.style.display = words.length === 0 ? 'block' : 'none';
    if (elements.aiPreviewTableContainer) elements.aiPreviewTableContainer.style.display = words.length > 0 ? 'block' : 'none';
    
    if (elements.aiDetectedCountBadge) {
        elements.aiDetectedCountBadge.style.display = words.length > 0 ? 'inline-block' : 'none';
        elements.aiDetectedCountBadge.textContent = `${words.length} Words`;
    }

    if (elements.aiBtnSaveAll) elements.aiBtnSaveAll.style.display = words.length > 0 ? 'inline-flex' : 'none';
    if (elements.aiSaveFooter) elements.aiSaveFooter.style.display = words.length > 0 ? 'flex' : 'none';
    
    if (elements.aiPreviewSummaryText) {
        elements.aiPreviewSummaryText.textContent = `✨ ${words.length} vocabulary words ready to be set to your course.`;
    }
}

async function handleAiSaveAll() {
    const user = getSessionUser();
    if (!user) return;

    if (!currentParsedWords || currentParsedWords.length === 0) {
        alert('Please parse words first before saving.');
        return;
    }

    let targetLessonId = null;
    let targetLessonTitle = '';

    const isCreatingNewCourse = elements.aiCreateCourseBox && elements.aiCreateCourseBox.style.display !== 'none';

    try {
        // Option A: Create New Course Inline
        if (isCreatingNewCourse) {
            const newTitle = elements.aiNewCourseTitle ? elements.aiNewCourseTitle.value.trim() : '';
            const newDesc = elements.aiNewCourseDesc ? elements.aiNewCourseDesc.value.trim() : '';

            if (!newTitle) {
                alert('Please enter a Title for the new Course / Lesson!');
                if (elements.aiNewCourseTitle) elements.aiNewCourseTitle.focus();
                return;
            }

            const courseResp = await fetch(`${CONFIG.API_URL}/lessons`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Role': user.role
                },
                body: JSON.stringify({ title: newTitle, description: newDesc })
            });
            const courseData = await courseResp.json();
            if (!courseResp.ok) throw new Error(courseData.error || 'Failed to create new course');
            
            targetLessonId = courseData.id;
            targetLessonTitle = courseData.title;
        } else {
            // Option B: Use Selected Course
            if (!elements.aiLessonSelect || !elements.aiLessonSelect.value) {
                alert('Please choose a Target Course / Lesson from the dropdown (or click "+ Create New Course Instead")!');
                if (elements.aiLessonSelect) elements.aiLessonSelect.focus();
                return;
            }
            targetLessonId = parseInt(elements.aiLessonSelect.value);
            targetLessonTitle = elements.aiLessonSelect.options[elements.aiLessonSelect.selectedIndex].text;
        }

        // Disable save buttons while saving
        if (elements.aiBtnSaveAll) elements.aiBtnSaveAll.disabled = true;
        if (elements.aiBtnSaveAllBottom) elements.aiBtnSaveAllBottom.disabled = true;

        // Bulk insert words
        const response = await fetch(`${CONFIG.API_URL}/words/bulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Role': user.role
            },
            body: JSON.stringify({
                lesson_id: targetLessonId,
                words: currentParsedWords
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save words to course');

        alert(`🎉 Success! Added ${data.count} words to "${targetLessonTitle}".`);

        // Reset AI Importer
        if (elements.aiPasteTextarea) elements.aiPasteTextarea.value = '';
        if (elements.aiNewCourseTitle) elements.aiNewCourseTitle.value = '';
        if (elements.aiNewCourseDesc) elements.aiNewCourseDesc.value = '';
        clearAiPreview();

        // Refresh database views
        await refreshLessonsList();
        await refreshWordsList();

        // Switch to words view so user sees newly imported list
        switchAdminView('words');
    } catch (e) {
        alert(e.message);
    } finally {
        if (elements.aiBtnSaveAll) elements.aiBtnSaveAll.disabled = false;
        if (elements.aiBtnSaveAllBottom) elements.aiBtnSaveAllBottom.disabled = false;
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
