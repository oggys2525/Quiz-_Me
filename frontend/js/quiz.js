import CONFIG from './config.js';
import { getSessionUser, updateSessionPoints } from './auth.js';

let quizState = {
    lessonId: null,
    lessonTitle: '',
    words: [],
    currentIndex: 0,
    score: 0, // points gained in this session
    correctCount: 0,
    totalQuestions: 0,
    timer: null,
    timeLimit: 10, // 10 seconds per question
    timeLeft: 10,
    timerInterval: null,
    canAnswer: false,
    quizMode: 'qa', // 'qa' (សំណួរចម្លើយ), 'blank' (បំពេញពាក្យ), 'arrange' (រៀបពាក្យ)
    correctMissingChar: '',
    arrangeAnswer: [], // Array of { char, scrambledIdx, btnElement }
    arrangeTarget: []  // Array of target characters in correct order
};

// UI Elements mapping
const elements = {
    overlay: document.getElementById('quiz-overlay'),
    progressText: document.getElementById('quiz-progress-text'),
    progressFill: document.getElementById('quiz-progress-fill'),
    timerFill: document.getElementById('timer-bar-fill'),
    chineseWord: document.getElementById('word-chinese'),
    pinyinWord: document.getElementById('word-pinyin'),
    choicesGrid: document.getElementById('choices-grid'),
    
    // Gameplay Area vs Result Summary Area
    gameplayArea: document.getElementById('quiz-gameplay'),
    resultView: document.getElementById('quiz-result-view'),
    
    // Results
    resultEmoji: document.getElementById('result-emoji'),
    resultTitle: document.getElementById('result-title'),
    resultDesc: document.getElementById('result-desc'),
    resultAccuracy: document.getElementById('result-accuracy'),
    resultPoints: document.getElementById('result-points'),
    btnRestart: document.getElementById('btn-result-restart'),
    
    closeBtn: document.getElementById('quiz-close'),

    // Mode Select elements
    modeSelect: document.getElementById('quiz-mode-select'),
    progressWrapper: document.getElementById('quiz-progress-wrapper'),
    timerContainer: document.getElementById('timer-bar-container'),
    quizInstruction: document.getElementById('quiz-instruction'),

    // Arrange containers
    arrangeContainer: document.getElementById('arrange-container'),
    arrangeSlots: document.getElementById('arrange-slots'),
    arrangeScrambled: document.getElementById('arrange-scrambled'),

    // Mode select buttons
    btnModeQA: document.getElementById('btn-mode-qa'),
    btnModeBlank: document.getElementById('btn-mode-blank'),
    btnModeArrange: document.getElementById('btn-mode-arrange')
};

export async function startQuiz(lessonId, lessonTitle) {
    try {
        // Fetch lesson words
        const response = await fetch(`${CONFIG.API_URL}/lessons/${lessonId}/words`);
        if (!response.ok) throw new Error('Failed to load quiz words');
        const words = await response.json();
        
        if (words.length === 0) {
            alert("This lesson doesn't have any words yet. Admin needs to add words.");
            return;
        }

        // Initialize state
        quizState.lessonId = lessonId;
        quizState.lessonTitle = lessonTitle;
        quizState.words = shuffleArray(words);
        quizState.currentIndex = 0;
        quizState.score = 0;
        quizState.correctCount = 0;
        quizState.totalQuestions = words.length;
        
        // Show overlay and Mode Selection, hide game details
        elements.overlay.style.display = 'flex';
        elements.modeSelect.style.display = 'block';
        elements.progressWrapper.style.display = 'none';
        elements.timerContainer.style.display = 'none';
        elements.gameplayArea.style.display = 'none';
        elements.resultView.style.display = 'none';
        
    } catch (error) {
        console.error("Error starting quiz:", error);
        alert("Error loading quiz words.");
    }
}

function selectMode(mode) {
    quizState.quizMode = mode;
    
    // Hide mode select screen
    elements.modeSelect.style.display = 'none';
    
    // Show progress and gameplay details
    elements.progressWrapper.style.display = 'block';
    elements.timerContainer.style.display = 'block';
    elements.gameplayArea.style.display = 'block';
    
    showQuestion();
}

function getModeKhmerName(mode) {
    if (mode === 'qa') return 'សំណួរចម្លើយ';
    if (mode === 'blank') return 'បំពេញពាក្យ';
    if (mode === 'arrange') return 'រៀបពាក្យ';
    return '';
}

