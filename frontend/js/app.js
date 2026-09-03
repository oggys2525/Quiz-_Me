import CONFIG from './config.js';
import { getSessionUser, saveSessionUser, login, register, clearSessionUser } from './auth.js';
import { startQuiz } from './quiz.js';

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
    headerUsername: document.getElementById('dropdown-username'),
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
    setupPasswordToggles();
    setupProfileDropdown();
    
    // Check if user is logged in
    const user = getSessionUser();
    if (user) {
        refreshUserSessionAndLoad(user);
    } else {
        showAuthForms('login');
    }
    
    // Back button listener for sub-lessons detail view
    const btnBack = document.getElementById('btn-back-to-topics');
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            document.getElementById('sub-lessons-container').style.display = 'none';
            document.getElementById('topics-container').style.display = 'block';
        });
    }
    
    // Register event listeners for updates
    window.addEventListener('pointsUpdated', (e) => {
        updateHeader(e.detail);
    });
    
    window.addEventListener('lessonsUpdated', () => {
        loadLessons();
    });
    
    window.addEventListener('quizClosed', () => {
        loadLessons();
        loadLeaderboard();
    });
}

function setupPasswordToggles() {
    const toggleBtns = document.querySelectorAll('.password-toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const wrapper = btn.closest('.password-input-wrapper');
            const input = wrapper.querySelector('input');
            
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.815 7.815 3 3m-3-3-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                `;
            } else {
                input.type = 'password';
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                `;
            }
            
            // Retain focus on password input so typing is uninterrupted
            input.focus();
        });
    });
}

async function refreshUserSessionAndLoad(user) {
    // Show the app shell immediately with local cached details as fallback
    showAppShell(user);
    try {
        const response = await fetch(`${CONFIG.API_URL}/users/${user.id}`);
        if (response.ok) {
            const data = await response.json();
            saveSessionUser(data.user);
            updateHeader(data.user);
            
            // Sync admin tab visibility if roles changed
            const tabNav = document.querySelector('.tabs-navigation');
            if (data.user && data.user.role && data.user.role.toLowerCase() === 'admin') {
                elements.tabAdmin.style.display = 'inline-block';
                tabNav.classList.add('has-admin');
            } else {
                elements.tabAdmin.style.display = 'none';
                tabNav.classList.remove('has-admin');
            }
        } else if (response.status === 404) {
            // User deleted from DB
            clearSessionUser();
            elements.appShell.style.display = 'none';
            elements.authWrapper.style.display = 'flex';
            showAuthForms('login');
        }
    } catch (err) {
        console.warn("Could not sync user session with backend:", err);
    }
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
        
        const btn = elements.loginForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> Signing In...`;
        
        try {
            const user = await login(usernameVal, passwordVal);
            showAlert('Welcome back! Logging you in...', true);
            
            setTimeout(() => {
                showAppShell(user);
                elements.loginForm.reset();
                btn.disabled = false;
                btn.textContent = originalText;
                hideAlert();
            }, 1000);
        } catch (err) {
            btn.disabled = false;
            btn.textContent = originalText;
            showAlert(err.message || 'Invalid username/email or password.');
        }
    });
    
    // Register Form Submit
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        
        const emailVal = document.getElementById('reg-email').value;
        const usernameVal = document.getElementById('reg-username').value;
        const passwordVal = document.getElementById('reg-password').value;
        const confirmPasswordVal = document.getElementById('reg-confirm-password').value;
        const roleVal = document.getElementById('reg-role').value;
        
        if (passwordVal !== confirmPasswordVal) {
            showAlert('Passwords do not match.');
            return;
        }
        
        const btn = elements.registerForm.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> Registering...`;
        
        try {
            const user = await register(emailVal, usernameVal, passwordVal, roleVal);
            showAlert('Registration successful! Logging you in...', true);
            
            setTimeout(() => {
                showAppShell(user);
                elements.registerForm.reset();
                btn.disabled = false;
                btn.textContent = originalText;
                hideAlert();
            }, 1000);
        } catch (err) {
            btn.disabled = false;
            btn.textContent = originalText;
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
    const urlParams = new URLSearchParams(window.location.search);
    const forceUserView = urlParams.get('view') === 'user';
    if (user && user.role && user.role.toLowerCase() === 'admin' && !forceUserView) {
        window.location.href = 'admin.html';
        return;
    }

    elements.authWrapper.style.display = 'none';
    elements.appShell.style.display = 'flex';
    
    updateHeader(user);
    
    // Check if tabs have admin class
    const tabNav = document.querySelector('.tabs-navigation');
    if (user && user.role && user.role.toLowerCase() === 'admin') {
        tabNav.classList.add('has-admin');
        if (elements.tabAdmin) elements.tabAdmin.style.display = 'inline-block';
    } else {
        tabNav.classList.remove('has-admin');
        if (elements.tabAdmin) elements.tabAdmin.style.display = 'none';
    }
    
    // Switch to lessons page by default
    switchTab('lessons');
    
    // Load fresh data
    loadLeaderboard();
}

function updateHeader(user) {
    // Set avatar letters
    const avatarEl = document.getElementById('profile-avatar');
    const dropdownAvatarEl = document.getElementById('dropdown-avatar');
    const firstLetter = user.username ? user.username.charAt(0).toUpperCase() : 'U';
    
    if (avatarEl) avatarEl.textContent = firstLetter;
    if (dropdownAvatarEl) dropdownAvatarEl.textContent = firstLetter;
    
    if (elements.headerUsername) elements.headerUsername.textContent = user.username;
    if (elements.headerPoints) elements.headerPoints.textContent = user.points;
    
    // Set dropdown points
    const dropdownPointsEl = document.getElementById('dropdown-points');
    if (dropdownPointsEl) dropdownPointsEl.textContent = user.points;
    
    // Set dropdown role
    const dropdownRoleEl = document.getElementById('dropdown-role');
    if (dropdownRoleEl) {
        if (user.role === 'admin') {
            dropdownRoleEl.innerHTML = `<span style="font-size:0.65rem; color:var(--pink-primary); border: 1px solid var(--pink-primary); padding:1px 4px; border-radius:3px; font-weight:800; display:inline-block;">ADMIN</span>`;
        } else {
            dropdownRoleEl.textContent = 'USER';
        }
    }
}

let alertTimeout = null;

function showAlert(message, isSuccess = false) {
    elements.alertBox.innerHTML = `${isSuccess ? '✅' : '⚠️'} ${message}`;
    elements.alertBox.style.display = 'block';
    
    // Reset classes
    elements.alertBox.classList.remove('success', 'shake');
    elements.alertBox.style.animation = 'none';
    elements.alertBox.offsetHeight; // Force DOM reflow
    
    if (isSuccess) {
        elements.alertBox.classList.add('success');
        elements.alertBox.style.animation = 'toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    } else {
        elements.alertBox.classList.add('shake');
        elements.alertBox.style.animation = 'toast-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), toast-shake 0.4s ease';
    }
    
    // Auto-dismiss after 3.5 seconds
    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
        hideAlert();
    }, 3500);
}

