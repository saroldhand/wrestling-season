/**
 * Display helpers for content/competitions/, shared by /schedule and the
 * calendar so a date or a bus time reads the same everywhere.
 */
import { TEAMS, type Competition } from './schemas.ts';
import { dateRange, formatDay } from './season.ts';

export type Team = (typeof TEAMS)[number];
export const TEAM_LABEL: Record<Team, string> = { varsity: 'Varsity', jv: 'JV' };
const TEAM_ABBR: Record<Team, string> = { varsity: 'V', jv: 'JV' };

/** "V", "JV", or "V·JV" — the calendar cell marker. */
export const teamAbbr = (c: Competition) => c.teams.map((t) => TEAM_ABBR[t]).join('·');

/** Every date the competition covers. */
export const competitionDays = (c: Competition) => dateRange(c.date, c.end_date ?? c.date);

/** By date; on a shared Saturday the varsity event leads. */
export function compareCompetitions(a: Competition, b: Competition): number {
  return (
    a.date.localeCompare(b.date) ||
    Number(!a.teams.includes('varsity')) - Number(!b.teams.includes('varsity')) ||
    a.name.localeCompare(b.name)
  );
}

const dow = (iso: string) => formatDay(iso, { weekday: 'short' });
const monthDay = (iso: string) => formatDay(iso, { month: 'short', day: 'numeric' });

/** { dow: "Sat–Sun", day: "Dec 19–20" } */
export function when(c: Competition): { dow: string; day: string } {
  const end = c.end_date ?? c.date;
  if (c.date === end) return { dow: dow(c.date), day: monthDay(c.date) };
  const sameMonth = c.date.slice(0, 7) === end.slice(0, 7);
  return {
    dow: `${dow(c.date)}–${dow(end)}`,
    day: sameMonth ? `${monthDay(c.date)}–${formatDay(end, { day: 'numeric' })}` : `${monthDay(c.date)} – ${monthDay(end)}`,
  };
}

export interface TimeLine {
  text: string;
  label?: string;
  team?: Team;
  tba?: boolean;
}

/** One line per value: a scalar, one per day (labelled by weekday), or one per team. */
function lines(value: Competition['start' | 'weigh_in' | 'bus'], days: string[], words: Record<string, string> = {}): TimeLine[] {
  if (value === undefined) return [{ text: 'TBA', tba: true }];
  if (Array.isArray(value)) return value.map((v, i) => ({ label: dow(days[i]), text: words[v] ?? v }));
  if (typeof value === 'object') {
    return (Object.entries(value) as [Team, string][]).map(([team, v]) => ({ label: TEAM_LABEL[team], team, text: v }));
  }
  return [{ text: words[value] ?? value }];
}

/** Start / Weigh-in / Bus, each as display lines. */
export function timeRows(c: Competition): { label: string; lines: TimeLine[] }[] {
  const days = competitionDays(c);
  return [
    { label: 'Start', lines: lines(c.start, days) },
    { label: 'Weigh-in', lines: lines(c.weigh_in, days, { none: 'None', home: 'At home' }) },
    { label: 'Bus', lines: lines(c.bus, days, { none: 'No bus' }) },
  ];
}
