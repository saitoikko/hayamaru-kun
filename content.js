/* Video Speed Controller (Personal) — ページ側の本体
 *
 * 速度の決定順（上が優先）
 *   1. この動画の個別設定   videoRules[videoId]
 *   2. 除外プレイリスト     excluded[playlistId].rate
 *   3. プレイリストの設定   playlistRules[playlistId]
 *   4. サイトの設定         siteRules[host]
 *   5. 全体の既定           defaultRate
 *
 * 外部通信は一切しない。保存先は chrome.storage.local のみ。
 */
(() => {
  'use strict';

  const MIN_RATE = 0.25;   // 最低倍率
  const MAX_RATE = 16.0;   // 最高倍率（4.0 を超えると音声は出ない）
  const KEY_STEP = 0.25;   // D / S キーの増減幅
  const SEEK_SEC = 10;     // Z / X キーのシーク秒数
  const OSD_MS   = 1500;   // 画面表示が消えるまでのミリ秒

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

  const isTop = window.top === window;

  let settings = Object.assign({}, DEFAULTS);
  let ctx = { host: location.hostname, videoId: null, playlistId: null };
  let effectiveRate = 1.0;
  let ready = false;
  const known = new WeakSet();

  const clamp = (r) =>
    Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round(Number(r) * 100) / 100));

  /* ------------------------------------------------------------------
   * 拡張が更新・再読み込み・削除されると、既に開いているページに残った
   * このスクリプトは chrome.* を使えなくなる（コンテキストの無効化）。
   * そのまま動き続けるとエラーを出し続けるので、検知したら自分を止める。
   * ------------------------------------------------------------------ */

  let dead = false;

  function contextAlive() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id && chrome.storage);
    } catch (e) {
      return false;
    }
  }

  function teardown() {
    if (dead) return;
    dead = true;
    try { observer.disconnect(); } catch (e) {}
    try { window.removeEventListener('keydown', onKeyDown, true); } catch (e) {}
    try { if (osdEl) osdEl.remove(); } catch (e) {}
  }

  /* 保存はすべてこの関数を通す */
  function storageSet(patch) {
    if (dead) return;
    if (!contextAlive()) { teardown(); return; }
    try {
      chrome.storage.local.set(patch);
    } catch (e) {
      teardown();
    }
  }

  /* ------------------------------------------------------------------
   * 現在のページの文脈（サイト / 動画ID / プレイリストID）
   * ------------------------------------------------------------------ */

  function parseContext() {
    let url;
    try {
      url = new URL(location.href);
    } catch (e) {
      return { host: location.hostname, videoId: null, playlistId: null };
    }
    const host = url.hostname;
    let videoId = url.searchParams.get('v');
    const playlistId = url.searchParams.get('list');

    if (!videoId) {
      if (host === 'youtu.be') {
        videoId = url.pathname.slice(1) || null;
      } else {
        const m = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
        if (m) videoId = m[1];
      }
    }
    return { host, videoId, playlistId };
  }

  /* プレイリスト名の取得。YouTube の画面構造に依存するので取れないこともある。
   * 取れなければ空文字を返し、ポップアップ側で ID を表示する。 */
  function readPlaylistTitle() {
    const selectors = [
      'ytd-playlist-panel-renderer #header-description a',
      'ytd-playlist-panel-renderer h3 a',
      'ytd-playlist-panel-renderer #playlist-title',
      'ytd-playlist-header-renderer yt-dynamic-sizing-formatted-string',
      'ytd-playlist-header-renderer #text',
      'yt-page-header-renderer h1'
    ];
    for (const sel of selectors) {
      let el = null;
      try { el = document.querySelector(sel); } catch (e) { continue; }
      const t = el && el.textContent ? el.textContent.trim() : '';
      if (t) return t.slice(0, 120);
    }
    return '';
  }

  /* ------------------------------------------------------------------
   * 速度の決定
   * ------------------------------------------------------------------ */

  function resolveRate() {
    const s = settings;
    const host = ctx.host;
    const videoId = ctx.videoId;
    const playlistId = ctx.playlistId;

    if (videoId && typeof s.videoRules[videoId] === 'number') {
      return { rate: s.videoRules[videoId], scope: 'video' };
    }
    // URL に list= が無くても、学習済みの所属から除外判定できる
    const pid = playlistId || (videoId ? s.videoPlaylist[videoId] : null);
    if (pid && s.excluded[pid]) {
      return { rate: s.excluded[pid].rate, scope: 'excluded', playlistId: pid };
    }
    if (playlistId && typeof s.playlistRules[playlistId] === 'number') {
      return { rate: s.playlistRules[playlistId], scope: 'playlist' };
    }
    if (typeof s.siteRules[host] === 'number') {
      return { rate: s.siteRules[host], scope: 'site' };
    }
    return { rate: s.defaultRate, scope: 'default' };
  }

  const SCOPE_LABEL = {
    video: 'この動画',
    excluded: '除外リスト',
    playlist: 'プレイリスト',
    site: 'サイト',
    default: '全体'
  };

  function applyRate(withOsd) {
    if (dead) return;
    if (!settings.enabled) {
      report();
      return;
    }
    const r = resolveRate();
    effectiveRate = clamp(r.rate);
    const videos = document.querySelectorAll('video');
    for (const v of videos) {
      if (v.playbackRate !== effectiveRate) v.playbackRate = effectiveRate;
    }
    report();
    if (withOsd && settings.showOsd) {
      showOsd(effectiveRate.toFixed(2) + 'x', SCOPE_LABEL[r.scope] || '');
    }
  }

  function report() {
    if (!isTop || dead) return;
    if (!contextAlive()) { teardown(); return; }
    try {
      const p = chrome.runtime.sendMessage({
        type: 'rate',
        rate: effectiveRate,
        enabled: settings.enabled
      });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { teardown(); }
  }

  /* プレイヤーが勝手に速度を戻すことがあるので、設定値へ引き戻す */
  function onRateChange(e) {
    if (!ready || !settings.enabled) return;
    const v = e.target;
    if (v.playbackRate !== effectiveRate) v.playbackRate = effectiveRate;
  }

  function syncVideos() {
    const videos = document.querySelectorAll('video');
    for (const v of videos) {
      if (!known.has(v)) {
        known.add(v);
        v.addEventListener('ratechange', onRateChange);
      }
    }
    applyRate(false);
  }

  /* ------------------------------------------------------------------
   * 設定の書き込み（キー操作は「今効いている設定」を上げ下げする）
   * ------------------------------------------------------------------ */

  function writeRate(rate) {
    rate = clamp(rate);
    const r = resolveRate();
    const s = settings;
    const patch = {};

    if (r.scope === 'video') {
      s.videoRules[ctx.videoId] = rate;
      patch.videoRules = s.videoRules;
    } else if (r.scope === 'excluded') {
      const pid = r.playlistId;
      s.excluded[pid] = Object.assign({}, s.excluded[pid], { rate: rate });
      patch.excluded = s.excluded;
    } else if (r.scope === 'playlist') {
      s.playlistRules[ctx.playlistId] = rate;
      patch.playlistRules = s.playlistRules;
    } else if (r.scope === 'site') {
      s.siteRules[ctx.host] = rate;
      patch.siteRules = s.siteRules;
    } else {
      s.defaultRate = rate;
      patch.defaultRate = rate;
    }
    storageSet(patch);
    applyRate(true);
  }

  /* 除外プレイリストを再生中なら、その動画の所属を覚える。
   * 後で検索などから単体で開いた時（URL に list= が無い時）も除外できるようにするため。 */
  function learnMembership() {
    if (!isTop) return;
    const videoId = ctx.videoId;
    const playlistId = ctx.playlistId;
    if (!videoId || !playlistId) return;
    if (!settings.excluded[playlistId]) return;
    if (settings.videoPlaylist[videoId] === playlistId) return;
    settings.videoPlaylist[videoId] = playlistId;
    storageSet({ videoPlaylist: settings.videoPlaylist });
  }

  /* 現在の文脈をポップアップへ渡す（ポップアップは DOM を読めないため）。
   * URL 全体は保存しない。機能に必要なのはホスト名・動画ID・プレイリストIDだけで、
   * URL を残すと閲覧履歴を保持することになるため。 */
  function publishContext() {
    if (!isTop || dead) return;
    storageSet({
      lastContext: {
        host: ctx.host,
        videoId: ctx.videoId,
        playlistId: ctx.playlistId,
        playlistTitle: ctx.playlistId ? readPlaylistTitle() : '',
        ts: Date.now()
      }
    });
  }

  /* ポップアップから「このプレイリストの動画をまとめて登録して」と頼まれた時の処理。
   * 画面に読み込まれている分しか取れない（長いリストは全部は取れない）。 */
  function handleBulkRequest(req) {
    if (!isTop || !req || !req.playlistId) return;
    if (req.playlistId !== ctx.playlistId) return;
    // プレイリストIDは URL 由来＝外部サイトが仕込める値。
    // 下でセレクタの文字列に埋め込むので、形式を検証してから使う。
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(req.playlistId)) return;

    const ids = new Set();
    let anchors = [];
    try {
      anchors = document.querySelectorAll('a[href*="list=' + req.playlistId + '"]');
    } catch (e) { return; }

    for (const a of anchors) {
      try {
        const u = new URL(a.href, location.origin);
        const v = u.searchParams.get('v');
        if (v) ids.add(v);
      } catch (e) { /* URL として解釈できないものは無視 */ }
    }
    if (!ids.size) return;

    const map = Object.assign({}, settings.videoPlaylist);
    ids.forEach((id) => { map[id] = req.playlistId; });
    settings.videoPlaylist = map;
    storageSet({
      videoPlaylist: map,
      bulkResult: { playlistId: req.playlistId, count: ids.size, ts: Date.now() }
    });
  }

  /* ------------------------------------------------------------------
   * キーボード
   * ------------------------------------------------------------------ */

  function deepActiveElement() {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) {
      el = el.shadowRoot.activeElement;
    }
    return el;
  }

  function isTypingTarget(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  function pickVideo() {
    const videos = Array.prototype.slice.call(document.querySelectorAll('video'));
    if (!videos.length) return null;
    const playing = videos.filter((v) => !v.paused && !v.ended);
    const pool = playing.length ? playing : videos;
    return pool.reduce((best, v) =>
      v.clientWidth * v.clientHeight > best.clientWidth * best.clientHeight ? v : best
    );
  }

  function seek(video, sec) {
    const t = video.currentTime + sec;
    video.currentTime = isFinite(video.duration)
      ? Math.max(0, Math.min(video.duration, t))
      : Math.max(0, t);
    if (settings.showOsd) showOsd((sec > 0 ? '+' : '') + sec + '秒', '');
  }

  function onKeyDown(e) {
    if (dead || !ready || !settings.enabled || !settings.keysEnabled) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;      // ブラウザ標準の操作を邪魔しない
    if (e.isComposing || e.keyCode === 229) return;      // 日本語入力の変換中
    if (isTypingTarget(deepActiveElement())) return;     // 入力欄では無効

    const key = (e.key || '').toLowerCase();
    if (key !== 'd' && key !== 's' && key !== 'r' && key !== 'z' && key !== 'x') return;

    const video = pickVideo();
    if (!video) return;

    if (key === 'd') writeRate(effectiveRate + KEY_STEP);
    else if (key === 's') writeRate(effectiveRate - KEY_STEP);
    else if (key === 'r') writeRate(1.0);
    else if (key === 'z') seek(video, -SEEK_SEC);
    else if (key === 'x') seek(video, SEEK_SEC);

    e.preventDefault();
    e.stopPropagation();
  }

  window.addEventListener('keydown', onKeyDown, true);

  /* ------------------------------------------------------------------
   * 画面左上の表示
   * ------------------------------------------------------------------ */

  let osdEl = null;
  let osdTimer = 0;

  function showOsd(main, sub) {
    // 全画面表示中は、その要素の中に入れないと描画されない
    const host = document.fullscreenElement || document.body || document.documentElement;
    if (!host) return;

    if (!osdEl) {
      osdEl = document.createElement('div');
      osdEl.style.cssText =
        'position:fixed;top:16px;left:16px;z-index:2147483647;' +
        'padding:6px 12px;border-radius:6px;' +
        'background:rgba(0,0,0,.8);color:#fff;' +
        'font:bold 18px/1.35 system-ui,sans-serif;pointer-events:none;' +
        'transition:opacity .2s;opacity:0;white-space:nowrap';
    }
    if (osdEl.parentNode !== host) host.appendChild(osdEl);

    osdEl.textContent = sub ? main + '  (' + sub + ')' : main;
    osdEl.style.opacity = '1';
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => { if (osdEl) osdEl.style.opacity = '0'; }, OSD_MS);
  }

  /* ------------------------------------------------------------------
   * 監視（新しい動画・SPA によるURL変更）
   * ------------------------------------------------------------------ */

  let lastUrl = location.href;

  function checkUrl() {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    ctx = parseContext();
    learnMembership();
    applyRate(false);
    publishContext();
    setTimeout(publishContext, 1500);   // プレイリスト名は遅れて描画される
  }

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (dead) return;
      checkUrl();
      syncVideos();
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('play', (e) => {
    if (e.target instanceof HTMLVideoElement) syncVideos();
  }, true);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) publishContext();
  });
  window.addEventListener('focus', publishContext);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (dead || area !== 'local') return;
    try {
    const keys = Object.keys(changes);
    for (const key of keys) {
      if (key in DEFAULTS) {
        const nv = changes[key].newValue;
        settings[key] = nv === undefined ? DEFAULTS[key] : nv;
      }
    }
    if (changes.bulkRequest) handleBulkRequest(changes.bulkRequest.newValue);
    applyRate(false);
    } catch (e) { teardown(); }
  });

  /* ------------------------------------------------------------------
   * 起動
   * ------------------------------------------------------------------ */

  try {
  chrome.storage.local.get(null, (stored) => {
    try {
    if (chrome.runtime.lastError) { teardown(); return; }
    settings = Object.assign({}, DEFAULTS, stored || {});
    ctx = parseContext();
    ready = true;
    syncVideos();
    learnMembership();
    publishContext();
    setTimeout(publishContext, 1500);
    setTimeout(publishContext, 4000);
    } catch (e) { teardown(); }
  });
  } catch (e) { teardown(); }
})();
