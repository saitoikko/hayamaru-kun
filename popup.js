/* Video Speed Controller (Personal) — ポップアップ
 *
 * ページ側へメッセージは送らない。chrome.storage.local に書くだけで、
 * content.js が storage.onChanged を受け取って即座に反映する。
 */
'use strict';

const MIN_RATE = 0.25;
const MAX_RATE = 16.0;

const DEFAULTS = {
  enabled: true,
  defaultRate: 1.0,
  siteRules: {},
  playlistRules: {},
  videoRules: {},
  excluded: {},
  videoPlaylist: {},
  keysEnabled: true,
  showOsd: true
};

const PRESETS = [0.25, 0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.8, 2.0, 3.0, 16.0];
const TICKS = [0.25, 0.5, 1, 2, 4, 8, 16];

const L_MIN = Math.log2(MIN_RATE);          // -2
const L_MAX = Math.log2(MAX_RATE);          //  4
const L_SPAN = L_MAX - L_MIN;               //  6

let settings = Object.assign({}, DEFAULTS);
let lastContext = null;
let ctx = { host: '', videoId: null, playlistId: null, playlistTitle: '' };
let scope = 'default';

/* ---------------------------------------------------------------- */
/* 小道具                                                            */
/* ---------------------------------------------------------------- */

const $ = (id) => document.getElementById(id);

const clamp = (r) =>
  Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round(Number(r) * 100) / 100));

const fmt = (r) => (r >= 10 ? Number(r).toFixed(1) : Number(r).toFixed(2));

function posFromRate(r) {
  return Math.round(((Math.log2(clamp(r)) - L_MIN) / L_SPAN) * 1000);
}

function rateFromPos(p) {
  return snap(Math.pow(2, L_MIN + (p / 1000) * L_SPAN));
}

/* 半端な値にならないよう丸める。1.0 の近くは 1.00 に吸着させる。 */
function snap(r) {
  if (Math.abs(r - 1) < 0.03) return 1.0;
  const step = r < 2 ? 0.05 : r < 4 ? 0.1 : 0.5;
  return clamp(Math.round(r / step) * step);
}

function save(patch) {
  return new Promise((resolve) => chrome.storage.local.set(patch, resolve));
}

/* ---------------------------------------------------------------- */
/* 現在のタブの文脈                                                  */
/* ---------------------------------------------------------------- */

function parseUrl(href) {
  const out = { host: '', videoId: null, playlistId: null };
  let u;
  try { u = new URL(href); } catch (e) { return out; }
  out.host = u.hostname;
  out.videoId = u.searchParams.get('v');
  out.playlistId = u.searchParams.get('list');
  if (!out.videoId) {
    if (u.hostname === 'youtu.be') {
      out.videoId = u.pathname.slice(1) || null;
    } else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      if (m) out.videoId = m[1];
    }
  }
  return out;
}

async function readContext() {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (e) { /* activeTab が無い状況では URL を読めない */ }

  const tab = tabs && tabs[0];
  const parsed = tab && tab.url ? parseUrl(tab.url) : { host: '', videoId: null, playlistId: null };

  // プレイリスト名はページ側が保存したものを使う（同じプレイリストの時だけ）
  let title = '';
  if (lastContext && parsed.playlistId && lastContext.playlistId === parsed.playlistId) {
    title = lastContext.playlistTitle || '';
  }
  if (!title && !parsed.host && lastContext) {
    // URL が読めなかった場合はページ側の情報で代用する
    parsed.host = lastContext.host || '';
    parsed.videoId = lastContext.videoId || null;
    parsed.playlistId = lastContext.playlistId || null;
    title = lastContext.playlistTitle || '';
  }
  return {
    host: parsed.host,
    videoId: parsed.videoId,
    playlistId: parsed.playlistId,
    playlistTitle: title
  };
}

/* ---------------------------------------------------------------- */
/* 速度の決定（content.js と同じ順序）                               */
/* ---------------------------------------------------------------- */

