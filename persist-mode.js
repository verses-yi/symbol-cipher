// Persistence for Word and Quote Modes
(function() {
    const STORAGE_KEY = 'symbol_cipher_standard';

    function saveStandardMode() {
        if (gameState.mode === 'word' || gameState.mode === 'quote') {
            localStorage.setItem(STORAGE_KEY + '_' + gameState.mode, JSON.stringify({
                text: gameState.originalText,
                mappings: gameState.userMappings,
                map: gameState.symbolMap,
                hints: gameState.hintsRemaining,
                solved: gameState.solved,
                timestamp: Date.now()
            }));
        }
    }

    function loadStandardMode(mode) {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY + '_' + mode));
            if (saved && saved.text) {
                gameState.saved[mode] = {
                    text: saved.text,
                    mappings: saved.mappings || {},
                    map: saved.map || {},
                    hints: saved.hints || 3,
                    solved: saved.solved || false
                };
            }
        } catch (e) {
            console.log('No saved ' + mode);
        }
    }

    // Save on mode switch
    const origSetMode = window.setMode;
    window.setMode = function(mode) {
        // Save current mode before switching
        if (gameState.mode === 'word' || gameState.mode === 'quote') {
            saveStandardMode();
        }

        // Load target mode if exists
        if (mode === 'word' || mode === 'quote') {
            loadStandardMode(mode);
        }

        return origSetMode(mode);
    };

    // Save on progress
    const origSelectLetter = window.selectLetter;
    if (typeof origSelectLetter === 'function') {
        window.selectLetter = function(letter) {
            origSelectLetter(letter);
            if (gameState.mode === 'word' || gameState.mode === 'quote') {
                saveStandardMode();
            }
        };
    }

    // Save on win
    const origCheckWin = window.checkWin;
    window.checkWin = function() {
        const wasSolved = gameState.solved;
        origCheckWin();
        if (!wasSolved && gameState.solved) {
            if (gameState.mode === 'word' || gameState.mode === 'quote') {
                saveStandardMode();
            }
        }
    };

    // Clear on skip/next
    const origNewPuzzle = window.newPuzzle;
    window.newPuzzle = function() {
        // Clear saved state for this mode
        if (gameState.mode === 'word' || gameState.mode === 'quote') {
            localStorage.removeItem(STORAGE_KEY + '_' + gameState.mode);
        }

        // Only generate new if not daily quote mode
        if (gameState.mode !== 'daily_quote') {
            origNewPuzzle();
        }
    };

    // Load on init
    const origInitGame = window.initGame;
    window.initGame = function() {
        // Load saved states
        loadStandardMode('word');
        loadStandardMode('quote');

        // Continue with normal init
        origInitGame();
    };

    console.log('Word/Quote persistence loaded');
})();