function hideAlert() {
    elements.alertBox.style.display = 'none';
    elements.alertBox.classList.remove('shake', 'success');
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
    if (elements.secAdmin) elements.secAdmin.classList.remove('active');
    
    const mainHeader = document.querySelector('header');
    const mainNav = document.querySelector('.tabs-navigation');
    const appShell = document.getElementById('app-shell');
    
    // Toggle header and tab bar visibility based on admin view
    if (tabName === 'admin') {
        if (mainHeader) mainHeader.style.display = 'flex'; // Keep header visible
        if (mainNav) mainNav.style.display = 'none'; // Hide user navigation tabs
        if (appShell) appShell.classList.add('admin-mode');
    } else {
        if (mainHeader) mainHeader.style.display = 'flex';
        if (mainNav) mainNav.style.display = 'flex';
        if (appShell) appShell.classList.remove('admin-mode');
    }
    
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
        window.location.href = 'admin.html';
    }
}

/* Content Loading Functions */
// Metadata for mapping topics, categories, colors, and emojis
const TOPICS_DEFINITION = {
    "HSK 1 Vocabulary (HSK 1 词汇)": { category: "HSK Levels", emoji: "📕", color: "blue" },
    "HSK 2 Vocabulary (HSK 2 词汇)": { category: "HSK Levels", emoji: "📗", color: "yellow" },
    "HSK 3 Vocabulary (HSK 3 词汇)": { category: "HSK Levels", emoji: "📘", color: "purple" },
    "Animals (动物 / សត្វ)": { category: "Nature ធម្មជាតិ", emoji: "🐅", color: "green" },
    "Health & Symptoms (健康与症状)": { category: "Health", emoji: "🏥", color: "purple" },
    "Fruit ផ្លែឈើ": { category: "Nature ធម្មជាតិ", emoji: "🍎", color: "red" },
    "Greetings 问候": { category: "Basics មូលដ្ឋាន", emoji: "👋", color: "blue" },
    "Numbers 数字": { category: "Basics មូលដ្ឋាន", emoji: "🔢", color: "purple" },
    "Colors 颜色": { category: "Basics មូលដ្ឋាន", emoji: "🎨", color: "yellow" },
    "Food & Drink 饮食": { category: "Basics មូលដ្ឋាន", emoji: "🍜", color: "orange" },
    "Sports 运动": { category: "Basics មូលដ្ឋាន", emoji: "⚽", color: "blue" },
    "Chinese New Year (春节)": { category: "Basics មូលដ្ឋាន", emoji: "🧧", color: "pink" }
};