function resolveRate() {
  const s = settings;
  if (ctx.videoId && typeof s.videoRules[ctx.videoId] === 'number') {
    return { rate: s.videoRules[ctx.videoId], scope: 'video' };
  }
  const pid = ctx.playlistId || (ctx.videoId ? s.videoPlaylist[ctx.videoId] : null);
  if (pid && s.excluded[pid]) {
    return { rate: s.excluded[pid].rate, scope: 'excluded', playlistId: pid };
  }
  if (ctx.playlistId && typeof s.playlistRules[ctx.playlistId] === 'number') {
    return { rate: s.playlistRules[ctx.playlistId], scope: 'playlist' };
  }
  if (typeof s.siteRules[ctx.host] === 'number') {
    return { rate: s.siteRules[ctx.host], scope: 'site' };
  }
  return { rate: s.defaultRate, scope: 'default' };
}

/* いま編集対象になっている範囲の値。未設定なら実効値を初期値として見せる。 */
function scopeRate() {
  const s = settings;
  if (scope === 'video' && ctx.videoId && typeof s.videoRules[ctx.videoId] === 'number') {
    return s.videoRules[ctx.videoId];
  }
  if (scope === 'playlist' && ctx.playlistId && typeof s.playlistRules[ctx.playlistId] === 'number') {
    return s.playlistRules[ctx.playlistId];
  }
  if (scope === 'site' && typeof s.siteRules[ctx.host] === 'number') {
    return s.siteRules[ctx.host];
  }
  if (scope === 'default') return s.defaultRate;
  return resolveRate().rate;
}

async function setScopeRate(rate) {
  rate = clamp(rate);
  const s = settings;
  if (scope === 'video' && ctx.videoId) {
    s.videoRules[ctx.videoId] = rate;
    await save({ videoRules: s.videoRules });
  } else if (scope === 'playlist' && ctx.playlistId) {
    s.playlistRules[ctx.playlistId] = rate;
    await save({ playlistRules: s.playlistRules });
  } else if (scope === 'site' && ctx.host) {
    s.siteRules[ctx.host] = rate;
    await save({ siteRules: s.siteRules });
  } else {
    s.defaultRate = rate;
    await save({ defaultRate: rate });
  }
  render();
}

async function clearScope(target) {
  const s = settings;
  if (target === 'video' && ctx.videoId) {
    delete s.videoRules[ctx.videoId];
    await save({ videoRules: s.videoRules });
  } else if (target === 'playlist' && ctx.playlistId) {
    delete s.playlistRules[ctx.playlistId];
    await save({ playlistRules: s.playlistRules });
  } else if (target === 'site' && ctx.host) {
    delete s.siteRules[ctx.host];
    await save({ siteRules: s.siteRules });
  }
  if (scope === target) scope = 'default';
  render();
}

/* ---------------------------------------------------------------- */
/* 描画                                                              */
/* ---------------------------------------------------------------- */

function buildStatic() {
  // プリセット
  const wrap = $('presets');
  wrap.innerHTML = '';
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = fmt(p);
    b.dataset.rate = String(p);
    if (p > 4) b.classList.add('mute-range');
    b.addEventListener('click', () => setScopeRate(p));
    wrap.appendChild(b);
  }

  // スライダーの目盛り
  const ticks = $('ticks');
  ticks.innerHTML = '';
  for (const t of TICKS) {
    const el = document.createElement('span');
    el.textContent = t < 1 ? String(t) : String(t);
    el.style.left = (posFromRate(t) / 10) + '%';
    ticks.appendChild(el);
  }
  $('muteMark').style.left = (posFromRate(4) / 10) + '%';
}

function scopeRows() {
  const rows = [
    { id: 'default', name: '全体（既定）', sub: 'どのサイトでも使う値', val: settings.defaultRate, canClear: false }
  ];
  if (ctx.host) {
    rows.push({
      id: 'site',
      name: 'このサイト',
      sub: ctx.host,
      val: settings.siteRules[ctx.host],
      canClear: typeof settings.siteRules[ctx.host] === 'number'
    });
  }
  if (ctx.playlistId) {
    rows.push({
      id: 'playlist',
      name: 'このプレイリスト',
      sub: ctx.playlistTitle || ctx.playlistId,
      val: settings.playlistRules[ctx.playlistId],
      canClear: typeof settings.playlistRules[ctx.playlistId] === 'number'
    });
  }
  if (ctx.videoId) {
    rows.push({
      id: 'video',
      name: 'この動画だけ',
      sub: ctx.videoId,
      val: settings.videoRules[ctx.videoId],
      canClear: typeof settings.videoRules[ctx.videoId] === 'number'
    });
  }
  return rows;
}

