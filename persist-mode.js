// Simple Word/Quote Persistence
(function() {
    console.log('PERSIST: Loading...');

    try {
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
            console.log('PERSIST: Trying to restore...');
            const mode = gameState.mode;
            if (mode !== 'word' && mode !== 'quote') {
                console.log('PERSIST: Not word/quote mode, skipping');
                return;
            }

            const saved = load(mode);
            if (!saved || !saved.text) {
                console.log('PERSIST: No saved state for', mode);
                return;
            }

            console.log('PERSIST: Found saved', mode, 'with text:', saved.text.substring(0, 20));

            // Overwrite current state
            gameState.originalText = saved.text;
            gameState.symbolMap = {...(saved.map || {})};
            gameState.userMappings = {...(saved.mappings || {})};
            gameState.solved = saved.solved || false;
            gameState.hintsRemaining = saved.hints || 3;

            console.log('PERSIST: State restored, symbolMap keys:', Object.keys(gameState.symbolMap).length);

            // Update saved cache
            gameState.saved[mode] = {
                text: saved.text,
                map: {...(saved.map || {})},
                mappings: {...(saved.mappings || {})},
                hints: saved.hints || 3,
                solved: saved.solved || false
            };

            // Render
            console.log('PERSIST: Rendering...');
            if (typeof renderPuzzle === 'function') {
                renderPuzzle();
                console.log('PERSIST: renderPuzzle called');
            }
            if (typeof updateAlphabet === 'function') {
                updateAlphabet();
                console.log('PERSIST: updateAlphabet called');
            }
            if (typeof updateSkipButton === 'function') updateSkipButton();

            const status = document.getElementById('status-message');
            if (status) status.textContent = gameState.solved ? 'Solved!' : 'Tap a symbol, then a letter';

            console.log('PERSIST: Restore complete for', mode);
        }

        // Hook initGame
        console.log('PERSIST: initGame exists?', typeof window.initGame);
        const origInitGame = window.initGame;

        if (typeof origInitGame !== 'function') {
            console.error('PERSIST: initGame not found!');
            return;
        }

        window.initGame = function() {
            console.log('PERSIST: initGame starting...');
            origInitGame();
            console.log('PERSIST: initGame complete, restoring...');
            restore();
        };
        console.log('PERSIST: Hooked initGame');

        // Hook setMode
        const origSetMode = window.setMode;
        window.setMode = function(mode) {
            console.log('PERSIST: setMode to', mode);
            save(gameState.mode);  // Save current
            origSetMode(mode);     // Switch
            setTimeout(restore, 0); // Restore new mode
        };

        // Hook newPuzzle
        const origNewPuzzle = window.newPuzzle;
        window.newPuzzle = function() {
            console.log('PERSIST: newPuzzle, clearing save for', gameState.mode);
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

        // Also try restore after a short delay (fallback)
        setTimeout(function() {
            console.log('PERSIST: Fallback restore check...');
            if (!gameState.originalText || gameState.originalText === '') {
                restore();
            }
        }, 100);

        console.log('PERSIST: Setup complete');
    } catch(e) {
        console.error('PERSIST: Fatal error:', e);
    }
})();
