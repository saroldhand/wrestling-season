/**
 * Season date math for 2026-27. Every date constant in the system lives in
 * this file — nothing else may hardcode a season date (see §11 of the spec:
 * multi-season support is a `season` field per collection plus a switcher,
 * deferred until a second season actually exists).
 *
 * All date arithmetic is done in UTC so that `2026-11-16` means the same
 * calendar day in Node scripts, the Astro build, and the browser.
 */

export const SEASON = '2026-27';
export const SEASON_START = '2026-11-13'; // Friday — first day of tryouts
export const SEASON_END = '2027-03-14'; // Sunday — end of state weekend

/** Week numbering anchor: 2026-11-16 (Monday) is week 1. Nov 13–15 (evaluation) is week 0. */
export const WEEK_ONE_MONDAY = '2026-11-16';

export type BlockId = 'evaluate' | 'install' | 'volume' | 'refine' | 'peak';
export type DayType = 'install' | 'volume' | 'sharpen' | 'competition' | 'off';

/**
 * Macrocycle block boundaries. `content/blocks/*.md` carries the coaching
 * intent (objective, KPIs); these dates are the machine-readable authority
 * that the calendar, seed script, and validator use.
 */
export const BLOCK_BOUNDS: { id: BlockId; start: string; end: string }[] = [
  { id: 'evaluate', start: '2026-11-13', end: '2026-11-15' },
  { id: 'install', start: '2026-11-16', end: '2026-12-20' },
  { id: 'volume', start: '2026-12-21', end: '2027-01-24' },
  { id: 'refine', start: '2027-01-25', end: '2027-02-21' },
  { id: 'peak', start: '2027-02-22', end: '2027-03-14' },
];

/** Days inside the season with no practice, beyond the Sunday rule. */
export const HOLIDAYS: Record<string, string> = {
  '2026-11-26': 'Thanksgiving',
  '2026-12-24': 'Christmas Eve',
  '2026-12-25': 'Christmas Day',
  '2027-01-01': "New Year's Day",
};

/** Practice days with something on them besides practice. */
export const MILESTONES: Record<string, string> = {
  '2026-11-25': 'Hydration testing',
};

/**
 * The weekly rhythm: default day_type by UTC weekday (0 = Sunday).
 * `null` means no practice — a Saturday only gets a file when there's a meet.
 * Monday teaches (weekend recap, film, what's pressing), Tuesday–Thursday
 * are the wrestling and conditioning days, Friday sharpens and makes weight.
 */
export const DAY_TYPE_BY_WEEKDAY: (DayType | null)[] = [
  null, // Sun — no practice
  'install', // Mon
  'volume', // Tue
  'volume', // Wed
  'volume', // Thu
  'sharpen', // Fri — make weight for Saturday
  null, // Sat — meets only
];

/** Practice starts at 5:00pm; schedule `start` offsets count from here. */
export const PRACTICE_START = '17:00';

/** Default practice length by day_type: two full hours, Fridays end a little early. */
export const DEFAULT_DURATION: Record<DayType, number> = {
  install: 120,
  volume: 120,
  sharpen: 105,
  competition: 120,
  off: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toISO(new Date(toDate(iso).getTime() + days * DAY_MS));
}

/** UTC weekday, 0 = Sunday. */
export function weekdayOf(iso: string): number {
  return toDate(iso).getUTCDay();
}

export function isInSeason(iso: string): boolean {
  return iso >= SEASON_START && iso <= SEASON_END;
}

/** Which block a date falls in, or null outside the season. */
export function blockFor(iso: string): BlockId | null {
  const bounds = BLOCK_BOUNDS.find((b) => iso >= b.start && iso <= b.end);
  return bounds ? bounds.id : null;
}

/** Season week number: week 1 starts WEEK_ONE_MONDAY; Nov 13–15 is week 0. */
export function weekOf(iso: string): number {
  const diff = toDate(iso).getTime() - toDate(WEEK_ONE_MONDAY).getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / (7 * DAY_MS)) + 1;
}

/** Calendar bounds of a season week: week 0 is Nov 13–15, weeks 1+ run Mon–Sun. */
export function weekBounds(week: number): { start: string; end: string } {
  if (week <= 0) return { start: SEASON_START, end: addDays(WEEK_ONE_MONDAY, -1) };
  const start = addDays(WEEK_ONE_MONDAY, (week - 1) * 7);
  const end = addDays(start, 6);
  return {
    start: start < SEASON_START ? SEASON_START : start,
    end: end > SEASON_END ? SEASON_END : end,
  };
}

/** Every ISO date from start through end inclusive (empty if end is before start). */
export function dateRange(start: string, end: string): string[] {
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Every ISO date from SEASON_START through SEASON_END inclusive. */
export function seasonDays(): string[] {
  return dateRange(SEASON_START, SEASON_END);
}

/** Human date for display, always evaluated in UTC so it matches the ISO day. */
export function formatDay(
  iso: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
): string {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(toDate(iso));
}

/** Clock time `offsetMin` minutes into practice, e.g. 30 → "5:30". */
export function practiceClock(offsetMin: number): string {
  const [h, m] = PRACTICE_START.split(':').map(Number);
  const total = h * 60 + m + offsetMin;
  return `${((Math.floor(total / 60) + 11) % 12) + 1}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Default day_type for a date. `meets` holds the dates where a competition
 * replaces practice (see meetDates in competitions.ts). Sundays never get a
 * practice; holidays are off; a meet day is competition; the last practice
 * before a meet sharpens and makes weight; everything else follows the
 * weekly rhythm (null = no practice).
 */
export function defaultDayType(iso: string, meets: ReadonlySet<string> = new Set()): DayType | null {
  if (weekdayOf(iso) === 0) return null;
  if (HOLIDAYS[iso]) return 'off';
  if (meets.has(iso)) return 'competition';
  const base = DAY_TYPE_BY_WEEKDAY[weekdayOf(iso)];
  if (base === null) return null;
  // Evaluation day is assessment work, whatever the weekday says.
  if (blockFor(iso) === 'evaluate') return 'install';
  return meetBeforeNextPractice(iso, meets) ? 'sharpen' : base;
}

function meetBeforeNextPractice(iso: string, meets: ReadonlySet<string>): boolean {
  for (let d = addDays(iso, 1); isInSeason(d); d = addDays(d, 1)) {
    if (meets.has(d)) return true;
    if (!HOLIDAYS[d] && DAY_TYPE_BY_WEEKDAY[weekdayOf(d)] !== null) return false;
  }
  return false;
}
