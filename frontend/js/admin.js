import CONFIG from './config.js';
import { getSessionUser } from './auth.js';

// DOM elements
const elements = {
    addLessonForm: document.getElementById('add-lesson-form'),
    addWordForm: document.getElementById('add-word-form'),
    lessonSelect: document.getElementById('word-lesson-id'),
    lessonsTableBody: document.getElementById('lessons-table-body'),
    wordsTableBody: document.getElementById('words-table-body'),
    adminTabBtn: document.getElementById('tab-admin')
};

export function setupAdminView() {
    const user = getSessionUser();
    if (!user || user.role !== 'admin') {
        if (elements.adminTabBtn) elements.adminTabBtn.style.display = 'none';
        return;
    }
    
    if (elements.adminTabBtn) elements.adminTabBtn.style.display = 'inline-block';
    
    // Attach event listeners for admin forms
    if (elements.addLessonForm) {
        elements.addLessonForm.addEventListener('submit', handleAddLesson);
    }
    if (elements.addWordForm) {
        elements.addWordForm.addEventListener('submit', handleAddWord);
    }
}

export async function loadAdminData() {
    const user = getSessionUser();
    if (!user || user.role !== 'admin') return;

    await refreshLessonsList();
    await refreshWordsList();
}

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
                elements.lessonsTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No lessons available. Add one above!</td></tr>';
            } else {
                lessons.forEach(lesson => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><strong>${escapeHtml(lesson.title)}</strong></td>
                        <td>${escapeHtml(lesson.description || '-')}</td>
                        <td style="text-align: right;">
                            <button class="btn-delete-row" data-id="${lesson.id}">Delete</button>
                        </td>
                    `;
                    // Attach delete handler
                    row.querySelector('.btn-delete-row').addEventListener('click', () => deleteLesson(lesson.id, lesson.title));
                    elements.lessonsTableBody.appendChild(row);
                });
            }
        }
    } catch (e) {
        console.error('Error listing lessons:', e);
    }
}

async function refreshWordsList() {
    try {
        const lessonsResponse = await fetch(`${CONFIG.API_URL}/lessons`);
        if (!lessonsResponse.ok) throw new Error('Failed to fetch lessons');
        const lessons = await lessonsResponse.json();
        
        if (elements.wordsTableBody) {
            elements.wordsTableBody.innerHTML = '';
            let totalWords = 0;
            
            // Loop through all lessons to pull all words (since database matches them by lesson_id)
            for (const lesson of lessons) {
                const wordsResponse = await fetch(`${CONFIG.API_URL}/lessons/${lesson.id}/words`);
                if (!wordsResponse.ok) continue;
                const words = await wordsResponse.json();
                
                words.forEach(word => {
                    totalWords++;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><span style="font-family: var(--font-chinese); font-size: 1.15rem; font-weight: bold;">${escapeHtml(word.chinese)}</span></td>
                        <td><span style="color: var(--pink-primary); font-weight: 500;">${escapeHtml(word.pinyin)}</span></td>
                        <td><strong>${escapeHtml(word.english)}</strong></td>
                        <td><span style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(lesson.title)}</span></td>
                        <td style="text-align: right;">
                            <button class="btn-delete-row" data-id="${word.id}">Delete</button>
                        </td>
                    `;
                    // Attach delete handler
                    row.querySelector('.btn-delete-row').addEventListener('click', () => deleteWord(word.id, word.chinese));
                    elements.wordsTableBody.appendChild(row);
                });
            }
            
            if (totalWords === 0) {
                elements.wordsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No words available. Add one above!</td></tr>';
            }
        }
    } catch (e) {
        console.error('Error listing words:', e);
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
        
        // Reset form and reload
        titleInput.value = '';
        descInput.value = '';
        await refreshLessonsList();
        
        // Dispatch event so dashboard updates list
        window.dispatchEvent(new Event('lessonsUpdated'));
        alert('Lesson added successfully!');
    } catch (error) {
        alert(error.message);
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
        alert(`Warning: The English answer ("${english}") must be one of the four multiple-choice options so the quiz can be solved!`);
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
        
        // Reset form inputs (excluding lesson selector for easier batch entries)
        document.getElementById('word-chinese-input').value = '';
        document.getElementById('word-pinyin-input').value = '';
        document.getElementById('word-english-input').value = '';
        document.getElementById('word-opt-1').value = '';
        document.getElementById('word-opt-2').value = '';
        document.getElementById('word-opt-3').value = '';
        document.getElementById('word-opt-4').value = '';
        
        await refreshWordsList();
        window.dispatchEvent(new Event('lessonsUpdated')); // triggers total counts refresh
        alert('Word added successfully!');
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
        window.dispatchEvent(new Event('lessonsUpdated'));
    } catch (e) {
        alert(e.message);
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
        window.dispatchEvent(new Event('lessonsUpdated'));
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
