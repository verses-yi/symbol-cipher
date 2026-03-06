// Symbol Cipher - Complete Working Game

const WORDS = [
  "peace", "calm", "kind", "light", "dream", "smile", "love", "hope", "joy", "grace",
  "heart", "soul", "mind", "happy", "free", "warm", "cool", "safe", "home", "life",
  "work", "play", "rest", "read", "walk", "talk", "sing", "dance", "laugh", "live",
  "blue", "green", "gold", "pink", "rose", "moon", "star", "sun", "sky", "sea",
  "tree", "bird", "fish", "cat", "dog", "bear", "wolf", "lion", "dear", "friend",
  "food", "water", "bread", "fruit", "sweet", "fresh", "clean", "clear", "bright", "dark",
  "flower", "garden", "forest", "river", "ocean", "beach", "island", "meadow", "valley", "mountain",
  "morning", "evening", "night", "dawn", "dusk", "sunrise", "sunset", "rainbow", "cloud", "mist",
  "spring", "summer", "autumn", "winter", "season", "weather", "breeze", "wind", "rain", "snow"
];

const QUOTES = [
  "knowledge is power",
  "be kind to yourself",
  "every day is a new beginning",
  "stars shine in darkness",
  "do small things with love",
  "peace comes from within",
  "happiness is a choice",
  "let your light shine",
  "dream big work hard",
  "believe in yourself",
  "stay true to yourself",
  "kindness changes everything",
  "simplicity is beautiful",
  "patience is a virtue",
  "time heals all wounds",
  "love conquers all",
  "friends are family",
  "home is where heart is",
  "music speaks words cannot",
  "art feeds the soul"
];

const SYMBOLS = ['🌸', '🌙', '⭐', '🌿', '🦋', '🍃', '🌼', '🌟', '🍂', '🌺', '🔮', '🕊', '💫'];

// Game State
let gameState = {
  mode: 'word',
  originalText: '',
  symbolMap: {},
  userMappings: {},
  hintsRemaining: 3,
  selectedSymbol: null,
  solvedWords: [],
  solvedQuotes: [],
  solved: false
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initGame);

function initGame() {
  console.log('Initializing game...');
  createAlphabet();
  setupEventListeners();
  newPuzzle();
}

function createAlphabet() {
  const alphabetDiv = document.getElementById('alphabet');
  if (!alphabetDiv) {
    console.error('Alphabet container not found!');
    return;
  }
  
  alphabetDiv.innerHTML = '';
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

function setupEventListeners() {
  // Mode toggle buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });
  
  // Control buttons
  const hintBtn = document.getElementById('hint-btn');
  const skipBtn = document.getElementById('skip-btn');
  const nextBtn = document.getElementById('next-btn');
  const modalNextBtn = document.getElementById('modal-next-btn');
  
  if (hintBtn) hintBtn.addEventListener('click', giveHint);
  if (skipBtn) skipBtn.addEventListener('click', skipPuzzle);
  if (nextBtn) nextBtn.addEventListener('click', () => nextPuzzle());
  if (modalNextBtn) modalNextBtn.addEventListener('click', () => {
    document.getElementById('completion-modal').classList.remove('visible');
    nextPuzzle();
  });
}

function setMode(mode) {
  gameState.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  newPuzzle();
}

function newPuzzle() {
  // Reset state
  gameState.userMappings = {};
  gameState.selectedSymbol = null;
  gameState.hintsRemaining = 3;
  gameState.solved = false;
  
  // Get available puzzles
  let available = gameState.mode === 'word' ? WORDS : QUOTES;
  available = available.filter(w => {
    const key = w.toLowerCase();
    return !(gameState.mode === 'word' ? gameState.solvedWords : gameState.solvedQuotes).includes(key);
  });
  
  // Reset if all used
  if (available.length === 0) {
    if (gameState.mode === 'word') gameState.solvedWords = [];
    else gameState.solvedQuotes = [];
    available = gameState.mode === 'word' ? WORDS : QUOTES;
  }
  
  // Pick random puzzle
  gameState.originalText = available[Math.floor(Math.random() * available.length)].toUpperCase();
  
  // Generate symbol mapping
  generateSymbolMap();
  
  // Render
  renderPuzzle();
  updateAlphabet();
  updateStatus('Tap a symbol, then a letter');
  hideNextButton();
  
  // Update hint button
  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) hintBtn.textContent = '💡 Hint (3)';
}

