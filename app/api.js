// make.fun's public API: read-only GET requests, open to any origin (CORS).
// The full API is described at https://make.fun/api/openapi.json.
//
// One request per view, cached: each answer is kept in memory for 60 seconds,
// and revalidated with the ETag the API binds to the minute (If-None-Match
// answers 304 within the minute, so a revisit costs no fresh body).

const API = 'https://make.fun/api';
const TTL = 60000;

const cache = new Map();

async function get(path) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.at < TTL) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) {
    hit.at = now;
    return hit.body;
  }
  const body = await res.json();
  cache.set(path, { body, at: now, etag: res.headers.get('etag') });
  return body;
}

/** The open bounties: { items: [...] } (activity=times leaves out the activity a board does not show). */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** The closed bounties, fetched only when the board asks for them. */
export const getClosedBounties = () => get('/competitions?status=closed&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** One bounty's leaderboard: { competition, phase, columns, entries }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile: { handle, record, solutions, ... }. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);
