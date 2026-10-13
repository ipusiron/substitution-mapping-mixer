'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Japanese and English READMEs use the correct related repository', () => {
  for (const file of ['README.md', 'README.en.md']) {
    const content = read(file);
    assert.match(content, /https:\/\/github\.com\/ipusiron\/semantic-candidate-ranker/);
    assert.doesNotMatch(content, /Semantic Candidate Ranker[^\n]*gematria-cipherlab/);
  }
});

test('HTML loads the testable core before the UI script', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('logic.js') < html.indexOf('script.js'));
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /id="languageBtn"/);
});

test('tracked documentation describes the 200-branch safety limit', () => {
  assert.match(read('README.md'), /200/);
  assert.match(read('README.en.md'), /200/);
  assert.match(read('SPEC.md'), /200/);
});
