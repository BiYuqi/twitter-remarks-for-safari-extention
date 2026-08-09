/* 扩展弹窗:备注列表 / 规则 / 设置
 * 数据结构与 userscript 版兼容:一份扁平 JSON,@handle 是备注,
 * __settings 是本扩展的设置(userscript 那边读不懂但会原样保留)。 */

const STORAGE_KEY = 'x_remarks_v1';
const BACKUP_KEY = 'x_remarks_backups_v1';
const THEME_KEY = 'x_remarks_theme';
const SETTINGS_KEY = '__settings';
const MAX_BACKUPS = 3;

// X 自己那套强调色,够用了 —— 省得每次点开系统取色盘
const PRESET_COLORS = [
  '#f4212e', '#ff7a00', '#ffd400', '#00ba7c',
  '#1d9bf0', '#7856ff', '#f91880', '#71767b'
];

const $ = (id) => document.getElementById(id);
let store = {};
let settings = {};
let grouped = false;
let filterRule = null;   // 只看某条规则命中的人;存规则对象本身,规则被删/重置后自动失效

/* ---------- 存取 ---------- */
async function load() {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  store = r[STORAGE_KEY] || {};
  adoptSettings();
}
function adoptSettings() {
  settings = Object.assign({}, XR_DEFAULT_SETTINGS, store[SETTINGS_KEY] || {});
  if (!Array.isArray(settings.rules)) settings.rules = XR_DEFAULT_SETTINGS.rules.slice();
  if (filterRule && settings.rules.indexOf(filterRule) < 0) filterRule = null;
}
function save() {
  return chrome.storage.local.set({ [STORAGE_KEY]: store });
}
function saveSettings() {
  store[SETTINGS_KEY] = settings;
  return save();
}

/* 弹窗是独立页面,读不到 X 的 data-theme;content.js 会把当前主题写进
 * x_remarks_theme,这里跟着走。没装过/没开过 X 就退回系统主题。 */
async function applyTheme() {
  try {
    const r = await chrome.storage.local.get(THEME_KEY);
    if (r && r[THEME_KEY]) document.documentElement.dataset.theme = r[THEME_KEY];
  } catch (e) {}
}

function noteOf(key) {
  const v = store[key];
  return typeof v === 'string' ? v : (v && v.note) || '';
}
function setNote(key, note) {
  const old = store[key];
  if (old && typeof old === 'object') old.note = note;
  else store[key] = note;
}
function handles() {
  return Object.keys(store).filter((k) => k.startsWith('@'));
}
function findKey(handle) {
  const lc = handle.toLowerCase();
  return handles().find((k) => k.toLowerCase() === lc);
}
function colorOf(key) {
  const v = store[key];
  if (v && typeof v === 'object' && v.color) return v.color;
  const rule = XR_ruleFor(noteOf(key), settings.rules);
  return (rule && rule.color) || '';
}

/* ---------- 备份:整体替换前存一份,保留最近 3 份 ---------- */
async function snapshot(reason) {
  const r = await chrome.storage.local.get(BACKUP_KEY);
  const list = r[BACKUP_KEY] || [];
  list.unshift({
    ts: Date.now(),
    reason: reason || '',
    count: handles().length,
    data: store
  });
  await chrome.storage.local.set({ [BACKUP_KEY]: list.slice(0, MAX_BACKUPS) });
}

async function loadSnaps() {
  const r = await chrome.storage.local.get(BACKUP_KEY);
  return r[BACKUP_KEY] || [];
}

/* ---------- toast(可带一个动作按钮,比如「撤销」) ---------- */
let toastTimer;
function toast(msg, actionLabel, fn) {
  const el = $('toast');
  el.textContent = '';
  const t = document.createElement('span');
  t.className = 't-msg';
  t.textContent = msg;
  el.appendChild(t);

  el.classList.toggle('act', !!actionLabel);
  if (actionLabel) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = actionLabel;
    b.addEventListener('click', () => {
      hideToast();
      fn();
    });
    el.appendChild(b);
  }

  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, actionLabel ? 4500 : 1600);
}
function hideToast() {
  clearTimeout(toastTimer);
  const el = $('toast');
  el.style.opacity = '0';
  el.classList.remove('act');
}

/* ============================================================
 * 备注列表
 * ============================================================ */
function filteredKeys() {
  const q = $('search').value.trim().toLowerCase();
  return handles().filter((k) => {
    if (q && !k.toLowerCase().includes(q) && !noteOf(k).toLowerCase().includes(q)) return false;
    if (filterRule && XR_ruleFor(noteOf(k), settings.rules) !== filterRule) return false;
    return true;
  });
}

