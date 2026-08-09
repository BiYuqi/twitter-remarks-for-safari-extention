/* ============================================================
 * X Remarks — 内容脚本
 * 在 X(Twitter)的用户名下方显示本地备注,点击药丸即可编辑。
 * 数据存 chrome.storage.local(不是 localStorage),清站点数据不会丢,
 * 也能被扩展弹窗直接读写。
 * ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'x_remarks_v1';
  const TAG_CLASS = 'xr-note-tag';
  const ADD_CLASS = 'xr-add-btn';

  /* ============================================================
   * 存储层
   *   "@user": "备注文字"
   *   "@user": { note:"备注", color:"#hex", fontSize:"12px", borderRadius:"6px" }
   * 全局样式:__style_bgColor / __style_fontSize / __style_borderRadius
   * ============================================================ */
  let store = {};
  let lcIndex = new Map();
  let selfWriteAt = 0;   // 自己写入的时间戳,用来忽略自己触发的 onChanged

  function rebuildIndex() {
    lcIndex = new Map();
    for (const k of Object.keys(store)) {
      if (k.startsWith('@')) lcIndex.set(k.toLowerCase(), k);
    }
  }

  async function loadStore() {
    let res = {};
    try { res = await chrome.storage.local.get(STORAGE_KEY); } catch (e) {}
    if (res && res[STORAGE_KEY]) {
      store = res[STORAGE_KEY];
    } else {
      // background 的 onInstalled 正常会种入;这里兜底(比如手动清空过 storage)
      store = Object.assign({}, self.XR_DEFAULT_REMARKS || {});
      persist();
    }
    rebuildIndex();
    loadSettings();
  }

  function persist() {
    selfWriteAt = Date.now();
    // 扩展被重新加载后旧的 content script 会失联(context invalidated),
    // 同步抛错和异步 reject 两条路都要接住,否则会冒到控制台
    try {
      const p = chrome.storage.local.set({ [STORAGE_KEY]: store });
      if (p && p.catch) p.catch(function () { toast('扩展已更新,请刷新页面'); });
    } catch (e) {
      toast('扩展已更新,请刷新页面');
    }
  }

  /* ---------- 设置 ----------
   * 存在 store 的 __settings 键里(不是单独的 storage key):
   * 这样导出的 JSON 依然是一份扁平对象,和 iOS userscript 版互相导入不会丢东西 ——
   * 那边只认 @ 开头的键,__settings 会被原样保留。
   */
  const SETTINGS_KEY = '__settings';
  let settings = {};

  function loadSettings() {
    const d = self.XR_DEFAULT_SETTINGS || {};
    settings = Object.assign({}, d, store[SETTINGS_KEY] || {});
    if (!Array.isArray(settings.rules)) settings.rules = d.rules || [];
    ruleCache.clear();
  }

  function applySettings() {
    document.documentElement.classList.toggle('xr-hide-ads', !!settings.hideAds);
    document.documentElement.style.setProperty(
      '--xr-dim', String(settings.dimOpacity == null ? 0.32 : settings.dimOpacity)
    );
    // 推广趋势是用内联 display 收掉的,关掉开关得手动放回来(CSS 那部分自己会跟)
    if (!settings.hideAds) {
      document.querySelectorAll('div[data-testid="trend"]').forEach(function (el) {
        if (el.style.display === 'none') el.style.display = '';
      });
    }
  }

  /* ---------- 规则:关键词 -> 颜色 / 是否算噪音 ----------
   * 按顺序匹配,第一条命中的生效。备注文案是有限的几十种,匹配结果直接缓存,
   * 滚动时不会反复做字符串查找。
   */
  const ruleCache = new Map();

  function ruleFor(noteText) {
    if (!noteText) return null;
    if (ruleCache.has(noteText)) return ruleCache.get(noteText);
    const hit = self.XR_ruleFor ? self.XR_ruleFor(noteText, settings.rules) : null;
    ruleCache.set(noteText, hit);
    return hit;
  }

  function getStyleFor(username) {
    const key = lcIndex.get(username.toLowerCase());
    if (!key) return null;
    const entry = store[key];
    const noteText = typeof entry === 'string' ? entry : (entry && entry.note);
    if (!noteText) return null;
    const rule = ruleFor(noteText);
    return {
      text: noteText,
      // 单条自定义色 > 规则色 > 全局色 > 跟随主题
      bg: (entry && entry.color) || (rule && rule.color) ||
        store.__style_bgColor || 'var(--xr-accent,#1d9bf0)',
      fontSize: (entry && entry.fontSize) || store.__style_fontSize || '12px',
      radius: (entry && entry.borderRadius) || store.__style_borderRadius || '6px',
      noise: !!(rule && rule.noise)
    };
  }

  function setNote(username, note) {
    const existingKey = lcIndex.get(username.toLowerCase());
    note = (note || '').trim();
    if (!note) {
      if (existingKey) delete store[existingKey];
    } else {
      const key = existingKey || username;
      const old = store[key];
      if (old && typeof old === 'object') old.note = note;
      else store[key] = note;
    }
    rebuildIndex();
    persist();
    rerender();
  }

  /* ---------- 其它页面/弹窗改了数据 -> 本页跟着更新 ---------- */
  function watchStorage() {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      if (Date.now() - selfWriteAt < 400) return;   // 自己刚写的,跳过
      store = changes[STORAGE_KEY].newValue || {};
      rebuildIndex();
      loadSettings();
      applySettings();
      rerender();
    });
  }

  /* ---------- 轻提示 ---------- */
  let toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'xr-toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.style.opacity = '0'; }, 1800);
  }

  /* ---------- 自建编辑弹窗 ----------
   * 不用 window.prompt:它会阻塞页面、样式不可控,而且和 X 的键盘快捷键打架。
   */
  let editBox = null, editInput = null, editTitle = null, editTarget = null;

  function buildEditor() {
    editBox = document.createElement('div');
    editBox.id = 'xr-edit';
    editBox.innerHTML =
      '<div class="box">' +
      '<div class="t"></div>' +
      '<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" />' +
      '<div class="row">' +
      '<button type="button" data-eact="save">保存</button>' +
      '<button type="button" class="sec" data-eact="del">删除</button>' +
      '<button type="button" class="sec" data-eact="cancel">取消</button>' +
      '</div></div>';
    document.body.appendChild(editBox);
    editInput = editBox.querySelector('input');
    editTitle = editBox.querySelector('.t');

    editBox.addEventListener('click', function (e) {
      if (e.target === editBox) { closeEditor(); return; }
      const b = e.target.closest && e.target.closest('[data-eact]');
      if (!b) return;
      e.stopPropagation();
      const a = b.dataset.eact;
      if (a === 'cancel') { closeEditor(); return; }
      if (a === 'del') { const u = editTarget; closeEditor(); setNote(u, ''); toast('已删除备注'); return; }
      const u = editTarget, v = editInput.value;
      closeEditor();
      setNote(u, v);
      toast(v.trim() ? '已保存' : '已删除备注');
    }, true);

    // X 有一堆单键快捷键(j/k/n/l...),输入时必须把键盘事件挡在弹窗里
    ['keydown', 'keyup', 'keypress'].forEach(function (type) {
      editBox.addEventListener(type, function (e) { e.stopPropagation(); }, true);
    });

    editInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const u = editTarget, v = editInput.value;
        closeEditor();
        setNote(u, v);
        toast(v.trim() ? '已保存' : '已删除备注');
      } else if (e.key === 'Escape') {
        closeEditor();
      }
    });
  }

  function closeEditor() {
    if (editBox) editBox.style.display = 'none';
    editTarget = null;
  }

  function promptEdit(username) {
    if (!username) return;
    if (!editBox) buildEditor();
    editTarget = username;
    const cur = getStyleFor(username);
    editTitle.textContent = '备注 ' + username;
    editInput.value = cur ? cur.text : '';
    editBox.style.display = 'flex';
    setTimeout(function () {
      try { editInput.focus(); editInput.select(); } catch (e) {}
    }, 60);
  }

  /* ============================================================
   * 全局事件委托 —— 不给每个徽章单独绑监听。
   * X 的 React 会不断替换/回收 DOM 节点,节点一被换掉,挂在它身上的监听就没了。
   * 委托只认 data-xr-edit 属性,节点怎么换都不受影响。
   * 挂在 window 而不是 document:X 的脚本先加载,它在 document 上的监听排在前面,
   * 一旦调用 stopImmediatePropagation 就收不到事件(症状:SPA 路由切换后突然失效)。
   * 按下阶段只 stopPropagation,不 preventDefault —— 后者会连点击手势一起取消。
   * ============================================================ */
  function bindDelegation() {
    const findTarget = function (e) {
      const t = e.target;
      if (!t || !t.closest) return null;
      return t.closest('[data-xr-edit],[data-xr-fold]');
    };

    const ROOT = window;

    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (type) {
      ROOT.addEventListener(type, function (e) {
        if (findTarget(e)) e.stopPropagation();
      }, true);
    });

    let busy = false;
    function fire(el, e) {
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (busy) return;
      busy = true;
      setTimeout(function () { busy = false; }, 500);
      if (el.dataset.xrFold !== undefined) expandArticle(el);
      else promptEdit(el.dataset.xrEdit);
    }

    ['click', 'pointerup', 'touchend'].forEach(function (type) {
      ROOT.addEventListener(type, function (e) {
        const el = findTarget(e);
        if (!el) return;
        if (type === 'click' && e.cancelable) e.preventDefault();
        fire(el, e);
      }, true);
    });

    // 元素级兜底:万一 X 在中途某个祖先的冒泡阶段拦截,目标阶段仍会先触发
    window.__xrFire = fire;
  }

  function bindDirect(el, username) {
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.__xrFire) window.__xrFire(el, e);
      else if (el.dataset.xrFold !== undefined) expandArticle(el);
      else promptEdit(username);
    }, false);
  }

  /* ============================================================
   * 徽章:独占一行 + 抬高 z-index,避免被 X 的整格点击覆盖层挡住
   * ============================================================ */
  function makeTagRow(username, noteObj) {
    const row = document.createElement('div');
    row.className = TAG_CLASS;
    row.dataset.handle = username;
    row.dataset.xrFor = username;
    row.style.cssText =
      'display:block;width:100%;flex-basis:100%;box-sizing:border-box;' +
      'margin:4px 0 5px;line-height:1.4;position:relative;z-index:9998;clear:both;';

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.dataset.xrEdit = username;             // 委托靠这个属性识别
    pill.title = '点击编辑备注';
    pill.textContent = noteObj.text;            // 无 emoji 前缀
    pill.style.cssText =
      'display:inline-block;background:' + noteObj.bg + ';color:#fff;font-weight:700;' +
      'font-size:' + noteObj.fontSize + ';padding:3px 9px;border-radius:' + noteObj.radius + ';' +
      'white-space:normal;word-break:break-word;max-width:100%;text-align:left;' +
      'border:none;margin:0;font-family:inherit;line-height:1.35;' +
      'cursor:pointer;position:relative;z-index:9999;pointer-events:auto;' +
      '-webkit-appearance:none;appearance:none;user-select:none;';

    bindDirect(pill, username);
    row.appendChild(pill);
    return row;
  }

  function makeAddRow(username) {
    const row = document.createElement('div');
    row.className = TAG_CLASS;
    row.style.cssText =
      'display:block;width:100%;margin:5px 0 6px;position:relative;z-index:9998;';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = ADD_CLASS;
    btn.dataset.xrEdit = username;
    btn.textContent = '＋ 备注';
    bindDirect(btn, username);
    row.appendChild(btn);
    return row;
  }

  /* ============================================================
   * 取 @handle
   * 优先读链接的 href(/handle、/handle/status/123 都能取到):
   * 比扫 span 快得多,而且不会被"显示名里写了 @xxx"的用户骗到 —— 扫 span
   * 取的是最后一个 @ 开头的文本,那种用户会挂到错误的 handle 上。
   * 个人主页的 UserName 区块里 handle 可能不是链接,所以保留扫 span 兜底。
   * ============================================================ */

  // X 的一级路径保留字,不是用户名
  const RESERVED_PATHS = new Set([
    'home', 'explore', 'notifications', 'messages', 'search', 'settings',
    'compose', 'intent', 'hashtag', 'i', 'login', 'logout', 'signup',
    'about', 'tos', 'privacy', 'download', 'account', 'topics', 'lists',
    'bookmarks', 'jobs', 'premium_sign_up', 'share'
  ]);

  function handleFromHref(href) {
    if (!href) return null;
    const m = String(href).match(
      /^(?:https?:\/\/(?:www\.)?(?:x|twitter)\.com)?\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/
    );
    if (!m) return null;
    if (RESERVED_PATHS.has(m[1].toLowerCase())) return null;
    return '@' + m[1];
  }

  // 扫 span 找 @handle 文本节点(兜底 + UserCell 定位插入点用)
  function handleSpanOf(block) {
    let found = null;
    block.querySelectorAll('span').forEach(function (s) {
      const t = (s.textContent || '').trim();
      if (t.startsWith('@') && t.length > 1 && !/\s/.test(t)) found = s;
    });
    return found;
  }

  function handleOf(block) {
    const links = block.querySelectorAll('a[href]');
    for (let i = 0; i < links.length; i++) {
      const h = handleFromHref(links[i].getAttribute('href'));
      if (h) return h;
    }
    const span = handleSpanOf(block);
    return span ? (span.textContent || '').trim() : null;
  }

  /* ============================================================
   * 插入位置
   * ============================================================ */
  // 向上找到第一个"纵向容器"(block 或 flex-column),把徽章作为其子节点插入,
  // 这样徽章独占一整行,不会和用户名/时间抢同一 flex 行的宽度(否则名字被挤成省略号)。
  //
  // getComputedStyle 会强制样式重算,放在滚动热路径里每个徽章最多 10 次太贵。
  // X 的 DOM 结构在同一种场景下是稳定的,所以按场景(timeline/usercell/…)缓存
  // "要向上爬几层",命中后只做一次校验;结构变了校验会失败,自动退回全量扫描并重新缓存。
  const slotDepthCache = new Map();

  function isColumnSlot(parent, node) {
    if (!parent || parent === document.body) return false;
    let cs;
    try { cs = getComputedStyle(parent); } catch (e) { return false; }
    const disp = cs.display || '';
    const isColumn =
      disp === 'block' ||
      ((disp.indexOf('flex') >= 0 || disp.indexOf('grid') >= 0) &&
        (cs.flexDirection || '').indexOf('column') === 0);
    // 该容器必须比当前分支宽,否则说明还在同一行里
    return isColumn && parent.clientWidth > node.clientWidth * 0.9;
  }

  function findColumnSlot(block, ctx) {
    // 快路径:用缓存的层数直接定位,只校验一次
    const cached = ctx != null ? slotDepthCache.get(ctx) : undefined;
    if (cached !== undefined) {
      let node = block;
      for (let i = 0; i < cached && node.parentElement; i++) node = node.parentElement;
      const parent = node.parentElement;
      if (isColumnSlot(parent, node)) return { parent: parent, before: node.nextSibling };
      slotDepthCache.delete(ctx);   // 结构变了,作废重来
    }

    let node = block;
    let depth = 0;
    while (node && node.parentElement && depth < 10) {
      const parent = node.parentElement;
      if (parent === document.body) break;
      if (isColumnSlot(parent, node)) {
        if (ctx != null) slotDepthCache.set(ctx, depth);
        return { parent: parent, before: node.nextSibling };
      }
      node = parent;
      depth++;
    }
    return null;
  }

  const badgeOwner = new WeakMap();   // 用户区块 -> 它的徽章节点

  function insertTagRow(block, node, ctx) {
    const slot = findColumnSlot(block, ctx);
    if (slot) {
      slot.parent.insertBefore(node, slot.before);
      return true;
    }
    // 兜底:留在原地,但补足左边距,别贴着时间
    node.style.display = 'inline-block';
    node.style.width = 'auto';
    node.style.margin = '0 0 0 8px';
    const row = block.parentElement;
    if (row && row.parentElement) {
      row.parentElement.insertBefore(node, row.nextSibling);
      return true;
    }
    return false;
  }

  /* ============================================================
   * 渲染:时间线 + 用户列表
   * 根用 document 而不是 main —— 关注/粉丝列表、转发者列表这些是
   * div[role="dialog"] 弹层,在 main 外面,只扫 main 会漏掉。
   * ============================================================ */
  /* ---------- 降噪:命中 noise 规则的作者,整条推文按设置处理 ----------
   * 一律作用在 article 上,不碰外面的 cellInnerDiv:X 的虚拟列表用绝对定位摆放
   * 每个 cell,直接隐藏 cell 会留下一个空洞;隐藏 article 让 cell 高度塌成 0,
   * X 自己的 ResizeObserver 会把位置重排,空隙自然合上(广告拦截器也是这么干的)。
   */
  function clearNoise(article) {
    article.classList.remove('xr-dim', 'xr-hidden', 'xr-collapsed');
    const bar = article.querySelector(':scope > .xr-fold-bar');
    if (bar) bar.remove();
    delete article.dataset.xrNoise;
  }

  function makeFoldBar(handle, noteObj) {
    const bar = document.createElement('div');
    bar.className = 'xr-fold-bar';
    bar.dataset.xrFold = handle;      // 委托靠这个属性识别

    const h = document.createElement('span');
    h.className = 'h';
    h.textContent = handle;

    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = noteObj.text;
    if (noteObj.bg) n.style.background = noteObj.bg;

    const x = document.createElement('span');
    x.className = 'x';
    x.textContent = '展开';

    bar.append(h, n, x);
    bindDirect(bar, handle);
    return bar;
  }

  function applyNoise(block, handle, noteObj) {
    const article = block.closest('article');
    if (!article) return;
    // 只对推文作者生效。引用推文里也有 User-Name,不能因为被引用的人上了黑名单
    // 就把整条推文折叠掉 —— 作者的 User-Name 是 article 里的第一个。
    if (article.querySelector('div[data-testid="User-Name"]') !== block) return;

    clearNoise(article);   // 节点被回收复用时,先把上一位的处理撤干净

    const mode = settings.noiseMode || 'off';
    if (!noteObj || !noteObj.noise || mode === 'off') return;

    article.dataset.xrNoise = handle;
    if (mode === 'hide') { article.classList.add('xr-hidden'); return; }
    if (mode === 'dim') { article.classList.add('xr-dim'); return; }
    if (mode === 'collapse') {
      article.classList.add('xr-collapsed');
      article.appendChild(makeFoldBar(handle, noteObj));
    }
  }

  // 兜底清理:article 被回收成了压根没有 User-Name 的东西(广告位、推荐模块…),
  // decorate 不会再碰它,降噪状态就会赖着不走。只扫已降噪的那几个节点,很便宜。
  function sweepNoise() {
    document.querySelectorAll('article[data-xr-noise]').forEach(function (a) {
      if (!a.querySelector('div[data-testid="User-Name"]')) clearNoise(a);
    });
  }

  function expandArticle(el) {
    const article = el.closest('article');
    if (!article) return;
    article.classList.remove('xr-collapsed');
    const bar = article.querySelector(':scope > .xr-fold-bar');
    if (bar) bar.remove();
    // 留着 data-xr-noise,下次 rerender 还能被清理到
  }

  function decorate(block, ctx, anchorFn) {
    const handle = handleOf(block);
    if (!handle) return;
    if (block.dataset.xrHandle === handle) return;

    // 虚拟列表复用节点:先移除这个区块自己的旧徽章,否则会串号
    const old = badgeOwner.get(block);
    if (old && old.parentElement) old.remove();
    badgeOwner.delete(block);

    block.dataset.xrHandle = handle;

    const noteObj = getStyleFor(handle);
    // 注意:noteObj 为空也要走一遍,否则回收复用的节点会留着上一位的降噪状态
    if (ctx === 'timeline') applyNoise(block, handle, noteObj);
    if (!noteObj) return;

    const anchor = (anchorFn && anchorFn(block)) || block;
    const node = makeTagRow(handle, noteObj);
    if (insertTagRow(anchor, node, ctx)) badgeOwner.set(block, node);
  }

  function addNotesToTimeline() {
    document.querySelectorAll('div[data-testid="User-Name"]').forEach(function (block) {
      decorate(block, 'timeline');
    });
  }

  /* ---------- 推广内容 ----------
   * 信息流里的推广推文外层挂着 data-testid="placementTracking",纯 CSS 就能收掉
   * (见 content.css,由 html.xr-hide-ads 控制),这里只处理需要看文字才能认出来的
   * 推广趋势。趋势一共十来个节点,每轮扫一遍不值一提。
   */
  const PROMO_TEXT = /promoted|推广|廣告/i;

  function hidePromotedTrends() {
    if (!settings.hideAds) return;
    document.querySelectorAll('div[data-testid="trend"]').forEach(function (el) {
      if (PROMO_TEXT.test(el.textContent || '')) el.style.display = 'none';
    });
  }

  // 关注/粉丝列表、"你可能感兴趣"侧栏、搜索的用户 tab、转发者列表:
  // 这些用 UserCell,里面没有 User-Name。从 @handle 那个 span 起找纵向容器,
  // 徽章正好落在 handle 行下面、简介上面。
  // 注意:UserCell 不一定是 div —— "认识的关注者"(followers_you_follow)这类
  // 整行可点的列表里,X 把它做成了 <button data-testid="UserCell">,
  // 之前用 div[data-testid="UserCell"] 选择器会漏掉,导致该页面完全不显示备注。
  function addNotesToUserCells() {
    document.querySelectorAll('[data-testid="UserCell"]').forEach(function (cell) {
      decorate(cell, 'usercell', function (c) {
        const span = handleSpanOf(c);
        return span ? span.parentElement : null;
      });
    });
  }

  /* ============================================================
   * 个人主页:唯一编辑入口
   * ============================================================ */
  function addProfileNote() {
    const userInfo = document.querySelector('div[data-testid="UserName"]');
    if (!userInfo) return;

    const username = handleOf(userInfo);
    if (!username) return;
    if (userInfo.dataset.xrHandle === username) return;

    userInfo.querySelectorAll('.' + TAG_CLASS).forEach(function (n) { n.remove(); });
    userInfo.dataset.xrHandle = username;

    const noteObj = getStyleFor(username);
    userInfo.appendChild(noteObj ? makeTagRow(username, noteObj) : makeAddRow(username));
  }

  function renderAll() {
    addProfileNote();
    addNotesToTimeline();
    addNotesToUserCells();
    sweepNoise();
    hidePromotedTrends();
  }

  function rerender() {
    document.querySelectorAll('.' + TAG_CLASS).forEach(function (n) { n.remove(); });
    document.querySelectorAll('[data-xr-noise]').forEach(clearNoise);
    document.querySelectorAll('[data-xr-handle]').forEach(function (n) {
      delete n.dataset.xrHandle;
    });
    renderAll();
  }

  /* ============================================================
   * 观察器
   * ============================================================ */
  // 带上限的防抖。纯 trailing 防抖会被饿死:X 上只要有自动播放的视频、
  // "显示 N 条新帖"的计数器或者加载中的骨架屏在持续吐 mutation,定时器就一直
  // 被 clearTimeout 推后,renderAll 永远不执行(症状:滚半天不出药丸,随手一点又好了)。
  // 距上次执行超过 MAX_WAIT 就强制跑一次。
  const IDLE_WAIT = 250;
  const MAX_WAIT = 800;
  let timer = null;
  let lastRun = 0;

  function runRender() {
    if (timer) { clearTimeout(timer); timer = null; }
    lastRun = Date.now();
    renderAll();
  }

  function schedule() {
    const waited = Date.now() - lastRun;
    if (waited >= MAX_WAIT) { runRender(); return; }
    if (timer) clearTimeout(timer);
    timer = setTimeout(runRender, Math.min(IDLE_WAIT, MAX_WAIT - waited));
  }

  function watchRouteChange() {
    let lastPath = location.pathname;
    setInterval(function () {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        setTimeout(rerender, 500);
      }
      applyTheme();   // 顺带跟随 X 的主题切换(浅色/暗淡/全黑)
    }, 600);
  }

  /* ============================================================
   * 主题:只做浅色 / 暗色两套
   * X 把当前主题写在 data-theme 上,直接读它,比算背景色亮度可靠。
   * ============================================================ */
  function detectTheme() {
    const nodes = [document.documentElement, document.body];
    for (let i = 0; i < nodes.length; i++) {
      if (!nodes[i]) continue;
      const v = (nodes[i].getAttribute('data-theme') || '').toLowerCase();
      if (!v) continue;
      // dark / dim / lightsout 都归为暗色
      if (v.indexOf('light') === 0 && v.indexOf('lightsout') !== 0) return 'light';
      return 'dark';
    }
    // 兜底:读背景色亮度
    let bg = null;
    for (let i = 0; i < nodes.length; i++) {
      if (!nodes[i]) continue;
      const m = String(getComputedStyle(nodes[i]).backgroundColor).match(/rgba?\(([^)]+)\)/);
      if (!m) continue;
      const c = m[1].split(',').map(parseFloat);
      if (c.length > 3 && c[3] === 0) continue;
      bg = c; break;
    }
    if (!bg) return 'light';
    return (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255 > 0.5 ? 'light' : 'dark';
  }

  const THEMES = {
    light: {
      scheme: 'light',
      overlay: 'rgba(0,0,0,.28)',
      bg: '#ffffff',
      fg: '#1c1c1e',
      muted: 'rgba(60,60,67,.6)',
      border: 'transparent',
      shadow: '0 12px 40px rgba(0,0,0,.18)',
      input: '#f2f2f7',
      inputFg: '#1c1c1e',
      inputBorder: 'rgba(60,60,67,.15)',
      // 用 X 自己的品牌蓝,不用 iOS 蓝 —— 两种蓝并置在同一个界面里最难看
      accent: '#1d9bf0',
      sec: '#eff3f4',
      secFg: '#1d9bf0',
      hover: 'rgba(15,20,25,.06)',
      toastBg: 'rgba(28,28,30,.92)',
      toastFg: '#ffffff'
    },
    dark: {
      scheme: 'dark',
      overlay: 'rgba(0,0,0,.6)',
      bg: '#1c1c1e',
      fg: '#ffffff',
      muted: 'rgba(235,235,245,.6)',
      border: 'rgba(84,84,88,.5)',
      shadow: '0 12px 40px rgba(0,0,0,.5)',
      input: '#2c2c2e',
      inputFg: '#ffffff',
      inputBorder: 'rgba(84,84,88,.5)',
      accent: '#1d9bf0',
      sec: '#2c2c2e',
      secFg: '#1d9bf0',
      hover: 'rgba(239,243,244,.1)',
      toastBg: 'rgba(58,58,60,.95)',
      toastFg: '#ffffff'
    }
  };

  let curTheme = '';
  function applyTheme(force) {
    const mode = detectTheme();
    if (mode === curTheme && !force) return;
    curTheme = mode;
    const T = THEMES[mode];
    const root = document.documentElement.style;
    root.setProperty('--xr-scheme', T.scheme);
    root.setProperty('--xr-overlay', T.overlay);
    root.setProperty('--xr-bg', T.bg);
    root.setProperty('--xr-fg', T.fg);
    root.setProperty('--xr-muted', T.muted);
    root.setProperty('--xr-border', T.border);
    root.setProperty('--xr-shadow', T.shadow);
    root.setProperty('--xr-input', T.input);
    root.setProperty('--xr-input-fg', T.inputFg);
    root.setProperty('--xr-input-border', T.inputBorder);
    root.setProperty('--xr-accent', T.accent);
    root.setProperty('--xr-sec', T.sec);
    root.setProperty('--xr-sec-fg', T.secFg);
    root.setProperty('--xr-toast-bg', T.toastBg);
    root.setProperty('--xr-toast-fg', T.toastFg);
    root.setProperty('--xr-hover', T.hover);
    publishTheme(mode);
  }

  /* 把当前主题告诉弹窗 —— 弹窗自己是独立页面,读不到 X 的 data-theme,
   * 只能跟系统的 prefers-color-scheme。你在系统浅色下用 X 的暗色模式时,
   * 两边就会一黑一白。单独存一个 key,不进 STORAGE_KEY,导出的 JSON 不受影响。 */
  const THEME_KEY = 'x_remarks_theme';
  let publishedTheme = '';
  function publishTheme(mode) {
    if (mode === publishedTheme) return;
    publishedTheme = mode;
    try {
      const p = chrome.storage.local.set({ [THEME_KEY]: mode });
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  /* ============================================================
   * 启动
   * ============================================================ */
  function waitForMain() {
    return new Promise(function (resolve) {
      (function check() {
        if (document.querySelector('main')) resolve();
        else setTimeout(check, 200);
      })();
    });
  }

  async function init() {
    await loadStore();
    watchStorage();
    applySettings();
    applyTheme(true);
    bindDelegation();          // 先绑委托,后续任何节点都自动生效
    await waitForMain();
    runRender();
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true
    });
    watchRouteChange();

    // data-theme 是离散属性,直接监听比轮询更即时
    const themeObs = new MutationObserver(function () { applyTheme(); });
    themeObs.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme']
    });
    if (document.body) {
      themeObs.observe(document.body, {
        attributes: true, attributeFilter: ['data-theme']
      });
    }

    console.log('[XR] 已加载 ' + lcIndex.size + ' 条备注, 主题 ' + curTheme);
  }

  if (document.body) init();
  else window.addEventListener('DOMContentLoaded', init);
})();
