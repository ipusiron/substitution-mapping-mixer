(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SubstitutionLogic = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_BRANCH_LIMIT = 200;

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
      const candidates = [...new Set(data.candidates)].filter(plain => !reserved.has(plain));
      entries.push({ cipher, candidates });
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

  return {
    DEFAULT_BRANCH_LIMIT,
    createMappings,
    getResolvedMapping,
    getConflicts,
    planBranches,
    generateBranches,
    decodeText
  };
}));
