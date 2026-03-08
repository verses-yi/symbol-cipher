// Word and Quote Mode Persistence
(function() {
    const SAVE_KEY = 'cipher_standard_mode';

    function save(key, data) {
        localStorage.setItem(SAVE_KEY + '_' + key, JSON.stringify(data));
    }

    function load(key) {
        try { return JSON.parse(localStorage.getItem(SAVE_KEY + '_' + key)); }
        catch(e) { return null; }
    }

    // Restore a specific mode
    function restoreMode(mode) {
        const saved = load(mode);
        if (saved && saved.text) {
            gameState.saved[mode] = {
                text: saved.text,
                mappings: saved.mappings || {},
                map: saved.map || {},
                hints: saved.hints || 3,
                solved: saved.solved || false
            };

            // If currently in this mode, apply immediately
            if (gameState.mode === mode) {
                gameState.originalText = saved.text;
                gameState.userMappings = {...(saved.mappings || {})};
                gameState.symbolMap = {...(saved.map || {})};
                gameState.hintsRemaining = saved.hints || 3;
                gameState.solved = saved.solved || false;

                if (typeof generateSymbolMap === 'function' && (!saved.map || Object.keys(saved.map).length === 0)) {
                    generateSymbolMap();
                }
                if (typeof renderPuzzle === 'function') renderPuzzle();
                if (typeof updateAlphabet === 'function') updateAlphabet();
                if (typeof updateSkipButton === 'function') updateSkipButton();
                if (typeof updateStatus === 'function') {
                    updateStatus(gameState.solved ? 'Solved!' : 'Tap a symbol, then a letter');
                }
                return true;
            }
        }
        return false;
    }

    function saveCurrent() {
        if (gameState.mode === 'word' || gameState.mode === 'quote') {
            save(gameState.mode, {
                text: gameState.originalText,
                mappings: gameState.userMappings,
                map: gameState.symbolMap,
                hints: gameState.hintsRemaining,
                solved: gameState.solved,
                timestamp: Date.now()
            });
        }
    }

    // Hook selectLetter
    const origSelectLetter = window.selectLetter;
    if (origSelectLetter) {
        window.selectLetter = function(letter) {
            origSelectLetter(letter);
            saveCurrent();
        };
    }

    // Hook checkWin
    const origCheckWin = window.checkWin;
    window.checkWin = function() {
        const wasSolved = gameState.solved;
        origCheckWin();
        if (gameState.solved !== wasSolved) {
            saveCurrent();
        }
    };

    // Hook newPuzzle
    const origNewPuzzle = window.newPuzzle;
    window.newPuzzle = function() {
        // Clear saved state when generating new puzzle
        if (gameState.mode === 'word' || gameState.mode === 'quote') {
            localStorage.removeItem(SAVE_KEY + '_' + gameState.mode);
            gameState.saved[gameState.mode] = { text: '', mappings: {}, map: {}, hints: 3, solved: false };
        }
        if (gameState.mode === 'daily_quote') return;
        origNewPuzzle();
    };

    // Hook initGame to restore after initialization
    const origInitGame = window.initGame;
    window.initGame = function() {
        // Run original init
        origInitGame();

        // Then restore saved state for current mode
        setTimeout(function() {
            if (gameState.mode === 'word' || gameState.mode === 'quote') {
                restoreMode(gameState.mode);
            }
        }, 0);
    };

    // Also restore in setMode
    const origSetMode = window.setMode;
    window.setMode = function(mode) {
        // Save current before switching
        saveCurrent();

        // Call original
        origSetMode(mode);

        // Restore new mode after a tick
        if (mode === 'word' || mode === 'quote') {
            setTimeout(function() {
                restoreMode(mode);
            }, 0);
        }
    };

    // Initial restore if in word/quote mode
    setTimeout(function() {
        if (gameState.mode === 'word' || gameState.mode === 'quote') {
            restoreMode(gameState.mode);
        }
    }, 0);

    console.log('Word/Quote persistence loaded');
})();
