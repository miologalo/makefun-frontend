// A make.fun frontend: the board, one bounty, its leaderboard and an account's
// public profile, on hash routes.
//
//   #/                              the board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     its leaderboard
//   #/u/<handle>  or  #/profile/<handle>   an account
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture. The board's controls
// re-render only the list, never the whole page.

import { getBounties, getBounty, getClosedBounties, getLeaderboard, getProfile } from './api.js';
import { boardList, boardShell, bounty, filterBoard, leaderboardRows, leaderboardShell, profile } from './views.js';

const app = document.getElementById('app');
const PER_PAGE = 20;

const boardState = { items: [], q: '', sort: 'deadline', cat: '', page: 1, closedShown: false };

function fail(err) {
  app.innerHTML = `<p class="error">Could not load this page (${String(err?.message ?? err)}). <a href="#/">Back to the board</a></p>`;
  window.__shotReady = true;
}

function renderBoardList() {
  const list = document.getElementById('board-list');
  const pager = document.getElementById('board-pager');
  if (!list || !pager) return;
  const filtered = filterBoard(boardState.items, boardState);
  const { rows, pager: pagerHtml } = boardList(filtered, boardState.page, PER_PAGE);
  list.innerHTML = rows;
  pager.innerHTML = pagerHtml;
}

async function renderBoard() {
  document.title = 'make.fun bounties';
  const data = await getBounties();
  boardState.items = data.items ?? [];
  const categories = [...new Set(boardState.items.map((b) => b.category).filter(Boolean))].sort();
  app.innerHTML = boardShell(categories);
  const q = document.getElementById('q');
  const sort = document.getElementById('sort');
  const cat = document.getElementById('cat');
  const closedBtn = document.getElementById('show-closed');
  q.addEventListener('input', () => {
    boardState.q = q.value;
    boardState.page = 1;
    renderBoardList();
  });
  sort.addEventListener('change', () => {
    boardState.sort = sort.value;
    boardState.page = 1;
    renderBoardList();
  });
  cat.addEventListener('change', () => {
    boardState.cat = cat.value;
    boardState.page = 1;
    renderBoardList();
  });
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

async function renderBounty(slug) {
  const b = await getBounty(slug);
  document.title = `${b.title} | make.fun bounties`;
  app.innerHTML = bounty(b);
}

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

async function renderProfile(handle) {
  const p = await getProfile(handle);
  document.title = `@${p.handle} | make.fun bounties`;
  app.innerHTML = profile(p);
}

async function render() {
  window.__shotReady = false;
  app.innerHTML = '<p class="loading">Loading…</p>';
  const hash = location.hash || '#/';
  const bountyMatch = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
  const singleMatch = hash.match(/^#\/bounty\/([^/]+)$/);
  const profileMatch = hash.match(/^#\/(?:u|profile)\/([^/]+)$/);
  try {
    if (bountyMatch) await renderLeaderboard(decodeURIComponent(bountyMatch[1]));
    else if (singleMatch) await renderBounty(decodeURIComponent(singleMatch[1]));
    else if (profileMatch) await renderProfile(decodeURIComponent(profileMatch[1]));
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
