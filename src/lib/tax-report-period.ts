// Pure date math for the Tax Report's period selector — no server/client-only
// APIs, so the same resolution logic is usable from the Server Component
// page (to compute the actual query range) and safe to unit-reason about in
// isolation. All boundaries are UTC to match how issueDate is stored
// (`new Date("YYYY-MM-DD")` parses as UTC midnight — see invoice-actions.ts).

export type PeriodPreset = "this-month" | "last-month" | "custom";

export interface ResolvedPeriod {
  preset: PeriodPreset;
  /** Inclusive lower bound for the issueDate query. */
  from: Date;
  /** Exclusive upper bound for the issueDate query. */
  to: Date;
  /** YYYY-MM-DD, for prefilling the date inputs. */
  fromInput: string;
  /** YYYY-MM-DD, inclusive — the last day actually included. */
  toInput: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfMonthUTC(year: number, monthIndex0: number): Date {
  return new Date(Date.UTC(year, monthIndex0, 1));
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateInput(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function thisMonthRange(): ResolvedPeriod {
  const now = new Date();
  const from = startOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth());
  const to = startOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth() + 1);
  return {
    preset: "this-month",
    from,
    to,
    fromInput: toDateInputValue(from),
    toInput: toDateInputValue(new Date(to.getTime() - DAY_MS)),
  };
}

function lastMonthRange(): ResolvedPeriod {
  const now = new Date();
  const from = startOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth() - 1);
  const to = startOfMonthUTC(now.getUTCFullYear(), now.getUTCMonth());
  return {
    preset: "last-month",
    from,
    to,
    fromInput: toDateInputValue(from),
    toInput: toDateInputValue(new Date(to.getTime() - DAY_MS)),
  };
}

// Falls back to "this month" whenever the requested period can't be
// resolved to a valid range (missing/malformed custom dates, or from > to)
// — never lets an invalid URL produce a broken or empty-by-accident query.
export function resolvePeriod(params: { period?: string; from?: string; to?: string }): ResolvedPeriod {
  if (params.period === "last-month") return lastMonthRange();

  if (params.period === "custom") {
    const from = parseDateInput(params.from);
    const to = parseDateInput(params.to);
    if (from && to && from.getTime() <= to.getTime()) {
      return {
        preset: "custom",
        from,
        to: new Date(to.getTime() + DAY_MS),
        fromInput: toDateInputValue(from),
        toInput: toDateInputValue(to),
      };
    }
  }

  return thisMonthRange();
}
