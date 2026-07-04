import CONFIG from './config.js';
import { getSessionUser, login, register, clearSessionUser } from './auth.js';
import { startQuiz } from './quiz.js';
import { setupAdminView, loadAdminData } from './admin.js';

// DOM elements
const elements = {
    // Top-level containers
    authWrapper: document.getElementById('auth-wrapper'),
    appShell: document.getElementById('app-shell'),
    
    // Auth Forms
    loginCard: document.getElementById('login-card'),
    registerCard: document.getElementById('register-card'),
    alertBox: document.getElementById('alert-box'),
    
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    
    gotoRegister: document.getElementById('goto-register'),
    gotoLogin: document.getElementById('goto-login'),
    
    // Header details
    headerUsername: document.getElementById('header-username'),
    headerPoints: document.getElementById('header-points'),
    btnLogout: document.getElementById('btn-logout'),
    
    // Navigation Tabs
    tabLessons: document.getElementById('tab-lessons'),
    tabLeaderboard: document.getElementById('tab-leaderboard'),
    tabAdmin: document.getElementById('tab-admin'),
    
    // Page Sections
    secLessons: document.getElementById('sec-lessons'),
    secLeaderboard: document.getElementById('sec-leaderboard'),
    secAdmin: document.getElementById('sec-admin'),
    
    // Dynamic Contents
    lessonsGrid: document.getElementById('lessons-grid'),
    leaderboardList: document.getElementById('leaderboard-list')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupAuthListeners();
    setupTabListeners();
    
    // Check if user is logged in
    const user = getSessionUser();
    if (user) {
        showAppShell(user);
    } else {
        showAuthForms('login');
    }
    
    // Register event listeners for updates
    window.addEventListener('pointsUpdated', (e) => {
        updateHeader(e.detail);
    });
    
    window.addEventListener('lessonsUpdated', () => {
        loadLessons();
        loadAdminData();
    });
    
    window.addEventListener('quizClosed', () => {
        loadLessons();
        loadLeaderboard();
    });
}

/* Authentication UI Handlers */
function setupAuthListeners() {
    // Form toggle links
    elements.gotoRegister.addEventListener('click', () => showAuthForms('register'));
    elements.gotoLogin.addEventListener('click', () => showAuthForms('login'));
    
    // Login Form Submit
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        
        const usernameVal = document.getElementById('login-username').value;
        const passwordVal = document.getElementById('login-password').value;
        
        try {
            const user = await login(usernameVal, passwordVal);
            showAppShell(user);
            // Reset form
            elements.loginForm.reset();
        } catch (err) {
            showAlert(err.message || 'Invalid username or password.');
        }
    });
    
    // Register Form Submit
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        
        const usernameVal = document.getElementById('reg-username').value;
        const passwordVal = document.getElementById('reg-password').value;
        const confirmPasswordVal = document.getElementById('reg-confirm-password').value;
        
        if (passwordVal !== confirmPasswordVal) {
            showAlert('Passwords do not match.');
            return;
        }
        
        try {
            const user = await register(usernameVal, passwordVal);
            showAppShell(user);
            elements.registerForm.reset();
        } catch (err) {
            showAlert(err.message || 'Registration failed.');
        }
    });
    
    // Logout Button Click
    elements.btnLogout.addEventListener('click', () => {
        clearSessionUser();
        elements.appShell.style.display = 'none';
        elements.authWrapper.style.display = 'flex';
        showAuthForms('login');
    });
}

function showAuthForms(mode) {
    hideAlert();
    elements.authWrapper.style.display = 'flex';
    elements.appShell.style.display = 'none';
    
    if (mode === 'login') {
        elements.loginCard.style.display = 'block';
        elements.registerCard.style.display = 'none';
    } else {
        elements.loginCard.style.display = 'none';
        elements.registerCard.style.display = 'block';
    }
}

function showAppShell(user) {
    elements.authWrapper.style.display = 'none';
    elements.appShell.style.display = 'block';
    
    updateHeader(user);
    setupAdminView();
    
    // Check if tabs have admin class
    const tabNav = document.querySelector('.tabs-navigation');
    if (user.role === 'admin') {
        tabNav.classList.add('has-admin');
    } else {
        tabNav.classList.remove('has-admin');
    }
    
    // Switch to lessons page by default
    switchTab('lessons');
    
    // Load fresh data
    loadLessons();
    loadLeaderboard();
    loadAdminData();
}

