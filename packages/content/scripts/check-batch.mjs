#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { WORD_SEEDS, validateWords } from '../dist/index.js';

const path = process.argv[2];
if (!path) { console.error('Usage: npm run check:batch -- staging/batch.json'); process.exit(2); }
let batch;
try { batch = JSON.parse(await readFile(path, 'utf8')); }
catch { console.error('Batch file is missing or invalid JSON.'); process.exit(2); }
const errors = [];
if (!batch || !Array.isArray(batch.items) || !batch.packId || !Number.isInteger(batch.version)) errors.push('packId, version and items[] are required');
const items = Array.isArray(batch?.items) ? batch.items : [];
if (!items.length) errors.push('items[] must contain at least one entry');
for (const [index, entry] of items.entries()) {
  if (!entry || typeof entry !== 'object') { errors.push(`item ${index}: invalid entry`); continue; }
  if (entry.review?.status !== 'approved' || !entry.review.reviewer || !entry.review.reviewedAt) errors.push(`${entry.id ?? index}: explicit review approval is required`);
  for (const key of ['id', 'word', 'pos', 'level', 'cefr', 'meaningKo', 'exampleEn', 'exampleKo']) if (typeof entry[key] !== 'string' && !(key === 'level' && Number.isInteger(entry[key]))) errors.push(`${entry.id ?? index}: missing ${key}`);
  if (!entry.provenance?.kind || !entry.provenance?.note) errors.push(`${entry.id ?? index}: provenance kind and note are required`);
  if (entry.provenance?.kind === 'external' && (!entry.provenance.sourceUrl || !entry.provenance.license)) errors.push(`${entry.id ?? index}: external source URL and license are required`);
}
const words = items.map(({ review, provenance, ...word }) => word);
if (!errors.length && words.length) errors.push(...validateWords([...WORD_SEEDS, ...words]).filter(error => !error.startsWith('level ')));
if (errors.length) { for (const error of errors) console.error(error); process.exit(1); }
console.log(`${batch.packId} v${batch.version}: ${words.length} reviewed entries passed structural checks. Manual publication is still required.`);