function showQuestion() {
    if (quizState.currentIndex >= quizState.totalQuestions) {
        endQuiz();
        return;
    }
    
    const word = quizState.words[quizState.currentIndex];
    
    // Update progress bar & text
    const progressPercent = (quizState.currentIndex / quizState.totalQuestions) * 100;
    elements.progressFill.style.width = `${progressPercent}%`;
    elements.progressText.innerHTML = `
        <span>សំណួរ ${quizState.currentIndex + 1} នៃ ${quizState.totalQuestions}</span> 
        <span>មេរៀន: ${quizState.lessonTitle} (${getModeKhmerName(quizState.quizMode)})</span>
    `;
    
    // Hide all containers initially, then enable relevant view
    elements.choicesGrid.style.display = 'none';
    elements.arrangeContainer.style.display = 'none';
    
    if (quizState.quizMode === 'qa') {
        // Mode 1: Multiple Choice Q&A (សំណួរចម្លើយ)
        elements.choicesGrid.style.display = 'grid';
        elements.quizInstruction.innerHTML = '<strong>Choose the correct English translation / ជ្រើសរើសចម្លើយត្រឹមត្រូវ៖</strong>';
        
        elements.chineseWord.textContent = word.chinese;
        elements.pinyinWord.textContent = word.pinyin;
        
        elements.choicesGrid.innerHTML = '';
        const options = shuffleArray([...word.options]);
        
        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = option;
            btn.addEventListener('click', () => handleAnswer(option, btn));
            elements.choicesGrid.appendChild(btn);
        });
        
    } else if (quizState.quizMode === 'blank') {
        // Mode 2: Fill in the Blank (បំពេញពាក្យ)
        elements.choicesGrid.style.display = 'grid';
        
        // Hide one random character of the Chinese word
        const chars = Array.from(word.chinese);
        const blankIndex = Math.floor(Math.random() * chars.length);
        quizState.correctMissingChar = chars[blankIndex];
        chars[blankIndex] = '_';
        const displayWord = chars.join(' ');
        
        elements.quizInstruction.innerHTML = `<strong>Fill in the blank character / បំពេញតួអក្សរក្នុងចន្លោះ៖</strong> <span style="color: var(--pink-primary); margin-left: 8px;">(${word.english})</span>`;
        
        elements.chineseWord.textContent = displayWord;
        elements.pinyinWord.textContent = word.pinyin;
        
        elements.choicesGrid.innerHTML = '';
        
        // Gather character distractors from current lesson words
        let charPool = [];
        quizState.words.forEach(w => {
            Array.from(w.chinese).forEach(c => {
                if (c !== quizState.correctMissingChar && !charPool.includes(c)) {
                    charPool.push(c);
                }
            });
        });
        
        // Use basic chinese character fillers if pool is small
        const fillers = ['你', '我', '好', '是', '不', '们', '这', '那', '水', '火', '山', '人', '口', '天'];
        while (charPool.length < 3) {
            const f = fillers[Math.floor(Math.random() * fillers.length)];
            if (f !== quizState.correctMissingChar && !charPool.includes(f)) {
                charPool.push(f);
            }
        }
        
        const distractors = shuffleArray(charPool).slice(0, 3);
        const choices = shuffleArray([quizState.correctMissingChar, ...distractors]);
        
        choices.forEach(char => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = char;
            // Center the Chinese character in button & style it
            btn.style.fontFamily = 'var(--font-chinese)';
            btn.style.fontSize = '1.8rem';
            btn.style.justifyContent = 'center';
            btn.style.padding = '10px 20px';
            btn.addEventListener('click', () => handleAnswer(char, btn));
            elements.choicesGrid.appendChild(btn);
        });
        
    } else if (quizState.quizMode === 'arrange') {
        // Mode 3: Arrange Characters (រៀបពាក្យ)
        elements.arrangeContainer.style.display = 'flex';
        elements.quizInstruction.innerHTML = '<strong>Arrange the characters in correct order / រៀបពាក្យឱ្យបានត្រឹមត្រូវ៖</strong>';
        
        const targetChars = Array.from(word.chinese);
        quizState.arrangeTarget = targetChars;
        quizState.arrangeAnswer = [];
        
        // Show blanks representing characters
        const slotsRepresent = targetChars.map(() => '_').join(' ');
        elements.chineseWord.textContent = slotsRepresent;
        elements.pinyinWord.textContent = `${word.pinyin} (${word.english})`;
        
        // Build empty slots elements
        elements.arrangeSlots.className = 'arrange-slots';
        elements.arrangeSlots.innerHTML = '';
        for (let i = 0; i < targetChars.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'arrange-slot';
            slot.id = `arrange-slot-${i}`;
            slot.textContent = '_';
            slot.addEventListener('click', () => handleSlotClick(i));
            elements.arrangeSlots.appendChild(slot);
        }
        
        // Build scrambled buttons elements
        elements.arrangeScrambled.innerHTML = '';
        const scrambled = shuffleArray([...targetChars]);
        scrambled.forEach((char, idx) => {
            const btn = document.createElement('button');
            btn.className = 'scrambled-btn';
            btn.id = `scrambled-btn-${idx}`;
            btn.textContent = char;
            btn.addEventListener('click', () => handleScrambledClick(char, idx, btn));
            elements.arrangeScrambled.appendChild(btn);
        });
    }
    
    quizState.canAnswer = true;
    startTimer();
}