// 搜索/筛选时显示「命中 / 总数」,不然只看到总数会以为没生效
function refreshCount(shown) {
  const total = handles().length;
  const n = shown == null ? filteredKeys().length : shown;
  $('count').textContent = n === total ? total + ' 条' : n + ' / ' + total + ' 条';
}

function renderFilterBar() {
  const bar = $('filter-bar');
  bar.hidden = !filterRule;
  if (!filterRule) return;
  $('filter-dot').style.background = filterRule.color || 'var(--muted)';
  $('filter-text').textContent = '';
  const b = document.createElement('b');
  b.textContent = filterRule.name || '(未命名规则)';
  $('filter-text').append('只看 ', b, ' 这一类');
}

function render() {
  const keys = filteredKeys();
  refreshCount(keys.length);
  renderFilterBar();

  const ul = $('list');
  ul.textContent = '';
  if (grouped) renderGrouped(ul, keys);
  else {
    keys.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    keys.forEach((k) => ul.appendChild(row(k)));
  }
  ul.hidden = keys.length === 0;
  renderEmpty(keys.length);
}

// 空态分两种:一条都没有(新装/清空了)和搜不到,提示要不一样
function renderEmpty(shown) {
  const box = $('empty');
  box.hidden = shown > 0;
  if (shown > 0) return;
  box.textContent = '';
  if (handles().length === 0) {
    box.append('还没有任何备注');
    box.appendChild(document.createElement('br'));
    box.append('在 X 上点用户名下面的「＋ 备注」就能加,或者用上面的「＋ 添加」');
  } else if (filterRule) {
    box.append('这条规则还没命中任何人 —— 去规则里改改关键词');
  } else {
    box.append('没有匹配的备注');
  }
}

// 按备注文案分组,人数多的排前面 —— 用来发现该合并的标签和该清理的人
function renderGrouped(ul, keys) {
  const groups = new Map();
  keys.forEach((k) => {
    const t = noteOf(k);
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t).push(k);
  });
  [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .forEach(([text, ks]) => {
      const head = document.createElement('li');
      head.className = 'group-head';
      const dot = document.createElement('span');
      dot.className = 'g-dot';
      const rule = XR_ruleFor(text, settings.rules);
      if (rule && rule.color) dot.style.background = rule.color;
      const name = document.createElement('span');
      name.className = 'g-name';
      name.textContent = text;
      const cnt = document.createElement('span');
      cnt.className = 'g-count';
      cnt.textContent = ks.length + ' 人' + (rule ? ' · ' + rule.name : '');
      head.append(dot, name, cnt);
      ul.appendChild(head);

      ks.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      ks.forEach((k) => {
        // 组名已经是备注文案了,行里不再重复渲染一遍
        const li = row(k, true);
        li.classList.add('in-group');
        ul.appendChild(li);
      });
    });
}

function row(key, hideNote) {
  const li = document.createElement('li');
  li.dataset.key = key;

  const h = document.createElement('span');
  h.className = 'handle';
  h.textContent = key;
  h.title = key + ' — 点击打开主页';
  const c = colorOf(key);
  if (c) h.style.color = c;
  h.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://x.com/' + key.slice(1) });
  });

  const del = document.createElement('button');
  del.className = 'del';
  del.type = 'button';
  del.textContent = '✕';
  del.title = '删除备注';
  del.addEventListener('click', () => armDelete(li, key, del));

  if (hideNote) {
    li.append(h, del);
    return li;
  }

  const n = document.createElement('span');
  n.className = 'note';
  n.textContent = noteOf(key);
  n.title = '点击编辑';
  n.addEventListener('click', () => editInline(li, key, n));

  li.append(h, n, del);
  return li;
}

/* ---------- 删除:两步确认,再加一层撤销 ----------
 * 第一下只是把 ✕ 变成红色的「删除?」,数据还没动,3 秒不点自己退回去 ——
 * 误点的代价是零。真删之后 toast 里还有「撤销」,把原值(可能是带样式的对象)整个放回来。 */
let armedBtn = null;
let armedTimer = null;

function disarm() {
  clearTimeout(armedTimer);
  if (armedBtn) {
    armedBtn.classList.remove('armed');
    armedBtn.textContent = '✕';
    armedBtn.title = '删除备注';
    armedBtn = null;
  }
}

