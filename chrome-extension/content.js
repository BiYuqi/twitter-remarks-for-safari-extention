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

  /* ---------- 选项 ----------
   * 目前没有启用的选项;保留读写口,以后加开关直接用。
   * 存储键统一 __opt_ 前缀,不与 @备注 冲突。
   */
  const OPT_DEFAULTS = {};

  function getOpt(k) {
    const v = store['__opt_' + k];
    return v === undefined ? OPT_DEFAULTS[k] : !!v;
  }
  function setOpt(k, v) {
    store['__opt_' + k] = !!v;
    persist();
  }

  function getStyleFor(username) {
    const key = lcIndex.get(username.toLowerCase());
    if (!key) return null;
    const entry = store[key];
    const noteText = typeof entry === 'string' ? entry : (entry && entry.note);
    if (!noteText) return null;
    return {
      text: noteText,
      bg: (entry && entry.color) || store.__style_bgColor || 'var(--xr-accent,#007aff)',
      fontSize: (entry && entry.fontSize) || store.__style_fontSize || '12px',
      radius: (entry && entry.borderRadius) || store.__style_borderRadius || '6px'
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
      return t.closest('[data-xr-edit]');
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
      promptEdit(el.dataset.xrEdit);
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
   * ============================================================ */
  function handleOf(block) {
    let handle = null;
    block.querySelectorAll('span').forEach(function (s) {
      const t = (s.textContent || '').trim();
      if (t.startsWith('@') && t.length > 1 && !/\s/.test(t)) handle = t;
    });
    return handle;
  }

  /* ============================================================
   * 时间线
   * ============================================================ */
  // 向上找到第一个"纵向容器"(block 或 flex-column),把徽章作为其子节点插入,
  // 这样徽章独占一整行,不会和用户名/时间抢同一 flex 行的宽度(否则名字被挤成省略号)
  function findColumnSlot(block) {
    let node = block;
    let depth = 0;
    while (node && node.parentElement && depth < 10) {
      const parent = node.parentElement;
      if (parent === document.body) break;
      let cs;
      try { cs = getComputedStyle(parent); } catch (e) { break; }
      const disp = cs.display || '';
      const isColumn =
        disp === 'block' ||
        ((disp.indexOf('flex') >= 0 || disp.indexOf('grid') >= 0) &&
          (cs.flexDirection || '').indexOf('column') === 0);
      // 该容器必须比当前分支宽,否则说明还在同一行里
      if (isColumn && parent.clientWidth > node.clientWidth * 0.9) {
        return { parent: parent, before: node.nextSibling };
      }
      node = parent;
      depth++;
    }
    return null;
  }

  const badgeOwner = new WeakMap();   // User-Name 区块 -> 它的徽章节点

  function insertTagRow(block, node) {
    const slot = findColumnSlot(block);
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

  function addNotesToTimeline() {
    const main = document.querySelector('main');
    if (!main) return;

    main.querySelectorAll('div[data-testid="User-Name"]').forEach(function (block) {
      const handle = handleOf(block);
      if (!handle) return;
      if (block.dataset.xrHandle === handle) return;

      // 虚拟列表复用节点:先移除这个区块自己的旧徽章,否则会串号
      const old = badgeOwner.get(block);
      if (old && old.parentElement) old.remove();
      badgeOwner.delete(block);

      block.dataset.xrHandle = handle;

      const noteObj = getStyleFor(handle);
      if (!noteObj) return;

      const node = makeTagRow(handle, noteObj);
      if (insertTagRow(block, node)) badgeOwner.set(block, node);
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
  }

  function rerender() {
    document.querySelectorAll('.' + TAG_CLASS).forEach(function (n) { n.remove(); });
    document.querySelectorAll('[data-xr-handle]').forEach(function (n) {
      delete n.dataset.xrHandle;
    });
    renderAll();
  }

  /* ============================================================
   * 观察器
   * ============================================================ */
  let timer = null;
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(renderAll, 250);
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
      accent: '#007aff',
      sec: '#f2f2f7',
      secFg: '#007aff',
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
      accent: '#0a84ff',
      sec: '#2c2c2e',
      secFg: '#0a84ff',
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
    applyTheme(true);
    bindDelegation();          // 先绑委托,后续任何节点都自动生效
    await waitForMain();
    renderAll();
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
