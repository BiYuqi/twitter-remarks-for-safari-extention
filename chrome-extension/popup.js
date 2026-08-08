/* 扩展弹窗:备注列表管理 + JSON 导入导出
 * 数据结构与 userscript 版完全一致,JSON 可以互相搬。 */

const STORAGE_KEY = 'x_remarks_v1';

const $ = (id) => document.getElementById(id);
let store = {};

/* ---------- 存取 ---------- */
async function load() {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  store = r[STORAGE_KEY] || {};
}
function save() {
  return chrome.storage.local.set({ [STORAGE_KEY]: store });
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

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 1600);
}

/* ---------- 列表渲染 ---------- */
function render() {
  const q = $('search').value.trim().toLowerCase();
  const keys = handles()
    .filter((k) => !q || k.toLowerCase().includes(q) || noteOf(k).toLowerCase().includes(q))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  $('count').textContent = handles().length + ' 条';

  const ul = $('list');
  ul.textContent = '';
  keys.forEach((k) => ul.appendChild(row(k)));
  $('empty').hidden = keys.length > 0;
  ul.hidden = keys.length === 0;
}

function row(key) {
  const li = document.createElement('li');

  const h = document.createElement('span');
  h.className = 'handle';
  h.textContent = key;
  h.title = key + ' — 点击打开主页';
  h.style.cursor = 'pointer';
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

/* ---------- 新增 ---------- */
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

/* ---------- 导入导出 ---------- */
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
    () => toast('复制失败,请用「{ }」里手动选中')
  );
}

async function doImportFile(file) {
  const text = await file.text();
  let obj;
  try { obj = JSON.parse(text); }
  catch (e) { toast('JSON 格式有误'); return; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    toast('需要一个 JSON 对象');
    return;
  }
  // 合并导入:同名覆盖,不删除已有的其它备注
  Object.assign(store, obj);
  await save();
  render();
  toast('已合并导入 ' + Object.keys(obj).filter((k) => k.startsWith('@')).length + ' 条');
}

/* ---------- JSON 视图 ---------- */
function showJson(on) {
  $('view-list').hidden = on;
  $('view-json').hidden = !on;
  if (on) $('json').value = currentJson();
}

async function saveJson() {
  let obj;
  try { obj = JSON.parse($('json').value); }
  catch (e) { toast('JSON 格式有误'); return; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    toast('需要一个 JSON 对象');
    return;
  }
  store = obj;
  await save();
  render();
  showJson(false);
  toast('已导入 ' + handles().length + ' 条备注');
}

/* ---------- 启动 ---------- */
(async function init() {
  await load();
  render();

  $('add').addEventListener('click', addNew);
  $('new-note').addEventListener('keydown', (e) => { if (e.key === 'Enter') addNew(); });
  $('new-handle').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('new-note').focus(); });
  $('search').addEventListener('input', render);

  $('export').addEventListener('click', doExport);
  $('copy').addEventListener('click', doCopy);
  $('import').addEventListener('click', () => $('file').click());
  $('file').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) doImportFile(f);
    e.target.value = '';
  });

  $('tab-json').addEventListener('click', () => showJson($('view-json').hidden));
  $('json-save').addEventListener('click', saveJson);
  $('json-cancel').addEventListener('click', () => showJson(false));

  // 页面里改了备注,弹窗开着时同步刷新
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEY]) return;
    store = changes[STORAGE_KEY].newValue || {};
    if ($('view-json').hidden) render();
  });
})();
