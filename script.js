'use strict';

const Logic = window.SubstitutionLogic;
const state = {
  inputText: '',
  mappings: Logic.createMappings(),
  highlightedCipher: null,
  language: 'ja'
};

const messages = {
  ja: {
    subtitle: '換字式暗号の置換表の手動解析支援ツール',
    scopeNote: '自動解読や候補の順位付けは行いません。人が仮説を比較するための作業台です。',
    inputTitle: '入力テキスト（A-Z: 暗号文文字、a-z: 確定済みの平文文字）',
    inputPlaceholder: '暗号文を入力してください（例: KHOOR ZRUOG）',
    mappingTitle: '置換マッピング',
    unusedTitle: '未使用の平文文字',
    branchTitle: 'ブランチ結果',
    copyButton: '意味評価用にコピー',
    copyTitle: 'ブランチ結果を意味評価用形式でコピー',
    downloadButton: '意味評価用にダウンロード',
    downloadTitle: 'ブランチ結果を意味評価用形式でダウンロード',
    emptyMessage: '暗号文を入力し、マッピングを設定するとデコード結果が表示されます',
    fixedPlaceholder: '確定',
    candidatesPlaceholder: '候補',
    candidateOnly: '候補のみで使用',
    completelyUnused: '完全に未使用',
    branches: count => `${count} ブランチ`,
    estimate: count => `生成前の組合せ上限: ${count}`,
    limit: (count, max) => `組合せ上限が${count}通りのため生成を停止しました（最大${max}通り）。候補を減らしてください。`,
    noValid: '一対一の対応を満たすブランチがありません。競合箇所を確認してください。',
    baseLabel: 'ベースマッピング',
    noValidLabel: 'ベースマッピング（有効なブランチなし）',
    copied: 'コピーしました',
    tooManyExport: '候補が多すぎるためエクスポートできません。候補を減らしてください。',
    noExport: 'エクスポートできるブランチがありません。',
    copyFailed: 'クリップボードへコピーできませんでした。ブラウザーの権限を確認してください。'
  },
  en: {
    subtitle: 'Manual substitution-cipher mapping workbench',
    scopeNote: 'This tool does not solve or rank candidates. It is a workbench for comparing hypotheses by hand.',
    inputTitle: 'Working text (A-Z: ciphertext, a-z: confirmed plaintext)',
    inputPlaceholder: 'Enter ciphertext (example: KHOOR ZRUOG)',
    mappingTitle: 'Substitution mappings',
    unusedTitle: 'Unused plaintext letters',
    branchTitle: 'Branch results',
    copyButton: 'Copy for semantic review',
    copyTitle: 'Copy branches in the semantic-review format',
    downloadButton: 'Download for semantic review',
    downloadTitle: 'Download branches in the semantic-review format',
    emptyMessage: 'Enter ciphertext and mappings to display decoded branches.',
    fixedPlaceholder: 'Fixed',
    candidatesPlaceholder: 'Candidates',
    candidateOnly: 'Used only as a candidate',
    completelyUnused: 'Completely unused',
    branches: count => `${count} ${count === 1 ? 'branch' : 'branches'}`,
    estimate: count => `Pre-generation combination upper bound: ${count}`,
    limit: (count, max) => `Generation stopped: the upper bound is ${count} combinations (maximum ${max}). Reduce the candidates.`,
    noValid: 'No branch satisfies the one-to-one mapping. Review the highlighted conflicts.',
    baseLabel: 'Base mapping',
    noValidLabel: 'Base mapping (no valid branches)',
    copied: 'Copied',
    tooManyExport: 'There are too many candidates to export. Reduce the candidates.',
    noExport: 'There are no branches to export.',
    copyFailed: 'Could not copy to the clipboard. Check the browser permission.'
  }
};

const cipherInput = document.getElementById('cipherInput');
const branchCards = document.getElementById('branchCards');
const branchCount = document.getElementById('branchCount');
const branchStatus = document.getElementById('branchStatus');
const mappingGrid = document.getElementById('mappingGrid');
const unusedLetters = document.getElementById('unusedLetters');
const languageBtn = document.getElementById('languageBtn');
const copySemanticBtn = document.getElementById('copySemanticBtn');
const downloadSemanticBtn = document.getElementById('downloadSemanticBtn');

