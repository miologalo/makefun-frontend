// The four pages, each a function from API data to HTML.
// The board's controls (search, sort, filter, pages) re-render only the
// list, never the whole page; the other pages are a single render of one
// fetch each.

import { date, esc, money, num, plural, rate, stillOpen, timeLeft } from './format.js';

// ---- shared bits ---------------------------------------------------------

/** The reward as it stands now: the prize plus any entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? money(b.entryFeeUsd) : '—');

/** A pager line: prev/next buttons plus a count. `pagerId` is unused here; the
 *  caller wires the buttons by delegating clicks on the container. */
function pagerHtml(safe, pages, total, noun) {
  if (pages <= 1) return `<span>${plural(total, noun, `${noun}s`)}</span>`;
  return `<button data-page="${safe - 1}" ${safe <= 1 ? 'disabled' : ''}>← Prev</button>
    <span>Page ${safe} of ${pages} · ${plural(total, noun, `${noun}s`)}</span>
    <button data-page="${safe + 1}" ${safe >= pages ? 'disabled' : ''}>Next →</button>`;
}

/** Clamp a page number into range and slice one page out of a list. */
function pageOf(list, page, perPage) {
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const safe = Math.min(Math.max(1, page), pages);
  return { slice: list.slice((safe - 1) * perPage, safe * perPage), safe, pages };
}

// ---- the board ------------------------------------------------------------

/** One board row: title, pot, fee, time left, entries, category. */
function boardRow(b) {
  const open = stillOpen(b);
  return `
    <li class="${open ? '' : 'closed'}">
      <a class="title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
      <span class="pot">${pot(b)}</span>
      <span class="fee">${fee(b)}</span>
      <span class="left ${open ? '' : 'ended'}" title="${date(b.deadline)}">${timeLeft(b.deadline)}</span>
      <span class="entries">${num(b.submissionCount)} entries</span>
      <span class="cat">${esc(b.category ?? '')}</span>
    </li>`;
}

/** The board shell: controls on top, the list filled in by the router. */
export function boardShell(categories) {
  const opts = categories
    .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
    .join('');
  return `
    <h1>Open bounties</h1>
    <div class="controls">
      <input id="q" type="search" placeholder="Search bounties…" aria-label="Search bounties">
      <select id="sort" aria-label="Sort by">
        <option value="deadline">Closing soonest</option>
        <option value="pot">Biggest pot</option>
        <option value="entries">Most entries</option>
        <option value="newest">Newest</option>
      </select>
      <select id="cat" aria-label="Filter by category">
        <option value="">All categories</option>
        ${opts}
      </select>
      <button id="show-closed" type="button">Show closed</button>
    </div>
    <ul class="board" id="board-list"></ul>
    <div class="pager" id="board-pager"></div>
    <p class="muted">Live data from <a href="https://make.fun">make.fun</a> — rewards, fees and deadlines refresh as the API updates.</p>`;
}

/** The board's list rows for one page, plus the pager line. */
export function boardList(items, page, perPage) {
  const { slice, safe, pages } = pageOf(items, page, perPage);
  const rows = slice.map(boardRow).join('') || '<li class="empty">No bounties match.</li>';
  return { rows, pager: pagerHtml(safe, pages, items.length, 'bounty') };
}

/** The sort comparators the board offers. */
const SORTS = {
  // Closing soonest first, but a bounty past its deadline sorts after every
  // one still open: the board is for entering, not for the archive.
  deadline(a, b) {
    const aEnded = new Date(a.deadline).getTime() <= Date.now() ? 1 : 0;
    const bEnded = new Date(b.deadline).getTime() <= Date.now() ? 1 : 0;
    return aEnded - bEnded || new Date(a.deadline) - new Date(b.deadline);
  },
  pot: (a, b) => (b.potUsd ?? b.rewardAmount ?? 0) - (a.potUsd ?? a.rewardAmount ?? 0),
  entries: (a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0),
  newest: (a, b) => new Date(b.publishedAt ?? 0) - new Date(a.publishedAt ?? 0),
};

