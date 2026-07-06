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
        loadAdminData();
    });
    
    window.addEventListener('quizClosed', () => {
        loadLessons();
        loadLeaderboard();
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
            if (data.user.role === 'admin') {
                elements.tabAdmin.style.display = 'block';
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
        
        try {
            const user = await login(usernameVal, passwordVal);
            showAppShell(user);
            // Reset form
            elements.loginForm.reset();
        } catch (err) {
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
        
        if (passwordVal !== confirmPasswordVal) {
            showAlert('Passwords do not match.');
            return;
        }
        
        try {
            const user = await register(emailVal, usernameVal, passwordVal);
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
// Metadata for mapping topics, categories, colors, and emojis
const TOPICS_DEFINITION = {
    "Fruit ផ្លែឈើ": { category: "Nature ធម្មជាតិ", emoji: "🍎", color: "red" },
    "Animals សត្វ": { category: "Nature ធម្មជាតិ", emoji: "🐶", color: "green" },
    "Greetings 问候": { category: "Basics មូលដ្ឋាន", emoji: "👋", color: "blue" },
    "Numbers 数字": { category: "Basics មូលដ្ឋាន", emoji: "🔢", color: "purple" },
    "Colors 颜色": { category: "Basics មូលដ្ឋាន", emoji: "🎨", color: "yellow" },
    "Food & Drink 饮食": { category: "Basics មូលដ្ឋាន", emoji: "🍜", color: "orange" },
    "Sports 运动": { category: "Basics មូលដ្ឋាន", emoji: "⚽", color: "blue" }
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
    "Animals (动物)": "Animals សត្វ",
    "Sports (运动)": "Sports 运动"
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
    "Animals (动物)": "Lesson 1: Common Animals",
    "Sports (运动)": "Lesson 1: Popular Sports"
};

let currentActiveCategory = "Nature ធម្មជាតិ"; // Default category
let allLoadedLessons = [];

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
    if (!tabContainer) return;
    
    const categories = ["Nature ធម្មជាតិ", "Basics មូលដ្ឋាន"];
    
    tabContainer.innerHTML = `
        <div class="category-bar">
            ${categories.map(cat => `
                <button class="category-tab ${cat === currentActiveCategory ? 'active' : ''}" data-category="${cat}">
                    ${cat}
                </button>
            `).join('')}
        </div>
    `;
    
    tabContainer.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentActiveCategory = tab.getAttribute('data-category');
            tabContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderLessonsGrid();
        });
    });
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
    
    const filtered = allLoadedLessons.filter(lesson => {
        const topic = LESSON_TO_TOPIC_MAP[lesson.title];
        const def = TOPICS_DEFINITION[topic] || { category: "Basics មូលដ្ឋាន" };
        return def.category === currentActiveCategory;
    });
    
    // Group lessons by topic and fetch word counts
    const topicWordCounts = {};
    const topicLessonCounts = {};
    
    // Fetch word count for each lesson
    const wordCounts = {};
    for (const lesson of allLoadedLessons) {
        const wordsResponse = await fetch(`${CONFIG.API_URL}/lessons/${lesson.id}/words`);
        if (wordsResponse.ok) {
            const words = await wordsResponse.json();
            wordCounts[lesson.title] = words.length;
        } else {
            wordCounts[lesson.title] = 0;
        }
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
    
    // Filter topics by category
    const topicsToShow = Object.keys(TOPICS_DEFINITION).filter(topic => {
        return TOPICS_DEFINITION[topic].category === currentActiveCategory;
    });
    
    if (topicsToShow.length === 0) {
        grid.innerHTML = '<p style="color: #64748b; text-align: center; grid-column: 1/-1; padding: 40px;">No topics available in this category.</p>';
        return;
    }
    
    topicsToShow.forEach(topic => {
        const def = TOPICS_DEFINITION[topic];
        const wordCount = topicWordCounts[topic] || 0;
        const lessonCount = topicLessonCounts[topic] || 0;
        
        const card = document.createElement('div');
        card.className = `lesson-card color-${def.color}`;
        
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
        
        card.innerHTML = `
            <div class="lesson-card-emoji">${def.emoji}</div>
            <div class="lesson-card-title">${escapeHtml(topic)}</div>
            <div class="lesson-card-count">📖 ${wordCount} ${wordCount === 1 ? 'Word' : 'Words'}</div>
        `;
        
        if (lessonCount > 0 && wordCount > 0) {
            card.addEventListener('click', () => {
                showTopicDetails(topic, def.emoji);
            });
        } else {
            card.style.opacity = '0.5';
            card.style.cursor = 'not-allowed';
            card.title = "No lessons/words added yet";
        }
        
        grid.appendChild(card);
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
