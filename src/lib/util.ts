// Common utility helpers
import { differenceInCalendarDays, addDays, format, parseISO, isWithinInterval, startOfDay } from 'date-fns';

export function daysBetween(a: string, b: string) {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

export function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'yyyy-MM-dd');
  } catch {
    return iso;
  }
}

export function addDaysISO(iso: string, days: number) {
  return addDays(parseISO(iso), days).toISOString();
}

export function todayISO() {
  return startOfDay(new Date()).toISOString();
}

export function inRange(iso: string, start: string, end: string) {
  try {
    return isWithinInterval(parseISO(iso), { start: parseISO(start), end: parseISO(end) });
  } catch {
    return false;
  }
}

export function currency(v?: number, ccy = 'THB') {
  if (v == null || Number.isNaN(v)) return '—';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(v);
  } catch {
    return v.toLocaleString();
  }
}
