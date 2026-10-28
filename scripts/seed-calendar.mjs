#!/usr/bin/env node
/**
 * Fill the season with practice stubs: one file per practice date from
 * SEASON_START through SEASON_END, with block/week/day_type/duration derived
 * from src/lib/season.ts and the meets in content/competitions/. Holidays
 * become day_type: off; Sundays and Saturdays without a meet get no file.
 *
 * Idempotent — an existing file is NEVER overwritten, so it is always safe
 * to re-run (e.g. after widening the season or adding a holiday).
 *
 *   npm run seed -- --resync
 *
 * also brings untouched stubs (planned, nothing written in them) back in
 * line after the schedule or the weekly rhythm changes: wrong day_type or
 * duration is rewritten, a stub on a date that no longer has practice is
 * deleted. Any file someone has written in is left alone and listed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import { seasonDays, defaultDayType, blockFor, weekOf, HOLIDAYS, DEFAULT_DURATION } from '../src/lib/season.ts';
import { loadMeets } from './lib/meets.mjs';

const DIR = path.resolve(import.meta.dirname, '..', 'content', 'practices');
const RESYNC = process.argv.includes('--resync');
fs.mkdirSync(DIR, { recursive: true });

const meets = loadMeets();

const stub = (iso, dayType) => {
  const off = dayType === 'off';
  return [
    '---',
    `date: ${iso}`,
    `day_type: ${dayType}`,
    `block: ${blockFor(iso)}`,
    `week: ${weekOf(iso)}`,
    `duration_min: ${DEFAULT_DURATION[dayType]}`,
    'primary: []',
    'spiral: []',
    'schedule: []',
    'pod_notes: {}',
    'status: planned',
    '---',
    '',
    off ? `${HOLIDAYS[iso]} — no practice.` : '## After-practice notes',
    '',
  ].join('\n');
};

/** A planned file nobody has written in: empty lists, no film, no notes. */
function untouched(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return null;
  const fm = loadYaml(match[1]) ?? {};
  const body = match[2].trim();
  const empty =
    fm.status === 'planned' &&
    !fm.film &&
    ['primary', 'spiral', 'schedule'].every((k) => (fm[k] ?? []).length === 0) &&
    Object.keys(fm.pod_notes ?? {}).length === 0 &&
    (body === '## After-practice notes' || body.endsWith('— no practice.'));
  return empty ? fm : null;
}

let created = 0;
let kept = 0;
const changed = [];
const skipped = [];

for (const iso of seasonDays()) {
  const dayType = defaultDayType(iso, meets);
  const file = path.join(DIR, `${iso}.md`);
  const exists = fs.existsSync(file);

  if (exists && RESYNC) {
    const fm = untouched(fs.readFileSync(file, 'utf8'));
    if (!dayType) {
      if (fm) {
        fs.rmSync(file);
        changed.push(`${iso}: removed (no practice)`);
      } else {
        skipped.push(`${iso}: has content but no practice is expected that day`);
      }
      continue;
    }
    if (fm && (fm.day_type !== dayType || fm.duration_min !== DEFAULT_DURATION[dayType])) {
      fs.writeFileSync(file, stub(iso, dayType));
      const minutes = fm.duration_min !== DEFAULT_DURATION[dayType] ? ` (${fm.duration_min} → ${DEFAULT_DURATION[dayType]} min)` : '';
      changed.push(`${iso}: ${fm.day_type} → ${dayType}${minutes}`);
    } else if (!fm) {
      const current = /^day_type:\s*(\S+)/m.exec(fs.readFileSync(file, 'utf8'))?.[1];
      if (current !== dayType) skipped.push(`${iso}: has content, day_type ${current} (rule says ${dayType})`);
    }
    kept++;
    continue;
  }

  if (!dayType) continue; // no practice that day
  if (exists) {
    kept++;
    continue;
  }
  fs.writeFileSync(file, stub(iso, dayType));
  created++;
}

for (const line of changed) console.log(`  resync   ${line}`);
for (const line of skipped) console.log(`  left     ${line}`);
console.log(
  `seed-calendar: ${created} stub(s) created, ${kept} existing file(s) kept` +
    (RESYNC ? `, ${changed.length} resynced, ${skipped.length} left for a human` : '')
);
