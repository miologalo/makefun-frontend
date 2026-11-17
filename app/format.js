// Small helpers for showing API values in HTML.
// Every value that reaches the page goes through esc() first.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount (1000, '1000.00', 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const fractionDigits = Number.isInteger(n) ? 0 : 2;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** A count as '1,234', or compact '12.3k' once it passes ten thousand. */
export function num(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('en-US');
}

/** A leaderboard micro value (987701 = 0.987701) as a percentage, '98.77%'. */
export function rate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10_000).toFixed(2)}%`;
}

/** A deadline as a date in UTC, e.g. 'Nov 17, 2026, 12:30 PM UTC'. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  })} UTC`;
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** The time until a deadline: '2d 4h left', '35m left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!(ms > 0)) return 'ended';
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** True when a bounty still takes entries: status open and deadline ahead. */
export function stillOpen(b) {
  return b.status === 'open' && new Date(b.deadline).getTime() > Date.now();
}

/** '1 bounty' / '12 bounties', '1 entry' / '3 entries'. */
export function plural(n, one, many) {
  return `${num(n)} ${n === 1 ? one : many}`;
}
