(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SubstitutionLogic = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_BRANCH_LIMIT = 200;
  const DATA_FORMAT = 'substitution-mapping-mixer';
  const DATA_VERSION = 1;
  const MAX_INPUT_LENGTH = 20000;

  function createMappings() {
    const mappings = {};
    for (let i = 0; i < 26; i += 1) {
      mappings[String.fromCharCode(65 + i)] = { fixed: '', candidates: [] };
    }
    return mappings;
  }

  function getResolvedMapping(mappings) {
    const resolved = {};
    for (const [cipher, data] of Object.entries(mappings)) {
      if (data.fixed) resolved[cipher] = data.fixed;
      else if (data.candidates.length === 1) resolved[cipher] = data.candidates[0];
    }
    return resolved;
  }

  function getConflicts(mappings) {
    const plainToCiphers = new Map();
    const conflicts = new Set();
    for (const [cipher, plain] of Object.entries(getResolvedMapping(mappings))) {
      if (!plainToCiphers.has(plain)) plainToCiphers.set(plain, []);
      plainToCiphers.get(plain).push(cipher);
    }
    for (const ciphers of plainToCiphers.values()) {
      if (ciphers.length > 1) ciphers.forEach(cipher => conflicts.add(cipher));
    }
    return conflicts;
  }

  function planBranches(mappings, limit = DEFAULT_BRANCH_LIMIT) {
    const fixedMapping = getResolvedMapping(mappings);
    const reserved = new Set(Object.values(fixedMapping));
    const entries = [];
    let upperBound = 1n;

    for (const [cipher, data] of Object.entries(mappings)) {
      if (data.fixed || data.candidates.length < 2) continue;
      const originalCandidates = [...new Set(data.candidates)];
      const candidates = originalCandidates.filter(plain => !reserved.has(plain));
      const excluded = originalCandidates.filter(plain => reserved.has(plain));
      entries.push({ cipher, candidates, originalCandidates, excluded });
      upperBound *= BigInt(candidates.length);
    }

    return {
      fixedMapping,
      entries,
      upperBound,
      exceedsLimit: upperBound > BigInt(limit),
      hasImpossibleEntry: entries.some(entry => entry.candidates.length === 0),
      limit
    };
  }

  function generateBranches(mappings, limit = DEFAULT_BRANCH_LIMIT) {
    const plan = planBranches(mappings, limit);
    if (plan.exceedsLimit) return { status: 'limit', branches: [], plan };

    if (plan.entries.length === 0 || plan.hasImpossibleEntry) {
      return {
        status: plan.hasImpossibleEntry ? 'none' : 'ok',
        branches: [{ mapping: { ...plan.fixedMapping }, selections: {}, isBase: true }],
        plan
      };
    }

    const branches = [];
    const used = new Set(Object.values(plan.fixedMapping));

    function visit(index, selections) {
      if (index === plan.entries.length) {
        branches.push({
          mapping: { ...plan.fixedMapping, ...selections },
          selections: { ...selections },
          isBase: false
        });
        return;
      }
      const entry = plan.entries[index];
      for (const plain of entry.candidates) {
        if (used.has(plain)) continue;
        used.add(plain);
        selections[entry.cipher] = plain;
        visit(index + 1, selections);
        delete selections[entry.cipher];
        used.delete(plain);
      }
    }

    visit(0, {});
    if (branches.length === 0) {
      branches.push({ mapping: { ...plan.fixedMapping }, selections: {}, isBase: true });
      return { status: 'none', branches, plan };
    }
    return { status: 'ok', branches, plan };
  }

  function decodeText(text, mapping, selections = {}) {
    return Array.from(text, char => {
      if (char >= 'A' && char <= 'Z') {
        if (mapping[char]) {
          return { original: char, decoded: mapping[char], type: 'decoded', isBranchSpecific: selections[char] === mapping[char] };
        }
        return { original: char, decoded: char, type: 'undecoded-raw', isBranchSpecific: false };
      }
      if (char >= 'a' && char <= 'z') {
        return { original: char, decoded: char, type: 'original-plain', isBranchSpecific: false };
      }
      return { original: char, decoded: char, type: 'other', isBranchSpecific: false };
    });
  }

  function validateMappings(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid-mappings');
    const expected = Object.keys(createMappings());
    const keys = Object.keys(value);
    if (keys.length !== expected.length || expected.some(cipher => !Object.hasOwn(value, cipher))) {
      throw new Error('invalid-mapping-letters');
    }
    if (keys.some(cipher => !expected.includes(cipher))) throw new Error('invalid-mapping-letters');

    const mappings = createMappings();
    for (const cipher of expected) {
      const row = value[cipher];
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('invalid-mapping-row');
      if (typeof row.fixed !== 'string' || !/^[a-z]?$/.test(row.fixed)) throw new Error('invalid-fixed');
      if (!Array.isArray(row.candidates) || row.candidates.length > 26) throw new Error('invalid-candidates');
      if (row.candidates.some(candidate => typeof candidate !== 'string' || !/^[a-z]$/.test(candidate))) {
        throw new Error('invalid-candidates');
      }
      if (new Set(row.candidates).size !== row.candidates.length) throw new Error('duplicate-candidates');
      mappings[cipher] = { fixed: row.fixed, candidates: [...row.candidates] };
    }
    return mappings;
  }

  function serializeMappingJSON(inputText, mappings) {
    if (typeof inputText !== 'string' || inputText.length > MAX_INPUT_LENGTH) throw new Error('invalid-input-text');
    const checked = validateMappings(mappings);
    return JSON.stringify({
      format: DATA_FORMAT,
      version: DATA_VERSION,
      inputText,
      mappings: checked
    }, null, 2);
  }

  function parseMappingJSON(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      throw new Error('invalid-json');
    }
    if (!data || data.format !== DATA_FORMAT) throw new Error('invalid-format');
    if (data.version !== DATA_VERSION) throw new Error('unsupported-version');
    if (typeof data.inputText !== 'string' || data.inputText.length > MAX_INPUT_LENGTH) {
      throw new Error('invalid-input-text');
    }
    return { inputText: data.inputText, mappings: validateMappings(data.mappings) };
  }

  function csvCell(value) {
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function serializeMappingCSV(mappings) {
    const checked = validateMappings(mappings);
    const rows = [['cipher', 'fixed', 'candidates']];
    for (const [cipher, data] of Object.entries(checked)) {
      rows.push([cipher, data.fixed, data.candidates.join('')]);
    }
    return rows.map(row => row.map(csvCell).join(',')).join('\n');
  }

  function parseCSVRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (quoted) {
        if (char === '"' && text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === '"' && cell === '') {
        quoted = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n') {
        row.push(cell.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    if (quoted) throw new Error('invalid-csv');
    row.push(cell.replace(/\r$/, ''));
    if (row.length > 1 || row[0] !== '' || rows.length === 0) rows.push(row);
    return rows;
  }

  function parseMappingCSV(text) {
    const rows = parseCSVRows(text.replace(/^\uFEFF/, ''));
    if (rows.length !== 27 || rows[0].join(',') !== 'cipher,fixed,candidates') throw new Error('invalid-csv-layout');
    const raw = {};
    for (const row of rows.slice(1)) {
      if (row.length !== 3 || !/^[A-Z]$/.test(row[0]) || Object.hasOwn(raw, row[0])) {
        throw new Error('invalid-csv-row');
      }
      raw[row[0]] = { fixed: row[1], candidates: [...row[2]] };
    }
    return { inputText: null, mappings: validateMappings(raw) };
  }

  return {
    DEFAULT_BRANCH_LIMIT,
    DATA_FORMAT,
    DATA_VERSION,
    MAX_INPUT_LENGTH,
    createMappings,
    getResolvedMapping,
    getConflicts,
    planBranches,
    generateBranches,
    decodeText,
    validateMappings,
    serializeMappingJSON,
    parseMappingJSON,
    serializeMappingCSV,
    parseMappingCSV
  };
}));