function armDelete(li, key, btn) {
  if (armedBtn === btn) { doDelete(li, key); return; }
  disarm();
  armedBtn = btn;
  btn.classList.add('armed');
  btn.textContent = '删除?';
  btn.title = '再点一次确认删除';
  armedTimer = setTimeout(disarm, 3000);
}

async function doDelete(li, key) {
  disarm();
  const prev = store[key];          // 原样保存,对象形式的自定义样式也能还原
  delete store[key];
  await save();
  li.remove();                      // 只摘这一行,不整表重绘 —— 保住滚动位置
  refreshCount();
  if (!$('list').children.length) { $('list').hidden = true; renderEmpty(0); }
  toast('已删除 ' + key, '撤销', async () => {
    store[key] = prev;
    await save();
    render();
    toast('已恢复 ' + key);
  });
}

function editInline(li, key, span) {
  disarm();
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'note-edit';
  input.value = noteOf(key);
  li.replaceChild(input, span);
  input.focus();
  input.select();

  let done = false;
  const commit = async (ok) => {
    if (done) return;
    done = true;
    const v = input.value.trim();

    if (!ok || v === noteOf(key)) {         // 取消 / 没改,原地还原
      li.replaceChild(span, input);
      return;
    }
    if (!v) {                                // 清空即删除
      const prev = store[key];
      delete store[key];
      await save();
      li.remove();
      refreshCount();
      if (!$('list').children.length) { $('list').hidden = true; renderEmpty(0); }
      toast('已删除 ' + key, '撤销', async () => {
        store[key] = prev;
        await save();
        render();
      });
      return;
    }

    setNote(key, v);
    await save();
    if (grouped) { render(); return; }       // 分组归属变了,得重排
    span.textContent = v;                    // 否则只更新这一行,不动滚动位置
    li.replaceChild(span, input);
    const c = colorOf(key);
    li.querySelector('.handle').style.color = c || '';
    if (filterRule && XR_ruleFor(v, settings.rules) !== filterRule) render();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit(true);
    if (e.key === 'Escape') commit(false);
  });
  input.addEventListener('blur', () => commit(true));
}

async function addNew() {
  let h = $('new-handle').value.trim();
  const note = $('new-note').value.trim();
  if (!h) { toast('先填 @handle'); return; }
  if (!note) { toast('备注不能为空'); return; }
  h = h.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/[/?#].*$/, '');
  if (!h.startsWith('@')) h = '@' + h;
  if (h === '@') { toast('handle 不对'); return; }

  const key = findKey(h) || h;
  setNote(key, note);
  await save();
  $('new-handle').value = '';
  $('new-note').value = '';
  $('search').value = '';
  filterRule = null;
  render();
  $('new-handle').focus();
  toast('已保存 ' + key);
}

/* ============================================================
 * 规则
 * ============================================================ */
function ruleCounts() {
  const counts = settings.rules.map(() => 0);
  handles().forEach((k) => {
    const r = XR_ruleFor(noteOf(k), settings.rules);
    const i = settings.rules.indexOf(r);
    if (i >= 0) counts[i]++;
  });
  return counts;
}

function renderRules() {
  const box = $('rules');
  box.textContent = '';
  const counts = ruleCounts();

  settings.rules.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'rule';

    const top = document.createElement('div');
    top.className = 'rule-top';

    const color = document.createElement('button');
    color.type = 'button';
    color.className = 'r-color';
    color.style.background = r.color || '#1d9bf0';
    color.title = '药丸颜色 —— 点击选色';

    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'r-name';
    name.value = r.name || '';
    name.placeholder = '规则名';
    name.addEventListener('change', () => patch(i, { name: name.value.trim() }));

    const cnt = document.createElement('button');
    cnt.type = 'button';
    cnt.className = 'r-count';
    cnt.textContent = counts[i] + ' 人';
    cnt.title = '只看这一类人';
    cnt.addEventListener('click', () => {
      filterRule = settings.rules[i];
      $('search').value = '';
      showTab('list');
      render();
    });

    const up = mini('↑', '上移', () => move(i, -1));
    const down = mini('↓', '下移', () => move(i, 1));
    const del = mini('✕', '删除规则', () => remove(i));
    del.classList.add('r-del');

    top.append(color, name, cnt, up, down, del);

    const match = document.createElement('input');
    match.type = 'text';
    match.className = 'r-match';
    match.value = (r.match || []).join(', ');
    match.placeholder = '关键词,逗号分隔(备注里包含任一个就命中)';
    match.addEventListener('change', () => {
      patch(i, {
        match: match.value.split(/[,,]/).map((s) => s.trim()).filter(Boolean)
      });
    });

    const foot = document.createElement('div');
    foot.className = 'r-foot';
    const noise = document.createElement('label');
    noise.className = 'check';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!r.noise;
    cb.addEventListener('change', () => patch(i, { noise: cb.checked }));
    noise.append(cb, document.createTextNode('降噪:这类人的推文按「设置」处理'));
    foot.appendChild(noise);

    const sw = buildSwatches(i, r);
    color.addEventListener('click', () => { sw.hidden = !sw.hidden; });

    card.append(top, match, foot, sw);
    box.appendChild(card);
  });
}

