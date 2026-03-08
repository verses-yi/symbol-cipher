// Persistence Preload - Runs BEFORE game.js
// Exposes saved state for game.js to use

(function() {
    const SAVE_KEY = 'cipher_save';

    function load(mode) {
        try { return JSON.parse(localStorage.getItem(SAVE_KEY + '_' + mode)); }
        catch(e) { return null; }
    }

    // Make saved state available globally BEFORE game.js loads
    window._persistState = {
        word: load('word'),
        quote: load('quote')
    };

    // Set flag to tell game.js to restore
    const wordSaved = window._persistState.word;
    if (wordSaved && wordSaved.text) {
        window._shouldRestoreWord = true;
    }

    console.log('PERSIST: Preloaded saved states', {
        word: !!(wordSaved && wordSaved.text),
        quote: !!(window._persistState.quote && window._persistState.quote.text)
    });
})();
