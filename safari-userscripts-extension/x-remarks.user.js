// ==UserScript==
// @name         X Remarks 推特备注
// @namespace    byte.local
// @version      1.0.0
// @description  给 X(推特)用户显示本地备注,点击即可编辑,支持 JSON 批量导入导出。iOS Safari / Userscripts 可用。
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.twitter.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'x_remarks_v1';
  const TAG_CLASS = 'xr-note-tag';
  const ADD_CLASS = 'xr-add-btn';

  /* ============================================================
   * 默认备注数据 —— 首次运行种入 localStorage,之后以 localStorage 为准
   * key 保留 @ 前缀,与原 JSON 完全一致
   * ============================================================ */
  const DEFAULT_REMARKS =
{
    "@020210jh": "畜生开盘割人",
    "@0xCryptoUni": "撸毛-任务型博主",
    "@0xEMC2WIN": "咋咋呼呼，不知真的赚钱否",
    "@0xJ818": "暴力杠杆交易员",
    "@0xJoeMov": "狗骗子",
    "@0xLuo": "Base链研究",
    "@0xMustardz": "畜生开盘割人",
    "@0xSleepinRain": "睡裙群主",
    "@0xSleuth_": "英文区影响力KOL",
    "@0xTaiBai": "交易玩家-收费",
    "@0x_CryptoAu": "Base链研究",
    "@0xbor": "kolscan创始人",
    "@0xdetweiler": "机器人赛道研究",
    "@0xfanfanfan": "畜生开盘割人",
    "@0xfengxun": "新币玩家",
    "@0xlong_life": "SOL&ICM",
    "@9yointern": "Jup 项目方",
    "@AI_BRK": "AIBRK Tech Lead",
    "@AndreCronjeTech": "AC Sonic创始人 口碑一般 DeFi元老",
    "@AveryChing": "APT CEO",
    "@Barret_China": "阿里开发",
    "@ChillHouseSOL": "Chillhouse法国销售代表",
    "@ClairvoyantLabs": "持续关注",
    "@CryptoCaligh": "挖坟贴老手，也许是跳大神",
    "@CryptoCapo_": "英文社区著名反指",
    "@Crypto_Cat888": "热点短平快交易",
    "@Cryptobaofu": "避而远之",
    "@CyptoForest": "meme玩家-研究型",
    "@Darkfarms1": "Bome作者",
    "@DexterOnchain": "工具叼毛",
    "@DigitsCapital": "英文区影响力KOL",
    "@Domingo_gou": "避而远之",
    "@DontShelll": "国内打狗kol",
    "@DoveyWan": "诈骗犯的何一闺蜜",
    "@Eason5825": "宝藏投研型博主",
    "@ForrestOLAB": "诈骗犯项目",
    "@Ga__ke": "尼玛DNF",
    "@GeoffreyHuntley": "RALPH畜生开发者",
    "@HeetTike": "Noice",
    "@IncomeSharks": "股票和加密货币分析与预测",
    "@JUST_DO_ITS7": "Bonk冲狗",
    "@JackDishman": "Clanker DEV",
    "@Kawasakitesu": "看起来也是装逼的",
    "@KelseyWeb3VC": "二级交易 & 趋势",
    "@Kong408": "Creator合伙人",
    "@LongzuAlpha": "打狗",
    "@MLeeJr": "LFI创始人",
    "@MaWanShuooo": "Base链研究",
    "@Master_Jobber": "老骗子",
    "@McCain889": "避而远之",
    "@MichaelHirsch": "SLOP Dev",
    "@MichaelandMa": "Creator创世人 | 甩手掌柜？",
    "@Murphychen888": "数据“分析师”",
    "@Neon2089": "投研搞起",
    "@NousResearch": "Hermes创始人",
    "@PayAINetwork": "x402",
    "@RicardoBitget": "畜生开盘割人",
    "@SemiAnalysis_": "专门拆解 英伟达 美光HBM GPU",
    "@Shawred0": "AI相关研究",
    "@SolportTom": "Bonk创始人",
    "@StaniKulechov": "AAVE 创始人",
    "@StriderOnBase": "有点意思的Alpha",
    "@TheRyo_778": "投研",
    "@VitalikButerin": "ETH创始人",
    "@WeSn0w": "高质量分析？",
    "@YA971718": "避而远之",
    "@Y_babyshow": "Base链投研",
    "@YanLiberman": "有趣的观点",
    "@ZephyrTrading": "畜生开盘割人",
    "@_johngranata": "Base 产品？",
    "@_jsmth": "Believe App工程师",
    "@a1lon9": "PUMP CEO ctm",
    "@aeyakovenko": "Solana创始人",
    "@aleabitoreddit": "新股神？？？还是跳大神",
    "@andy8052": "区块链开发者、加密货币爱好者",
    "@blknoiz06": "黑鬼",
    "@brian_armstrong": "Base CEO",
    "@btcbabycow": "Alpha挖掘- Base",
    "@btcxiage": "诈骗犯",
    "@cb_doge": "马斯克狗腿子",
    "@chickenBrother_": "技术 ｜ 分析师",
    "@clankeronbase": "Clank儿",
    "@corbits_dev": "x402 框架",
    "@crypto_popseye": "英文区影响力KOL",
    "@cryptok64440829": "避而远之",
    "@cryptoxiao1127": "感谢6551",
    "@cz_binance": "赵长鹏",
    "@d33v33d0": "西红柿开发者",
    "@danielesesta": "Sonic链Anon Dev",
    "@daosdotfun": "初代发币模式 DAO",
    "@defidude": "crypto 老玩家  Ratspeak 开发和推广",
    "@diiorioanthony": "以太坊联合创始人",
    "@elonmusk": "马斯克",
    "@feltanimalworld": "AI相关",
    "@fundstrat": "Tom Lee 华尔街大佬",
    "@game_for_one": "Alpha信号KOL",
    "@gammichan": "外国KOL 研究型",
    "@gengdaJ": "AI相关工具研究",
    "@goocarlos": "Dify CEO",
    "@higgsfield_ai": "AI视频合成网站",
    "@himgajria": "小心！大割",
    "@hubzify": "避而远之",
    "@hunterweb303": "Web3开发",
    "@iamkadense": "Bonk核心贡献者",
    "@infinit49976199": "撸毛",
    "@iruletrenches": "Base Kol 国内人称行业冥灯",
    "@jessepollak": "垃圾杰西",
    "@jimcramer": "英文CT著名反指",
    "@js_horne": "Zora创始人",
    "@jukan05": "研究员？",
    "@jup_studio": "JUP台子",
    "@klik_evm": "EVN 发射台",
    "@kolscan": "PUMP 收购的项目",
    "@kunlunstar": "算命的？还行",
    "@liaoblove520": "避而远之",
    "@lifefind_itsway": "扒链",
    "@maid_crypto": "臭傻逼",
    "@mayangdarana": "畜生开盘割人",
    "@metaplex": "SOL上的发射&投融",
    "@missoralways": "$memecoin最早喊单的核心人物 英文区KOL",
    "@mrpapawheelie": "Base生态分析",
    "@nanbeiblock": "交易&投研&Alpha",
    "@nftsiy": "避而远之",
    "@notthreadguy": "人工智能|兼职主播",
    "@novogratz": "sol链“Tom lee”",
    "@opinionlabsxyz": "诈骗犯项目",
    "@pasternak": "Believe创始人",
    "@poe_real69": "老外喊单KOL",
    "@predictionindex": "预测市场聚合站",
    "@qrcoindotfun": "Base链上竞拍广告位",
    "@rbthreek": "英文区 KOL",
    "@runes_leo": "预测市场策略 · AI 工具实战 · 独立构建日常",
    "@ryolu_": "Cursor",
    "@ryzzqq": "值得关注",
    "@sama": "OpenAI奥特曼",
    "@shirleyusy": "庄",
    "@sibeleth": "拿钱办事 国外畜牲",
    "@sidewinder1901": "moonshot营销主管",
    "@spncrk": "ORGO 创始人",
    "@starving_series": "拍短剧的",
    "@stitchdegen": "一级二段博主",
    "@stompymoppybase": "我操，改名了，注意安全",
    "@stventure_": "投研大佬TBD",
    "@supercontraa": "alpha",
    "@thetradingstar": "被CoinbaseAsset关注",
    "@uponlymodee": "应用币版本T0",
    "@waiting027": "投研-Base",
    "@wangyiduo0404": "畜生开盘割人",
    "@web3_home": "避而远之",
    "@x0110GYY": "避而远之",
    "@xhanTululu": "Alpha研究",
    "@xmtp_": "高融资 消息通讯",
    "@yetone": "开发者",
    "@yiboyun613": "装逼博主",
    "@zachxbt": "内幕 装逼狗"
  }