function buildSwatches(i, r) {
  const wrap = document.createElement('div');
  wrap.className = 'swatches';
  wrap.hidden = true;

  PRESET_COLORS.forEach((hex) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sw';
    b.style.background = hex;
    b.title = hex;
    if ((r.color || '').toLowerCase() === hex) b.classList.add('on');
    b.addEventListener('click', () => patch(i, { color: hex }));
    wrap.appendChild(b);
  });

  const custom = document.createElement('input');
  custom.type = 'color';
  custom.className = 'custom';
  custom.value = /^#[0-9a-f]{6}$/i.test(r.color || '') ? r.color : '#1d9bf0';
  custom.title = '自定义颜色';
  custom.addEventListener('change', () => patch(i, { color: custom.value }));
  wrap.appendChild(custom);

  return wrap;
}

function mini(text, title, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mini';
  b.textContent = text;
  b.title = title;
  b.addEventListener('click', fn);
  return b;
}

async function patch(i, obj) {
  Object.assign(settings.rules[i], obj);
  await saveSettings();
  renderRules();
}
async function move(i, d) {
  const j = i + d;
  if (j < 0 || j >= settings.rules.length) return;
  const [r] = settings.rules.splice(i, 1);
  settings.rules.splice(j, 0, r);
  await saveSettings();
  renderRules();
}
async function remove(i) {
  if (settings.rules[i] === filterRule) filterRule = null;
  settings.rules.splice(i, 1);
  await saveSettings();
  renderRules();
}
async function addRule() {
  settings.rules.push({ name: '新规则', color: '#1d9bf0', noise: false, match: [] });
  await saveSettings();
  renderRules();
  const inputs = document.querySelectorAll('#rules .r-name');
  const last = inputs[inputs.length - 1];
  if (last) { last.focus(); last.select(); }
}
async function resetRules() {
  filterRule = null;
  settings.rules = JSON.parse(JSON.stringify(XR_DEFAULT_SETTINGS.rules));
  await saveSettings();
  renderRules();
  toast('已恢复默认规则');
}

/* ============================================================
 * 设置
 * ============================================================ */
function renderSettings() {
  $('noise-mode').value = settings.noiseMode || 'off';
  const pct = Math.round((settings.dimOpacity == null ? 0.3 : settings.dimOpacity) * 100);
  $('dim').value = String(pct);
  $('dim-val').textContent = pct + '%';
  $('dim-field').hidden = (settings.noiseMode || 'off') !== 'dim';
  $('hide-ads').checked = !!settings.hideAds;
  renderSnaps();
}

async function renderSnaps() {
  const ul = $('snaps');
  ul.textContent = '';
  const list = await loadSnaps();
  if (!list.length) {
    const li = document.createElement('li');
    li.className = 'none';
    li.textContent = '还没有备份';
    ul.appendChild(li);
    return;
  }
  list.forEach((s, i) => {
    const li = document.createElement('li');
    const t = document.createElement('span');
    t.className = 's-time';
    t.textContent = new Date(s.ts).toLocaleString('zh-CN', { hour12: false });
    const c = document.createElement('span');
    c.className = 's-count';
    c.textContent = s.count + ' 条' + (s.reason ? ' · ' + s.reason : '');
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sec';
    b.textContent = '回滚';
    b.addEventListener('click', () => restore(i));
    li.append(t, c, b);
    ul.appendChild(li);
  });
}

async function restore(i) {
  const list = await loadSnaps();
  const snap = list[i];
  if (!snap) return;
  await snapshot('回滚前');
  store = snap.data;
  adoptSettings();
  await save();
  render();
  renderRules();
  renderSettings();
  toast('已回滚到 ' + snap.count + ' 条');
}

/* ============================================================
 * 导入导出
 * ============================================================ */
function currentJson() {
  const out = {};
  Object.keys(store).sort().forEach((k) => { out[k] = store[k]; });
  return JSON.stringify(out, null, 2);
}