function renderScopes() {
  const host = $('scopeList');
  host.innerHTML = '';
  for (const row of scopeRows()) {
    const div = document.createElement('div');
    div.className = 'scope-row' + (scope === row.id ? ' selected' : '');
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('x-btn')) return;
      scope = row.id;
      render();
    });

    const main = document.createElement('div');
    main.className = 'scope-main';
    const n = document.createElement('span');
    n.className = 'scope-name';
    n.textContent = row.name;
    const s = document.createElement('span');
    s.className = 'scope-sub';
    s.textContent = row.sub;
    main.appendChild(n);
    main.appendChild(s);

    const val = document.createElement('span');
    const has = typeof row.val === 'number';
    val.className = 'scope-val' + (has ? ' set' : '');
    val.textContent = has ? fmt(row.val) + 'x' : '未設定';

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x-btn' + (row.canClear ? ' show' : '');
    x.textContent = '×';
    x.title = 'この範囲の設定を解除';
    x.addEventListener('click', () => clearScope(row.id));

    div.appendChild(main);
    div.appendChild(val);
    div.appendChild(x);
    host.appendChild(div);
  }
}

function renderExcludeBlock() {
  const block = $('excludeBlock');
  if (!ctx.playlistId) {
    block.hidden = true;
    return;
  }
  block.hidden = false;
  const entry = settings.excluded[ctx.playlistId];
  $('excludeToggle').checked = !!entry;
  $('excludeLabel').textContent =
    '「' + (ctx.playlistTitle || ctx.playlistId) + '」を除外する';
  $('excludeRate').value = fmt(entry ? entry.rate : 1.0);
}

function learnedCount(pid) {
  let n = 0;
  for (const k of Object.keys(settings.videoPlaylist)) {
    if (settings.videoPlaylist[k] === pid) n++;
  }
  return n;
}

function renderExcludedList() {
  const host = $('excludedList');
  host.innerHTML = '';
  const ids = Object.keys(settings.excluded);
  $('excludedCount').textContent = '(' + ids.length + '件)';

  if (!ids.length) {
    const p = document.createElement('div');
    p.className = 'empty';
    p.textContent = 'まだありません。プレイリストを再生中にこの画面を開いて登録します。';
    host.appendChild(p);
    return;
  }

  ids.sort((a, b) => (settings.excluded[b].addedAt || 0) - (settings.excluded[a].addedAt || 0));

  for (const pid of ids) {
    const entry = settings.excluded[pid];
    const row = document.createElement('div');
    row.className = 'ex-row' + (pid === ctx.playlistId ? ' current' : '');

    const main = document.createElement('div');
    main.className = 'ex-main';

    const name = document.createElement('input');
    name.className = 'ex-name';
    name.type = 'text';
    name.value = entry.title || pid;
    name.title = '名前を編集できます';
    name.addEventListener('change', async () => {
      settings.excluded[pid] = Object.assign({}, entry, { title: name.value.trim() });
      await save({ excluded: settings.excluded });
      render();
    });

    const sub = document.createElement('span');
    sub.className = 'ex-sub';
    sub.textContent = pid + '  /  記憶した動画 ' + learnedCount(pid) + '件';

    main.appendChild(name);
    main.appendChild(sub);

    const rate = document.createElement('input');
    rate.className = 'mini-input';
    rate.type = 'text';
    rate.inputMode = 'decimal';
    rate.value = fmt(entry.rate);
    rate.title = '除外中の再生速度';
    rate.addEventListener('change', async () => {
      const v = clamp(parseFloat(rate.value) || 1);
      settings.excluded[pid] = Object.assign({}, entry, { rate: v });
      await save({ excluded: settings.excluded });
      render();
    });

    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x-btn show';
    x.textContent = '×';
    x.title = '除外を解除';
    x.addEventListener('click', () => removeExcluded(pid));

    row.appendChild(main);
    row.appendChild(rate);
    row.appendChild(x);
    host.appendChild(row);
  }
}

function render() {
  const eff = resolveRate();

  $('power').classList.toggle('off', !settings.enabled);
  $('headRate').classList.toggle('off', !settings.enabled);
  $('headRate').textContent = settings.enabled ? fmt(eff.rate) + 'x' : 'OFF';

  const r = scopeRate();
  // ドラッグ中・入力中は書き戻さない（つまみが跳ねるのを防ぐ）
  if (document.activeElement !== $('slider')) $('slider').value = String(posFromRate(r));
  if (document.activeElement !== $('rateInput')) $('rateInput').value = fmt(r);

  for (const b of $('presets').children) {
    b.classList.toggle('active', Math.abs(parseFloat(b.dataset.rate) - r) < 0.005);
  }

  renderScopes();
  renderExcludeBlock();
  renderExcludedList();
}

