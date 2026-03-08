// Word and Quote Mode Persistence
// Saves progress to localStorage

(function() {
    const SAVE_KEY = 'cipher_standard_mode';

    // Save current mode state
    function saveState() {
        if (gameState.mode === 'word' || gameState.mode === 'quote') {
            const data = {
                mode: gameState.mode,
                text: gameState.originalText,
                mappings: gameState.userMappings,
                map: gameState.symbolMap,
                hints: gameState.hintsRemaining,
                solved: gameState.solved
            };
            localStorage.setItem(SAVE_KEY + '_' + gameState.mode, JSON.stringify(data));
        }
    }

    // Load saved state into gameState.saved
    function loadState(mode) {
        try {
            const saved = JSON.parse(localStorage.getItem(SAVE_KEY + '_' + mode));
            if (saved && saved.text) {
                gameState.saved[mode] = {
                    text: saved.text,
                    mappings: saved.mappings || {},
                    map: saved.map || {},
                    hints: saved.hints || 3,
                    solved: saved.solved || false
                };
            }
        } catch (e) {}
    }

    // Hook into selectLetter (called when user makes a guess)
    const origSelectLetter = window.selectLetter;
    if (origSelectLetter) {
        window.selectLetter = function(letter) {
            origSelectLetter(letter);
            saveState();
        };
    }

    // Hook into checkWin
    const origCheckWin = window.checkWin;
    if (origCheckWin) {
        window.checkWin = function() {
            origCheckWin();
            saveState();
        };
    }

    // Hook into newPuzzle to clear saved state
    const origNewPuzzle = window.newPuzzle;
    if (origNewPuzzle) {
        window.newPuzzle = function() {
            // Clear saved state for current mode
            if (gameState.mode === 'word' || gameState.mode === 'quote') {
                localStorage.removeItem(SAVE_KEY + '_' + gameState.mode);
                gameState.saved[gameState.mode] = { text: '', mappings: {}, map: {}, hints: 3, solved: false };
            }

            // Don't generate new puzzle if in daily mode
            if (gameState.mode === 'daily_quote') {
                return;
            }

            origNewPuzzle();
        };
    }

    // Load saved states on startup
    loadState('word');
    loadState('quote');

    console.log('Word/Quote persistence: loaded');
})();
