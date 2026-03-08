// Daily Quote Mode
(function() {
    const STORAGE_KEY = 'symbol_cipher_daily';
    const SETTINGS_KEY = 'symbol_cipher_settings';

    let dailyState = { currentDay: 1, solvedCount: 0, missedCount: 0, lastDate: null };
    let settings = { showAuthor: false };
    let dailySymbolMap = {};
    let alreadyCountedSolved = false; // Prevent double counting

    const origSetMode = setMode;
    const origCheckWin = checkWin;

    function getToday() { return new Date().toISOString().split('T')[0]; }
    function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } }

    function checkDay() {
        const today = getToday();
        if (dailyState.lastDate && dailyState.lastDate !== today) {
            const yesterday = load(STORAGE_KEY + '_day_' + dailyState.currentDay);
            if (!yesterday || !yesterday.solved) dailyState.missedCount++;
            dailyState.currentDay++;
            dailyState.lastDate = today;
            save(STORAGE_KEY, dailyState);
        } else if (!dailyState.lastDate) {
            dailyState.lastDate = today;
            save(STORAGE_KEY, dailyState);
        }
    }

    function getQuote() {
        return DAILY_QUOTES[(dailyState.currentDay - 1) % DAILY_QUOTES.length];
    }

    function updateStats() {
        document.getElementById('current-day').textContent = dailyState.currentDay;
        document.getElementById('solved-count').textContent = dailyState.solvedCount;
        document.getElementById('missed-count').textContent = dailyState.missedCount;
    }

    function updateAuthor() {
        const el = document.getElementById('quote-author');
        if (el) el.classList.toggle('hidden', !settings.showAuthor && !gameState.solved);
    }

    function saveDay() {
        save(STORAGE_KEY + '_day_' + dailyState.currentDay, {
            text: gameState.originalText,
            mappings: gameState.userMappings,
            symbolMap: dailySymbolMap,
            solved: gameState.solved,
            hints: gameState.hintsRemaining,
            date: getToday()
        });
    }

    function doReset() {
        dailyState = { currentDay: 1, solvedCount: 0, missedCount: 0, lastDate: null };
        alreadyCountedSolved = false;
        save(STORAGE_KEY, dailyState);
        // Clear ALL daily progress
        for (let i = 1; i <= 1000; i++) {
            localStorage.removeItem(STORAGE_KEY + '_day_' + i);
        }
        document.getElementById('reset-confirm-modal')?.classList.remove('visible');
        document.getElementById('daily-locked-modal')?.classList.remove('visible');
        loadDaily();
    }

    function loadDailyState() {
        const s = load(STORAGE_KEY);
        if (s) {
            dailyState.currentDay = s.currentDay || 1;
            dailyState.solvedCount = s.solvedCount || 0;
            dailyState.missedCount = s.missedCount || 0;
            dailyState.lastDate = s.lastDate || null;
        }
        const st = load(SETTINGS_KEY);
        if (st) settings = Object.assign(settings, st);
    }

    function loadDaily() {
        loadDailyState();
        checkDay();
        alreadyCountedSolved = false; // Reset for new load

        document.getElementById('daily-stats')?.classList.remove('hidden');
        document.getElementById('daily-controls')?.classList.remove('hidden');
        document.getElementById('author-toggle-container')?.classList.remove('hidden');

        const t = document.getElementById('author-toggle');
        if (t) {
            t.checked = settings.showAuthor;
            t.onchange = function() {
                settings.showAuthor = this.checked;
                save(SETTINGS_KEY, settings);
                updateAuthor();
            };
        }

        updateStats();
        document.getElementById('skip-btn').style.display = 'none';

        const q = getQuote();
        const ae = document.getElementById('quote-author');
        if (ae) ae.textContent = '— ' + q.author;

        const today = getToday();
        const saved = load(STORAGE_KEY + '_day_' + dailyState.currentDay);

        if (saved && saved.date === today) {
            gameState.originalText = saved.text;
            gameState.userMappings = saved.mappings || {};
            gameState.solved = saved.solved || false;
            gameState.hintsRemaining = saved.hints || 3;
            dailySymbolMap = saved.symbolMap || {};
            alreadyCountedSolved = gameState.solved; // Don't count again
        } else {
            gameState.originalText = q.text.toUpperCase();
            gameState.userMappings = {};
            gameState.solved = false;
            gameState.hintsRemaining = 3;
            dailySymbolMap = {};
            alreadyCountedSolved = false;
            saveDay();
        }

        gameState.symbolMap = dailySymbolMap;

        if (Object.keys(dailySymbolMap).length === 0 || !gameState.originalText) {
            if (typeof generateSymbolMap === 'function') generateSymbolMap();
            dailySymbolMap = gameState.symbolMap;
            saveDay();
        }

        if (typeof renderPuzzle === 'function') renderPuzzle();
        if (typeof updateAlphabet === 'function') updateAlphabet();
        updateAuthor();

        if (gameState.solved) {
            document.getElementById('daily-locked-modal')?.classList.add('visible');
            if (typeof updateStatus === 'function') {
                updateStatus('Solved! Come back tomorrow for Day ' + (dailyState.currentDay + 1));
            }
        } else {
            if (typeof updateStatus === 'function') {
                updateStatus('Day ' + dailyState.currentDay + ': Tap a symbol, then a letter');
            }
        }
        if (typeof updateSkipButton === 'function') updateSkipButton();
    }

    // Override setMode
    window.setMode = function(mode) {
        if (gameState.mode === 'daily_quote') saveDay();

        if (mode !== 'daily_quote') {
            document.getElementById('daily-stats')?.classList.add('hidden');
            document.getElementById('daily-controls')?.classList.add('hidden');
            document.getElementById('author-toggle-container')?.classList.add('hidden');
            document.getElementById('daily-locked-modal')?.classList.remove('visible');
            document.getElementById('skip-btn').style.display = '';
            return origSetMode(mode);
        }

        if (gameState.originalText) {
            gameState.saved[gameState.mode] = {
                text: gameState.originalText,
                mappings: {...gameState.userMappings},
                map: {...gameState.symbolMap},
                hints: gameState.hintsRemaining,
                solved: gameState.solved
            };
        }

        gameState.mode = mode;
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        loadDaily();
    };

    // Override checkWin - prevent double counting
    window.checkWin = function() {
        const wasSolved = gameState.solved;
        origCheckWin();

        if (gameState.solved && gameState.mode === 'daily_quote' && !alreadyCountedSolved) {
            alreadyCountedSolved = true;
            dailyState.solvedCount++;
            dailyState.lastDate = getToday();
            save(STORAGE_KEY, dailyState);
            saveDay();
            updateStats();
            updateAuthor();
            const sa = document.getElementById('solved-author');
            if (sa) sa.textContent = '— ' + getQuote().author;
        }
    };

    // ============ EVENT LISTENERS ============

    function setupResetListeners() {
        const resetBtn = document.getElementById
        if (resetBtn) {
            resetBtn.onclick = function() {
                document.getElementById('reset-confirm-modal')?.classList.add('visible');
            };
        }

        const confirmBtn = document.getElementById('reset-confirm-btn');
        if (confirmBtn) {
            confirmBtn.onclick = doReset;
        }

        const cancelBtn = document.getElementById('reset-cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = function() {
                document.getElementById('reset-confirm-modal')?.classList.remove('visible');
            };
        }

        const okBtn = document.getElementById('locked-ok-btn');
        if (okBtn) {
            okBtn.onclick = function() {
                document.getElementById('daily-locked-modal')?.classList.remove('visible');
            };
        }
    }

    // Try to setup listeners immediately
    setupResetListeners();

    // And also on DOMContentLoaded (fallback)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupResetListeners);
    }

    console.log('Daily mode v2 loaded');
})();
