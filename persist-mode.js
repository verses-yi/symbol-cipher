// Word and Quote Mode Persistence
(function() {
    const SAVE_KEY = 'cipher_standard_mode';

    function save(key, data) {
        try { localStorage.setItem(SAVE_KEY + '_' + key, JSON.stringify(data)); }
        catch (e) {}
    }

    function load(key) {
        try { return JSON.parse(localStorage.getItem(SAVE_KEY + '_' + key)); }
        catch(e) { return null; }
    }

    function hasSavedState(mode) {
        const s = load(mode);
        return !!(s && s.text);
    }

    // Apply saved state to gameState
    function applySavedState(mode) {
        const saved = load(mode);
        if (!saved || !saved.text) return false;

        gameState.originalText = saved.text;
        gameState.userMappings = {...(saved.mappings || {})};
        gameState.symbolMap = {...(saved.map || {})};
        gameState.hintsRemaining = saved.hints || 3;
        gameState.solved = saved.solved || false;

        // Generate symbols if missing
        if (Object.keys(gameState.symbolMap).length === 0) {
            if (typeof generateSymbolMap === 'function') {
                generateSymbolMap();
            }
        }

        // Update gameState.saved
        gameState.saved[mode] = {
            text: saved.text,
            mappings: {...(saved.mappings || {})},
            map: {...(saved.map || {})},
            hints: saved.hints || 3,
            solved: saved.solved || false
        };

        return true;
    }

    // Restore and render
    function restoreAndRender() {
        const mode = gameState.mode;
        if (!applySavedState(mode)) return false;

        if (typeof renderPuzzle === 'function') renderPuzzle();
        if (typeof updateAlphabet === 'function') updateAlphabet();
        if (typeof updateSkipButton === 'function') updateSkipButton();

        const statusEl = document.getElementById('status-message');
        if (statusEl) {
            statusEl.textContent = gameState.solved ? 'Solved!' : 'Tap a symbol, then a letter';
        }

        console.log('Restored ' + mode + ' mode');
        return true;
    }

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

    // ============ Immediate check: Should we skip init? ============
    // Check ALL saved modes and load them into gameState.saved
    let skipInit = false;

    ['word', 'quote'].forEach(function(mode) {
        const saved = load(mode);
        if (saved && saved.text) {
            gameState.saved[mode] = {
                text: saved.text,
                mappings: {...(saved.mappings || {})},
                map: {...(saved.map || {})},
                hints: saved.hints || 3,
                solved: saved.solved || false
            };

            // If this is the current mode, mark to skip init
            if (mode === gameState.mode) {
                skipInit = true;
            }
        }
    });

    if (skipInit) {
        console.log('Found saved state for current mode, will skip init newPuzzle');
        window.skipNewPuzzleOnInit = true;
    }

    // ============ Hooks ============

    // Hook initGame - restore right after
    const origInitGame = window.initGame;
    window.initGame = function() {
        origInitGame();

        // Restore if current mode has saved state
        if ((gameState.mode === 'word' || gameState.mode === 'quote') &&
            gameState.saved[gameState.mode]?.text) {
            setTimeout(restoreAndRender, 0);
        }
    };

    // Hook setMode
    const origSetMode = window.setMode;
    window.setMode = function(mode) {
        // Save current before switch
        saveCurrent();

        // Check if target mode has saved state
        const hasSaved = gameState.saved[mode]?.text;

        if ((mode === 'word' || mode === 'quote') && hasSaved) {
            // Apply saved state
            applySavedState(mode);

            // Mode switch UI
            if (gameState.originalText) {
                gameState.saved[gameState.mode] = {
                    text: gameState.originalText,
                    mappings: {...gameState.userMappings},
                    map: {...gameState.symbolMap},
                    hints: gameState.hintsRemaining,
                    solved: gameState.solved
                };
            }

            gameState.mode = mode;
            document.querySelectorAll('.mode-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.mode === mode);
            });

            // Render restored state
            renderPuzzle();
            updateAlphabet();
            updateSkipButton();
            return;
        }

        // Normal mode switch
        origSetMode(mode);
    };

    // Hook newPuzzle
    const origNewPuzzle = window.newPuzzle;
    window.newPuzzle = function() {
        const mode = gameState.mode;
        if (mode === 'word' || mode === 'quote') {
            localStorage.removeItem(SAVE_KEY + '_' + mode);
            gameState.saved[mode] = { text: '', mappings: {}, map: {}, hints: 3, solved: false };
        }
        if (mode === 'daily_quote') return;
        origNewPuzzle();
    };

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

    console.log('Word/Quote persistence loaded');
})();
