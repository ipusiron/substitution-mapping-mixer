// State
const state = {
  inputText: '',
  mappings: {},
  highlightedCipher: null
};

// Initialize mappings for A-Z
for (let i = 0; i < 26; i++) {
  const letter = String.fromCharCode(65 + i);
  state.mappings[letter] = { fixed: '', candidates: [] };
}

// DOM Elements
const cipherInput = document.getElementById('cipherInput');
const branchCards = document.getElementById('branchCards');
const branchCount = document.getElementById('branchCount');
const mappingGrid = document.getElementById('mappingGrid');
const unusedLetters = document.getElementById('unusedLetters');

// Build mapping grid
function buildMappingGrid() {
  mappingGrid.innerHTML = '';

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    const mapping = state.mappings[letter];

    const item = document.createElement('div');
    item.className = 'mapping-item';
    item.dataset.cipher = letter;

    item.innerHTML = `
      <span class="cipher-letter">${letter}</span>
      <div class="mapping-inputs">
        <input type="text"
               class="mapping-input fixed"
               data-cipher="${letter}"
               data-type="fixed"
               value="${mapping.fixed}"
               maxlength="1"
               placeholder="確定">
        <input type="text"
               class="mapping-input candidates"
               data-cipher="${letter}"
               data-type="candidates"
               value="${mapping.candidates.join('')}"
               placeholder="候補">
      </div>
    `;

    // Hover events for mutual highlighting
    item.addEventListener('mouseenter', () => highlightCipher(letter));
    item.addEventListener('mouseleave', () => highlightCipher(null));

    mappingGrid.appendChild(item);
  }

  // Input change listeners
  mappingGrid.querySelectorAll('.mapping-input').forEach(input => {
    input.addEventListener('input', handleMappingInput);
  });
}

function handleMappingInput(e) {
  const cipher = e.target.dataset.cipher;
  const type = e.target.dataset.type;
  let value = e.target.value.toLowerCase().replace(/[^a-z]/g, '');

  if (type === 'fixed') {
    value = value.slice(0, 1);
    e.target.value = value;
    state.mappings[cipher].fixed = value;
  } else {
    // Remove duplicates
    value = [...new Set(value.split(''))].join('');
    e.target.value = value;
    state.mappings[cipher].candidates = value.split('');
  }

  updateAll();
}

// Get plaintext letters used in input (lowercase)
function getPlaintextLettersInInput() {
  const letters = new Set();
  for (const char of state.inputText) {
    if (char >= 'a' && char <= 'z') {
      letters.add(char);
    }
  }
  return letters;
}

// Generate all branches
function generateBranches() {
  const fixedMapping = {};
  for (const [cipher, data] of Object.entries(state.mappings)) {
    if (data.fixed) {
      fixedMapping[cipher] = data.fixed;
    } else if (data.candidates.length === 1) {
      // 候補が1つの場合は自動的にその候補を採用
      fixedMapping[cipher] = data.candidates[0];
    }
  }

  const candidateEntries = [];
  for (const [cipher, data] of Object.entries(state.mappings)) {
    // 候補が2つ以上の場合のみブランチ分岐
    if (!data.fixed && data.candidates.length >= 2) {
      candidateEntries.push({ cipher, candidates: data.candidates });
    }
  }

  if (candidateEntries.length === 0) {
    return [{ mapping: { ...fixedMapping }, label: 'ベースマッピング', isBase: true }];
  }

  const branches = [];

  function generateCombinations(index, currentMapping, currentLabel) {
    if (index >= candidateEntries.length) {
      const plainUsed = new Set(Object.values(fixedMapping));
      let hasConflict = false;

      for (const plain of Object.values(currentMapping)) {
        if (plainUsed.has(plain)) {
          hasConflict = true;
          break;
        }
        plainUsed.add(plain);
      }

      const currentPlains = Object.values(currentMapping);
      if (new Set(currentPlains).size !== currentPlains.length) {
        hasConflict = true;
      }

      if (!hasConflict) {
        branches.push({
          mapping: { ...fixedMapping, ...currentMapping },
          label: currentLabel.join(', ') || 'ベースマッピング',
          isBase: false,
          branchSpecific: { ...currentMapping }
        });
      }
      return;
    }

    const { cipher, candidates } = candidateEntries[index];
    for (const candidate of candidates) {
      generateCombinations(
        index + 1,
        { ...currentMapping, [cipher]: candidate },
        [...currentLabel, `${cipher}=${candidate}`]
      );
    }
  }

  generateCombinations(0, {}, []);

  return branches.length > 0 ? branches : [{ mapping: { ...fixedMapping }, label: 'ベースマッピング（有効なブランチなし）', isBase: true }];
}

// Check for conflicts in fixed mappings
function getFixedConflicts() {
  const plainToCiphers = {};
  const conflicts = new Set();

  for (const [cipher, data] of Object.entries(state.mappings)) {
    if (data.fixed) {
      const plain = data.fixed;
      if (!plainToCiphers[plain]) {
        plainToCiphers[plain] = [];
      }
      plainToCiphers[plain].push(cipher);
    }
  }

  for (const [plain, ciphers] of Object.entries(plainToCiphers)) {
    if (ciphers.length > 1) {
      ciphers.forEach(c => conflicts.add(c));
    }
  }

  return conflicts;
}

