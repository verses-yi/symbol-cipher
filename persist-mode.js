// Save/Load for Word, Quote, and Daily Quote modes
// Auto-saves on correct guess

(function() {
    const SAVE_KEY = 'cipher_manual_save';
    const DAILY_KEY = 'cipher_daily_save';

    function getToday() { return new Date().toISOString().split('T')[0]; }

    // ========== SAVE FUNCTION ==========
    window.manualSave = function(auto) {
        const mode = gameState.mode;
        const source = mode === 'daily_quote' ? 'daily' : 'word';
        const key = mode === 'daily_quote' ? DAILY_KEY + '_' + getToday() : SAVE_KEY + '_' + mode;

        const data = {
            text: gameState.originalText,
            map: gameState.symbolMap,
            mappings: gameState.userMappings,
            solved: gameState.solved,
            hints: gameState.hintsRemaining,
            timestamp: Date.now()
        };

        if (mode === 'daily_quote') {
            data.date = getToday();
            data.day = (typeof dailyState !== 'undefined') ? dailyState.currentDay : 1;
        }

        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch(e) {
            console.error('Save failed:', e);
            if (!auto) updateStatus('Save failed - storage may be full');
            return;
        }

        // Visual feedback (only for manual save)
        if (!auto) {
            const btn = document.getElementById('manual-save-btn');
            if (btn) {
                const oldText = btn.textContent;
                btn.textContent = '✓ Saved!';
                setTimeout(function() { btn.textContent = oldText; }, 800);
            }
            updateStatus(mode + ' saved!');
        }

        console.log('SAVED:', mode, auto ? '(auto)' : '(manual)');
    };

    // ========== LOAD FUNCTION ==========
    window.manualLoad = function() {
        const mode = gameState.mode;

        if (mode === 'daily_quote') {
            loadDailyQuote();
            return;
        }

        // Word or Quote mode
        try {
            const saved = JSON.parse(localStorage.getItem(SAVE_KEY + '_' + mode));
            if (!saved || !saved.text) {
                updateStatus('No saved ' + mode + ' found');
                return;
            }

            restoreState(saved, mode);

            const btn = document.getElementById('manual-load-btn');
            if (btn) {
                const oldText = btn.textContent;
                btn.textContent = '✓ Loaded!';
                setTimeout(function() { btn.textContent = oldText; }, 800);
            }

            console.log('LOADED:', mode, saved.text.substring(0, 20));

        } catch(e) {
            updateStatus('Error loading');
            console.error(e);
        }
    };

    // ========== LOAD DAILY QUOTE ==========
    function loadDailyQuote() {
        try {
            const saved = JSON.parse(localStorage.getItem(DAILY_KEY + '_' + getToday()));

            if (!saved || !saved.text) {
                updateStatus("No save found for today's quote");
                return;
            }

            // Check if it's from today
            if (saved.date !== getToday()) {
                updateStatus("Save expired - can only load today's quote");
                return;
            }

            // Check day number matches
            const currentDay = (typeof dailyState !== 'undefined') ? dailyState.currentDay : 1;
            if (saved.day && saved.day !== currentDay) {
                updateStatus("Day mismatch - resume from today's puzzle");
                return;
            }

            restoreState(saved, 'daily_quote');

            const btn = document.getElementById('manual-load-btn');
            if (btn) {
                const oldText = btn.textContent;
                btn.textContent = '✓ Loaded!';
                setTimeout(function() { btn.textContent = oldText; }, 800);
            }

            console.log('LOADED: daily quote day', saved.day);

        } catch(e) {
            updateStatus('Error loading daily quote');
            console.error(e);
        }
    }

    // ========== RESTORE STATE ==========
    function restoreState(saved, mode) {
        // Setup game state
        gameState.originalText = saved.text;
        gameState.symbolMap = {...(saved.map || {})};
        gameState.userMappings = {...(saved.mappings || {})};
        gameState.solved = saved.solved || false;
        gameState.hintsRemaining = saved.hints || 3;

        // Update saved cache
        gameState.saved[mode] = {
            text: saved.text,
            map: {...(saved.map || {})},
            mappings: {...(saved.mappings || {})},
            hints: saved.hints || 3,
            solved: saved.solved || false
        };

        // Generate symbols if missing
        if (Object.keys(gameState.symbolMap).length === 0) {
            if (typeof generateSymbolMap === 'function') generateSymbolMap();
        }

        // Render
        if (typeof renderPuzzle === 'function') renderPuzzle();
        if (typeof updateAlphabet === 'function') updateAlphabet();
        if (typeof updateSkipButton === 'function') updateSkipButton();

        updateStatus(gameState.solved ? 'Solved!' : 'Tap a symbol, then a letter');

        // Update hint button
        const hintBtn = document.getElementById('hint-btn');
        if (hintBtn) hintBtn.textContent = `💡 Hint (${gameState.hintsRemaining})`;

        // Update author visibility for daily quote
        if (mode === 'daily_quote' && typeof updateAuthor === 'function') {
            updateAuthor();
        }
    }

    // ========== AUTO-SAVE ON CORRECT GUESS ==========
    const origSelectLetter = window.selectLetter;
    if (origSelectLetter) {
        window.selectLetter = function(letter) {
            const beforeSolved = gameState.solved;
            origSelectLetter(letter);

            // Auto-save if: guess was correct OR puzzle became solved
            if (!beforeSolved && gameState.solved) {
                window.manualSave(true); // Auto-save on win
            } else if (gameState.selectedSymbol === null) {
                // Check if last guess was correct (userMappings increased)
                // Save on any change
                window.manualSave(true);
            }
        };
    }

    // ========== CHECK IF SAVE EXISTS ==========
    window.hasManualSave = function(mode) {
        if (mode === 'daily_quote') {
            try {
                const saved = JSON.parse(localStorage.getItem(DAILY_KEY + '_' + getToday()));
                return !!(saved && saved.text && saved.date === getToday());
            } catch(e) { return false; }
        }
        try {
            const saved = JSON.parse(localStorage.getItem(SAVE_KEY + '_' + mode));
            return !!(saved && saved.text);
        } catch(e) { return false; }
    };

    // ========== UPDATE UI VISIBILITY ==========
    window.updateSaveLoadVisibility = function() {
        const controls = document.getElementById('save-load-controls');
        const instructions = document.getElementById('save-instructions');
        const loadBtn = document.getElementById('manual-load-btn');

        if (!controls) return;

        // Always show in Word/Quote/Daily
        controls.classList.remove('hidden');
        if (instructions) instructions.classList.remove('hidden');

        // Update Load button text if save exists
        const mode = gameState.mode;
        if (loadBtn) {
            if (window.hasManualSave(mode)) {
                loadBtn.textContent = '📂 Load (saved!)';
                loadBtn.style.background = '#c6f6d5';
            } else {
                loadBtn.textContent = '📂 Load';
                loadBtn.style.background = '';
            }
        }
    };

    // Hook into setMode to update visibility
    const origSetMode = window.setMode;
    window.setMode = function(mode) {
        origSetMode(mode);
        setTimeout(updateHintButton, 10);
        setTimeout(window.updateSaveLoadVisibility, 10);
    };

    // ========== UPDATE HINT BUTTON ==========
    function updateHintButton() {
        const btn = document.getElementById('hint-btn');
        if (btn) btn.textContent = `💡 Hint (${gameState.hintsRemaining})`;
    }

    // Initial check
    // Hook newPuzzle to update hint button after skip/new
    const origNewPuzzle = window.newPuzzle;
    if (origNewPuzzle) {
        window.newPuzzle = function() {
            const mode = gameState.mode;
            if (mode === 'word' || mode === 'quote') {
                localStorage.removeItem(SAVE_KEY + '_' + mode);
                gameState.saved[mode] = { text: '', map: {}, mappings: {}, hints: 3, solved: false };
            }
            if (mode === 'daily_quote') return;
            origNewPuzzle();
            setTimeout(updateHintButton, 0);
        };
    }

    // Initial hint button update
    setTimeout(updateHintButton, 100);
    setTimeout(window.updateSaveLoadVisibility, 100);

    console.log('Save/Load system loaded (manual + auto-save on correct guess)');
})();
