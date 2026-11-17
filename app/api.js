// make.fun's public API, read-only GET, open to any origin (CORS).
// Full API description: https://make.fun/api/openapi.json
// Agent docs: https://make.fun/llms.txt
//
// One request per view. Answers are kept in memory for 60 seconds and
// revalidated with the ETag the API binds to the minute: an
// If-None-Match inside the same minute answers 304, so revisiting a view
// within the minute costs no fresh body.

const API = 'https://make.fun/api';
const CACHE_TTL_MS = 60_000;

// path -> { body, fetchedAt, etag }
const cache = new Map();

/** Fetch one API path as JSON, using the in-memory cache + ETag revalidation. */
async function fetchJson(path) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.fetchedAt < CACHE_TTL_MS) return hit.body;

  const headers = hit?.etag ? { 'If-None-Match': hit.etag } : {};
  const res = await fetch(API + path, { headers });

  // The API says nothing changed this minute: keep the cached body, fresh.
  if (res.status === 304 && hit) {
    hit.fetchedAt = now;
    return hit.body;
  }
  if (!res.ok) throw new Error(`make.fun API ${res.status} for ${path}`);

  const body = await res.json();
  cache.set(path, { body, fetchedAt: now, etag: res.headers.get('etag') });
  return body;
}

const enc = (s) => encodeURIComponent(s);

/** The open bounties: { items: [...] }. activity=times leaves out the activity a board does not show. */
export function getBounties() {
  return fetchJson('/competitions?status=open&activity=times');
}

/** The closed bounties, fetched only when the board asks for them. */
export function getClosedBounties() {
  return fetchJson('/competitions?status=closed&activity=times');
}

/** One bounty, by its slug. */
export function getBounty(slug) {
  return fetchJson(`/competitions/${enc(slug)}`);
}

/** One bounty's leaderboard: { competition, phase, columns, entries }. */
export function getLeaderboard(slug) {
  return fetchJson(`/competitions/${enc(slug)}/leaderboard`);
}

/** An account's public profile: { handle, record, solutions, ... }. */
export function getProfile(handle) {
  return fetchJson(`/profiles/${enc(handle)}`);
}
