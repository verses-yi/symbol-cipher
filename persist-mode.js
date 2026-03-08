// Simple Word/Quote Persistence - MUST load AFTER game.js
(function() {
    const SAVE_KEY = 'cipher_save';

    function save(mode) {
        if (mode !== 'word' && mode !== 'quote') return;
        try {
            localStorage.setItem(SAVE_KEY + '_' + mode, JSON.stringify({
                text: gameState.originalText,
                map: gameState.symbolMap,
                mappings: gameState.userMappings,
                solved: gameState.solved,
                hints: gameState.hintsRemaining
            }));
        } catch(e) {}
    }

    function load(mode) {
        try { return JSON.parse(localStorage.getItem(SAVE_KEY + '_' + mode)); }
        catch(e) { return null; }
    }

    // Restore saved state
    function restore() {
        const mode = gameState.mode;
        if (mode !== 'word' && mode !== 'quote') return;

        const saved = load(mode);
        if (!saved || !saved.text) return;

        // Overwrite current state
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

        // Render
        if (typeof renderPuzzle === 'function') renderPuzzle();
        if (typeof updateAlphabet === 'function') updateAlphabet();
        if (typeof updateSkipButton === 'function') updateSkipButton();

        const status = document.getElementById('status-message');
        if (status) status.textContent = gameState.solved ? 'Solved!' : 'Tap a symbol, then a letter';
    }

    // CRITICAL: Re-attach initGame with our hook
    const origInitGame = window.initGame;
    if (typeof origInitGame !== 'function') {
        console.error('PERSIST: initGame not found');
        return;
    }

    // Remove old listener and add hooked version
    // The old listener is still there with the old reference
    // We need to run restore AFTER initGame completes

    window.initGame = function() {
        origInitGame();   // Let game create puzzle
        restore();        // Then overwrite with saved state
    };

    // Since DOMContentLoaded already fired (we're loading after game.js),
    // we need to trigger restore manually one time
    if (document.readyState !== 'loading') {
        // DOM is already ready, initGame already ran
        // Run restore now
        setTimeout(restore, 10);
    }

    // Also hook setMode
    const origSetMode = window.setMode;
    window.setMode = function(mode) {
        save(gameState.mode);   // Save current
        origSetMode(mode);      // Switch
        setTimeout(restore, 0); // Restore new mode
    };

    // Hook newPuzzle - clear save
    const origNewPuzzle = window.newPuzzle;
    window.newPuzzle = function() {
        const mode = gameState.mode;
        if (mode === 'word' || mode === 'quote') {
            localStorage.removeItem(SAVE_KEY + '_' + mode);
            gameState.saved[mode] = { text: '', map: {}, mappings: {}, hints: 3, solved: false };
        }
        if (mode === 'daily_quote') return;
        origNewPuzzle();
    };

    // Hook selectLetter
    const origSelectLetter = window.selectLetter;
    if (origSelectLetter) {
        window.selectLetter = function(letter) {
            origSelectLetter(letter);
            save(gameState.mode);
        };
    }

    // Hook checkWin
    const origCheckWin = window.checkWin;
    window.checkWin = function() {
        const wasSolved = gameState.solved;
        origCheckWin();
        if (gameState.solved !== wasSolved) {
            save(gameState.mode);
        }
    };

    console.log('PERSIST: Persistence loaded');
})();
