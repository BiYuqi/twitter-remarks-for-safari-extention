// ==UserScript==
// @name         X Remarks 推特备注
// @namespace    byte.local
// @version      1.1.0
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
  "@0xRenaissance": "老外KOL",
  "@0xSleepinRain": "睡裙群主",
  "@0xSleuth_": "英文区影响力KOL",
  "@0xTaiBai": "交易玩家-收费",
  "@0x_CryptoAu": "Base链研究",
  "@0xbor": "kolscan创始人",
  "@0xcarnation": "SHROOM dev",
  "@0xdetweiler": "机器人赛道研究",
  "@0xfanfanfan": "畜生开盘割人",
  "@0xfengxun": "新币玩家",
  "@0xlong_life": "SOL&ICM",
  "@9yointern": "Jup 项目方",
  "@AI_BRK": "AIBRK Tech Lead",
  "@Alvin0617": "睡神推荐",
  "@AndreCronjeTech": "AC Sonic创始人 口碑一般 DeFi元老",
  "@ArrowFinanceio": "RH 借贷",
  "@AveryChing": "APT CEO",
  "@BTCKiK": "一级有点厉害",
  "@Barret_China": "阿里开发",
  "@BeatingOfficial": "深度报道",
  "@Blonskr": "BEM 挖矿",
  "@BruceBlue": "有点厉害",
  "@CEOAdam": "AMC CEO",
  "@CG_BRC20": "比特币事件跟踪",
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
  "@Entelic_Aria": "orbio 竟品？",
  "@ExitLiqCapital": "交易员-睡神推荐",
  "@FarmerJoe0x": "有点意思，可能有早期alpha",
  "@Fliptfun": "Launchpad on  @arc",
  "@ForrestOLAB": "诈骗犯项目",
  "@FuzzyBull": "交易员-睡神推荐",
  "@Ga__ke": "尼玛DNF",
  "@GeoffreyHuntley": "RALPH畜生开发者",
  "@HYPERTXT__": "TapeOut core member",
  "@HeetTike": "Noice",
  "@Hookrfun": "v4 hook 规则市场",
  "@IncomeSharks": "股票和加密货币分析与预测",
  "@JUST_DO_ITS7": "Bonk冲狗",
  "@JackDishman": "Clanker DEV",
  "@JohannKerbrat": "Robinhood 业务负责人",
  "@Kawasakitesu": "看起来也是装逼的",
  "@KelseyWeb3VC": "二级交易 & 趋势",
  "@Kong408": "Creator合伙人",
  "@LongzuAlpha": "打狗",
  "@MEADGod": "PONS 开发",
  "@MLeeJr": "LFI创始人",
  "@MaWanShuooo": "Base链研究",
  "@Master_Jobber": "老骗子",
  "@McCain889": "避而远之",
  "@MichaelHirsch": "SLOP Dev",
  "@MichaelandMa": "Creator创世人 | 甩手掌柜？",
  "@Moshdottrade": "AI swarm 锁 bundle、双边做市",
  "@MrGafish": "提示词",
  "@Mudo9453": "SOL agency榜一",
  "@Murphychen888": "数据“分析师”",
  "@Natan_benish": "Long联合创始人",
  "@NavenNetwork": "RH x402",
  "@Neon2089": "投研搞起",
  "@NodarJ": "Hookr Dev",
  "@NousResearch": "Hermes创始人",
  "@OxSimpleFarmer": "RH生态 StonkBrokers",
  "@PareStocks": "Stock pendle on RH",
  "@PayAINetwork": "x402",
  "@RKST_xyz": "合作购买火箭？RH meme",
  "@Real0xLiam": "链上玩家",
  "@RicardoBitget": "畜生开盘割人",
  "@SemiAnalysis_": "专门拆解 英伟达 美光HBM GPU",
  "@SendNudesRH": "SNAP配对股票",
  "@Shawred0": "AI相关研究",
  "@SimpPolice911": "小黄文",
  "@SingItAgent": "x402",
  "@SolportTom": "Bonk创始人",
  "@StaniKulechov": "AAVE 创始人",
  "@StriderOnBase": "有点意思的Alpha",
  "@TheRyo_778": "投研",
  "@ThinkingUSD": "说的话好牛逼啊",
  "@VictorOnChain": "STRATTON dev",
  "@VitalikButerin": "ETH创始人",
  "@WallStreet0Name": "趋势交易员",
  "@WeSn0w": "高质量分析？",
  "@YA971718": "避而远之",
  "@Y_babyshow": "链上投研",
  "@YanLiberman": "有趣的观点",
  "@ZephyrTrading": "畜生开盘割人",
  "@_johngranata": "Base 产品？",
  "@_jsmth": "Believe App工程师",
  "@a1lon9": "PUMP CEO ctm",
  "@aaronliubit": "说话挺有深度，观察",
  "@aeyakovenko": "Solana创始人",
  "@ahboyash": "有点东西",
  "@aidaniil": "被黑 发币",
  "@aleabitoreddit": "新股神or还是跳大神",
  "@alu1337": "交易员-睡神推荐",
  "@andy8052": "区块链开发者、加密货币爱好者",
  "@blknoiz06": "黑鬼",
  "@brian_armstrong": "Base CEO",
  "@btcbabycow": "Alpha挖掘- Base",
  "@btcxiage": "诈骗犯",
  "@cb_doge": "马斯克狗腿子",
  "@charliermarsh": "OpenAI",
  "@chickenBrother_": "技术 ｜ 分析师",
  "@clankeronbase": "Clank儿",
  "@cnyzgkc": "AI自媒体",
  "@corbits_dev": "x402 框架",
  "@coresrent": "诈骗",
  "@crypto_popseye": "英文区影响力KOL",
  "@cryptok64440829": "避而远之",
  "@cryptoxiao1127": "感谢6551",
  "@cz_binance": "赵长鹏",
  "@d33v33d0": "西红柿开发者",
  "@danielesesta": "Sonic链Anon Dev",
  "@daosdotfun": "初代发币模式 DAO",
  "@defidude": "crypto 老玩家  Ratspeak 开发和推广",
  "@diamondhandjs": "美女交易员",
  "@diiorioanthony": "以太坊联合创始人",
  "@dontbesilent": "AI营销",
  "@elonmusk": "马斯克",
  "@feltanimalworld": "AI相关",
  "@fiatphobia": "Clan 项目方",
  "@flrande": "投资",
  "@fundstrat": "Tom Lee 华尔街大佬",
  "@gMAKcrypto": "hookr早期发现者",
  "@game_for_one": "Alpha信号KOL",
  "@gammichan": "外国KOL 研究型",
  "@gengdaJ": "AI相关工具研究",
  "@giskandzc": "借贷 Bow",
  "@goocarlos": "Dify CEO",
  "@hansolar21": "交易员-睡神推荐",
  "@higgsfield_ai": "AI视频合成网站",
  "@himgajria": "小心！大割",
  "@hubzify": "避而远之",
  "@hunterweb303": "Web3开发",
  "@iamai_omni": "投资",
  "@iamkadense": "Bonk核心贡献者",
  "@ineedtendies": "SYNTHS dev",
  "@infinit49976199": "撸毛",
  "@insomniacxbt": "加密交易 & 叙事轮动",
  "@iruletrenches": "Base Kol 国内人称行业冥灯",
  "@jacobjong66": "技术牛",
  "@jerallaire": "ARC创始人",
  "@jessepollak": "垃圾杰西",
  "@jimcramer": "反指王",
  "@js_horne": "Zora创始人",
  "@jukan05": "研究员？",
  "@jup_studio": "JUP台子",
  "@klik_evm": "EVN 发射台",
  "@kolscan": "PUMP 收购的项目",
  "@kunlunstar": "算命的？还行",
  "@kv4rl": "交易员-睡神推荐",
  "@kyle": "很牛逼啊",
  "@lanaaielsa": "一级链上",
  "@liaoblove520": "避而远之",
  "@lifefind_itsway": "扒链",
  "@longbowlend": "RH 借贷",
  "@maid_crypto": "臭傻逼",
  "@mayangdarana": "畜生开盘割人",
  "@memorycowmoo": "MU配对 long平台",
  "@metaplex": "SOL上的发射&投融",
  "@mickhagen": "Ripe创始人 借贷",
  "@miles_mazy": "营销/引流/FED",
  "@missoralways": "$memecoin最早喊单的核心人物 英文区KOL",
  "@motiyawerey": "Fomo Trader 推荐",
  "@mrpapawheelie": "Base生态分析",
  "@nanbeiblock": "交易&投研&Alpha",
  "@naval": "二级交易员",
  "@nftsiy": "避而远之",
  "@niuniu255431": "链上玩家",
  "@notthreadguy": "人工智能|兼职主播",
  "@novogratz": "sol链“Tom lee”",
  "@omnifient": "老外KOL",
  "@opinionlabsxyz": "诈骗犯项目",
  "@owen1v9": "大佬复出？还不认识",
  "@pasternak": "Believe创始人",
  "@pmarca": "a16z founder",
  "@poe_real69": "老外喊单KOL",
  "@pointfarmcap": "这叼毛谁？待定",
  "@poteto": "Grok Bot 工程师",
  "@predictionindex": "预测市场聚合站",
  "@qinbafrank": "投资 & 行业分析",
  "@qrcoindotfun": "Base链上竞拍广告位",
  "@rbthreek": "英文区 KOL",
  "@rngzhwn199456": "投资研究",
  "@runes_leo": "预测市场策略 · AI 工具实战 · 独立构建日常",
  "@ryolu_": "Cursor",
  "@ryzzqq": "值得关注",
  "@sama": "OpenAI奥特曼",
  "@saylor": "微策略saylor",
  "@scriptdotmoney": "技术",
  "@shirleyusy": "庄",
  "@shroom_network": "自建流动性 RH项目",
  "@sibeleth": "拿钱办事 国外畜牲",
  "@sidewinder1901": "moonshot营销主管",
  "@sight_hood": "预测市场",
  "@smartestmoney": "待备注",
  "@spncrk": "ORGO 创始人",
  "@stambouli_o1": "o1项目方",
  "@starving_series": "拍短剧的",
  "@stitchdegen": "一级二段博主",
  "@stompymoppybase": "我操，改名了，注意安全",
  "@strattonmrkt": "垃圾股票配对",
  "@stventure_": "投研？",
  "@supercontraa": "alpha",
  "@thetradingstar": "被CoinbaseAsset关注",
  "@tomzhanghui": "搞营销的额",
  "@uponlymodee": "应用币版本T0",
  "@utexocom": "据说是诈骗项目",
  "@waiting027": "投研-Base",
  "@wangyiduo0404": "畜生开盘割人",
  "@web3_home": "避而远之",
  "@wsdxbz1": "电你牛子的王老师",
  "@x0110GYY": "避而远之",
  "@xhanTululu": "Alpha研究",
  "@xmtp_": "高融资 消息通讯",
  "@yetone": "开发者",
  "@yiboyun613": "装逼博主",
  "@zachxbt": "内幕 装逼狗",
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
  let editTagsWrap = null, editTagsList = null;
  let editSuggest = null, suggestItems = [], suggestActive = -1;

  /* ---------- 已有标签(备注按逗号拆成单个标签,去重后按使用人数排序) ----------
   * 多个标签用逗号拼进同一条备注即可,存储格式不变。
   */
  function splitTags(text) {
    return (text || '').split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function getExistingTags() {
    const counts = new Map();
    for (const k of Object.keys(store)) {
      if (!k.startsWith('@')) continue;
      const v = store[k];
      const text = (typeof v === 'string' ? v : (v && v.note)) || '';
      new Set(splitTags(text)).forEach(function (t) {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    }
    return Array.from(counts.entries())
      .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); })
      .map(function (e) { return e[0]; });
  }

  function toggleTag(tag) {
    const list = splitTags(editInput.value);
    const i = list.indexOf(tag);
    if (i >= 0) list.splice(i, 1); else list.push(tag);
    editInput.value = list.join(', ');
    renderTagChips();
    hideSuggest();
  }

  function renderTagChips() {
    if (!editTagsList) return;
    const tags = getExistingTags();
    editTagsWrap.style.display = tags.length ? '' : 'none';
    editTagsList.textContent = '';
    const current = splitTags(editInput.value);
    tags.forEach(function (t) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip' + (current.indexOf(t) >= 0 ? ' on' : '');
      chip.dataset.etag = t;
      chip.textContent = t;
      editTagsList.appendChild(chip);
    });
  }

  /* ---------- 输入联想:按当前正在输入的那一段(最后一个逗号之后)匹配已有标签 ---------- */
  function currentSegment() {
    const v = editInput.value;
    const i = Math.max(v.lastIndexOf(','), v.lastIndexOf('，'));
    return v.slice(i + 1).trim();
  }

  function renderSuggest() {
    if (!editSuggest) return;
    const q = currentSegment().toLowerCase();
    suggestItems = [];
    suggestActive = -1;
    if (q) {
      const used = splitTags(editInput.value);
      used.pop(); // 最后一段就是正在输入的 q,本身不算"已用"
      const prefix = [], contains = [];
      getExistingTags().forEach(function (t) {
        if (used.indexOf(t) >= 0) return;
        const lt = t.toLowerCase();
        if (lt === q) return; // 已经完整输入,不必再提示
        const i = lt.indexOf(q);
        if (i === 0) prefix.push(t); else if (i > 0) contains.push(t);
      });
      suggestItems = prefix.concat(contains).slice(0, 8);
    }
    editSuggest.textContent = '';
    suggestItems.forEach(function (t, i) {
      const item = document.createElement('div');
      item.className = 'opt';
      item.dataset.esug = String(i);
      item.textContent = t;
      editSuggest.appendChild(item);
    });
    editSuggest.style.display = suggestItems.length ? '' : 'none';
  }

  function hideSuggest() {
    suggestItems = [];
    suggestActive = -1;
    if (editSuggest) editSuggest.style.display = 'none';
  }

  function moveSuggest(d) {
    const n = suggestItems.length;
    suggestActive = (suggestActive + d + n + 2) % (n + 1) - 1; // -1 表示不选中
    Array.prototype.forEach.call(editSuggest.children, function (el, i) {
      el.classList.toggle('on', i === suggestActive);
      if (i === suggestActive) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function pickSuggest(i) {
    const tag = suggestItems[i];
    if (!tag) return;
    const list = splitTags(editInput.value);
    list.pop(); // 用选中的标签替换正在输入的那一段
    if (list.indexOf(tag) < 0) list.push(tag);
    editInput.value = list.join(', ');
    hideSuggest();
    renderTagChips();
    try { editInput.focus(); } catch (e) {}
  }

  function buildEditor() {
    editBox = document.createElement('div');
    editBox.id = 'xr-edit';
    editBox.innerHTML =
      '<div class="box">' +
      '<div class="t"></div>' +
      '<div class="input-wrap">' +
      '<input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" />' +
      '<div class="suggest" style="display:none"></div>' +
      '</div>' +
      '<div class="tags-wrap">' +
      '<div class="tags-label">已有标签(点击添加/取消):</div>' +
      '<div class="tags"></div>' +
      '</div>' +
      '<div class="row">' +
      '<button type="button" data-eact="save">保存</button>' +
      '<button type="button" class="sec" data-eact="del">删除</button>' +
      '<button type="button" class="sec" data-eact="cancel">取消</button>' +
      '</div></div>';
    document.body.appendChild(editBox);
    editInput = editBox.querySelector('input');
    editTitle = editBox.querySelector('.t');
    editTagsWrap = editBox.querySelector('.tags-wrap');
    editTagsList = editBox.querySelector('.tags');
    editSuggest = editBox.querySelector('.suggest');

    editBox.addEventListener('click', function (e) {
      if (e.target === editBox) { closeEditor(); return; }
      const opt = e.target.closest && e.target.closest('[data-esug]');
      if (opt) { e.stopPropagation(); pickSuggest(+opt.dataset.esug); return; }
      const chip = e.target.closest && e.target.closest('[data-etag]');
      if (chip) { e.stopPropagation(); toggleTag(chip.dataset.etag); return; }
      if (!(e.target.closest && e.target.closest('.input-wrap'))) hideSuggest();
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

    // 不在 blur 时收起下拉:iOS 上点下拉项的时序和桌面不同,blur 先到会把列表收掉、
    // click 落空。收起只走"点弹窗内其它位置 / 选中 / 关闭弹窗"。
    // 桌面 Safari 点下拉项时阻止 input 失焦,保持键盘焦点。
    editSuggest.addEventListener('mousedown', function (e) { e.preventDefault(); });
    editInput.addEventListener('input', function () { renderTagChips(); renderSuggest(); });
    editInput.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return; // 中文输入法选词中的回车不处理
      const open = suggestItems.length > 0;
      if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        moveSuggest(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (open && e.key === 'Tab') {
        e.preventDefault();
        pickSuggest(suggestActive >= 0 ? suggestActive : 0);
        return;
      }
      if (open && suggestActive >= 0 && e.key === 'Enter') {
        e.preventDefault();
        pickSuggest(suggestActive);
        return;
      }
      if (open && e.key === 'Escape') { hideSuggest(); return; }
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
    hideSuggest();
  }

  function promptEdit(username) {
    if (!username) return;
    if (!editBox) buildEditor();
    editTarget = username;
    const cur = getStyleFor(username);
    editTitle.textContent = '备注 ' + username;
    editInput.value = cur ? cur.text : '';
    renderTagChips();
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

  // 转帖头部用:行内药丸,和"XX 已转帖"文字并排
  function makeInlineTagRow(username, noteObj) {
    const row = document.createElement('span');
    row.className = TAG_CLASS;
    row.dataset.handle = username;
    row.dataset.xrFor = username;
    row.style.cssText =
      'display:inline-flex;vertical-align:middle;margin-left:6px;' +
      'position:relative;z-index:9998;';

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.dataset.xrEdit = username;
    pill.textContent = noteObj.text;
    pill.style.cssText =
      'display:inline-block;background:' + noteObj.bg + ';color:#fff;font-weight:700;' +
      'font-size:' + noteObj.fontSize + ';padding:2px 8px;border-radius:' + noteObj.radius + ';' +
      'white-space:nowrap;text-align:left;' +
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
      /^(?:https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com)?\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/
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
  // X 的 DOM 结构在同一种场景下是稳定的,所以按场景(timeline/usercell)缓存
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
   * 渲染:时间线 / 转帖头部 / 用户列表
   * 根用 document 而不是 main —— 转发者、点赞者这类列表可能是
   * div[role="dialog"] 弹层,在 main 外面,只扫 main 会漏掉。
   * ============================================================ */
  function decorate(block, ctx, anchorFn, handleFn) {
    const handle = handleFn ? handleFn(block) : handleOf(block);
    if (!handle) return;
    if (block.dataset.xrHandle === handle) return;

    // 虚拟列表复用节点:先移除这个区块自己的旧徽章,否则会串号
    const old = badgeOwner.get(block);
    if (old && old.parentElement) old.remove();
    badgeOwner.delete(block);

    block.dataset.xrHandle = handle;

    const noteObj = getStyleFor(handle);

    if (ctx === 'socialContext') {
      // "已转帖"文字用 -webkit-line-clamp 做省略,那个 span 本身是块级盒子,
      // 插进它的父级 <a> 后依然会被挤到下一行 —— <a> 默认不是 flex,
      // 必须显式把 <a> 设成 display:flex,徽章才会和文字在同一行排开。
      // 节点被虚拟列表回收复用、换成没有备注的人时,也要把强制样式撤掉。
      const link = block.closest('a[href]') || block;
      if (!noteObj) {
        link.style.display = '';
        link.style.alignItems = '';
        link.style.flexWrap = '';
        return;
      }
      link.style.display = 'flex';
      link.style.alignItems = 'center';
      link.style.flexWrap = 'wrap';
      const node = makeInlineTagRow(handle, noteObj);
      link.appendChild(node);
      badgeOwner.set(block, node);
      return;
    }

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

  // 转帖头部("XX 已转帖"):data-testid="socialContext" 挂在一个 <span> 上
  // (不是 div,选择器不能锁标签),块本身没有 <a>——链接是它的外层祖先,
  // 要从祖先取 href,不能像别处那样往子节点里找。
  function socialContextHandle(block) {
    const a = block.closest('a[href]');
    return a ? handleFromHref(a.getAttribute('href')) : null;
  }

  function addNotesToSocialContext() {
    document.querySelectorAll('[data-testid="socialContext"]').forEach(function (block) {
      decorate(block, 'socialContext', null, socialContextHandle);
    });
  }

  // 关注/粉丝列表、搜索的用户 tab、转发者列表:这些用 UserCell,里面没有 User-Name。
  // 从 @handle 那个 span 起找纵向容器,徽章正好落在 handle 行下面、简介上面。
  // UserCell 不一定是 div(整行可点的列表里是 <button>),选择器不能锁标签。
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
    addNotesToSocialContext();
    addNotesToUserCells();
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

      /* ---- 输入联想下拉 ---- */
      '#xr-edit .input-wrap{position:relative;}',
      '#xr-edit .suggest{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:1;',
      'max-height:232px;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:4px;',
      'border-radius:10px;background:var(--xr-bg,#fff);box-sizing:border-box;',
      'border:1px solid var(--xr-input-border,rgba(60,60,67,.15));',
      'box-shadow:var(--xr-shadow,0 8px 24px rgba(0,0,0,.18));}',
      '#xr-edit .suggest .opt{padding:10px 12px;border-radius:7px;font-size:15px;line-height:1.3;',
      'color:var(--xr-input-fg,#1c1c1e);cursor:pointer;word-break:break-all;',
      'touch-action:manipulation;-webkit-user-select:none;user-select:none;}',
      '#xr-edit .suggest .opt:active{background:var(--xr-input,#f2f2f7);}',
      '#xr-edit .suggest .opt.on{background:var(--xr-accent,#007aff);color:#fff;}',

      /* ---- 已有标签(点击追加到输入框) ---- */
      '#xr-edit .tags-wrap{display:flex;flex-direction:column;gap:6px;}',
      '#xr-edit .tags-label{font-size:12px;color:var(--xr-muted,rgba(60,60,67,.6));}',
      '#xr-edit .tags{display:flex;flex-wrap:wrap;gap:6px;max-height:120px;overflow-y:auto;',
      '-webkit-overflow-scrolling:touch;}',
      '#xr-edit .tags .chip{padding:6px 12px !important;border-radius:999px !important;',
      'font-size:13px !important;font-weight:500 !important;margin:0 !important;',
      'border:1px solid var(--xr-input-border,rgba(60,60,67,.15)) !important;',
      'background:var(--xr-input,#f2f2f7) !important;color:var(--xr-input-fg,#1c1c1e) !important;',
      'font-family:inherit !important;line-height:1.3 !important;cursor:pointer;',
      'touch-action:manipulation;-webkit-appearance:none;appearance:none;',
      'transition:transform .08s;}',
      '#xr-edit .tags .chip:active{transform:scale(.95);}',
      '#xr-edit .tags .chip.on{background:var(--xr-accent,#007aff) !important;',
      'border-color:var(--xr-accent,#007aff) !important;color:#fff !important;}',

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
