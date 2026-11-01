// The problems inside a merged ticket, counted the desk's way. causes.ts says which bug a report's
// tenant and channel point to, and every report is counted there (as CauseTable does). The reports
// the desk read as a one-day move (desk-notes.json) are not a day/month flip: they are their own
// problem too, and stay counted where they are filed (readAs in causes.ts).
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';

export const PROBLEM_TITLE: Record<Problem, string> = {
  parser: 'Shared parser reads day-first dates month first',
  hint: 'booking-v3 date hint says MM/DD/YYYY to day-first tenants',
  shift: 'Dates move by one day across time zones',
  unplaced: 'No tenant on file',
};

export function problemsOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem[] {
  const filed: Problem = causeOf(r, t) ?? 'unplaced';
  return oneDayMove.includes(r.id) ? [filed, 'shift'] : [filed];
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // Reports also counted under another problem: problem → count.
  alsoIn: Partial<Record<Problem, number>>;
  tenants: number;
  firstSeen: string;
  lastSeen: string;
  taggedAs: Record<string, number>;
};

export function groupByProblem(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const by = new Map<Problem, Report[]>();
  for (const r of merged) {
    for (const p of problemsOf(r, tenantOf(r), oneDayMove)) by.set(p, [...(by.get(p) ?? []), r]);
  }
  const groups = [...by.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        alsoIn: rs.reduce<Partial<Record<Problem, number>>>((n, r) => {
          for (const q of problemsOf(r, tenantOf(r), oneDayMove)) if (q !== problem) n[q] = (n[q] ?? 0) + 1;
          return n;
        }, {}),
        tenants: new Set(rs.map((r) => r.tenant)).size,
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
        taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, groups };
}
