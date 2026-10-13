'use strict';

const Logic = window.SubstitutionLogic;
const state = {
  inputText: '',
  mappings: Logic.createMappings(),
  highlightedCipher: null,
  language: 'ja',
  notice: null
};

const messages = {
  ja: {
    subtitle: '換字式暗号の置換表の手動解析支援ツール',
    scopeNote: '自動解読や候補の順位付けは行いません。人が仮説を比較するための作業台です。',
    inputTitle: '入力テキスト（A-Z: 暗号文文字、a-z: 確定済みの平文文字）',
    inputPlaceholder: '暗号文を入力してください（例: KHOOR ZRUOG）',
    mappingTitle: '置換マッピング',
    mappingToolsLabel: '対応表の保存と読み込み',
    saveJsonButton: 'JSON保存',
    saveCsvButton: 'CSV保存',
    loadButton: '読み込む',
    savedJson: '作業テキストと対応表をJSONで保存しました。',
    savedCsv: '対応表をCSVで保存しました。',
    loadedJson: 'JSONから作業テキストと対応表を読み込みました。',
    loadedCsv: 'CSVから対応表を読み込みました。入力テキストは変更していません。',
    importTooLarge: 'ファイルが大きすぎます（上限128 KiB）。',
    importUnsupported: 'JSONまたはCSVファイルを選択してください。',
    importInvalid: 'ファイルの形式または内容が不正です。現在の状態は変更していません。',
    candidateFix: letter => `${letter} を確定`,
    candidateExclude: letter => `${letter} を除外`,
    unusedTitle: '未使用の平文文字',
    branchTitle: 'ブランチ結果',
    contributionTitle: '分岐寄与の内訳',
    contributionHelp: '固定済み文字との重複を除いた、暗号文字ごとの実効候補数です。',
    contributionEmpty: '複数候補による分岐はありません。',
    contributionItem: (cipher, count, candidates) => `${cipher} × ${count}: ${candidates || 'なし'}`,
    contributionExcluded: letters => `（確定済みのため除外: ${letters}）`,
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
    mappingToolsLabel: 'Save and load the mapping table',
    saveJsonButton: 'Save JSON',
    saveCsvButton: 'Save CSV',
    loadButton: 'Load',
    savedJson: 'Saved the working text and mappings as JSON.',
    savedCsv: 'Saved the mappings as CSV.',
    loadedJson: 'Loaded the working text and mappings from JSON.',
    loadedCsv: 'Loaded the mappings from CSV. The working text was not changed.',
    importTooLarge: 'The file is too large (maximum 128 KiB).',
    importUnsupported: 'Select a JSON or CSV file.',
    importInvalid: 'The file format or content is invalid. The current state was not changed.',
    candidateFix: letter => `Fix as ${letter}`,
    candidateExclude: letter => `Exclude ${letter}`,
    unusedTitle: 'Unused plaintext letters',
    branchTitle: 'Branch results',
    contributionTitle: 'Branch contribution breakdown',
    contributionHelp: 'Effective candidate counts after removing letters reserved by resolved mappings.',
    contributionEmpty: 'There are no multi-candidate branches.',
    contributionItem: (cipher, count, candidates) => `${cipher} × ${count}: ${candidates || 'none'}`,
    contributionExcluded: letters => `(excluded because already resolved: ${letters})`,
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
const contributionList = document.getElementById('contributionList');
const importStatus = document.getElementById('importStatus');
const languageBtn = document.getElementById('languageBtn');
const saveJsonBtn = document.getElementById('saveJsonBtn');
const saveCsvBtn = document.getElementById('saveCsvBtn');
const loadMappingBtn = document.getElementById('loadMappingBtn');
const mappingFileInput = document.getElementById('mappingFileInput');
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
    const candidateActions = document.createElement('div');
    candidateActions.className = 'candidate-actions';
    item.appendChild(candidateActions);
    renderCandidateActions(item, letter);
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
  renderCandidateActions(event.target.closest('.mapping-item'), cipher);
  updateAll();
}

function renderCandidateActions(item, cipher) {
  const container = item.querySelector('.candidate-actions');
  container.replaceChildren();
  for (const candidate of state.mappings[cipher].candidates) {
    const group = document.createElement('span');
    group.className = 'candidate-action';
    const fix = document.createElement('button');
    fix.type = 'button';
    fix.className = 'candidate-fix';
    fix.textContent = candidate;
    fix.title = t('candidateFix', candidate);
    fix.setAttribute('aria-label', `${cipher}: ${t('candidateFix', candidate)}`);
    fix.addEventListener('click', () => {
      state.mappings[cipher].fixed = candidate;
      state.mappings[cipher].candidates = [];
      item.querySelector('.mapping-input.fixed').value = candidate;
      item.querySelector('.mapping-input.candidates').value = '';
      renderCandidateActions(item, cipher);
      updateAll();
    });
    const exclude = document.createElement('button');
    exclude.type = 'button';
    exclude.className = 'candidate-exclude';
    exclude.textContent = '×';
    exclude.title = t('candidateExclude', candidate);
    exclude.setAttribute('aria-label', `${cipher}: ${t('candidateExclude', candidate)}`);
    exclude.addEventListener('click', () => {
      state.mappings[cipher].candidates = state.mappings[cipher].candidates.filter(value => value !== candidate);
      item.querySelector('.mapping-input.candidates').value = state.mappings[cipher].candidates.join('');
      renderCandidateActions(item, cipher);
      updateAll();
    });
    group.append(fix, exclude);
    container.appendChild(group);
  }
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

function renderContributions(plan) {
  const entries = [...plan.entries].sort((a, b) => b.candidates.length - a.candidates.length || a.cipher.localeCompare(b.cipher));
  if (entries.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'contribution-empty';
    empty.textContent = t('contributionEmpty');
    contributionList.replaceChildren(empty);
    return;
  }
  const items = entries.map(entry => {
    const item = document.createElement('span');
    item.className = 'contribution-item';
    const main = document.createElement('strong');
    main.textContent = t('contributionItem', entry.cipher, entry.candidates.length, entry.candidates.join(''));
    item.appendChild(main);
    if (entry.excluded.length) {
      const excluded = document.createElement('small');
      excluded.textContent = t('contributionExcluded', entry.excluded.join(''));
      item.appendChild(excluded);
    }
    return item;
  });
  contributionList.replaceChildren(...items);
}

function renderBranches() {
  const result = Logic.generateBranches(state.mappings);
  renderContributions(result.plan);
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

function showImportStatus(key, isError = false) {
  state.notice = { key, isError };
  importStatus.textContent = t(key);
  importStatus.classList.toggle('error', isError);
}

function downloadText(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function saveMappingJSON() {
  const content = Logic.serializeMappingJSON(state.inputText, state.mappings);
  downloadText(content, 'application/json;charset=utf-8', 'substitution-mapping.json');
  showImportStatus('savedJson');
}

function saveMappingCSV() {
  const content = `\uFEFF${Logic.serializeMappingCSV(state.mappings)}`;
  downloadText(content, 'text/csv;charset=utf-8', 'substitution-mapping.csv');
  showImportStatus('savedCsv');
}

async function loadMappingFile(file) {
  if (file.size > 128 * 1024) {
    showImportStatus('importTooLarge', true);
    return;
  }
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension !== 'json' && extension !== 'csv') {
    showImportStatus('importUnsupported', true);
    return;
  }
  try {
    const text = await file.text();
    const imported = extension === 'json' ? Logic.parseMappingJSON(text) : Logic.parseMappingCSV(text);
    state.mappings = imported.mappings;
    if (imported.inputText !== null) {
      state.inputText = imported.inputText;
      cipherInput.value = imported.inputText;
    }
    buildMappingGrid();
    updateAll();
    showImportStatus(extension === 'json' ? 'loadedJson' : 'loadedCsv');
  } catch (error) {
    showImportStatus('importInvalid', true);
  }
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
  downloadText(result.content, 'text/plain;charset=utf-8', 'substitution-candidates-semantic.txt');
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
  document.querySelectorAll('[data-i18n-aria]').forEach(element => {
    element.setAttribute('aria-label', t(element.dataset.i18nAria));
  });
  languageBtn.textContent = state.language === 'ja' ? 'English' : '日本語';
  languageBtn.setAttribute('aria-label', state.language === 'ja' ? 'Switch to English' : '日本語に切り替える');
  if (state.notice) showImportStatus(state.notice.key, state.notice.isError);
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
saveJsonBtn.addEventListener('click', saveMappingJSON);
saveCsvBtn.addEventListener('click', saveMappingCSV);
loadMappingBtn.addEventListener('click', () => {
  mappingFileInput.value = '';
  mappingFileInput.click();
});
mappingFileInput.addEventListener('change', () => {
  const [file] = mappingFileInput.files;
  if (file) loadMappingFile(file);
});
copySemanticBtn.addEventListener('click', copyForSemanticRanking);
downloadSemanticBtn.addEventListener('click', downloadForSemanticRanking);

applyLanguage();