;

  /* ============================================================
   * 存储层
   *   "@user": "备注文字"
   *   "@user": { note:"备注", color:"#hex", fontSize:"12px", borderRadius:"6px" }
   * 全局样式:__style_bgColor / __style_fontSize / __style_borderRadius
   * ============================================================ */
  let store = {};
  let lcIndex = new Map();

  function rebuildIndex() {
    lcIndex = new Map();
    for (const k of Object.keys(store)) {
      if (k.startsWith('@')) lcIndex.set(k.toLowerCase(), k);
    }
  }

  function loadStore() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (raw) {
      try { store = JSON.parse(raw); }
      catch (e) { store = Object.assign({}, DEFAULT_REMARKS); }
    } else {
      store = Object.assign({}, DEFAULT_REMARKS);
      persist();
    }
    rebuildIndex();
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch (e) { console.warn('[XR] 保存失败', e); }
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

  /* ---------- 轻提示(替代 alert,alert 同样可能被 Safari 吞掉) ---------- */
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

  /* ---------- 自建编辑弹窗(替代 window.prompt) ----------
   * iOS Safari 会在多种情况下静默拦掉 prompt():用户手势激活状态被消耗、
   * 之前弹过对话框被用户选择"不再显示"等。既不显示也不报错,
   * 表现就是"按钮有按下反馈,但没有弹窗"。改用页面内 DOM 弹窗彻底规避。
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

    editInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const u = editTarget, v = editInput.value;
        closeEditor();
        setNote(u, v);
        toast(v.trim() ? '已保存' : '已删除备注');
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
   * 全局事件委托 —— 关键修复
   * 不给每个徽章单独绑监听。X 的 React 会不断替换/回收 DOM 节点,
   * 节点一被换掉,挂在它身上的监听就没了,表现为"一开始能点,刷新后突然点不动"。
   * 委托到 document 上,只认 data-xr-edit 属性,节点怎么换都不受影响。
   * 同时在 pointerdown/touchstart 阶段拦截,阻断 X 自己的"点推文进详情"跳转。
   * ============================================================ */
  function bindDelegation() {
    const findTarget = function (e) {
      const t = e.target;
      if (!t || !t.closest) return null;
      return t.closest('[data-xr-edit]');
    };

    // 挂在 window 而不是 document。
    // 捕获阶段顺序是 window -> document -> ... -> target,
    // X 的应用脚本比本脚本先加载,它在 document 上注册的监听会排在我们前面;
    // 一旦它调用 stopImmediatePropagation,挂在 document 的委托就永远收不到事件
    // (表现为:一开始能点,SPA 路由切换后 X 追加了拦截器,就突然失效)。
    // 挂到 window 捕获阶段可以抢在它之前拿到事件。
    const ROOT = window;

    // 按下阶段:只切断冒泡,拦住 X 的"点推文进详情"。
    // 绝不能 preventDefault —— iOS Safari 上会取消整个点击手势,click 永远不产生。
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
    window.__xrFire = fire;   // 元素级监听复用同一套防重入

    // 三种事件都收,任意一条通路活着就能触发
    ['click', 'pointerup', 'touchend'].forEach(function (type) {
      ROOT.addEventListener(type, function (e) {
        const el = findTarget(e);
        if (!el) return;
        if (type === 'click' && e.cancelable) e.preventDefault();
        fire(el, e);
      }, true);
    });
  }

  // 元素级直绑:万一 X 在中途某个祖先节点的冒泡阶段拦截,
  // 目标阶段仍会先于冒泡触发,这条通路还能兜住。
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
      'margin:5px 0 6px;line-height:1.4;position:relative;z-index:9998;clear:both;';

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.dataset.xrEdit = username;             // 委托靠这个属性识别
    pill.textContent = noteObj.text;            // 无 emoji 前缀
    pill.style.cssText =
      'display:inline-block;background:' + noteObj.bg + ';color:#fff;font-weight:700;' +
      'font-size:' + noteObj.fontSize + ';padding:3px 9px;border-radius:' + noteObj.radius + ';' +
      'white-space:normal;word-break:break-word;max-width:100%;text-align:left;' +
      'border:none;margin:0;font-family:inherit;line-height:1.35;' +
      'cursor:pointer;position:relative;z-index:9999;pointer-events:auto;' +
      'touch-action:manipulation;-webkit-appearance:none;appearance:none;' +
      '-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;';

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
  // 向上找到第一个"纵向容器"(block 或 flex-column),把徽章作为其子节点插入
  // 这样徽章独占一整行,不再和用户名/时间抢 flex 行的宽度
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

      // 虚拟列表复用节点:先移除这个区块自己的旧徽章
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
   * 样式(面板部分统一 !important,避免被 X 全局 CSS 覆盖)
   * ============================================================ */
  /* ============================================================
   * 主题:只做浅色 / 暗色两套
   * X 移动版把当前主题写在 data-theme 上,直接读它,比算背景色亮度可靠。
   * 浅色沿用 iOS 卡片风格(白卡 + 阴影,不描边),暗色走常规暗色。
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

  function injectStyle() {
    const s = document.createElement('style');
    s.textContent = [
      /* ---- 备注按钮 ---- */
      '.' + ADD_CLASS + '{color:var(--xr-muted,#8899a6) !important;',
      'border:1px dashed var(--xr-muted,#8899a6) !important;',
      'border-radius:6px !important;padding:3px 10px !important;font-size:12px !important;',
      'cursor:pointer !important;display:inline-block !important;line-height:1.35 !important;',
      'position:relative !important;z-index:9999 !important;pointer-events:auto !important;',
      'background:transparent !important;margin:0 !important;font-family:inherit !important;',
      'touch-action:manipulation;-webkit-appearance:none;appearance:none;',
      '-webkit-user-select:none;user-select:none;}',
      '[data-xr-edit]:active{opacity:.45 !important;transform:scale(.94) !important;}',
      '[data-xr-edit]{transition:opacity .06s,transform .06s;}',

      /* ---- 悬浮设置按钮 ---- */
      '#xr-fab{position:fixed !important;right:10px;bottom:170px;z-index:99999;',
      'width:34px;height:34px;border-radius:50%;border:none;',
      'background:var(--xr-accent,#007aff);opacity:.55;color:#fff;font-size:14px;padding:0;',
      'box-shadow:0 1px 5px rgba(0,0,0,.25);',
      'display:flex !important;align-items:center !important;justify-content:center !important;}',
      '#xr-fab:active{opacity:1;}',

      /* ---- 通用卡片(设置面板 / 编辑弹窗共用) ---- */
      '#xr-panel,#xr-edit{position:fixed;inset:0;background:var(--xr-overlay,rgba(0,0,0,.6));',
      'display:none;align-items:center;justify-content:center;padding:18px;}',
      '#xr-panel{z-index:100000;}',
      '#xr-edit{z-index:100001;}',
      '#xr-panel .box,#xr-edit .box{background:var(--xr-bg,#fff);color:var(--xr-fg,#1c1c1e);',
      'width:100%;border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px;',
      'border:1px solid var(--xr-border,transparent);box-shadow:var(--xr-shadow,0 12px 40px rgba(0,0,0,.2));',
      'color-scheme:var(--xr-scheme,light);}',
      '#xr-panel .box{max-width:560px;max-height:86vh;}',
      '#xr-edit .box{max-width:420px;}',

      /* ---- 文本区 / 输入框 ---- */
      '#xr-panel textarea{flex:1;min-height:44vh;background:var(--xr-input,#f2f2f7) !important;',
      'color:var(--xr-input-fg,#1c1c1e) !important;',
      'border:1px solid var(--xr-input-border,transparent) !important;border-radius:10px !important;',
      'padding:10px !important;font-size:12px !important;font-family:ui-monospace,monospace !important;',
      'resize:vertical;box-sizing:border-box !important;-webkit-appearance:none;appearance:none;}',
      '#xr-edit input{background:var(--xr-input,#f2f2f7) !important;',
      'color:var(--xr-input-fg,#1c1c1e) !important;',
      'border:1px solid var(--xr-input-border,transparent) !important;border-radius:10px !important;',
      'padding:13px !important;font-size:16px !important;width:100% !important;',
      'box-sizing:border-box !important;font-family:inherit !important;',
      '-webkit-appearance:none;appearance:none;}',

      /* ---- 按钮行 ---- */
      '#xr-panel .row,#xr-edit .row{display:flex;gap:8px;flex-wrap:wrap;}',
      '#xr-panel .row button,#xr-edit .row button{flex:1 1 0 !important;min-width:88px;',
      'padding:12px 8px !important;border:none !important;border-radius:11px !important;',
      'font-size:15px !important;font-weight:600 !important;color:#fff !important;',
      'background:var(--xr-accent,#007aff) !important;box-sizing:border-box !important;',
      'margin:0 !important;font-family:inherit !important;line-height:1.2 !important;',
      'display:flex !important;align-items:center !important;justify-content:center !important;',
      'text-align:center !important;-webkit-appearance:none;appearance:none;',
      'touch-action:manipulation;}',
      '#xr-panel .row button:active,#xr-edit .row button:active{opacity:.6;}',
      '#xr-panel .row button.sec,#xr-edit .row button.sec{',
      'background:var(--xr-sec,#f2f2f7) !important;color:var(--xr-sec-fg,#007aff) !important;}',

      /* ---- 说明文字 / 标题 ---- */
      '#xr-panel .tip,#xr-edit .t{font-size:13px;color:var(--xr-muted,rgba(60,60,67,.6));',
      'line-height:1.5;word-break:break-all;}',

      /* ---- toast ---- */
      '#xr-toast{position:fixed;left:50%;bottom:120px;transform:translateX(-50%);',
      'z-index:100002;background:var(--xr-toast-bg,rgba(28,28,30,.92));',
      'color:var(--xr-toast-fg,#fff);font-size:14px;backdrop-filter:blur(12px);',
      '-webkit-backdrop-filter:blur(12px);',
      'padding:10px 18px;border-radius:20px;opacity:0;transition:opacity .25s;',
      'pointer-events:none;max-width:80vw;text-align:center;}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  /* ============================================================
   * 设置面板
   * ============================================================ */
  let panel, ta;

  function currentJson() {
    const out = {};
    Object.keys(store).sort().forEach(function (k) { out[k] = store[k]; });
    return JSON.stringify(out, null, 2);
  }

  function buildUI() {
    const fab = document.createElement('button');
    fab.id = 'xr-fab';
    fab.textContent = '⚙';
    fab.addEventListener('click', function (e) {
      e.stopPropagation();
      ta.value = currentJson();
      updateCount();
      panel.style.display = 'flex';
    }, true);
    document.body.appendChild(fab);

    panel = document.createElement('div');
    panel.id = 'xr-panel';
    panel.innerHTML =
      '<div class="box">' +
      '<div class="tip">备注 JSON,可直接编辑。共 <b id="xr-count"></b> 条。' +
      '换设备或清缓存前用「复制导出」备份。</div>' +
      '<textarea spellcheck="false"></textarea>' +
      '<div class="row">' +
      '<button type="button" data-act="save">保存导入</button>' +
      '<button type="button" class="sec" data-act="copy">复制导出</button>' +
      '<button type="button" class="sec" data-act="close">关闭</button>' +
      '</div></div>';
    ta = panel.querySelector('textarea');

    panel.addEventListener('click', function (e) {
      if (e.target === panel) { panel.style.display = 'none'; return; }
      const btn = e.target.closest && e.target.closest('[data-act]');
      if (!btn) return;
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === 'close') panel.style.display = 'none';
      if (act === 'copy') doCopy();
      if (act === 'save') doSave();
    }, true);
    document.body.appendChild(panel);
    updateCount();
  }

  function updateCount() {
    const el = document.getElementById('xr-count');
    if (el) el.textContent = String(lcIndex.size);
  }

  function doCopy() {
    const text = ta.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast('已复制到剪贴板'); },
        function () { ta.select(); toast('已选中,请手动复制'); }
      );
    } else {
      ta.select();
      toast('已选中,请手动复制');
    }
  }

  function doSave() {
    let obj;
    try { obj = JSON.parse(ta.value); }
    catch (e) { toast('JSON 格式有误'); return; }
    if (!obj || typeof obj !== 'object') { toast('需要一个 JSON 对象'); return; }
    store = obj;
    rebuildIndex();
    persist();
    updateCount();
    panel.style.display = 'none';
    rerender();
    toast('已导入 ' + lcIndex.size + ' 条备注');
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
    loadStore();
    injectStyle();
    applyTheme(true);
    bindDelegation();          // 先绑委托,后续任何节点都自动生效
    await waitForMain();
    buildUI();
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
