// Daily Quote Mode - Complete Implementation
(function() {
    'use strict';
    if (typeof gameState === 'undefined') return;

    const STORAGE_KEY = 'symbol_cipher_daily';
    const SETTINGS_KEY = 'symbol_cipher_settings';
    let dailyState = { currentDay: 1, solvedCount: 0, missedCount: 0, lastDate: null };
    let settings = { showAuthor: false, __proto__: null };
    let dailySymbolMap = {};
    const origSetMode = window.setMode;
    const origCheckWin = window.checkWin;

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    function loadSettings() {
        try {
            const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
            if (s) Object.assign(settings, s);
        } catch (e) {}
    }

    function saveDailyState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyState));
    }

    function loadDailyState() {
        try {
            const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (s) Object.assign(dailyState, s);
        } catch (e) {}
    }

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function checkDay() {
        const today = getToday();
        if (dailyState.lastDate && dailyState.lastDate !== today) {
            const prev = JSON.parse(localStorage.getItem(STORAGE_KEY + '_day_' + dailyState.currentDay) || '{}');
            if (!prev.solved) dailyState.missedCount++;
            dailyState.currentDay++;
        }
        dailyState.lastDate = today;
        saveDailyState();
    }

    function saveDay() {
        localStorage.setItem(STORAGE_KEY + '_day_' + dailyState.currentDay, JSON.stringify({
            text: gameState.originalText,
            mappings: gameState.userMappings,
            symbolMap: dailySymbolMap,
            solved: gameState.solved,
            hints: gameState.hintsRemaining,
            date: getToday()
        }));
    }

    function loadDay(day) {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY + '_day_' + day));
        } catch (e) { return null; }
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

    function showSkip(show) {
        const btn = document.getElementById('skip-btn');
        if (btn) btn.style.display = show ? '' : 'none';
    }

    function loadDaily() {
        loadDailyState();
        loadSettings();
        checkDay();

        document.getElementById('daily-stats')?.classList.remove('hidden');
        document.getElementById('daily-controls')?.classList.remove('hidden');
        document.getElementById('author-toggle-container')?.classList.remove('hidden');

        const toggle = document.getElementById('author-toggle');
        if (toggle) {
            toggle.checked = settings.showAuthor;
            toggle.onchange = function() {
                settings.showAuthor = this.checked;
                saveSettings();
                updateAuthor();
            };
        }

        updateStats();
        showSkip(false);

        const quote = getQuote();
        const authorEl = document.getElementById('quote-author');
        if (authorEl) authorEl.textContent = '— ' + quote.author;

        const saved = loadDay(dailyState.currentDay);
        const today = getToday();

        if (saved && saved.date === today) {
            gameState.originalText = saved.text;
            gameState.userMappings = saved.mappings || {};
            gameState.solved = saved.solved || false;
            gameState.hintsRemaining = saved.hints || 3;
            dailySymbolMap = saved.symbolMap || {};
        } else {
            gameState.originalText = quote.text.toUpperCase();
            gameState.userMappings = {};
            gameState.solved = false;
            gameState.hintsRemaining = 3;
            dailySymbolMap = {};
            saveDay();
        }

        gameState.symbolMap = { ...dailySymbolMap };

        if (typeof generateSymbolMap === 'function' && !Object.keys(dailySymbolMap).length) {
            generateSymbolMap();
            dailySymbolMap = { ...gameState.symbolMap };
            saveDay();
        }

        if (typeof renderPuzzle === 'function') renderPuzzle();
        if (typeof updateAlphabet === 'function') updateAlphabet();
        updateAuthor();

        if (gameState.solved) {
            document.getElementById('daily-locked-modal')?.classList.add('visible');
            updateStatus('Solved! Come back tomorrow for Day ' + (dailyState.currentDay + 1));
        } else {
            updateStatus('Day ' + dailyState.currentDay + ': Tap a symbol, then a letter');
        }
        if (typeof updateSkipButton === 'function') updateSkipButton();
    }

    window.setMode = function(mode) {
        if (gameState.mode === 'daily_quote') {
            saveDay();
        }

        if (mode !== 'daily_quote') {
            document.getElementById('daily-stats')?.classList.add('hidden');
            document.getElementById('daily-controls')?.classList.add('hidden');
            document.getElementById('author-toggle-container')?.classList.add('hidden');
            document.getElementById('daily-locked-modal')?.classList.remove('visible');
            showSkip(true);
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
        document.querySelectorAll('.mode-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.mode === mode);
        });

        loadDaily();
    };

    window.checkWin = function() {
        origCheckWin();
        if (gameState.solved && gameState.mode === 'daily_quote') {
            dailyState.solvedCount++;
            dailyState.lastDate = getToday();
            saveDailyState();
            saveDay();
            updateStats();
            updateAuthor();

            // Show author in completion modal
            const quote = getQuote();
            const solvedAuthor = document.getElementById('solved-author');
            if (solvedAuthor) solvedAuthor.textContent = '— ' + quote.author;
        }
    };

    // Event listeners
    document.getElementById('reset-daily-btn')?.addEventListener('click', function() {
        document.getElementById('reset-confirm-modal')?.classList.add('visible');
    });

    document.getElementById('reset-confirm-btn')?.addEventListener('click', function() {
        dailyState = { currentDay: 1, solvedCount: 0, missedCount: 0, lastDate: null };
        saveDailyState();
        for (let i = 0; i < 1000; i++) {
            localStorage.removeItem(STORAGE_KEY + '_day_' + i);
        }
        document.getElementById('reset-confirm-modal')?.classList.remove('visible');
        document.getElementById('daily-locked-modal')?.classList.remove('visible');
        loadDaily();
    });

    document.getElementById('reset-cancel-btn')?.addEventListener('click', function() {    document.getElementById("reset-confirm-modal")?.classList.remove("visible");
});

document.getElementById("locked-ok-btn")?.addEventListener("click", function() {
    document.getElementById("daily-locked-modal")?.classList.remove("visible");
});

console.log("Daily Quote mode loaded");
})();
