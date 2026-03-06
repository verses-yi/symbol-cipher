// Symbol Cipher - Relaxing Word & Quote Decoder (Complete)
const WORDS = [
    "peace", "calm", "kind", "light", "dream", "smile", "love", "hope", "joy", "grace",
    "heart", "soul", "mind", "spirit", "wisdom", "truth", "beauty", "gentle", "soft", "warm"
];

const QUOTES = [
    "knowledge is power",
    "be kind to yourself",
    "every day is a new beginning",
    "stars shine in darkness",
    "do small things with love",
    "peace comes from within",
    "happiness is a choice",
    "let your light shine"
];

const SYMBOLS = ['🌸', '🌙', '⭐', '🌿', '🦋', '🍃', '🌼', '🌟', '🍂', '🌺', '🔮', '🕊', '💫'];

let gameState = {
    mode: 'word',
    originalText: '',
    symbolMap: {},
    userMappings: {},
    hintsRemaining: 3,
    selectedSymbol: null
};

function init() {
    createAlphabet();
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });
    document.getElementById('hint-btn').addEventListener('click', giveHint);
    document.getElementById('skip-btn').addEventListener('click', newPuzzle);
    document.getElementById('next-btn').addEventListener('click', newPuzzle);
    document.getElementById('modal-next-btn').addEventListener('click', () => {
        document.getElementById('completion-modal').classList.remove('visible');
        newPuzzle();
    });
    newPuzzle();
}

function createAlphabet() {
    const alphabetDiv = document.getElementById('alphabet');
    for (let i = 65; i <= 90; i++) {
        const letter = String.fromCharCode(i);
        const btn = document.createElement('button');
        btn.className = 'letter';
        btn.textContent = letter;
        btn.dataset.letter = letter;
        btn.addEventListener('click', () => selectLetter(letter));
        alphabetDiv.appendChild(btn);
    }
}

function setMode(mode) {
    gameState.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    newPuzzle();
}

function newPuzzle() {
    gameState.userMappings = {};
    gameState.selectedSymbol = null;
    gameState.hintsRemaining = 3;
    
    const source = gameState.mode === 'word' ? WORDS : QUOTES;
    gameState.originalText = source[Math.floor(Math.random() * source.length)].toUpperCase();
    
    // Create symbol mapping
    gameState.symbolMap = {};
    const usedSymbols = {};
    const uniqueLetters = [...new Set(gameState.originalText.replace(/[^A-Z]/g, ''))];
    
    uniqueLetters.forEach(letter => {
        let symbol;
        do {
            symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        } while (usedSymbols[symbol] && Object.keys(usedSymbols).length < SYMBOLS.length);
        usedSymbols[symbol] = true;
        gameState.symbolMap[letter] = symbol;
    });
    
    renderPuzzle();
    updateAlphabet();
    document.getElementById('hint-btn').textContent = `Hint (${gameState.hintsRemaining})`;
    document.getElementById('next-btn').classList.remove('visible');
    document.getElementById('completion-modal').classList.remove('visible');
}

function renderPuzzle() {
    const display = document.getElementById('puzzle-display');
    display.innerHTML = '';
    
    const words = gameState.originalText.split(' ');
    words.forEach((word, i) => {
        const wordDiv = document.createElement('div');
        wordDiv.className = 'word';
        
        for (let letter of word) {
            const span = document.createElement('span');
            span.className = 'symbol';
            
            if (gameState.userMappings[letter]) {
                span.textContent = gameState.userMappings[letter];
                span.classList.add('revealed');
            } else {
                span.textContent = gameState.symbolMap[letter] || letter;
                if (gameState.symbolMap[letter]) {
                    span.dataset.letter = letter;
                    span.dataset.symbol = gameState.symbolMap[letter];
                    span.addEventListener('click', () => selectSymbol(letter));
                }
            }
            wordDiv.appendChild(span);
        }
        display.appendChild(wordDiv);
        
        // Add space between words
        if (i < words.length - 1) {
            const space = document.createElement('span');
            space.textContent = '  ';
            display.appendChild(space);
        }
    });
    
    checkWin();
}

function selectSymbol(letter) {
    gameState.selectedSymbol = letter;
    document.querySelectorAll('.symbol').forEach(el => {
        el.classList.toggle('selected', el.dataset.letter === letter);
    });
    document.getElementById('status-message').textContent = `Selected: ${gameState.symbolMap[letter]} - Now pick a letter`;
}

function selectLetter(userLetter) {
    if (!gameState.selectedSymbol) {
        document.getElementById('status-message').textContent = 'Click a symbol first';
        return;
    }
    
    // Check if letter is already used
    if (Object.values(gameState.userMappings).includes(userLetter)) {
        document.getElementById('status-message').textContent = 'That letter is already used';
        return;
    }
    
    // Check if correct
    const correctLetter = gameState.selectedSymbol;
    if (userLetter === correctLetter) {
        gameState.userMappings[correctLetter] = userLetter;
        document.getElementById('status-message').textContent = 'Correct!';
        document.getElementById('status-message').className = 'status-message success';
    } else {
        document.getElementById('status-message').textContent = `Not quite... try another letter`;
        document.getElementById('status-message').className = 'status-message error';
    }
    
    gameState.selectedSymbol = null;
    renderPuzzle();
    updateAlphabet();
}

function updateAlphabet() {
    document.querySelectorAll('.letter').forEach(btn => {
        const letter = btn.dataset.letter;
        const used = Object.values(gameState.userMappings).includes(letter);
        btn.classList.toggle('disabled', used);
        btn.classList.toggle('selected', gameState.selectedSymbol === letter);
    });
}

function giveHint() {
    if (gameState.hintsRemaining <= 0) return;
    
    // Find unrevealed letter
    const unrevealed = [];
    for (let letter in gameState.symbolMap) {
        if (!gameState.userMappings[letter]) {
            unrevealed.push(letter);
        }
    }
    
    if (unrevealed.length > 0) {
        const letter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        gameState.userMappings[letter] = letter;
        gameState.hintsRemaining--;
        document.getElementById('hint-btn').textContent = `Hint (${gameState.hintsRemaining})`;
        renderPuzzle();
        updateAlphabet();
        document.getElementById('status-message').textContent = `Hint: ${gameState.symbolMap[letter]} = ${letter}`;
    }
}

function checkWin() {
    const allRevealed = Object.keys(gameState.symbolMap).every(letter => 
        gameState.userMappings[letter]
    );
    
    if (allRevealed) {
        document.querySelectorAll('.symbol').forEach(el => {
            el.classList.add('solved');
        });
        
        setTimeout(() => {
            document.getElementById('solved-text').textContent = gameState.originalText;
            document.getElementById('completion-modal').classList.add('visible');
        }, 500);
    }
}

// Start game
document.addEventListener('DOMContentLoaded', init);