function t(key, ...args) {
  const value = messages[state.language][key];
  return typeof value === 'function' ? value(...args) : value;
}

function buildMappingGrid() {
  mappingGrid.replaceChildren();
  for (const [letter, mapping] of Object.entries(state.mappings)) {
    const item = document.createElement('div');
    item.className = 'mapping-item';
    item.dataset.cipher = letter;

    const cipher = document.createElement('span');
    cipher.className = 'cipher-letter';
    cipher.textContent = letter;

    const inputs = document.createElement('div');
    inputs.className = 'mapping-inputs';
    for (const type of ['fixed', 'candidates']) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = `mapping-input ${type}`;
      input.dataset.cipher = letter;
      input.dataset.type = type;
      input.value = type === 'fixed' ? mapping.fixed : mapping.candidates.join('');
      input.placeholder = t(type === 'fixed' ? 'fixedPlaceholder' : 'candidatesPlaceholder');
      input.setAttribute('aria-label', `${letter} ${input.placeholder}`);
      if (type === 'fixed') input.maxLength = 1;
      input.addEventListener('input', handleMappingInput);
      inputs.appendChild(input);
    }

    item.append(cipher, inputs);
    item.addEventListener('mouseenter', () => highlightCipher(letter));
    item.addEventListener('mouseleave', () => highlightCipher(null));
    mappingGrid.appendChild(item);
  }
}

function handleMappingInput(event) {
  const { cipher, type } = event.target.dataset;
  let value = event.target.value.toLowerCase().replace(/[^a-z]/g, '');
  if (type === 'fixed') {
    value = value.slice(0, 1);
    state.mappings[cipher].fixed = value;
  } else {
    value = [...new Set(value)].join('');
    state.mappings[cipher].candidates = [...value];
  }
  event.target.value = value;
  updateAll();
}

function getPlaintextLettersInInput() {
  return new Set([...state.inputText].filter(char => char >= 'a' && char <= 'z'));
}

function highlightCipher(cipher) {
  state.highlightedCipher = cipher;
  document.querySelectorAll('.mapping-item').forEach(item => {
    item.classList.toggle('highlighted', item.dataset.cipher === cipher);
  });
  document.querySelectorAll('.decoded-char').forEach(span => {
    span.classList.toggle('highlighted', span.dataset.cipher === cipher);
  });
}

function updateUnusedLetters() {
  const resolved = new Set(Object.values(Logic.getResolvedMapping(state.mappings)));
  const candidates = new Set(Object.values(state.mappings).flatMap(data => data.candidates));
  const inInput = getPlaintextLettersInInput();
  unusedLetters.replaceChildren();

  for (let i = 0; i < 26; i += 1) {
    const letter = String.fromCharCode(97 + i);
    if (resolved.has(letter) || inInput.has(letter)) continue;
    const span = document.createElement('span');
    const candidateOnly = candidates.has(letter);
    span.className = `unused-letter${candidateOnly ? ' candidate-only' : ''}`;
    span.textContent = letter;
    span.title = t(candidateOnly ? 'candidateOnly' : 'completelyUnused');
    unusedLetters.appendChild(span);
  }
}

function updateConflictHighlighting() {
  const conflicts = Logic.getConflicts(state.mappings);
  document.querySelectorAll('.mapping-item').forEach(item => {
    item.classList.toggle('conflict', conflicts.has(item.dataset.cipher));
  });
  return conflicts;
}

function branchLabel(branch, status) {
  const parts = Object.entries(branch.selections).map(([cipher, plain]) => `${cipher}=${plain}`);
  if (parts.length) return parts.join(', ');
  return t(status === 'none' ? 'noValidLabel' : 'baseLabel');
}