/* ---------------------------------------------------------------- */
/* 除外の登録・解除                                                  */
/* ---------------------------------------------------------------- */

async function addExcluded() {
  if (!ctx.playlistId) return;
  const rate = clamp(parseFloat($('excludeRate').value) || 1);
  settings.excluded[ctx.playlistId] = {
    rate: rate,
    title: ctx.playlistTitle || '',
    addedAt: Date.now()
  };
  await save({ excluded: settings.excluded });

  // ページ側に「一覧から動画IDをまとめて拾って」と依頼する
  await save({ bulkRequest: { playlistId: ctx.playlistId, ts: Date.now() } });
  $('bulkNote').textContent = 'このリストの動画を記憶中…';
  render();
}

async function removeExcluded(pid) {
  delete settings.excluded[pid];
  const map = {};
  for (const k of Object.keys(settings.videoPlaylist)) {
    if (settings.videoPlaylist[k] !== pid) map[k] = settings.videoPlaylist[k];
  }
  settings.videoPlaylist = map;
  await save({ excluded: settings.excluded, videoPlaylist: map });
  render();
}

/* ---------------------------------------------------------------- */
/* 操作の割り当て                                                    */
/* ---------------------------------------------------------------- */

let sliderTimer = 0;

function bind() {
  $('power').addEventListener('click', async () => {
    settings.enabled = !settings.enabled;
    await save({ enabled: settings.enabled });
    render();
  });

  $('slider').addEventListener('input', () => {
    const r = rateFromPos(parseInt($('slider').value, 10));
    $('rateInput').value = fmt(r);
    $('headRate').textContent = fmt(r) + 'x';
    clearTimeout(sliderTimer);
    sliderTimer = setTimeout(() => setScopeRate(r), 80);
  });

  $('rateInput').addEventListener('change', () => {
    const v = parseFloat($('rateInput').value);
    if (isNaN(v)) { render(); return; }
    setScopeRate(v);
  });

  for (const b of document.querySelectorAll('.step')) {
    b.addEventListener('click', () => {
      setScopeRate(scopeRate() + parseFloat(b.dataset.delta));
    });
  }

  $('excludeToggle').addEventListener('change', () => {
    if ($('excludeToggle').checked) addExcluded();
    else removeExcluded(ctx.playlistId);
  });

  $('excludeRate').addEventListener('change', async () => {
    if (!ctx.playlistId || !settings.excluded[ctx.playlistId]) return;
    const v = clamp(parseFloat($('excludeRate').value) || 1);
    settings.excluded[ctx.playlistId] =
      Object.assign({}, settings.excluded[ctx.playlistId], { rate: v });
    await save({ excluded: settings.excluded });
    render();
  });

  $('resetAll').addEventListener('click', async () => {
    if (!confirm('すべての設定（既定速度・サイト別・プレイリスト別・除外リスト）を消します。よろしいですか。')) return;
    await new Promise((resolve) => chrome.storage.local.clear(resolve));
    settings = Object.assign({}, DEFAULTS);
    scope = 'default';
    render();
  });

  // ページ側が動画IDをまとめて記憶し終えたら件数を出す
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    for (const k of Object.keys(changes)) {
      if (k in DEFAULTS) {
        const nv = changes[k].newValue;
        settings[k] = nv === undefined ? DEFAULTS[k] : nv;
      }
    }
    if (changes.bulkResult && changes.bulkResult.newValue) {
      const res = changes.bulkResult.newValue;
      $('bulkNote').textContent =
        'このリストの動画を ' + res.count + '件 記憶しました（画面に出ていた分）。';
    }
    render();
  });
}

/* ---------------------------------------------------------------- */
/* 起動                                                              */
/* ---------------------------------------------------------------- */

(async function init() {
  const stored = await new Promise((resolve) => chrome.storage.local.get(null, resolve));
  settings = Object.assign({}, DEFAULTS, stored || {});
  lastContext = (stored && stored.lastContext) || null;
  ctx = await readContext();
  scope = resolveRate().scope;
  if (scope === 'excluded') scope = 'default';

  buildStatic();
  bind();
  render();
})();
