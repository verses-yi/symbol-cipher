// Word/Quote Persistence - Load AFTER game.js
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

        console.log('PERSIST: Restored', mode, '-', saved.text.substring(0, 20));
    }

    // ========== RUN RESTORE IMMEDIATELY ==========
    // By the time this script loads, initGame has already run
    restore();

    // ========== HOOK SETMODE ==========
    const origSetMode = window.setMode;
    window.setMode = function(mode) {
        save(gameState.mode);   // Save current before switch
        origSetMode(mode);      // Switch modes
        setTimeout(restore, 0); // Restore new mode
    };

    // ========== HOOK NEWPUZZLE ==========
    const origNewPuzzle = window.newPuzzle;
    window.newPuzzle = function() {
        const mode = gameState.mode;
        if (mode === 'word' || mode === 'quote') {
            localStorage.removeItem(SAVE_KEY + '_' + mode);
            gameState.saved[mode] = { text: '', map: {}, mappings: {}, hints: 3, solved: false };
            console.log('PERSIST: Cleared save for', mode);
        }
        if (mode === 'daily_quote') return;
        origNewPuzzle();
    };

    // ========== HOOK SELECTLETTER ==========
    const origSelectLetter = window.selectLetter;
    if (origSelectLetter) {
        window.selectLetter = function(letter) {
            origSelectLetter(letter);
            save(gameState.mode);
        };
    }

    // ========== HOOK CHECKWIN ==========
    const origCheckWin = window.checkWin;
    window.checkWin = function() {
        const wasSolved = gameState.solved;
        origCheckWin();
        if (gameState.solved !== wasSolved) {
            save(gameState.mode);
        }
    };

    console.log('PERSIST: Loaded and ready');
})();
