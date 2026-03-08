// Word and Quote Mode Persistence
(function() {
    const SAVE_KEY = 'cipher_standard_mode';

    function save(key, data) {
        try {
            localStorage.setItem(SAVE_KEY + '_' + key, JSON.stringify(data));
        } catch (e) {}
    }

    function load(key) {
        try { return JSON.parse(localStorage.getItem(SAVE_KEY + '_' + key)); }
        catch(e) { return null; }
    }

    // Called after initGame - apply saved state to current mode
    function restoreAfterInit() {
        const mode = gameState.mode;
        if (mode !== 'word' && mode !== 'quote') return;

        const saved = load(mode);
        if (!saved || !saved.text) {
            // No saved state - clear just in case
            gameState.saved[mode] = { text: '', mappings: {}, map: {}, hints: 3, solved: false };
            return;
        }

        // Apply saved state
        gameState.originalText = saved.text;
        gameState.userMappings = {...(saved.mappings || {})};
        gameState.symbolMap = {...(saved.map || {})};
        gameState.hintsRemaining = saved.hints || 3;
        gameState.solved = saved.solved || false;

        // Regenerate symbol map if missing
        if (Object.keys(gameState.symbolMap).length === 0 && typeof generateSymbolMap === 'function') {
            generateSymbolMap();
        }

        // Update UI
        if (typeof renderPuzzle === 'function') renderPuzzle();
        if (typeof updateAlphabet === 'function') updateAlphabet();
        if (typeof updateSkipButton === 'function') updateSkipButton();

        // Update status
        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = gameState.solved ? 'Solved!' : 'Tap a symbol, then a letter';
        }

        console.log('Restored ' + mode + ' mode from save');
    }

    // Save current state
    function saveCurrent() {
        const mode = gameState.mode;
        if (mode !== 'word' && mode !== 'quote') return;
        save(mode, {
            text: gameState.originalText,
            mappings: gameState.userMappings,
            map: gameState.symbolMap,
            hints: gameState.hintsRemaining,
            solved: gameState.solved
        });
    }

    // Clear saved state
    function clearSaved(mode) {
        localStorage.removeItem(SAVE_KEY + '_' + mode);
        gameState.saved[mode] = { text: '', mappings: {}, map: {}, hints: 3, solved: false };
    }

    // Mark game as started (prevents initGame from generating new puzzle if we have saves)
    function shouldSkipInit() {
        // Check if there's a save for the default mode (word)
        const wordSave = load('word');
        const quoteSave = load('quote');
        return !!(wordSave?.text || quoteSave?.text);
    }

    // Hook into setMode
    const origSetMode = window.setMode;
    window.setMode = function(mode) {
        // Save current first
        saveCurrent();

        // Switch mode
        origSetMode(mode);

        // Restore new mode
        if (mode === 'word' || mode === 'quote') {
            restoreAfterInit();
        }
    };

    // Hook into checkWin - save when solved
    const origCheckWin = window.checkWin;
    window.checkWin = function() {
        origCheckWin();
        saveCurrent();
    };

    // Hook into selectLetter - save after each guess
    const origSelectLetter = window.selectLetter;
    if (origSelectLetter) {
        window.selectLetter = function(letter) {
            origSelectLetter(letter);
            saveCurrent();
        };
    }

    // Hook into newPuzzle - clear save
    const origNewPuzzle = window.newPuzzle;
    window.newPuzzle = function() {
        // Don't skip for daily mode
        if (gameState.mode !== 'daily_quote') {
            clearSaved(gameState.mode);
        }
        if (gameState.mode === 'daily_quote') return;
        origNewPuzzle();
    };

    // Main execution - set flag before initGame runs
    if (shouldSkipInit()) {
        window.skipNewPuzzleOnInit = true;
        console.log('Persistence: skipping init newPuzzle, will restore saved state');
    }

    // Hook into initGame to restore after it runs
    const origInitGame = window.initGame;
    const hasSaves = shouldSkipInit();

    window.initGame = function() {
        // Run original init
        origInitGame();

        // Restore saved state if we have any
        if (hasSaves) {
            restoreAfterInit();
        }
    };

    console.log('Word/Quote persistence loaded, hasSaves:', hasSaves);
})();