const LESSON_TO_TOPIC_MAP = {
    "Greetings (问候)": "Greetings 问候",
    "Numbers (数字)": "Numbers 数字",
    "Colors (颜色)": "Colors 颜色",
    "Food & Drink (饮食)": "Food & Drink 饮食",
    "Fruits Part 1 (水果 ភាគ ១)": "Fruit ផ្លែឈើ",
    "Fruits Part 2 (水果 ភាគ ២)": "Fruit ផ្លែឈើ",
    "Fruits Part 3 (水果 ភាគ ៣)": "Fruit ផ្លែឈើ",
    "Fruits Part 4 (水果 ភាគ ៤)": "Fruit ផ្លែឈើ",
    "Animals (动物)": "Animals (动物 / សត្វ)",
    "Health & Symptoms (健康与症状)": "Health & Symptoms (健康与症状)",
    "HSK 1 Part 1 (HSK 1 ភាគ ១)": "HSK 1 Vocabulary (HSK 1 词汇)",
    "HSK 1 Part 2 (HSK 1 ភាគ ២)": "HSK 1 Vocabulary (HSK 1 词汇)",
    "HSK 1 Part 3 (HSK 1 ភាគ ៣)": "HSK 1 Vocabulary (HSK 1 词汇)",
    "HSK 1 Part 4 (HSK 1 ភាគ ៤)": "HSK 1 Vocabulary (HSK 1 词汇)",
    "HSK 1 Part 5 (HSK 1 ភាគ ៥)": "HSK 1 Vocabulary (HSK 1 词汇)",
    "HSK 1 Part 6 (HSK 1 ភាគ ៦)": "HSK 1 Vocabulary (HSK 1 词汇)",
    "HSK 2 Part 1 (HSK 2 ភាគ ១)": "HSK 2 Vocabulary (HSK 2 词汇)",
    "HSK 2 Part 2 (HSK 2 ភាគ ២)": "HSK 2 Vocabulary (HSK 2 词汇)",
    "HSK 2 Part 3 (HSK 2 ភាគ ៣)": "HSK 2 Vocabulary (HSK 2 词汇)",
    "HSK 2 Part 4 (HSK 2 ភាគ ៤)": "HSK 2 Vocabulary (HSK 2 词汇)",
    "HSK 2 Part 5 (HSK 2 ភាគ ៥)": "HSK 2 Vocabulary (HSK 2 词汇)",
    "HSK 2 Part 6 (HSK 2 ភាគ ៦)": "HSK 2 Vocabulary (HSK 2 词汇)",
    "HSK 2 Part 7 (HSK 2 ភាគ ៧)": "HSK 2 Vocabulary (HSK 2 词汇)",
    "HSK 3 Part 1 (HSK 3 ភាគ ១)": "HSK 3 Vocabulary (HSK 3 词汇)",
    "HSK 3 Part 2 (HSK 3 ភាគ ២)": "HSK 3 Vocabulary (HSK 3 词汇)",
    "HSK 3 Part 3 (HSK 3 ភាគ ៣)": "HSK 3 Vocabulary (HSK 3 词汇)",
    "HSK 3 Part 4 (HSK 3 ភាគ ៤)": "HSK 3 Vocabulary (HSK 3 词汇)",
    "HSK 3 Part 5 (HSK 3 ភាគ ៥)": "HSK 3 Vocabulary (HSK 3 词汇)",
    "HSK 3 Part 6 (HSK 3 ភាគ ៦)": "HSK 3 Vocabulary (HSK 3 词汇)",
    "HSK 3 Part 7 (HSK 3 ភាគ ៧)": "HSK 3 Vocabulary (HSK 3 词汇)",
    "HSK 3 Part 8 (HSK 3 ភាគ ៨)": "HSK 3 Vocabulary (HSK 3 词汇)",
    "Sports (运动)": "Sports 运动",
    "Chinese New Year (春节)": "Chinese New Year (春节)"
};

