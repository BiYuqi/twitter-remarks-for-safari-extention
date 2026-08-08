/* 扩展弹窗:备注列表 / 规则 / 设置
 * 数据结构与 userscript 版兼容:一份扁平 JSON,@handle 是备注,
 * __settings 是本扩展的设置(userscript 那边读不懂但会原样保留)。 */

const STORAGE_KEY = 'x_remarks_v1';
const BACKUP_KEY = 'x_remarks_backups_v1';
const SETTINGS_KEY = '__settings';
const MAX_BACKUPS = 3;

const $ = (id) => document.getElementById(id);
let store = {};
let settings = {};
let grouped = false;

/* ---------- 存取 ---------- */
async function load() {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  store = r[STORAGE_KEY] || {};
  settings = Object.assign({}, XR_DEFAULT_SETTINGS, store[SETTINGS_KEY] || {});
  if (!Array.isArray(settings.rules)) settings.rules = XR_DEFAULT_SETTINGS.rules.slice();
}
function save() {
  return chrome.storage.local.set({ [STORAGE_KEY]: store });
}
function saveSettings() {
  store[SETTINGS_KEY] = settings;
  return save();
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

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1600);
}

/* ============================================================
 * 备注列表
 * ============================================================ */
function render() {
  const q = $('search').value.trim().toLowerCase();
  const keys = handles()
    .filter((k) => !q || k.toLowerCase().includes(q) || noteOf(k).toLowerCase().includes(q));

  $('count').textContent = handles().length + ' 条';

  const ul = $('list');
  ul.textContent = '';
  if (grouped) renderGrouped(ul, keys);
  else {
    keys.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    keys.forEach((k) => ul.appendChild(row(k)));
  }
  $('empty').hidden = keys.length > 0;
  ul.hidden = keys.length === 0;
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
        const li = row(k);
        li.classList.add('in-group');
        ul.appendChild(li);
      });
    });
}

function row(key) {
  const li = document.createElement('li');

  const h = document.createElement('span');
  h.className = 'handle';
  h.textContent = key;
  h.title = key + ' — 点击打开主页';
  h.style.cursor = 'pointer';
  const rule = XR_ruleFor(noteOf(key), settings.rules);
  if (rule && rule.color) h.style.color = rule.color;
  h.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://x.com/' + key.slice(1) });
  });

  const n = document.createElement('span');
  n.className = 'note';
  n.textContent = noteOf(key);
  n.title = '点击编辑';
  n.addEventListener('click', () => editInline(li, key, n));

  const del = document.createElement('button');
  del.className = 'del';
  del.type = 'button';
  del.textContent = '✕';
  del.title = '删除备注';
  del.addEventListener('click', async () => {
    delete store[key];
    await save();
    render();
    toast('已删除 ' + key);
  });

  li.append(h, n, del);
  return li;
}

function editInline(li, key, span) {
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
    if (ok) {
      const v = input.value.trim();
      if (v) setNote(key, v);
      else delete store[key];
      await save();
    }
    render();
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
  h = h.replace(/^https?:\/\/(x|twitter)\.com\//i, '').replace(/[/?].*$/, '');
  if (!h.startsWith('@')) h = '@' + h;

  const key = findKey(h) || h;
  setNote(key, note);
  await save();
  $('new-handle').value = '';
  $('new-note').value = '';
  $('search').value = '';
  render();
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

    const color = document.createElement('input');
    color.type = 'color';
    color.className = 'r-color';
    color.value = /^#[0-9a-f]{6}$/i.test(r.color || '') ? r.color : '#007aff';
    color.title = '药丸颜色';
    color.addEventListener('change', () => patch(i, { color: color.value }));

    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'r-name';
    name.value = r.name || '';
    name.placeholder = '规则名';
    name.addEventListener('change', () => patch(i, { name: name.value.trim() }));

    const noise = document.createElement('label');
    noise.className = 'check';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!r.noise;
    cb.addEventListener('change', () => patch(i, { noise: cb.checked }));
    noise.append(cb, document.createTextNode('降噪'));

    const cnt = document.createElement('span');
    cnt.className = 'r-count';
    cnt.textContent = counts[i] + ' 人';

    const up = mini('↑', '上移', () => move(i, -1));
    const down = mini('↓', '下移', () => move(i, 1));
    const del = mini('✕', '删除规则', () => remove(i));
    del.classList.add('r-del');

    top.append(color, name, noise, cnt, up, down, del);

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

    card.append(top, match);
    box.appendChild(card);
  });
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
  settings.rules.splice(i, 1);
  await saveSettings();
  renderRules();
}
async function addRule() {
  settings.rules.push({ name: '新规则', color: '#007aff', noise: false, match: [] });
  await saveSettings();
  renderRules();
  const inputs = document.querySelectorAll('#rules .r-name');
  const last = inputs[inputs.length - 1];
  if (last) { last.focus(); last.select(); }
}
async function resetRules() {
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
  settings = Object.assign({}, XR_DEFAULT_SETTINGS, store[SETTINGS_KEY] || {});
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
    () => toast('复制失败,去「{ }」里手动选中')
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
  settings = Object.assign({}, XR_DEFAULT_SETTINGS, store[SETTINGS_KEY] || {});
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
  settings = Object.assign({}, XR_DEFAULT_SETTINGS, store[SETTINGS_KEY] || {});
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
  ['list', 'rules', 'settings', 'json'].forEach((n) => {
    $('view-' + n).hidden = n !== name;
  });
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.tab === name);
  });
  if (name === 'rules') renderRules();
  if (name === 'settings') renderSettings();
  if (name === 'json') $('json').value = currentJson();
}

/* ============================================================
 * 启动
 * ============================================================ */
(async function init() {
  await load();
  render();

  document.querySelectorAll('.tabs button').forEach((b) => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
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

  // 页面里改了备注,弹窗开着时同步刷新
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    store = changes[STORAGE_KEY].newValue || {};
    settings = Object.assign({}, XR_DEFAULT_SETTINGS, store[SETTINGS_KEY] || {});
    if (!$('view-list').hidden) render();
  });
})();