function startTimer() {
    clearInterval(quizState.timerInterval);
    quizState.timeLeft = quizState.timeLimit;
    updateTimerUI();
    
    const intervalMs = 100;
    const totalSteps = quizState.timeLimit * 10;
    let currentStep = totalSteps;
    
    elements.timerFill.style.transition = 'none';
    elements.timerFill.style.width = '100%';
    
    quizState.timerInterval = setInterval(() => {
        currentStep--;
        quizState.timeLeft = currentStep / 10;
        
        const widthPercent = (currentStep / totalSteps) * 100;
        elements.timerFill.style.width = `${widthPercent}%`;
        
        if (currentStep <= 0) {
            clearInterval(quizState.timerInterval);
            handleTimeout();
        }
    }, intervalMs);
}

function updateTimerUI() {
    elements.timerFill.style.width = '100%';
}

function handleAnswer(selectedOption, clickedBtn) {
    if (!quizState.canAnswer) return;
    quizState.canAnswer = false;
    clearInterval(quizState.timerInterval);
    
    const word = quizState.words[quizState.currentIndex];
    let isCorrect = false;
    let correctValue = '';
    
    if (quizState.quizMode === 'qa') {
        isCorrect = (selectedOption.toLowerCase() === word.english.toLowerCase());
        correctValue = word.english;
    } else if (quizState.quizMode === 'blank') {
        isCorrect = (selectedOption === quizState.correctMissingChar);
        correctValue = quizState.correctMissingChar;
    }
    
    const buttons = elements.choicesGrid.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    if (isCorrect) {
        clickedBtn.classList.add('correct');
        quizState.correctCount++;
        
        const timeBonus = Math.round((quizState.timeLeft / quizState.timeLimit) * 10);
        const questionScore = 20 + timeBonus;
        quizState.score += questionScore;
    } else {
        clickedBtn.classList.add('wrong');
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase() === correctValue.toLowerCase()) {
                btn.classList.add('correct');
            }
        });
    }
    
    setTimeout(() => {
        quizState.currentIndex++;
        showQuestion();
    }, 1500);
}

function handleScrambledClick(char, idx, btn) {
    if (!quizState.canAnswer) return;
    if (quizState.arrangeAnswer.length >= quizState.arrangeTarget.length) return;
    
    // Add to answer sequence
    quizState.arrangeAnswer.push({ char, scrambledIdx: idx, btnElement: btn });
    btn.classList.add('used');
    
    // Update target slot content
    const currentSlotIdx = quizState.arrangeAnswer.length - 1;
    const slot = document.getElementById(`arrange-slot-${currentSlotIdx}`);
    if (slot) {
        slot.textContent = char;
        slot.classList.add('filled');
    }
    
    // If all characters placed, verify answer
    if (quizState.arrangeAnswer.length === quizState.arrangeTarget.length) {
        checkArrangeAnswer();
    }
}

function handleSlotClick(slotIdx) {
    if (!quizState.canAnswer) return;
    if (slotIdx >= quizState.arrangeAnswer.length) return;
    
    // Remove element at index
    const removed = quizState.arrangeAnswer.splice(slotIdx, 1)[0];
    removed.btnElement.classList.remove('used');
    
    // Re-render slot contents
    for (let i = 0; i < quizState.arrangeTarget.length; i++) {
        const slot = document.getElementById(`arrange-slot-${i}`);
        if (i < quizState.arrangeAnswer.length) {
            slot.textContent = quizState.arrangeAnswer[i].char;
            slot.classList.add('filled');
        } else {
            slot.textContent = '_';
            slot.classList.remove('filled');
        }
    }
}

