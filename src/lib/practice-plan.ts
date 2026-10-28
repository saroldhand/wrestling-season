/**
 * What a practice card shows as its timeline: the practice's own written
 * schedule when there is one, otherwise its block's template for that day
 * type. Times are clock times counted from PRACTICE_START in season.ts.
 */
import type { Practice, TemplateSegment, SegmentKind } from './schemas.ts';
import { practiceClock } from './season.ts';

export const SEGMENT_LABEL: Record<SegmentKind, string> = {
  'warm-up': 'Warm-up',
  matball: 'Matball',
  teach: 'Teach',
  drill: 'Drill',
  situations: 'Situations',
  live: 'Live',
  conditioning: 'Conditioning',
  water: 'Water',
  close: 'Close',
};

/** The idea-bank concept type offered inside each segment. */
export const IDEA_TYPE: Partial<Record<SegmentKind, 'drill' | 'situation' | 'live' | 'conditioning'>> = {
  drill: 'drill',
  situations: 'situation',
  live: 'live',
  conditioning: 'conditioning',
};

/** Days the room actually practices — not meets, not off days. */
export const isPracticeDay = (dayType: Practice['day_type']) => dayType !== 'off' && dayType !== 'competition';

export interface TimedSegment {
  clock: string;
  len: number;
  label: string;
  detail?: string;
  kind?: SegmentKind;
}

const minutes = (start: string) => {
  const [h, m] = start.split(':').map(Number);
  return h * 60 + m;
};

export function practiceTimeline(
  p: Practice,
  template: TemplateSegment[] | undefined
): { segments: TimedSegment[]; fromTemplate: boolean } {
  if (p.schedule.length > 0) {
    return {
      fromTemplate: false,
      segments: p.schedule.map((item) => ({
        clock: practiceClock(minutes(item.start)),
        len: item.len,
        label: item.label,
        detail: item.detail,
        kind: item.kind,
      })),
    };
  }
  let offset = 0;
  const segments = (template ?? []).map((s) => {
    const segment = { clock: practiceClock(offset), len: s.min, label: SEGMENT_LABEL[s.kind], detail: s.note, kind: s.kind };
    offset += s.min;
    return segment;
  });
  return { fromTemplate: segments.length > 0, segments };
}