function generateSymbolMap() {
  gameState.symbolMap = {};
  const usedSymbols = new Set();
  const letters = [...new Set(gameState.originalText.replace(/[^A-Z]/g, ''))];
  
  letters.forEach(letter => {
    let symbol;
    do {
      symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    } while (usedSymbols.has(symbol) && usedSymbols.size < SYMBOLS.length);
    usedSymbols.add(symbol);
    gameState.symbolMap[letter] = symbol;
  });
}

function renderPuzzle() {
  const display = document.getElementById('puzzle-display');
  if (!display) return;
  
  display.innerHTML = '';
  const words = gameState.originalText.split(' ');
  
  words.forEach((word, i) => {
    // Create word container
    const wordDiv = document.createElement('div');
    wordDiv.className = 'word';
    
    // Add each letter/symbol
    for (let letter of word) {
      const span = document.createElement('span');
      span.className = 'symbol';
      
      if (gameState.userMappings[letter]) {
        span.textContent = gameState.userMappings[letter];
        span.classList.add('revealed');
      } else {
        span.textContent = gameState.symbolMap[letter] || letter;
        if (gameState.symbolMap[letter]) {
          span.addEventListener('click', () => selectSymbol(letter));
        }
      }
      
      wordDiv.appendChild(span);
    }
    
    display.appendChild(wordDiv);
    
    // Add space between words
    if (i < words.length - 1) {
      const space = document.createElement('span');
      space.style.minWidth = '8px';
      display.appendChild(space);
    }
  });
  
  checkWin();
}

function selectSymbol(letter) {
  gameState.selectedSymbol = letter;
  
  // Update visual
  document.querySelectorAll('.symbol').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Find matching symbols
  document.querySelectorAll('.symbol').forEach(el => {
    if (el.textContent === gameState.symbolMap[letter] && !el.classList.contains('revealed')) {
      el.classList.add('selected');
    }
  });
  
  updateStatus('Now tap a letter from the alphabet');
}

function selectLetter(userLetter) {
  if (!gameState.selectedSymbol) {
    updateStatus('Tap a symbol first');
    return;
  }
  
  // Check if already used
  if (Object.values(gameState.userMappings).includes(userLetter)) {
    updateStatus('Letter already used');
    return;
  }
  
  const correctLetter = gameState.selectedSymbol;
  
  if (userLetter === correctLetter) {
    gameState.userMappings[correctLetter] = userLetter;
    updateStatus('Correct!', 'success');
  } else {
    updateStatus('Not quite...');
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

function giveHint() {
  if (gameState.hintsRemaining <= 0) return;
  
  const unrevealed = Object.keys(gameState.symbolMap).filter(l => !gameState.userMappings[l]);
  if (unrevealed.length > 0) {
    const letter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    gameState.userMappings[letter] = letter;
    gameState.hintsRemaining--;
    document.getElementById('hint-btn').textContent = `💡 Hint (${gameState.hintsRemaining})`;
    updateStatus(`Hint: ${gameState.symbolMap[letter]} = ${letter}`);
    renderPuzzle();
    updateAlphabet();
  }
}

function checkWin() {
  const allRevealed = Object.keys(gameState.symbolMap).every(l => gameState.userMappings[l]);
  
  if (!allRevealed || gameState.solved) return;
  
  gameState.solved = true;
  
  // Track solved to prevent repeats
  const key = gameState.originalText.toLowerCase();
  if (gameState.mode === 'word') {
    gameState.solvedWords.push(key);
  } else {
    gameState.solvedQuotes.push(key);
  }
  
  // Visual feedback
  document.querySelectorAll('.symbol').forEach(el => el.classList.add('solved'));
  
  // Show next button
  const nextBtn = document.getElementById('next-btn');
  if (nextBtn) nextBtn.classList.add('visible');
  
  // Show modal after delay
  setTimeout(() => {
    const modal = document.getElementById('completion-modal');
    const solvedText = document.getElementById('solved-text');
    if (modal && solvedText) {
      solvedText.textContent = gameState.originalText;
      modal.classList.add('visible');
    }
  }, 500);
}

function hideNextButton() {
  const btn = document.getElementById('next-btn');
  if (btn) btn.classList.remove('visible');
}

function nextPuzzle() {
  document.getElementById('completion-modal')?.classList.remove('visible');
  hideNextButton();
  newPuzzle();
}

function skipPuzzle() {
  const key = gameState.originalText.toLowerCase();
  if (gameState.mode === 'word') gameState.solvedWords.push(key);
  else gameState.solvedQuotes.push(key);
  newPuzzle();
}

function updateStatus(msg, type = '') {
  const el = document.getElementById('status-message');
  if (el) {
    el.textContent = msg;
    el.className = 'status-message' + (type ? ' ' + type : '');
  }
}

console.log('Symbol Cipher loaded');
