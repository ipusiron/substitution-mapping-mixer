'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Logic = require('../logic.js');

test('empty mappings produce one base branch', () => {
  const result = Logic.generateBranches(Logic.createMappings());
  assert.equal(result.status, 'ok');
  assert.equal(result.branches.length, 1);
  assert.equal(result.branches[0].isBase, true);
});

test('single candidates are resolved without branching', () => {
  const mappings = Logic.createMappings();
  mappings.A.candidates = ['x'];
  const result = Logic.generateBranches(mappings);
  assert.equal(result.branches.length, 1);
  assert.equal(result.branches[0].mapping.A, 'x');
});

test('candidate product is checked before generation', () => {
  const mappings = Logic.createMappings();
  for (const cipher of ['A', 'B', 'C', 'D']) mappings[cipher].candidates = ['a', 'b', 'c', 'd'];
  const result = Logic.generateBranches(mappings, 200);
  assert.equal(result.plan.upperBound, 256n);
  assert.equal(result.status, 'limit');
  assert.deepEqual(result.branches, []);
});

test('exactly 200 combinations are allowed', () => {
  const mappings = Logic.createMappings();
  mappings.A.candidates = ['a', 'b', 'c', 'd', 'e'];
  mappings.B.candidates = ['f', 'g', 'h', 'i', 'j'];
  mappings.C.candidates = ['k', 'l', 'm', 'n', 'o', 'p', 'q', 'r'];
  const result = Logic.generateBranches(mappings, 200);
  assert.equal(result.plan.upperBound, 200n);
  assert.equal(result.status, 'ok');
  assert.equal(result.branches.length, 200);
});

test('fixed plaintext letters are removed from branch candidates', () => {
  const mappings = Logic.createMappings();
  mappings.A.fixed = 'a';
  mappings.B.candidates = ['a', 'b'];
  const result = Logic.generateBranches(mappings);
  assert.equal(result.plan.upperBound, 1n);
  assert.equal(result.branches.length, 1);
  assert.equal(result.branches[0].mapping.B, 'b');
});

test('branches keep plaintext assignments one-to-one', () => {
  const mappings = Logic.createMappings();
  mappings.A.candidates = ['a', 'b'];
  mappings.B.candidates = ['a', 'b'];
  const result = Logic.generateBranches(mappings);
  assert.equal(result.branches.length, 2);
  for (const branch of result.branches) {
    const values = Object.values(branch.mapping);
    assert.equal(new Set(values).size, values.length);
  }
});

test('fixed and single-candidate conflicts are reported', () => {
  const mappings = Logic.createMappings();
  mappings.A.fixed = 'x';
  mappings.B.candidates = ['x'];
  assert.deepEqual([...Logic.getConflicts(mappings)].sort(), ['A', 'B']);
});

test('an impossible candidate entry is reported without recursion', () => {
  const mappings = Logic.createMappings();
  mappings.A.fixed = 'a';
  mappings.B.fixed = 'b';
  mappings.C.candidates = ['a', 'b'];
  const result = Logic.generateBranches(mappings);
  assert.equal(result.status, 'none');
  assert.equal(result.plan.upperBound, 0n);
  assert.equal(result.branches.length, 1);
});

test('decode preserves lowercase, punctuation, and unmapped uppercase', () => {
  const decoded = Logic.decodeText('A b-C!', { A: 'x' }, { A: 'x' });
  assert.equal(decoded.map(item => item.decoded).join(''), 'x b-C!');
  assert.equal(decoded[0].isBranchSpecific, true);
  assert.equal(decoded[4].type, 'undecoded-raw');
});

test('branch plan reports effective and excluded candidates', () => {
  const mappings = Logic.createMappings();
  mappings.A.fixed = 'a';
  mappings.B.candidates = ['a', 'b', 'c'];
  const plan = Logic.planBranches(mappings);
  assert.deepEqual(plan.entries[0], {
    cipher: 'B',
    candidates: ['b', 'c'],
    originalCandidates: ['a', 'b', 'c'],
    excluded: ['a']
  });
  assert.equal(plan.upperBound, 2n);
});

test('JSON export and import preserve working text and mappings', () => {
  const mappings = Logic.createMappings();
  mappings.Q.fixed = 'e';
  mappings.X.candidates = ['a', 'o'];
  const text = Logic.serializeMappingJSON('QX\nknown', mappings);
  const restored = Logic.parseMappingJSON(text);
  assert.equal(restored.inputText, 'QX\nknown');
  assert.deepEqual(restored.mappings, mappings);
});

test('JSON import rejects unknown formats and duplicate candidates', () => {
  const mappings = Logic.createMappings();
  const valid = JSON.parse(Logic.serializeMappingJSON('', mappings));
  assert.throws(() => Logic.parseMappingJSON(JSON.stringify({ ...valid, format: 'other' })), /invalid-format/);
  valid.mappings.A.candidates = ['a', 'a'];
  assert.throws(() => Logic.parseMappingJSON(JSON.stringify(valid)), /duplicate-candidates/);
});

test('JSON import rejects oversized working text', () => {
  const mappings = Logic.createMappings();
  const data = {
    format: Logic.DATA_FORMAT,
    version: Logic.DATA_VERSION,
    inputText: 'A'.repeat(Logic.MAX_INPUT_LENGTH + 1),
    mappings
  };
  assert.throws(() => Logic.parseMappingJSON(JSON.stringify(data)), /invalid-input-text/);
});

test('CSV export and import preserve all 26 mappings', () => {
  const mappings = Logic.createMappings();
  mappings.A.fixed = 'x';
  mappings.Z.candidates = ['a', 'b', 'c'];
  const csv = Logic.serializeMappingCSV(mappings);
  const restored = Logic.parseMappingCSV(`\uFEFF${csv.replace(/\n/g, '\r\n')}`);
  assert.equal(restored.inputText, null);
  assert.deepEqual(restored.mappings, mappings);
});

test('CSV import rejects missing, duplicate, and invalid rows', () => {
  const mappings = Logic.createMappings();
  const lines = Logic.serializeMappingCSV(mappings).split('\n');
  assert.throws(() => Logic.parseMappingCSV(lines.slice(0, -1).join('\n')), /invalid-csv-layout/);
  lines[2] = lines[1];
  assert.throws(() => Logic.parseMappingCSV(lines.join('\n')), /invalid-csv-row/);
  const invalid = Logic.serializeMappingCSV(mappings).replace('A,,', 'A,1,');
  assert.throws(() => Logic.parseMappingCSV(invalid), /invalid-fixed/);
});
