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
  "do small things with love"
];

const SYMBOLS = [
  // Flowers (10)
  '🌸', '🌺', '🌻', '🌹', '🌷', '🌼', '🥀', '🌾', '💐', '🏵️',
  // Plants/Leaves (12)
  '🌿', '🍃', '🍂', '🍁', '☘️', '🍀', '🌾', '🪴', '🌴', '🌲', '🌳', '🎋',
  // Celestial/Sky (12)
  '⭐', '🌟', '✨', '💫', '🌙', '☀️', '🌞', '☁️', '⛅', '🌈', '☄️', '🪐',
  // Magic/Gems (8)
  '🔮', '💎', '✨', '💍', '💠', '🧿', '👁️', '🕯️',
  // Peace/Nature (8)
  '🕊️', '🦋', '🐛', '🐝', '🦗', '🪲', '🐞', '🦎',
  // Water/Weather (10)
  '💧', '💦', '❄️', '☃️', '⛄', '🌊', '💨', '🌪️', '⚡', '🌫️',
  // Animals (10)
  '🦌', '🐇', '🐿️', '🦡', '🐁', '🐀', '🦔', '🐾', '🦨', '🦝',
  // Objects (10)
  '🏹', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💌', '🎁',
  // Spiritual (8)
  '☯️', '☮️', '🔔', '🎵', '🎶', '🕉️', '✝️', '☪️',
  // Elements (12)
  '🔥', '⚡', '🌊', '🌍', '🌎', '🌏', '💨', '🌑', '🌒', '🌓', '🌔', '🌕'
];

let gameState = {
  mode: 'word',
  originalText: '',
  symbolMap: {},
  userMappings: {},
  hintsRemaining: 3,
  selectedSymbol: null,
  solved: false,
  saved: {
    word: { text: '', mappings: {}, map: {}, hints: 3, solved: false },
    quote: { text: '', mappings: {}, map: {}, hints: 3, solved: false }
  }
};

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
  console.log('Alphabet created');
}

function setupEventListeners() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });
  
  document.getElementById('hint-btn')?.addEventListener('click', giveHint);
  document.getElementById('skip-btn')?.addEventListener('click', handleSkipOrNext);
  document.getElementById('next-btn')?.addEventListener('click', () => nextPuzzle());
  document.getElementById('modal-next-btn')?.addEventListener('click', () => {
    document.getElementById('completion-modal')?.classList.remove('visible');
    nextPuzzle();
  });
}

function handleSkipOrNext() {
  if (gameState.solved) {
    nextPuzzle();
  } else {
    skipPuzzle();
  }
}

function setMode(newMode) {
  if (gameState.originalText) {
    gameState.saved[gameState.mode] = {
      text: gameState.originalText,
      mappings: {...gameState.userMappings},
      map: {...gameState.symbolMap},
      hints: gameState.hintsRemaining,
      solved: gameState.solved
    };
  }
  
  gameState.mode = newMode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === newMode);
  });
  
  const saved = gameState.saved[newMode];
  if (saved && saved.text) {
    gameState.originalText = saved.text;
    gameState.userMappings = {...saved.mappings};
    gameState.symbolMap = {...saved.map};
    gameState.hintsRemaining = saved.hints;
    gameState.solved = saved.solved;
    gameState.selectedSymbol = null;
    renderPuzzle();
    updateAlphabet();
    updateStatus(saved.solved ? 'Puzzle already solved!' : 'Tap a symbol, then a letter');
    updateSkipButton();
  } else {
    newPuzzle();
  }
}

function newPuzzle() {
  gameState.userMappings = {};
  gameState.selectedSymbol = null;
  gameState.hintsRemaining = 3;
  gameState.solved = false;
  gameState.saved[gameState.mode] = { text: '', mappings: {}, map: {}, hints: 3, solved: false };
  
  const source = gameState.mode === 'word' ? WORDS : QUOTES;
  gameState.originalText = source[Math.floor(Math.random() * source.length)].toUpperCase();
  
  generateSymbolMap();
  renderPuzzle();
  updateAlphabet();
  updateStatus('Tap a symbol, then a letter');
  updateSkipButton();
  
  document.getElementById('completion-modal')?.classList.remove('visible');
}

function updateSkipButton() {
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) {
    skipBtn.textContent = gameState.solved ? 'Next ➔' : '⏭ Skip';
  }
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
        span.addEventListener('click', () => selectSymbol(letter));
      }
      
      wordDiv.appendChild(span);
    }
    
    display.appendChild(wordDiv);
    
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
  document.querySelectorAll('.symbol').forEach(el => {
    el.classList.remove('selected');
    if (el.textContent === gameState.symbolMap[letter] && !el.classList.contains('revealed')) {
      el.classList.add('selected');
    }
  });
  updateStatus('Now tap a letter');
}

function selectLetter(userLetter) {
  if (!gameState.selectedSymbol) {
    updateStatus('Tap a symbol first');
    return;
  }
  
  if (Object.values(gameState.userMappings).includes(userLetter)) {
    updateStatus('Letter already used');
    return;
  }
  
  if (userLetter === gameState.selectedSymbol) {
    gameState.userMappings[userLetter] = userLetter;
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
  });
}

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
  document.querySelectorAll('.symbol').forEach(el => el.classList.add('solved'));
  
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) skipBtn.textContent = 'Next ➔';
  
  setTimeout(() => {
    const modal = document.getElementById('completion-modal');
    const solvedText = document.getElementById('solved-text');
    if (modal && solvedText) {
      solvedText.textContent = gameState.originalText;
      modal.classList.add('visible');
    }
  }, 500);
}

function skipPuzzle() {
  gameState.saved[gameState.mode] = { text: '', mappings: {}, map: {}, hints: 3, solved: false };
  newPuzzle();
}

function nextPuzzle() {
  document.getElementById('completion-modal')?.classList.remove('visible');
  newPuzzle();
}

function updateStatus(msg, type = '') {
  const el = document.getElementById('status-message');
  if (el) {
    el.textContent = msg;
    el.className = 'status-message' + (type ? ' ' + type : '');
  }
}

console.log('Game loaded');
