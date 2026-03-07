// Daily Quote Mode for Symbol Cipher
// Hooks into existing game functions

(function() {
    // Wait for game.js to load
    if (typeof gameState === 'undefined') {
        console.error('game.js not loaded');
        return;
    }

    // Daily state
    const STORAGE_KEY = 'symbol_cipher_daily';
    let dailyState = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
        currentDay: 1,
        solvedCount: 0,
        missedCount: 0,
        lastDate: null
    };

    // Store original functions
    const origSetMode = window.setMode;
    const origNewPuzzle = window.newPuzzle;

    // Helper: save state
    function saveDaily() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dailyState));
    }

    // Helper: check for new day
    function checkDay() {
        const today = new Date().toISOString().split('T')[0];
        if (dailyState.lastDate && dailyState.lastDate !== today) {
            // New day - check if yesterday was unsolved
            const yesterday = dailyState.currentDay;
            const progress = JSON.parse(localStorage.getItem(STORAGE_KEY + '_day_' + yesterday) || '{}');
            if (!progress.solved) {
                dailyState.missedCount++;
            }
            dailyState.currentDay++;
            saveDaily();
        }
    }

    // Load daily quote
    function loadDaily() {
        checkDay();
        
        // Show UI
        const stats = document.getElementById('daily-stats');
        const ctrl = document.getElementById('daily-controls');
        if (stats) stats.classList.remove('hidden');
        if (ctrl) ctrl.classList.remove('hidden');

        // Update stats
        document.getElementById('current-day').textContent = dailyState.currentDay;
        document.getElementById('solved-count').textContent = dailyState.solvedCount;
        document.getElementById('missed-count').textContent = dailyState.missedCount;

        // Get quote
        const idx = (dailyState.currentDay - 1) % DAILY_QUOTES.length;
        const quote = DAILY_QUOTES[idx];
        document.getElementById('quote-author').textContent = '— ' + quote.author;

        // Restore saved progress
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + '_day_' + dailyState.currentDay) || '{}');
        gameState.originalText = saved.text || quote.text.toUpperCase();
        gameState.userMappings = saved.mappings || {};
        gameState.solved = saved.solved || false;
        gameState.hintsRemaining = saved.hints || 3;
        gameState.selectedSymbol = null;

        // Generate and render
        generateSymbolMap();
        renderPuzzle();
        updateAlphabet();
        updateStatus(gameState.solved ? 'Solved! Come back tomorrow' : 'Day ' + dailyState.currentDay + ': Tap a symbol');
        updateSkipButton();

        // Check if locked (already solved today)
        if (gameState.solved) {
            document.getElementById('daily-locked-modal').classList.add('visible');
        }
    }

    // Save progress
    function saveDay() {
        localStorage.setItem(STORAGE_KEY + '_day_' + dailyState.currentDay, JSON.stringify({
            text: gameState.originalText,
            mappings: gameState.userMappings,
            solved: gameState.solved,
            hints: gameState.hintsRemaining
        }));
    }

    // Override setMode
    window.setMode = function(mode) {
        // Save if leaving daily mode
        if (gameState.mode === 'daily_quote' && !gameState.solved) {
            saveDay();
            dailyState.lastDate = new Date().toISOString().split('T')[0];
            saveDaily();
        }

        // Hide daily UI
        if (mode !== 'daily_quote') {
            document.getElementById('daily-stats')?.classList.add('hidden');
            document.getElementById('daily-controls')?.classList.add('hidden');
            document.getElementById('daily-locked-modal')?.classList.remove('visible');
            return origSetMode(mode);
        }

        // Save current mode
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

    // Override newPuzzle for daily mode
    window.newPuzzle = function() {
        if (gameState.mode === 'daily_quote') {
            // Daily mode - don't generate new puzzle, just save current state
            if (gameState.solved) {
                dailyState.solvedCount++;
                dailyState.lastDate = new Date().toISOString().split('T')[0];
                saveDaily();
                saveDay();
            }
            return;
        }
        return origNewPuzzle();
    };

    // Hook into checkWin
    const origCheckWin = window.checkWin;
    window.checkWin = function() {
        origCheckWin();
        if (gameState.solved && gameState.mode === 'daily_quote') {
            dailyState.solvedCount++;
            dailyState.lastDate = new Date().toISOString().split('T')[0];
            saveDaily();
            saveDay();
        }
    };

    // Reset button
    document.getElementById('reset-daily-btn')?.addEventListener('click', function() {
        if (!confirm('Reset to Day 1?')) return;
        dailyState = { currentDay: 1, solvedCount: 0, missedCount: 0, lastDate: null };
        saveDaily();
        document.getElementById('daily-locked-modal')?.classList.remove('visible');
        loadDaily();
    });

    // Locked modal OK button
    document.getElementById('locked-ok-btn')?.addEventListener('click', function() {
        document.getElementById('daily-locked-modal')?.classList.remove('visible');
    });

    console.log('Daily Quote mode loaded');
})();
