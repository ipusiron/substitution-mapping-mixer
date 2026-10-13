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
