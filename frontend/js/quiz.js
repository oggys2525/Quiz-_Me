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
    canAnswer: false
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
    
    closeBtn: document.getElementById('quiz-close')
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
        
        // Show quiz screen
        elements.overlay.style.display = 'flex';
        elements.gameplayArea.style.display = 'block';
        elements.resultView.style.display = 'none';
        
        showQuestion();
    } catch (error) {
        console.error("Error starting quiz:", error);
        alert("Error loading quiz words.");
    }
}

function showQuestion() {
    if (quizState.currentIndex >= quizState.totalQuestions) {
        endQuiz();
        return;
    }
    
    const word = quizState.words[quizState.currentIndex];
    
    // Update progress bar
    const progressPercent = ((quizState.currentIndex) / quizState.totalQuestions) * 100;
    elements.progressFill.style.width = `${progressPercent}%`;
    elements.progressText.innerHTML = `<span>Question ${quizState.currentIndex + 1} of ${quizState.totalQuestions}</span> <span>Lesson: ${quizState.lessonTitle}</span>`;
    
    // Render question
    elements.chineseWord.textContent = word.chinese;
    elements.pinyinWord.textContent = word.pinyin;
    
    // Render options (choices)
    elements.choicesGrid.innerHTML = '';
    
    // Shuffle options array
    const options = shuffleArray([...word.options]);
    
    options.forEach(option => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = option;
        btn.addEventListener('click', () => handleAnswer(option, btn));
        elements.choicesGrid.appendChild(btn);
    });
    
    quizState.canAnswer = true;
    startTimer();
}

function startTimer() {
    clearInterval(quizState.timerInterval);
    quizState.timeLeft = quizState.timeLimit;
    updateTimerUI();
    
    const intervalMs = 100; // tick every 100ms for smooth progress bar transition
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
    const isCorrect = (selectedOption.toLowerCase() === word.english.toLowerCase());
    
    // Find all choice buttons
    const buttons = elements.choicesGrid.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.disabled = true);
    
    if (isCorrect) {
        clickedBtn.classList.add('correct');
        quizState.correctCount++;
        
        // Calculate points: 20 base points + time bonus (up to 10 points based on speed)
        const timeBonus = Math.round((quizState.timeLeft / quizState.timeLimit) * 10);
        const questionScore = 20 + timeBonus;
        quizState.score += questionScore;
    } else {
        clickedBtn.classList.add('wrong');
        // Highlight correct option
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase() === word.english.toLowerCase()) {
                btn.classList.add('correct');
            }
        });
    }
    
    // Wait for 1.5 seconds so user can see feedback before moving to next question
    setTimeout(() => {
        quizState.currentIndex++;
        showQuestion();
    }, 1500);
}

function handleTimeout() {
    if (!quizState.canAnswer) return;
    quizState.canAnswer = false;
    
    const word = quizState.words[quizState.currentIndex];
    
    // Highlight correct option
    const buttons = elements.choicesGrid.querySelectorAll('.choice-btn');
    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.textContent.toLowerCase() === word.english.toLowerCase()) {
            btn.classList.add('correct');
        } else {
            btn.classList.add('wrong');
        }
    });
    
    // Show timeout feedback and move next
    setTimeout(() => {
        quizState.currentIndex++;
        showQuestion();
    }, 1500);
}

async function endQuiz() {
    clearInterval(quizState.timerInterval);
    
    // Update progress bar to 100%
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
        elements.resultDesc.textContent = `Excellent job! You have mastered the words of "${quizState.lessonTitle}"!`;
    } else if (accuracy >= 50) {
        elements.resultEmoji.textContent = '💪';
        elements.resultTitle.textContent = 'Good Job!';
        elements.resultDesc.textContent = `Great progress. A bit more practice and you will get a perfect score!`;
    } else {
        elements.resultEmoji.textContent = '📚';
        elements.resultTitle.textContent = 'Keep Learning!';
        elements.resultDesc.textContent = `Keep practicing to improve your Chinese memory vocabulary. You got this!`;
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

// Helper to shuffle choices
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
    // Trigger dashboard refresh event
    window.dispatchEvent(new Event('quizClosed'));
});

elements.btnRestart.addEventListener('click', () => {
    startQuiz(quizState.lessonId, quizState.lessonTitle);
});