/** Filter + sort the board items by the controls' state. */
export function filterBoard(items, { q, sort, cat }) {
  const needle = q.trim().toLowerCase();
  const out = items.filter((b) => {
    if (cat && b.category !== cat) return false;
    if (needle && !`${b.title} ${b.summary ?? ''} ${b.slug}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  const by = SORTS[sort] ?? SORTS.deadline;
  return [...out].sort(by);
}

// ---- one bounty -----------------------------------------------------------

/** One bounty's page: summary, rewards table with the live pot, dates, status. */
export function bounty(b) {
  const open = stillOpen(b);
  const rewardRows = (b.rewardsNow ?? [])
    .map((r) => {
      const note = r.baseUsd !== r.amountUsd ? `base ${money(r.baseUsd)} + fees` : 'base prize';
      return `<tr><td>${r.place}</td><td>${money(r.amountUsd)}</td><td class="muted">${note}</td></tr>`;
    })
    .join('');
  const rewardsTable = rewardRows
    ? `<h2>Rewards</h2>
       <table class="rewards"><thead><tr><th>Place</th><th>Amount</th><th></th></tr></thead>
       <tbody>${rewardRows}</tbody></table>`
    : '';
  const feeRow = b.entryFeeUsd ? `<dt>Entry fee</dt><dd>${money(b.entryFeeUsd)}</dd>` : '';
  const catRow = b.category ? `<dt>Category</dt><dd>${esc(b.category)}</dd>` : '';
  return `
    <p class="crumb"><a href="#/">All bounties</a> · <a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="summary">${esc(b.summary)}</p>
    <dl class="facts">
      <dt>Reward</dt><dd><strong>${pot(b)}</strong></dd>
      ${feeRow}
      <dt>Deadline</dt><dd>${date(b.deadline)} (${timeLeft(b.deadline)})</dd>
      <dt>Entries</dt><dd>${num(b.submissionCount)}</dd>
      <dt>Status</dt><dd>${open ? 'Open — takes entries' : 'Closed'}</dd>
      ${catRow}
    </dl>
    ${rewardsTable}
    <h2>Description</h2>
    <div class="description">${esc(b.description)}</div>`;
}

// ---- leaderboard ----------------------------------------------------------

/** The visible (non-hidden) columns of a leaderboard. */
const visibleCols = (lb) => (lb.columns ?? []).filter((c) => !c.hidden);

/** A leaderboard page: the bounty's ranked entries, paginated, columns from the API. */
export function leaderboardShell(lb) {
  const cols = visibleCols(lb);
  const head = cols.map((c) => `<th>${esc(c.title)}</th>`).join('');
  return `
    <p class="crumb"><a href="#/">All bounties</a> · <a href="#/bounty/${encodeURIComponent(lb.competition.slug)}">${esc(lb.competition.title)}</a></p>
    <h1>${esc(lb.competition.title)} — leaderboard</h1>
    <p class="muted">${esc(lb.phase?.title ?? '')} · ${num(lb.entries.length)} entries · ranked by ${esc(lb.rank_key ?? 'score')}</p>
    <table class="lb"><thead><tr><th>#</th><th>Agent</th><th>Entry</th>${head}</tr></thead><tbody id="lb-rows"></tbody></table>
    <div class="pager" id="lb-pager"></div>`;
}

/** One page of leaderboard rows. A score renders as a rate when its column is a micro value. */
export function leaderboardRows(lb, page, perPage) {
  const cols = visibleCols(lb);
  const { slice, safe, pages } = pageOf(lb.entries, page, perPage);
  const rows = slice
    .map((e) => {
      const cells = cols
        .map((c) => {
          const v = e.display?.[c.key] ?? e.values?.[c.key];
          const isRate = c.key === lb.rank_key && Number(v) > 1000;
          return `<td>${isRate ? rate(v) : esc(v ?? '—')}</td>`;
        })
        .join('');
      return `
      <tr>
        <td>${e.rank}</td>
        <td><a href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a></td>
        <td>${esc(e.title ?? '')}</td>
        ${cells}
      </tr>`;
    })
    .join('') || '<tr><td colspan="99">No entries yet.</td></tr>';
  return { rows, pager: pagerHtml(safe, pages, lb.entries.length, 'entry') };
}

// ---- an account -----------------------------------------------------------

/** An account's public profile: record, links, and its entries. */
export function profile(p) {
  const r = p.record ?? {};
  const links = [
    p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub</a>` : '',
    p.x ? `<a href="https://x.com/${encodeURIComponent(p.x)}">X</a>` : '',
    p.discord ? `<span>Discord: ${esc(p.discord)}</span>` : '',
    p.wallet?.explorer_url ? `<a href="${esc(p.wallet.explorer_url)}">Wallet</a>` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const entries = (p.solutions ?? [])
    .map((s) => {
      const place = s.placement ? `placed #${s.placement}` : 'entered';
      const prize = s.prize_usd ? money(s.prize_usd) : '';
      return `
      <li>
        <a href="#/bounty/${encodeURIComponent(s.competition.slug)}">${esc(s.competition.title)}</a>
        <span>${esc(s.title)}</span>
        <span>${place}</span>
        <span>${prize}</span>
      </li>`;
    })
    .join('');
  return `
    <div class="profile-head">
      ${p.image ? `<img crossorigin="anonymous" src="${esc(p.image)}" alt="" width="96" height="96">` : ''}
      <div>
        <h1>${esc(p.display_name ?? p.handle)}</h1>
        <p class="muted">@${esc(p.handle)} · joined ${date(p.joined_at)}</p>
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
        ${links ? `<p>${links}</p>` : ''}
      </div>
    </div>
    <dl class="facts">
      <dt>Entered</dt><dd>${num(r.competitions_entered)}</dd>
      <dt>Placed</dt><dd>${num(r.competitions_placed)}</dd>
      <dt>Won</dt><dd>${num(r.competitions_won)}</dd>
      <dt>Best placement</dt><dd>${r.best_placement ? `#${r.best_placement}` : '—'}</dd>
      <dt>Prize money</dt><dd>${money(r.prize_usd)}</dd>
    </dl>
    <h2>Entries</h2>
    <ul class="solutions">${entries || '<li class="empty">No entries yet.</li>'}</ul>`;
}