const LESSON_SUBTITLE_MAP = {
    "Greetings (问候)": "Lesson 1: Common Greetings",
    "Numbers (数字)": "Lesson 1: Count 1 to 10",
    "Colors (颜色)": "Lesson 1: Common Colors",
    "Food & Drink (饮食)": "Lesson 1: Food & Beverages",
    "Fruits Part 1 (水果 ភាគ ១)": "Lesson 1: Common Fruits",
    "Fruits Part 2 (水果 ភាគ ២)": "Lesson 2: Tropical Fruits",
    "Fruits Part 3 (水果 ភាគ ៣)": "Lesson 3: Citrus & Berries",
    "Fruits Part 4 (水果 ភាគ ៤)": "Lesson 4: Melons & Exotic Fruits",
    "Animals (动物)": "Lesson 1: 12 Common Animals (សត្វ ១២ ប្រភេទ)",
    "Health & Symptoms (健康与症状)": "Lesson 1: Health & Symptoms (សុខភាព និងរោគសញ្ញា)",
    "HSK 1 Part 1 (HSK 1 ភាគ ១)": "Lesson 1: Words 1 to 26 (ពាក្យ ១ - ២៦)",
    "HSK 1 Part 2 (HSK 1 ភាគ ២)": "Lesson 2: Words 27 to 53 (ពាក្យ ២៧ - ៥៣)",
    "HSK 1 Part 3 (HSK 1 ភាគ ៣)": "Lesson 3: Words 54 to 78 (ពាក្យ ៥៤ - ៧៨)",
    "HSK 1 Part 4 (HSK 1 ភាគ ៤)": "Lesson 4: Words 79 to 104 & Idiom (ពាក្យ ៧៩ - ១០៤)",
    "HSK 1 Part 5 (HSK 1 ភាគ ៥)": "Lesson 5: Words 105 to 130 (ពាក្យ ១០៥ - ១៣០)",
    "HSK 1 Part 6 (HSK 1 ភាគ ៦)": "Lesson 6: Words 131 to 156 (ពាក្យ ១៣១ - ១៥៦)",
    "HSK 2 Part 1 (HSK 2 ភាគ ១)": "Lesson 1: Words 157 to 182 (ពាក្យ ១៥៧ - ១៨២)",
    "HSK 2 Part 2 (HSK 2 ភាគ ២)": "Lesson 2: Words 183 to 208 (ពាក្យ ១៨៣ - ២០៨)",
    "HSK 2 Part 3 (HSK 2 ភាគ ៣)": "Lesson 3: Words 209 to 235 (ពាក្យ ២០៩ - ២៣៥)",
    "HSK 2 Part 4 (HSK 2 ភាគ ៤)": "Lesson 4: Words 236 to 260 (ពាក្យ ២៣៦ - ២៦០)",
    "HSK 2 Part 5 (HSK 2 ភាគ ៥)": "Lesson 5: Words 261 to 286 (ពាក្យ ២៦១ - ២៨៦)",
    "HSK 2 Part 6 (HSK 2 ភាគ ៦)": "Lesson 6: Words 287 to 312 (ពាក្យ ២៨៧ - ៣១២)",
    "HSK 2 Part 7 (HSK 2 ភាគ ៧)": "Lesson 7: Essential HSK 2 Words (ពាក្យ HSK 2 សំខាន់ៗ)",
    "HSK 3 Part 1 (HSK 3 ភាគ ១)": "Lesson 1: Words 313 to 338 (ពាក្យ ៣១៣ - ៣៣៨)",
    "HSK 3 Part 2 (HSK 3 ភាគ ២)": "Lesson 2: Words 339 to 364 (ពាក្យ ៣៣៩ - ៣៦៤)",
    "HSK 3 Part 3 (HSK 3 ភាគ ៣)": "Lesson 3: Words 365 to 389 (ពាក្យ ៣៦៥ - ៣៨៩)",
    "HSK 3 Part 4 (HSK 3 ភាគ ៤)": "Lesson 4: Words 390 to 414 (ពាក្យ ៣៩០ - ៤១៤)",
    "HSK 3 Part 5 (HSK 3 ភាគ ៥)": "Lesson 5: Words 415 to 440 (ពាក្យ ៤១៥ - ៤៤០)",
    "HSK 3 Part 6 (HSK 3 ភាគ ៦)": "Lesson 6: Words 441 to 466 (ពាក្យ ៤៤១ - ៤៦៦)",
    "HSK 3 Part 7 (HSK 3 ភាគ ៧)": "Lesson 7: Words 467 to 492 (ពាក្យ ៤៦៧ - ៤៩២)",
    "HSK 3 Part 8 (HSK 3 ភាគ ៨)": "Lesson 8: Words 493 to 518 (ពាក្យ ៤៩៣ - ៥១៨)",
    "Sports (运动)": "Lesson 1: Popular Sports",
    "Chinese New Year (春节)": "Lesson 1: New Year Wishes"
};

