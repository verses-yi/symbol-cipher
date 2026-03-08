// Daily Quote Mode
(function() {
    const STORAGE_KEY = 'symbol_cipher_daily';
    const SETTINGS_KEY = 'symbol_cipher_settings';

    let dailyState = { currentDay: 1, solvedCount: 0, missedCount: 0, lastDate: null };
    let settings = { showAuthor: false };
    let dailySymbolMap = {};
    const origSetMode = setMode;
    const origCheckWin = checkWin;

    function getToday() { return new Date().toISOString().split('T')[0]; }

    function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
    function load(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } }

    function checkDay() {
        const today = getToday();
        // Only increment if lastDate exists AND is different from today
        if (dailyState.lastDate && dailyState.lastDate !== today) {
            // Check if yesterday was unsolved
            const yesterday = load(STORAGE_KEY + '_day_' + dailyState.currentDay);
            if (!yesterday || !yesterday.solved) dailyState.missedCount++;

            dailyState.currentDay++;
            dailyState.lastDate = today;
            save(STORAGE_KEY, dailyState);
        } else if (!dailyState.lastDate) {
            // First time - set lastDate
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
        save(STORAGE_KEY, dailyState);
        for (let i = 1; i <= 1000; i++) {
            localStorage.removeItem(STORAGE_KEY + '_day_' + i);
        }
        document.getElementById('reset-confirm-modal')?.classList.remove('visible');
        document.getElementById('daily-locked-modal')?.classList.remove('visible');
        loadDaily();
    }

    function loadDaily() {
        // Load state
        const s = load(STORAGE_KEY);
        if (s) Object.assign(dailyState, s);
        const st = load(SETTINGS_KEY);
        if (st) Object.assign(settings, st);

        checkDay();

        // Show UI
        document.getElementById('daily-stats')?.classList.remove('hidden');
        document.getElementById('daily-controls')?.classList.remove('hidden');
        document.getElementById('author-toggle-container')?.classList.remove('hidden');

        // Toggle
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

        // Quote
        const q = getQuote();
        const ae = document.getElementById('quote-author');
        if (ae) ae.textContent = '— ' + q.author;

        // Load progress
        const today = getToday();
        const saved = load(STORAGE_KEY + '_day_' + dailyState.currentDay);

        if (saved && saved.date === today) {
            gameState.originalText = saved.text;
            gameState.userMappings = saved.mappings || {};
            gameState.solved = saved.solved || false;
            gameState.hintsRemaining = saved.hints || 3;
            dailySymbolMap = saved.symbolMap || {};
        } else {
            gameState.originalText = q.text.toUpperCase();
            gameState.userMappings = {};
            gameState.solved = false;
            gameState.hintsRemaining = 3;
            dailySymbolMap = {};
            saveDay();
        }

        gameState.symbolMap = dailySymbolMap;

        if (Object.keys(dailySymbolMap).length === 0 || !gameState.originalText) {
            generateSymbolMap();
            dailySymbolMap = gameState.symbolMap;
            saveDay();
        }

        renderPuzzle();
        updateAlphabet();
        updateAuthor();

        if (gameState.solved) {
            document.getElementById('daily-locked-modal')?.classList.add('visible');
            updateStatus('Solved! Come back tomorrow for Day ' + (dailyState.currentDay + 1));
        } else {
            updateStatus('Day ' + dailyState.currentDay + ': Tap a symbol, then a letter');
        }
        updateSkipButton();
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

    // Override checkWin
    window.checkWin = function() {
        origCheckWin();
        if (gameState.solved && gameState.mode === 'daily_quote') {
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

    // Event listeners - use standard addEventListener
    document.addEventListener('DOMContentLoaded', function() {
        const resetBtn = document.getElementById('reset-daily-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', function() {
                document.getElementById('reset-confirm-modal')?.classList.add('visible');
            });
        }

        const confirmBtn = document.getElementById('reset-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', doReset);
        }

        const cancelBtn = document.getElementById('reset-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                document.getElementById('reset-confirm-modal')?.classList.remove('visible');
            });
        }

        const okBtn = document.getElementById('locked-ok-btn');
        if (okBtn) {
            okBtn.addEventListener("click", function() {
                document.getElementById("daily-locked-modal")?.classList.remove("visible");
            });
        }
    });

    console.log("Daily mode loaded");
})();