function doExport() {
  const blob = new Blob([currentJson()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  const stamp = d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  a.href = url;
  a.download = 'x-remarks-' + stamp + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  toast('已导出 ' + handles().length + ' 条');
}

function doCopy() {
  navigator.clipboard.writeText(currentJson()).then(
    () => toast('已复制到剪贴板'),
    () => toast('复制失败,去「编辑 JSON」里手动选中')
  );
}

function parseObj(text) {
  let obj;
  try { obj = JSON.parse(text); }
  catch (e) { toast('JSON 格式有误'); return null; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    toast('需要一个 JSON 对象');
    return null;
  }
  return obj;
}

async function doImportFile(file) {
  const obj = parseObj(await file.text());
  if (!obj) return;
  await snapshot('导入前');
  // 合并导入:同名覆盖,不删除已有的其它备注
  Object.assign(store, obj);
  adoptSettings();
  await save();
  render();
  renderRules();
  renderSettings();
  toast('已合并导入 ' + Object.keys(obj).filter((k) => k.startsWith('@')).length + ' 条');
}

async function saveJson() {
  const obj = parseObj($('json').value);
  if (!obj) return;
  await snapshot('整体替换前');
  store = obj;
  filterRule = null;
  adoptSettings();
  await save();
  render();
  renderRules();
  renderSettings();
  showTab('list');
  toast('已导入 ' + handles().length + ' 条备注');
}

/* ============================================================
 * tab 切换
 * ============================================================ */
function showTab(name) {
  disarm();
  ['list', 'rules', 'settings', 'json'].forEach((n) => {
    $('view-' + n).hidden = n !== name;
  });
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === name);
  });
  if (name === 'list') refreshCount();
  if (name === 'rules') renderRules();
  if (name === 'settings') renderSettings();
  if (name === 'json') $('json').value = currentJson();
}

/* ============================================================
 * 启动
 * ============================================================ */
(async function init() {
  applyTheme();
  await load();
  render();
  $('search').focus();     // 打开就能搜 —— 这是最高频的动作

  document.querySelectorAll('.tabs button').forEach((b) => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  });

  $('add-toggle').addEventListener('click', () => {
    const row = $('add-row');
    row.hidden = !row.hidden;
    $('add-toggle').classList.toggle('on', !row.hidden);
    if (!row.hidden) $('new-handle').focus();
  });
  $('add').addEventListener('click', addNew);
  $('new-note').addEventListener('keydown', (e) => { if (e.key === 'Enter') addNew(); });
  $('new-handle').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('new-note').focus(); });

  $('search').addEventListener('input', render);
  $('group').addEventListener('click', () => {
    grouped = !grouped;
    $('group').classList.toggle('on', grouped);
    render();
  });
  $('filter-clear').addEventListener('click', () => {
    filterRule = null;
    render();
  });

  $('rule-add').addEventListener('click', addRule);
  $('rule-reset').addEventListener('click', resetRules);

  $('noise-mode').addEventListener('change', async () => {
    settings.noiseMode = $('noise-mode').value;
    await saveSettings();
    renderSettings();
  });
  $('dim').addEventListener('input', () => {
    $('dim-val').textContent = $('dim').value + '%';
  });
  $('dim').addEventListener('change', async () => {
    settings.dimOpacity = Number($('dim').value) / 100;
    await saveSettings();
  });
  $('hide-ads').addEventListener('change', async () => {
    settings.hideAds = $('hide-ads').checked;
    await saveSettings();
  });

  $('export').addEventListener('click', doExport);
  $('copy').addEventListener('click', doCopy);
  $('import').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) doImportFile(f);
    e.target.value = '';
  });
  $('to-json').addEventListener('click', () => showTab('json'));
  $('json-save').addEventListener('click', saveJson);
  $('json-cancel').addEventListener('click', () => showTab('settings'));

  // 点别处就取消「删除?」的待确认态
  document.addEventListener('click', (e) => {
    if (armedBtn && !armedBtn.contains(e.target)) disarm();
  }, true);

  // 页面里改了备注,弹窗开着时同步刷新
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[THEME_KEY] && changes[THEME_KEY].newValue) {
      document.documentElement.dataset.theme = changes[THEME_KEY].newValue;
    }
    if (!changes[STORAGE_KEY]) return;
    store = changes[STORAGE_KEY].newValue || {};
    adoptSettings();
    if (!$('view-list').hidden) render();
  });
})();