function renderBranches() {
  const result = Logic.generateBranches(state.mappings);
  const count = result.status === 'limit' ? 0 : result.branches.length;
  branchCount.textContent = t('branches', count);
  branchStatus.className = 'branch-status';
  branchStatus.textContent = t('estimate', result.plan.upperBound.toString());

  if (result.status === 'limit') {
    branchStatus.classList.add('warning');
    branchStatus.textContent = t('limit', result.plan.upperBound.toString(), result.plan.limit);
    branchCards.replaceChildren();
    return result;
  }
  if (result.status === 'none') {
    branchStatus.classList.add('warning');
    branchStatus.textContent = t('noValid');
  }
  if (!state.inputText.trim()) {
    const empty = document.createElement('div');
    empty.className = 'no-branches';
    empty.textContent = t('emptyMessage');
    branchCards.replaceChildren(empty);
    return result;
  }

  const conflicts = Logic.getConflicts(state.mappings);
  const cards = result.branches.map(branch => {
    const card = document.createElement('div');
    card.className = 'branch-card';
    const label = document.createElement('div');
    label.className = `branch-label${branch.isBase ? ' base-only' : ''}`;
    label.textContent = branchLabel(branch, result.status);
    const textDiv = document.createElement('div');
    textDiv.className = 'decoded-text';

    for (const item of Logic.decodeText(state.inputText, branch.mapping, branch.selections)) {
      if (item.type === 'other') {
        textDiv.appendChild(document.createTextNode(item.decoded));
        continue;
      }
      const span = document.createElement('span');
      span.className = `decoded-char ${item.type}`;
      span.textContent = item.decoded;
      span.dataset.cipher = item.original;
      if (item.isBranchSpecific) span.classList.add('branch-specific');
      if (conflicts.has(item.original)) span.classList.add('conflict');
      if (item.original >= 'A' && item.original <= 'Z') {
        span.addEventListener('mouseenter', () => highlightCipher(item.original));
        span.addEventListener('mouseleave', () => highlightCipher(null));
      }
      textDiv.appendChild(span);
    }
    card.append(label, textDiv);
    return card;
  });
  branchCards.replaceChildren(...cards);
  return result;
}

function updateAll() {
  updateUnusedLetters();
  updateConflictHighlighting();
  return renderBranches();
}

function formatBranchesForSemanticRanking() {
  const result = Logic.generateBranches(state.mappings);
  if (result.status === 'limit') return { error: t('tooManyExport') };
  if (!state.inputText.trim()) return { error: t('noExport') };
  const blocks = result.branches.map((branch, index) => {
    const mappings = Object.entries(branch.selections).map(([cipher, plain]) => `${cipher}->${plain}`).join(',');
    const plaintext = Logic.decodeText(state.inputText, branch.mapping, branch.selections).map(item => item.decoded).join('');
    return [`branch=B${index + 1}`, `mapping=${mappings}`, plaintext].join('\n');
  });
  return { content: blocks.join('\n\n') };
}

async function copyForSemanticRanking() {
  const result = formatBranchesForSemanticRanking();
  if (result.error) return window.alert(result.error);
  try {
    await navigator.clipboard.writeText(result.content);
    const original = t('copyButton');
    copySemanticBtn.textContent = t('copied');
    copySemanticBtn.disabled = true;
    window.setTimeout(() => {
      copySemanticBtn.textContent = original;
      copySemanticBtn.disabled = false;
    }, 2000);
  } catch (error) {
    window.alert(t('copyFailed'));
  }
}

function downloadForSemanticRanking() {
  const result = formatBranchesForSemanticRanking();
  if (result.error) return window.alert(result.error);
  const url = URL.createObjectURL(new Blob([result.content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'substitution-candidates-semantic.txt';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.title = t(element.dataset.i18nTitle);
  });
  languageBtn.textContent = state.language === 'ja' ? 'English' : '日本語';
  languageBtn.setAttribute('aria-label', state.language === 'ja' ? 'Switch to English' : '日本語に切り替える');
  buildMappingGrid();
  updateAll();
}

cipherInput.addEventListener('input', () => {
  state.inputText = cipherInput.value;
  updateAll();
});
languageBtn.addEventListener('click', () => {
  state.language = state.language === 'ja' ? 'en' : 'ja';
  applyLanguage();
});
copySemanticBtn.addEventListener('click', copyForSemanticRanking);
downloadSemanticBtn.addEventListener('click', downloadForSemanticRanking);

applyLanguage();