function updateHeader(user) {
    elements.headerUsername.textContent = user.username;
    elements.headerPoints.textContent = user.points;
    
    // If admin is logged in, append an (Admin) badge
    if (user.role === 'admin') {
        elements.headerUsername.innerHTML = `${user.username} <span style="font-size:0.75rem; color:var(--pink-primary); border: 1px solid var(--pink-primary); padding:1px 4px; border-radius:3px; margin-left:4px;">ADMIN</span>`;
    }
}

function showAlert(message, isSuccess = false) {
    elements.alertBox.textContent = message;
    elements.alertBox.style.display = 'block';
    if (isSuccess) {
        elements.alertBox.classList.add('success');
    } else {
        elements.alertBox.classList.remove('success');
    }
}

function hideAlert() {
    elements.alertBox.style.display = 'none';
}

/* Tabs Switching Handlers */
function setupTabListeners() {
    elements.tabLessons.addEventListener('click', () => switchTab('lessons'));
    elements.tabLeaderboard.addEventListener('click', () => switchTab('leaderboard'));
    if (elements.tabAdmin) {
        elements.tabAdmin.addEventListener('click', () => switchTab('admin'));
    }
}

function switchTab(tabName) {
    // Reset all tabs active states
    elements.tabLessons.classList.remove('active');
    elements.tabLeaderboard.classList.remove('active');
    if (elements.tabAdmin) elements.tabAdmin.classList.remove('active');
    
    // Hide all sections
    elements.secLessons.classList.remove('active');
    elements.secLeaderboard.classList.remove('active');
    elements.secAdmin.classList.remove('active');
    
    // Set active
    if (tabName === 'lessons') {
        elements.tabLessons.classList.add('active');
        elements.secLessons.classList.add('active');
        loadLessons();
    } else if (tabName === 'leaderboard') {
        elements.tabLeaderboard.classList.add('active');
        elements.secLeaderboard.classList.add('active');
        loadLeaderboard();
    } else if (tabName === 'admin') {
        if (elements.tabAdmin) elements.tabAdmin.classList.add('active');
        elements.secAdmin.classList.add('active');
        loadAdminData();
    }
}

/* Content Loading Functions */
async function loadLessons() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/lessons`);
        if (!response.ok) throw new Error('Could not load lessons');
        const lessons = await response.json();
        
        elements.lessonsGrid.innerHTML = '';
        
        if (lessons.length === 0) {
            elements.lessonsGrid.innerHTML = '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">No lessons available yet. Check back later!</p>';
            return;
        }
        
        for (const lesson of lessons) {
            // Fetch word counts dynamically per lesson
            const wordsResponse = await fetch(`${CONFIG.API_URL}/lessons/${lesson.id}/words`);
            let wordCount = 0;
            if (wordsResponse.ok) {
                const words = await wordsResponse.json();
                wordCount = words.length;
            }
            
            const card = document.createElement('div');
            card.className = 'lesson-card';
            card.innerHTML = `
                <div class="lesson-card-header">
                    <h3 class="lesson-title">${escapeHtml(lesson.title)}</h3>
                    <p class="lesson-desc">${escapeHtml(lesson.description || 'No description provided.')}</p>
                </div>
                <div class="lesson-card-footer">
                    <span class="lesson-stats">📖 ${wordCount} ${wordCount === 1 ? 'Word' : 'Words'}</span>
                    <button class="btn-play-lesson" ${wordCount === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;" title="No words added yet"' : ''}>Start Quiz</button>
                </div>
            `;
            
            // Start quiz button listener
            if (wordCount > 0) {
                card.querySelector('.btn-play-lesson').addEventListener('click', () => {
                    startQuiz(lesson.id, lesson.title);
                });
            }
            
            elements.lessonsGrid.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading lessons:', error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/leaderboard`);
        if (!response.ok) throw new Error('Could not load leaderboard');
        const leaderboard = await response.json();
        
        elements.leaderboardList.innerHTML = '';
        
        if (leaderboard.length === 0) {
            elements.leaderboardList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No ranking data yet. Take quizzes to rank up!</p>';
            return;
        }
        
        leaderboard.forEach((row, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';
            
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <div class="leaderboard-rank ${rankClass}">${rank}</div>
                <div class="leaderboard-user-info">
                    <span class="leaderboard-name">${escapeHtml(row.username)} ${row.role === 'admin' ? '<span style="font-size:0.65rem; border:1px solid #ff2a74; color:#ff2a74; padding:0 3px; border-radius:2px; vertical-align:middle; margin-left:3px;">ADMIN</span>' : ''}</span>
                </div>
                <div class="leaderboard-score">${row.points} pts</div>
            `;
            
            elements.leaderboardList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
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
