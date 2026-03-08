// Persistence Save - Runs AFTER game.js
// Hooks into selectLetter and checkWin to save progress

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

    // Hook selectLetter
    const orig = selectLetter;
    selectLetter = function(letter) {
        orig(letter);
        save(gameState.mode);
    };

    // Hook checkWin
    const origCheck = checkWin;
    checkWin = function() {
        const was = gameState.solved;
        origCheck();
        if (gameState.solved !== was) {
            save(gameState.mode);
        }
    };

    // Hook newPuzzle
    const origNew = newPuzzle;
    newPuzzle = function() {
        // Clear flag so we can restore next time
        window._restored = false;

        // Clear save
        if (gameState.mode === 'word' || gameState.mode === 'quote') {
            localStorage.removeItem(SAVE_KEY + '_' + gameState.mode);
            gameState.saved[gameState.mode] = { text: '', map: {}, mappings: {}, hints: 3, solved: false };
            window._persistState[gameState.mode] = null;
        }

        if (gameState.mode === 'daily_quote') return;
        origNew();
    };

    // Hook setMode
    const origSet = setMode;
    setMode = function(mode) {
        save(gameState.mode);
        origSet(mode);
    };

    console.log('PERSIST: Save hooks active');
})();
