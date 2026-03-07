// =====================================================
// DAILY QUOTE MODE - Extension for Symbol Cipher
// =====================================================

// Daily Quote State
let dailyState = {
    currentDay: 1,
    solvedCount: 0,
    missedCount: 0,
    lastSolvedDate: null,
    dayProgress: {}, // day -> { solved: bool, mappings: {}, text: '' }
    locked: false
};

const STORAGE_KEY = 'symbol_cipher_daily_progress';

// Load daily progress from localStorage
function loadDailyProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            dailyState = { ...dailyState, ...parsed };
            checkForDayReset();
        }
    } catch (e) {
        console.log('No saved daily progress');
    }
}

// Save daily progress to localStorage
function saveDailyProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyState));
    } catch (e) {
        console.error('Failed to save daily progress', e);
    }
}

// Get today's date as string YYYY-MM-DD
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// Check if we need to advance to next day
function checkForDayReset() {
    const lastSolved = dailyState.lastSolvedDate;
    const today = getTodayString();
    
    if (lastSolved && lastSolved !== today) {
        // It's a new day
        const todayProgress = dailyState.dayProgress[dailyState.currentDay];
        
        if (!todayProgress || !todayProgress.solved) {
            dailyState.missedCount++;
        }
        
        dailyState.currentDay++;
        dailyState.locked = false;
        saveDailyProgress();
    }
}

// Get current day's quote
function getCurrentDailyQuote() {
    const dayIndex = (dailyState.currentDay - 1) % DAILY_QUOTES.length;
    return DAILY_QUOTES[dayIndex];
}

// Load daily quote puzzle
function loadDailyQuote() {
    loadDailyProgress();
    
    // Show daily stats panel
    const statsPanel = document.getElementById('daily-stats');
    const controlsPanel = document.getElementById('daily-controls');
    
    if (statsPanel) statsPanel.classList.remove('hidden');
    if (controlsPanel) controlsPanel.classList.remove('hidden');
    
    // Update stats display
    const dayEl = document.getElementById('current-day');
    const solvedEl = document.getElementById('solved-count');
    const missedEl = document.getElementById('missed-count');
    const authorEl = document.getElementById('quote-author');
    
    if (dayEl) dayEl.textContent = dailyState.currentDay;
    if (solvedEl) solvedEl.textContent = dailyState.solvedCount;
    if (missedEl) missedEl.textContent = dailyState.missedCount;
    
    const quote = getCurrentDailyQuote();
    if (authorEl) authorEl.textContent = '— ' + quote.author;
    
    // Check if already solved today
    const todayProgress = dailyState.dayProgress[dailyState.currentDay];
    if (todayProgress?.solved) {
        dailyState.locked = true;
    }
    
    // Restore progress if exists
    if (todayProgress) {
        gameState.originalText = todayProgress.text || quote.text.toUpperCase();
        gameState.userMappings = { ...todayProgress.mappings };
        gameState.solved = todayProgress.solved;
        gameState.hintsRemaining = todayProgress.hints || 3;
    } else {
        gameState.originalText = quote.text.toUpperCase();
        gameState.userMappings = {};
        gameState.solved = false;
        gameState.hintsRemaining = 3;
    }
    
    if (typeof generateSymbolMap === 'function') generateSymbolMap();
    if (typeof renderPuzzle === 'function') renderPuzzle();
    if (typeof updateAlphabet === 'function') updateAlphabet();
    
    const statusMsg = gameState.solved 
        ? 'Solved! Come back tomorrow for Day ' + (dailyState.currentDay + 1)
        : 'Day ' + dailyState.currentDay + ': Tap a symbol, then a letter';
    if (typeof updateStatus === 'function') updateStatus(statusMsg);
    if (typeof updateSkipButton === 'function') updateSkipButton();
}

// Save current daily puzzle state
function saveDailyPuzzleState() {
    dailyState.dayProgress[dailyState.currentDay] = {
        text: gameState.originalText,
        mappings: {...gameState.userMappings},
        solved: gameState.solved,
        hints: gameState.hintsRemaining
    };
    
    if (gameState.solved) {
        dailyState.lastSolvedDate = getTodayString();
        dailyState.solvedCount++;
        dailyState.locked = true;
    }
    
    saveDailyProgress();
    updateDailyStats();
}

// Update daily stats display
function updateDailyStats() {
    const solvedEl = document.getElementById('solved-count');
    const missedEl = document.getElementById('missed-count');
    if (solvedEl) solvedEl.textContent = dailyState.solvedCount;
    if (missedEl) missedEl.textContent = dailyState.missedCount;
}

// Reset daily progress to Day 1
function resetDailyProgress() {
    if (!confirm('Reset Daily Quote progress to Day 1? All progress will be lost.')) {
        return;
    }
    
    dailyState = {
        currentDay: 1,
        solvedCount: 0,
        missedCount: 0,
        lastSolvedDate: null,
        dayProgress: {},
        locked: false
    };
    
    saveDailyProgress();
    loadDailyQuote();
}

// Hook into mode switching
let originalSetMode = setMode;
setMode = function(newMode) {
    // Save current daily state before leaving daily mode
    if (gameState.mode === 'daily_quote' && !gameState.solved) {
        dailyState.dayProgress[dailyState.currentDay] = {
            text: gameState.originalText,
            mappings: {...gameState.userMappings},
            solved: false,
            hints: gameState.hintsRemaining
        };
        saveDailyProgress();
    }
    
    // Hide daily UI for non-daily modes
    if (newMode !== 'daily_quote') {
        const statsPanel = document.getElementById('daily-stats');
        const controlsPanel = document.getElementById('daily-controls');
        if (statsPanel) statsPanel.classList.add('hidden');
        if (controlsPanel) controlsPanel.classList.add('hidden');
        
        originalSetMode(newMode);
        return;
    }
    
    // Save current mode state
    if (gameState.originalText) {
        gameState.saved[gameState.mode] = {
            text: gameState.originalText,
            mappings: {...gameState.userMappings},
            map: {...gameState.symbolMap},
            hints: gameState.hintsRemaining,
            solved: gameState.solved
        };
    }
    
    gameState.mode = newMode;
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === newMode);
    });
    
    loadDailyQuote();
};

// Hook into puzzle completion
const originalCheckWin = checkWin;
checkWin = function() {
    const wasSolved = gameState.solved;
    originalCheckWin();
    
    if (gameState.solved && gameState.mode === 'daily_quote' && !wasSolved) {
        saveDailyPuzzleState();
    }
};

// Setup reset button
document.addEventListener('DOMContentLoaded', function() {
    const resetBtn = document.getElementById('reset-daily-btn');
    const lockedBtn = document.getElementById('locked-ok-btn');
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetDailyProgress);
    }
    
    if (lockedBtn) {
        lockedBtn.addEventListener('click', function() {
            document.getElementById('daily-locked-modal')?.classList.remove('visible');
        });
    }
    
    // Check if we loaded in daily mode
    if (gameState.mode === 'daily_quote') {
        loadDailyQuote();
    }
});