// Decode text with a given mapping
function decodeText(text, mapping, branchSpecific = {}) {
  const result = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char >= 'A' && char <= 'Z') {
      const decoded = mapping[char];
      const data = state.mappings[char];

      if (decoded) {
        // 確定または候補から選択された文字
        const isBranchSpecific = branchSpecific[char] === decoded;
        result.push({
          original: char,
          decoded: decoded,
          type: 'decoded',
          isBranchSpecific
        });
      } else if (!data.fixed && data.candidates.length === 0) {
        // 確定も候補もない → 大文字のまま
        result.push({
          original: char,
          decoded: char,
          type: 'undecoded-raw',
          isBranchSpecific: false
        });
      } else if (!data.fixed && data.candidates.length >= 2) {
        // 候補が複数 → ?
        result.push({
          original: char,
          decoded: '?',
          type: 'undecoded',
          isBranchSpecific: false
        });
      } else {
        result.push({
          original: char,
          decoded: '?',
          type: 'undecoded',
          isBranchSpecific: false
        });
      }
    } else if (char >= 'a' && char <= 'z') {
      result.push({
        original: char,
        decoded: char,
        type: 'original-plain',
        isBranchSpecific: false
      });
    } else {
      result.push({
        original: char,
        decoded: char,
        type: 'other',
        isBranchSpecific: false
      });
    }
  }

  return result;
}

// Highlight cipher letter
function highlightCipher(cipher) {
  state.highlightedCipher = cipher;

  document.querySelectorAll('.mapping-item').forEach(item => {
    item.classList.toggle('highlighted', item.dataset.cipher === cipher);
  });

  document.querySelectorAll('.decoded-char').forEach(span => {
    span.classList.toggle('highlighted', span.dataset.cipher === cipher);
  });
}

// Update unused letters display
function updateUnusedLetters() {
  const usedInFixed = new Set();
  const usedInCandidates = new Set();
  const usedInInput = getPlaintextLettersInInput();

  for (const data of Object.values(state.mappings)) {
    if (data.fixed) usedInFixed.add(data.fixed);
    data.candidates.forEach(c => usedInCandidates.add(c));
  }

  unusedLetters.innerHTML = '';

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i);
    const inFixed = usedInFixed.has(letter);
    const inCandidates = usedInCandidates.has(letter);
    const inInput = usedInInput.has(letter);

    if (!inFixed && !inInput) {
      const span = document.createElement('span');
      span.className = 'unused-letter' + (inCandidates ? ' candidate-only' : '');
      span.textContent = letter;
      span.title = inCandidates ? '候補のみで使用' : '完全に未使用';
      unusedLetters.appendChild(span);
    }
  }
}

// Update conflict highlighting
function updateConflictHighlighting() {
  const conflicts = getFixedConflicts();

  document.querySelectorAll('.mapping-item').forEach(item => {
    item.classList.toggle('conflict', conflicts.has(item.dataset.cipher));
  });
}

// Render branches
function renderBranches() {
  const branches = generateBranches();

  branchCount.textContent = `${branches.length} ブランチ`;

  if (branches.length === 0 || !state.inputText.trim()) {
    branchCards.innerHTML = '<div class="no-branches">暗号文を入力し、マッピングを設定するとデコード結果が表示されます</div>';
    return;
  }

  const fixedConflicts = getFixedConflicts();

  branchCards.innerHTML = '';

  for (const branch of branches) {
    const card = document.createElement('div');
    card.className = 'branch-card';

    const label = document.createElement('div');
    label.className = 'branch-label' + (branch.isBase ? ' base-only' : '');
    label.textContent = branch.label;

    const textDiv = document.createElement('div');
    textDiv.className = 'decoded-text';

    const decoded = decodeText(state.inputText, branch.mapping, branch.branchSpecific || {});

    for (const item of decoded) {
      if (item.type === 'other') {
        if (item.decoded === '\n') {
          textDiv.appendChild(document.createElement('br'));
        } else {
          textDiv.appendChild(document.createTextNode(item.decoded));
        }
      } else {
        const span = document.createElement('span');
        span.className = 'decoded-char ' + item.type;
        span.textContent = item.decoded;
        span.dataset.cipher = item.original;

        if (item.isBranchSpecific) {
          span.classList.add('branch-specific');
        }

        if (fixedConflicts.has(item.original)) {
          span.classList.add('conflict');
        }

        if (item.original >= 'A' && item.original <= 'Z') {
          span.addEventListener('mouseenter', () => highlightCipher(item.original));
          span.addEventListener('mouseleave', () => highlightCipher(null));
        }

        textDiv.appendChild(span);
      }
    }

    card.appendChild(label);
    card.appendChild(textDiv);
    branchCards.appendChild(card);
  }
}

// Update all displays
function updateAll() {
  updateUnusedLetters();
  updateConflictHighlighting();
  renderBranches();
}

// Input change handler
cipherInput.addEventListener('input', () => {
  state.inputText = cipherInput.value;
  updateAll();
});

// Initialize
buildMappingGrid();
updateAll();
