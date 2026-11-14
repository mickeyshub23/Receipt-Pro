import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFingerprint } from '../lib/fingerprint.js';

const base = {
  bn: 'Mama Tee Fabrics',
  bp: '0801 234 5678',
  ba: '12 Allen Avenue, Ikeja, Lagos',
  bm: 'Quality you can trust',
  cn: 'Ada Okafor',
  ca: '5 Admiralty Way, Lekki',
  no: 'RP-0001',
  date: '2026-11-14',
  pay: 'Bank transfer',
  cur: '₦',
  items: [{ q: 1, d: 'Ankara fabric', p: 15000, x: 0 }],
  logo: '',
};

test('fingerprint is stable for identical payloads', () => {
  const a = computeFingerprint(base);
  const b = computeFingerprint({ ...base });
  assert.strictEqual(a, b);
});

test('fingerprint changes when any detail changes', () => {
  const a = computeFingerprint(base);
  const b = computeFingerprint({ ...base, bn: 'Different' });
  assert.notStrictEqual(a, b);
});

test('fingerprint normalises numbers to 2 decimals', () => {
  const a = computeFingerprint({ ...base, items: [{ q: 1, d: 'X', p: 10, x: 0 }] });
  const b = computeFingerprint({ ...base, items: [{ q: 1, d: 'X', p: '10.00', x: '0' }] });
  assert.strictEqual(a, b);
});
