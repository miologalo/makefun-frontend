// A make.fun frontend: the board, one bounty, its leaderboard and an
// account's public profile, on hash routes.
//
//   #/                              the board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     its leaderboard
//   #/u/<handle>  or  #/profile/<handle>   an account
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture. The board's
// controls re-render only the list, never the whole page.

import { getBounties, getBounty, getClosedBounties, getLeaderboard, getProfile } from './api.js';
import {
  boardList,
  boardShell,
  bounty,
  filterBoard,
  leaderboardRows,
  leaderboardShell,
  profile,
} from './views.js';

const app = document.getElementById('app');
const PER_PAGE = 20;

// The board's filter/sort/page state; the list is the only thing re-rendered.
const boardState = { items: [], q: '', sort: 'deadline', cat: '', page: 1, closedShown: false };

/** Show a load failure, with a way back to the board. */
function fail(err) {
  app.innerHTML = `<p class="error">Could not load this page (${String(err?.message ?? err)}). <a href="#/">Back to the board</a></p>`;
  window.__shotReady = true;
}

/** Re-render just the board's list + pager from the current controls. */
function renderBoardList() {
  const list = document.getElementById('board-list');
  const pager = document.getElementById('board-pager');
  if (!list || !pager) return;
  const filtered = filterBoard(boardState.items, boardState);
  const { rows, pager: pagerHtml } = boardList(filtered, boardState.page, PER_PAGE);
  list.innerHTML = rows;
  pager.innerHTML = pagerHtml;
}

/** Wire a control so changing it re-renders only the list, from page 1. */
function wireControl(id, event, apply) {
  const el = document.getElementById(id);
  el.addEventListener(event, () => {
    apply(el);
    boardState.page = 1;
    renderBoardList();
  });
}

/** The board: fetch the open bounties once, then let the controls filter them. */
async function renderBoard() {
  document.title = 'make.fun bounties';
  const data = await getBounties();
  boardState.items = data.items ?? [];
  const categories = [...new Set(boardState.items.map((b) => b.category).filter(Boolean))].sort();
  app.innerHTML = boardShell(categories);

  wireControl('q', 'input', (el) => {
    boardState.q = el.value;
  });
  wireControl('sort', 'change', (el) => {
    boardState.sort = el.value;
  });
  wireControl('cat', 'change', (el) => {
    boardState.cat = el.value;
  });

  // Closed bounties load on demand, once, and join the same list.
  const closedBtn = document.getElementById('show-closed');
  closedBtn.addEventListener('click', async () => {
    if (boardState.closedShown) return;
    closedBtn.disabled = true;
    closedBtn.textContent = 'Loading closed…';
    const closed = await getClosedBounties();
    boardState.items = [...boardState.items, ...(closed.items ?? [])];
    boardState.closedShown = true;
    closedBtn.textContent = 'Closed included';
    renderBoardList();
  });

  document.getElementById('board-pager').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    boardState.page = Number(btn.dataset.page);
    renderBoardList();
  });
  renderBoardList();
}

/** One bounty's page. */
async function renderBounty(slug) {
  const b = await getBounty(slug);
  document.title = `${b.title} | make.fun bounties`;
  app.innerHTML = bounty(b);
}

/** One bounty's leaderboard, paginated. */
async function renderLeaderboard(slug) {
  const lb = await getLeaderboard(slug);
  document.title = `${lb.competition.title} leaderboard | make.fun bounties`;
  app.innerHTML = leaderboardShell(lb);
  let page = 1;
  const draw = () => {
    const { rows, pager } = leaderboardRows(lb, page, PER_PAGE);
    document.getElementById('lb-rows').innerHTML = rows;
    document.getElementById('lb-pager').innerHTML = pager;
  };
  document.getElementById('lb-pager').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-page]');
    if (!btn || btn.disabled) return;
    page = Number(btn.dataset.page);
    draw();
  });
  draw();
}

/** An account's public profile. */
async function renderProfile(handle) {
  const p = await getProfile(handle);
  document.title = `@${p.handle} | make.fun bounties`;
  app.innerHTML = profile(p);
}

// The hash routes, in order: leaderboard, bounty, profile, then the board.
const ROUTES = [
  { re: /^#\/bounty\/([^/]+)\/leaderboard$/, run: (m) => renderLeaderboard(decodeURIComponent(m[1])) },
  { re: /^#\/bounty\/([^/]+)$/, run: (m) => renderBounty(decodeURIComponent(m[1])) },
  { re: /^#\/(?:u|profile)\/([^/]+)$/, run: (m) => renderProfile(decodeURIComponent(m[1])) },
];

/** Render the page the current hash names. */
async function render() {
  window.__shotReady = false;
  app.innerHTML = '<p class="loading">Loading…</p>';
  const hash = location.hash || '#/';
  try {
    const route = ROUTES.find((r) => r.re.test(hash));
    if (route) await route.run(hash.match(route.re));
    else await renderBoard();
  } catch (err) {
    fail(err);
    return;
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