let currentActiveCategory = "Nature ធម្មជាតិ"; // Default category
let allLoadedLessons = [];
let scrollRevealObserver = null;

function getScrollRevealObserver() {
    if (!scrollRevealObserver) {
        scrollRevealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    scrollRevealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.05,
            root: document.querySelector('main')
        });
    }
    return scrollRevealObserver;
}

async function loadLessons() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/lessons`);
        if (!response.ok) throw new Error('Could not load lessons');
        allLoadedLessons = await response.json();
        
        renderCategoryTabs();
        await renderLessonsGrid();
    } catch (error) {
        console.error('Error loading lessons:', error);
    }
}

function renderCategoryTabs() {
    const tabContainer = document.getElementById('category-tabs-container');
    if (tabContainer) {
        tabContainer.style.display = 'none'; // Hide the category switcher tabs completely
    }
}

async function renderLessonsGrid() {
    const grid = document.getElementById('lessons-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Dynamically map any new lessons created via Admin Panel that are not in static mappings
    allLoadedLessons.forEach(lesson => {
        if (!LESSON_TO_TOPIC_MAP[lesson.title]) {
            LESSON_TO_TOPIC_MAP[lesson.title] = lesson.title;
            LESSON_SUBTITLE_MAP[lesson.title] = `Lesson 1: ${lesson.title}`;
            TOPICS_DEFINITION[lesson.title] = {
                category: "Basics មូលដ្ឋាន",
                emoji: "📖",
                color: "pink"
            };
        }
    });
    
    // Group lessons by topic and fetch word counts
    const topicWordCounts = {};
    const topicLessonCounts = {};
    
    // Calculate word count for each lesson from pre-calculated lesson.word_count
    const wordCounts = {};
    for (const lesson of allLoadedLessons) {
        wordCounts[lesson.title] = lesson.word_count || 0;
    }
    
    // Accumulate counts for each topic
    Object.keys(TOPICS_DEFINITION).forEach(topic => {
        topicWordCounts[topic] = 0;
        topicLessonCounts[topic] = 0;
    });
    
    allLoadedLessons.forEach(lesson => {
        const topic = LESSON_TO_TOPIC_MAP[lesson.title];
        if (topic) {
            topicWordCounts[topic] += (wordCounts[lesson.title] || 0);
            topicLessonCounts[topic] += 1;
        }
    });
    
    // Show all topics together
    const topicsToShow = Object.keys(TOPICS_DEFINITION);
    
    if (topicsToShow.length === 0) {
        grid.innerHTML = '<p style="color: #64748b; text-align: center; grid-column: 1/-1; padding: 40px;">No topics available.</p>';
        return;
    }
    
    topicsToShow.forEach((topic, index) => {
        const def = TOPICS_DEFINITION[topic];
        const wordCount = topicWordCounts[topic] || 0;
        const lessonCount = topicLessonCounts[topic] || 0;
        
        const card = document.createElement('div');
        card.className = `lesson-card color-${def.color} reveal-card`;
        card.style.transitionDelay = `${index * 60}ms`;
        
        let bg = "rgba(255, 255, 255, 0.02)", border = "rgba(255, 255, 255, 0.08)", text = "var(--text-white)";
        if (def.color === 'red') {
            bg = "rgba(239, 68, 68, 0.08)"; border = "rgba(239, 68, 68, 0.25)"; text = "#ef4444";
        } else if (def.color === 'green') {
            bg = "rgba(16, 185, 129, 0.08)"; border = "rgba(16, 185, 129, 0.25)"; text = "#10b981";
        } else if (def.color === 'blue') {
            bg = "rgba(59, 130, 246, 0.08)"; border = "rgba(59, 130, 246, 0.25)"; text = "#3b82f6";
        } else if (def.color === 'purple') {
            bg = "rgba(139, 92, 246, 0.08)"; border = "rgba(139, 92, 246, 0.25)"; text = "#8b5cf6";
        } else if (def.color === 'yellow') {
            bg = "rgba(245, 158, 11, 0.08)"; border = "rgba(245, 158, 11, 0.25)"; text = "#f59e0b";
        } else if (def.color === 'orange') {
            bg = "rgba(249, 115, 22, 0.08)"; border = "rgba(249, 115, 22, 0.25)"; text = "#f97316";
        } else if (def.color === 'pink') {
            bg = "rgba(255, 42, 116, 0.08)"; border = "rgba(255, 42, 116, 0.25)"; text = "#ff2a74";
        }
        
        card.style.backgroundColor = bg;
        card.style.border = `2px solid ${border}`;
        card.style.color = text;
        
        // Find if any matched lesson has an uploaded image
        const matchedTopicLessons = allLoadedLessons.filter(l => LESSON_TO_TOPIC_MAP[l.title] === topic || l.title === topic);
        const cardImg = matchedTopicLessons.find(l => l.image_url)?.image_url;
        
        if (cardImg) {
            card.classList.add('has-image');
            card.innerHTML = `
                <div class="lesson-card-img-wrapper">
                    <img src="${escapeHtml(cardImg)}" alt="${escapeHtml(topic)}" class="lesson-card-img" onerror="this.parentElement.style.display='none'; this.closest('.lesson-card').classList.remove('has-image');" />
                    <div class="lesson-card-img-overlay"></div>
                </div>
                <div class="lesson-card-content">
                    <div class="lesson-card-title">${escapeHtml(topic)}</div>
                    <div class="lesson-card-count">📖 ${wordCount} ${wordCount === 1 ? 'Word' : 'Words'}</div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="lesson-card-emoji">${def.emoji}</div>
                <div class="lesson-card-title">${escapeHtml(topic)}</div>
                <div class="lesson-card-count">📖 ${wordCount} ${wordCount === 1 ? 'Word' : 'Words'}</div>
            `;
        }
        
        if (lessonCount > 0 && wordCount > 0) {
            card.addEventListener('click', () => {
                const matchedLessons = allLoadedLessons.filter(lesson => LESSON_TO_TOPIC_MAP[lesson.title] === topic);
                if (matchedLessons.length === 1) {
                    startQuiz(matchedLessons[0].id, matchedLessons[0].title);
                } else {
                    showTopicDetails(topic, def.emoji);
                }
            });
        } else {
            card.style.opacity = '0.5';
            card.style.cursor = 'not-allowed';
            card.title = "No lessons/words added yet";
        }
        
        grid.appendChild(card);
        getScrollRevealObserver().observe(card);
    });
}

function showTopicDetails(topicName, emoji) {
    const topicsContainer = document.getElementById('topics-container');
    const subLessonsContainer = document.getElementById('sub-lessons-container');
    const subLessonsTitle = document.getElementById('sub-lessons-topic-title');
    const subLessonsEmoji = document.getElementById('sub-lessons-topic-emoji');
    const subLessonsList = document.getElementById('sub-lessons-list');
    
    if (!topicsContainer || !subLessonsContainer || !subLessonsList) return;
    
    // Set headers
    subLessonsTitle.textContent = topicName;
    subLessonsEmoji.textContent = emoji;
    
    // Filter database lessons mapping to this topic
    const matchedLessons = allLoadedLessons.filter(lesson => {
        return LESSON_TO_TOPIC_MAP[lesson.title] === topicName;
    });
    
    subLessonsList.innerHTML = '';
    
    matchedLessons.forEach((lesson, index) => {
        const row = document.createElement('div');
        row.className = 'sub-lesson-row';
        
        const subtitle = LESSON_SUBTITLE_MAP[lesson.title] || `Lesson ${index + 1}: ${lesson.title}`;
        
        row.innerHTML = `
            <div class="row-left">
                <div class="row-icon-circle">
                    <span class="row-icon">📖</span>
                </div>
                <span class="row-title">${escapeHtml(subtitle)}</span>
            </div>
            <span class="row-arrow">&rsaquo;</span>
        `;
        
        row.addEventListener('click', () => {
            startQuiz(lesson.id, lesson.title);
        });
        
        subLessonsList.appendChild(row);
    });
    
    // Transition views
    topicsContainer.style.display = 'none';
    subLessonsContainer.style.display = 'block';
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

function setupProfileDropdown() {
    const avatar = document.getElementById('profile-avatar');
    const dropdown = document.getElementById('profile-dropdown');
    
    if (!avatar || !dropdown) return;
    
    avatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== avatar) {
            dropdown.classList.remove('active');
        }
    });
}
