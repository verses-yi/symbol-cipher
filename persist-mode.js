// Simple Word/Quote Persistence
// Load AFTER game.js

(function() {
    const SAVE_KEY = 'cipher_save';

    function save(mode) {
        if (mode !== 'word' && mode !== 'quote') return;
        localStorage.setItem(SAVE_KEY + '_' + mode, JSON.stringify({
            text: gameState.originalText,
            map: gameState.symbolMap,
            mappings: gameState.userMappings,
            solved: gameState.solved,
            hints: gameState.hintsRemaining
        }));
    }

    function load(mode) {
        try { return JSON.parse(localStorage.getItem(SAVE_KEY + '_' + mode)); }
        catch(e) { return null; }
    }

    // Restore after initGame runs
    function restore() {
        const mode = gameState.mode;
        if (mode !== 'word' && mode !== 'quote') return;

        const saved = load(mode);
        if (!saved || !saved.text) return;

        // Overwrite current state with saved
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

        console.log('Restored ' + mode + ' mode');
    }

    // Hook initGame to restore after it runs
    const origInitGame = window.initGame;
    window.initGame = function() {
        origInitGame();          // Let game create new puzzle
        restore();               // Then overwrite with saved state
    };

    // Hook setMode
    const origSetMode = window.setMode;
    window.setMode = function(mode) {
        save(gameState.mode);    // Save current before switch

        origSetMode(mode);       // Switch modes

        restore();               // Restore if saved state exists
    };

    // Hook newPuzzle - clear save and generate new
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

    // Hook selectLetter - save after guess
    const origSelectLetter = window.selectLetter;
    if (origSelectLetter) {
        window.selectLetter = function(letter) {
            origSelectLetter(letter);
            save(gameState.mode);
        };
    }

    // Hook checkWin - save when solved
    const origCheckWin = window.checkWin;
    window.checkWin = function() {
        const wasSolved = gameState.solved;
        origCheckWin();
        if (gameState.solved !== wasSolved) {
            save(gameState.mode);
        }
    };

    console.log('Simple persistence loaded');
})();