function checkArrangeAnswer() {
    quizState.canAnswer = false;
    clearInterval(quizState.timerInterval);
    
    const word = quizState.words[quizState.currentIndex];
    const userCombined = quizState.arrangeAnswer.map(a => a.char).join('');
    const isCorrect = (userCombined === word.chinese);
    
    // Disable scrambled options
    const scrambledBtns = elements.arrangeScrambled.querySelectorAll('.scrambled-btn');
    scrambledBtns.forEach(btn => btn.disabled = true);
    
    if (isCorrect) {
        elements.arrangeSlots.classList.add('correct');
        quizState.correctCount++;
        
        const timeBonus = Math.round((quizState.timeLeft / quizState.timeLimit) * 10);
        const questionScore = 20 + timeBonus;
        quizState.score += questionScore;
    } else {
        elements.arrangeSlots.classList.add('wrong');
        
        // Show correct order in slots after 500ms
        setTimeout(() => {
            elements.arrangeSlots.classList.remove('wrong');
            elements.arrangeSlots.classList.add('correct');
            
            for (let i = 0; i < quizState.arrangeTarget.length; i++) {
                const slot = document.getElementById(`arrange-slot-${i}`);
                slot.textContent = quizState.arrangeTarget[i];
                slot.classList.add('filled');
            }
        }, 500);
    }
    
    setTimeout(() => {
        quizState.currentIndex++;
        showQuestion();
    }, 1500);
}

function handleTimeout() {
    if (!quizState.canAnswer) return;
    quizState.canAnswer = false;
    
    const word = quizState.words[quizState.currentIndex];
    
    if (quizState.quizMode === 'arrange') {
        elements.arrangeSlots.classList.add('wrong');
        const scrambledBtns = elements.arrangeScrambled.querySelectorAll('.scrambled-btn');
        scrambledBtns.forEach(btn => btn.disabled = true);
        
        // Reveal correct characters in order
        for (let i = 0; i < quizState.arrangeTarget.length; i++) {
            const slot = document.getElementById(`arrange-slot-${i}`);
            slot.textContent = quizState.arrangeTarget[i];
            slot.classList.add('filled');
        }
    } else {
        const correctText = quizState.quizMode === 'blank' ? quizState.correctMissingChar : word.english;
        const buttons = elements.choicesGrid.querySelectorAll('.choice-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent.toLowerCase() === correctText.toLowerCase()) {
                btn.classList.add('correct');
            } else {
                btn.classList.add('wrong');
            }
        });
    }
    
    setTimeout(() => {
        quizState.currentIndex++;
        showQuestion();
    }, 1500);
}

async function endQuiz() {
    clearInterval(quizState.timerInterval);
    
    // Update progress bar
    elements.progressFill.style.width = '100%';
    
    // Switch UI views
    elements.gameplayArea.style.display = 'none';
    elements.resultView.style.display = 'block';
    
    // Set score card values
    const accuracy = Math.round((quizState.correctCount / quizState.totalQuestions) * 100);
    elements.resultAccuracy.textContent = `${accuracy}%`;
    elements.resultPoints.textContent = `+${quizState.score}`;
    
    // Style response based on performance
    if (accuracy >= 80) {
        elements.resultEmoji.textContent = '🏆';
        elements.resultTitle.textContent = 'Outstanding!';
        elements.resultDesc.textContent = `Excellent job! You have mastered the words of "${quizState.lessonTitle}" in ${getModeKhmerName(quizState.quizMode)} mode!`;
    } else if (accuracy >= 50) {
        elements.resultEmoji.textContent = '💪';
        elements.resultTitle.textContent = 'Good Job!';
        elements.resultDesc.textContent = `Great progress. A bit more practice and you will get a perfect score!`;
    } else {
        elements.resultEmoji.textContent = '📚';
        elements.resultTitle.textContent = 'Keep Learning!';
        elements.resultDesc.textContent = `Keep practicing to improve your Chinese vocabulary. You got this!`;
    }
    
    // Submit scores to backend
    if (quizState.score > 0) {
        const updatedUser = await updateSessionPoints(quizState.score);
        if (updatedUser) {
            // Trigger header update event
            const event = new CustomEvent('pointsUpdated', { detail: updatedUser });
            window.dispatchEvent(event);
        }
    }
}

// Helper to shuffle arrays
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Attach event listeners
elements.closeBtn.addEventListener('click', () => {
    clearInterval(quizState.timerInterval);
    elements.overlay.style.display = 'none';
    window.dispatchEvent(new Event('quizClosed'));
});

elements.btnRestart.addEventListener('click', () => {
    startQuiz(quizState.lessonId, quizState.lessonTitle);
});

// Attach mode select buttons click listeners
elements.btnModeQA.addEventListener('click', () => selectMode('qa'));
elements.btnModeBlank.addEventListener('click', () => selectMode('blank'));
elements.btnModeArrange.addEventListener('click', () => selectMode('arrange'));
