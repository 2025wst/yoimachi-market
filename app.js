/* ============================================================
   羲皇寻踪 · 淮阳太昊陵
   四幕互动框架
   ============================================================ */

(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var app = $('#app');
  var veil = $('#veil');
  var toastEl = $('#toast');
  var panel = $('#panel');
  var drawer = $('#drawer');
  var gateway = $('#gateway');
  var mapCamera = $('#mapCamera');

  var SAVE_KEY = 'taihaoling-pass-v1';

  /* ---------------- 数据 ---------------- */

  var TASKS = {
    tiger: {
      act: 2, group: '第二幕 · 入市', label: '瑞虎坊 · 拼装',
      title: '拼一只布老虎', kicker: '集市 · 瑞虎坊',
      body: '从托盘里把裁片拖到虚线位置，七片摆好，一只小布老虎就做好了。做好的布老虎会收进背包。',
      need: 1, art: 'tiger', stage: 'none'
    },
    bun: {
      act: 2, group: '第二幕 · 入市', label: '馍香坊 · 吃掉',
      title: '吃一个压缩馍', kicker: '集市 · 馍香坊',
      body: '“压缩馍，压缩馍，小孩吃了考大学。”刚出炉的压缩馍，一口一口吃掉，最后会剩一个挂件。',
      need: 1, art: 'bun', stage: 'none'
    },
    sachet: {
      act: 3, group: '第三幕 · 朝门', label: '香薰坊 · 配香',
      title: '配一只香囊', kicker: '内街 · 香薰坊',
      body: '六味香药摆在摊上：薰衣草、玫瑰、柠檬、薄荷叶、檀香、洋甘菊。挑三味拖进香囊，再选一只喜欢的囊袋颜色，系上袋口。',
      need: 1, art: 'sachet', stage: 'choices', choices: ['薰衣草', '玫瑰', '柠檬', '薄荷叶', '檀香', '洋甘菊']
    },
    sugar: {
      act: 3, group: '第三幕 · 朝门', label: '泥泥狗工坊 · 听故事',
      title: '听泥泥狗讲自己', kicker: '内街 · 泥泥狗工坊',
      body: '店里一排手工泥泥狗，点一只，它会用第一人称讲讲自己身上的花纹；六只都听过，就能收下泥泥狗挂件。',
      need: 1, art: 'sugar', stage: 'choices', choices: ['阿黑', '小白', '小玉', '红红', '小翠', '阿黄']
    },
    gate: {
      act: 3, group: '第三幕 · 朝门', label: '午朝门 · 推门',
      title: '推开午朝门', kicker: '第三幕 · 朝门',
      body: '午朝门是太昊陵正门，红门金钉，中门九排九路，两侧七排九路。推门，才算真正入陵。',
      need: 1, art: 'gate', stage: 'none'
    },
    tongtian: {
      act: 4, group: '第四幕 · 陵庙', label: '统天殿 · 上香', spot: true,
      title: '统天殿前三炷香', kicker: '陵庙 · 统天殿',
      body: '统天殿是太昊陵内等级最高的殿宇，通高 15.7 米，面阔五间，供奉太昊伏羲氏像，是历代祭祖大典的中心。点三炷香。',
      need: 3, art: 'incense', stage: 'incense'
    },
    bagua: {
      act: 4, group: '第四幕 · 陵庙', label: '八卦坛 · 问卦', spot: true,
      title: '揲蓍问卦', kicker: '陵庙 · 八卦坛',
      body: '八卦坛在太始门之后，传为伏羲画卦之处。先点开八卦看每一卦的含义，再点坛心太极抽卦问签，答对即可通关。',
      need: 1, art: 'bagua', stage: 'choices', choices: ['乾', '坤', '震', '巽']
    },
    tomb: {
      act: 4, group: '第四幕 · 陵庙', label: '伏羲陵墓 · 绕陵', spot: true,
      title: '绕陵一周', kicker: '陵庙 · 伏羲陵墓',
      body: '太昊陵墓高二十余米，上圆下方，是中国唯一的上圆下方陵墓形制。绕陵一周，是礼敬。',
      need: 3, art: 'tomb', stage: 'repeat', action: '绕陵一步'
    },
    shicao: {
      act: 4, group: '第四幕 · 陵庙', label: '蓍草园 · 数蓍草', spot: true,
      title: '数三株蓍草', kicker: '陵庙 · 蓍草园',
      body: '蓍草园在陵墓之后。相传伏羲以蓍草画八卦，蓍草也就成了“神草”。数三株。',
      need: 3, art: 'grass', stage: 'grass'
    },
    beilin: {
      act: 4, group: '第四幕 · 陵庙', label: '碑林 · 拓碑', spot: true,
      title: '拓一方碑', kicker: '陵庙 · 碑林',
      body: '碑林里立着历代祭陵碑。选一种书体，把碑上的字拓下来，带一份墨香走。',
      need: 1, art: 'beilin', stage: 'choices', choices: ['篆', '隶', '楷']
    }
  };

  var ORDER = ['tiger', 'bun', 'sachet', 'sugar', 'gate', 'tongtian', 'bagua', 'tomb', 'shicao', 'beilin'];

  var SPOTS = [
    { id: 'tongtian', name: '统天殿', x: 47.0, y: 61.5, w: 46, h: 19 },
    { id: 'bagua', name: '八卦坛', x: 47.0, y: 46.5, w: 24, h: 11, round: true },
    { id: 'tomb', name: '伏羲陵墓', x: 48.0, y: 32.5, w: 30, h: 15 },
    { id: 'shicao', name: '蓍草园', x: 48.0, y: 18.5, w: 48, h: 17 },
    { id: 'beilin', name: '碑林', x: 83.0, y: 44.5, w: 30, h: 23 }
  ];

  var INNER_SHOPS = [
    { x: 60, name: '香囊', accent: '#8E8C79', goods: ['#8E8C79', '#7A5B48', '#B19C84'] },
    { x: 480, name: '糖画', accent: '#B19C84', goods: ['#C7B49C', '#94745D', '#8E8C79'] },
    { x: 900, name: '茶棚', accent: '#8A6A55', goods: ['#6F5B4A', '#B19C84', '#7A5B48'] },
    { x: 1320, name: '香烛', accent: '#8A6A55', goods: ['#8A6A55', '#B19C84', '#3A332C'] },
    { x: 1740, name: '福袋', accent: '#7A5B48', goods: ['#7A5B48', '#B19C84', '#8E8C79'] }
  ];

  var MARKET_STALLS = [];

  var INNER_STALLS = [
    { id: 'sachet', x: 360, name: '香囊', tag: '点我 · 配一只香囊', accent: '#8E8C79', goods: ['#8E8C79', '#7A5B48', '#B19C84'] },
    { id: 'sugar', x: 1120, name: '糖画', tag: '点我 · 转一个糖画', accent: '#B19C84', goods: ['#C7B49C', '#94745D', '#8E8C79'] }
  ];

  var ROBES = ['#5E4C40', '#8A6A55', '#7A5B48', '#8B8C78', '#8A6A55', '#7C8285', '#8A6A55', '#4E4036', '#8A6A55'];

  /* ---------------- 状态 ---------------- */

  var state = {
    tasks: [],
    visited: [1],
    name: '羲皇故都探索者',
    muted: false
  };

  // 每次重新进入游戏都重置打卡与互动进度，只保留静音设置；
  // 但同一标签页内的意外刷新（浏览器回收页面、误下拉刷新）会恢复刚才的进度与当前幕
  var SNAPSHOT_KEY = 'taihaoling-session-v1';
  var snapSession = null;
  (function resetOnEntry() {
    var mutedPref = false;
    try {
      var old = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (old && typeof old === 'object') mutedPref = !!old.muted;
      localStorage.removeItem(SAVE_KEY);
      var raw = sessionStorage.getItem(SNAPSHOT_KEY);
      if (raw) snapSession = JSON.parse(raw);
    } catch (err) { /* ignore */ }
    state.tasks = [];
    state.visited = [1];
    state.name = '羲皇故都探索者';
    state.muted = mutedPref;
    if (snapSession && snapSession.state && typeof snapSession.state === 'object') {
      var s = snapSession.state;
      if (Array.isArray(s.tasks)) state.tasks = s.tasks.slice();
      if (Array.isArray(s.visited)) state.visited = s.visited.slice();
      if (typeof s.name === 'string' && s.name) state.name = s.name;
      state.muted = !!s.muted;
      if (snapSession.act) state._restoreAct = snapSession.act;
    }
  })();

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (err) { /* ignore */ }
    try { sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ state: state, act: currentAct })); } catch (err) { /* ignore */ }
  }

  function has(id) { return state.tasks.indexOf(id) !== -1; }

  /* ---------------- 声音 ---------------- */

  var ctx = null;

  function audioCtx() {
    if (!ctx) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try { ctx = new Ctx(); } catch (err) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    return ctx;
  }

  function tone(freq, dur, gain, type, when) {
    if (state.muted) return;
    var ac = audioCtx();
    if (!ac) return;
    var t = ac.currentTime + (when || 0);
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.05, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(dur, gain, freq, type) {
    if (state.muted) return;
    var ac = audioCtx();
    if (!ac) return;
    var len = Math.max(1, Math.floor(ac.sampleRate * dur));
    var buf = ac.createBuffer(1, len, ac.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    var src = ac.createBufferSource();
    src.buffer = buf;
    var f = ac.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.value = freq || 900;
    var g = ac.createGain();
    g.gain.value = gain || 0.05;
    src.connect(f);
    f.connect(g);
    g.connect(ac.destination);
    src.start();
  }

  var sfx = {
    chime: function () { tone(660, 0.5, 0.035, 'sine'); tone(880, 0.6, 0.025, 'sine', 0.08); },
    bell: function () {
      tone(220, 1.8, 0.06, 'sine');
      tone(440, 1.4, 0.03, 'sine');
      tone(660, 1.1, 0.018, 'sine');
      tone(880, 0.8, 0.012, 'sine');
    },
    thud: function () { tone(76, 0.35, 0.16, 'sine'); noiseBurst(0.18, 0.06, 220, 'lowpass'); },
    creak: function () { noiseBurst(0.55, 0.05, 380, 'lowpass'); tone(130, 0.5, 0.02, 'sawtooth'); },
    whoosh: function () { noiseBurst(0.35, 0.035, 700, 'bandpass'); },
    tick: function () { tone(520, 0.08, 0.02, 'triangle'); },
    crunch: function () {
      // 更像真实咬一口：闷软的低频「噗嗤」+ 一点点面皮摩擦，不刺耳
      noiseBurst(0.30, 0.030, 520, 'lowpass');
      noiseBurst(0.16, 0.020, 300, 'lowpass');
      tone(132, 0.22, 0.020, 'sine', 0.012);
      tone(96, 0.30, 0.014, 'sine', 0.05);
    },
    pop: function () { tone(420, 0.12, 0.025, 'sine'); tone(620, 0.1, 0.015, 'sine', 0.04); },
    snip: function () { noiseBurst(0.08, 0.04, 2400, 'highpass'); }
  };

  /* ---------------- 通用 UI ---------------- */

  var toastTimer = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }

  function showStamp(text) {
    var el = document.createElement('div');
    el.className = 'mini-stamp';
    el.textContent = text || '已打卡';
    app.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
  }

  /* ---------------- 幕切换 ---------------- */

  var actEls = {
    1: $('.act--1'),
    2: $('.act--2'),
    3: $('.act--3'),
    4: $('.act--4'),
    final: $('.act--final')
  };
  var currentAct = 1;
  var busy = false;

  function setAct(n) {
    currentAct = n;
    // 开始页没有可返回的地方，隐藏「上一步」
    var gb = document.getElementById('globalBack');
    if (gb) gb.style.display = (String(n) === '1') ? 'none' : '';
    Object.keys(actEls).forEach(function (key) {
      actEls[key].classList.toggle('is-active', String(key) === String(n));
    });
    app.dataset.act = String(n);
    if (typeof n === 'number' && n >= 2 && state.visited.indexOf(n) === -1) {
      state.visited.push(n);
    }
    save();
    updateChapters();
    if (n === 2 && window.Scene3D && Scene3D.resize) Scene3D.resize();
    if (n === 3 && streetInner.resize) streetInner.resize();
    if (n === 3 && window.InnerScene && InnerScene.resize) InnerScene.resize();
    if (n === 4) { renderSpots(); preloadNow(ACT4_IMAGES); }
    if (n === 3) preloadNow(ACT3_IMAGES);
    var iv = document.getElementById('inner2dVideo');
    if (iv) {
      if (String(n) === '3') { try { var ip = iv.play(); if (ip && ip.catch) ip.catch(function () {}); } catch (e) {} }
      else { try { iv.pause(); } catch (e) {} }
    }
    var mv = document.getElementById('market2dVideo');
    if (mv) {
      if (String(n) === '2') { try { var mp = mv.play(); if (mp && mp.catch) mp.catch(function () {}); } catch (e) {} }
      else { try { mv.pause(); } catch (e) {} }
    }
  }

  var capsShown = {};
  function showStoryCard(innerHTML) {
    var ov = document.createElement('div');
    ov.className = 'act-caption is-story';
    ov.innerHTML = '<div class="act-caption__card">' + innerHTML +
      '<p class="act-caption__hint">轻触继续</p></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('is-on'); });
    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      ov.classList.remove('is-on');
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 380);
    }
    ov.addEventListener('click', dismiss);
    ov.addEventListener('touchstart', dismiss, { passive: true });
    window.__dismissStoryCard = dismiss;
    return ov;
  }

  function flashCaption(n) {
    if (capsShown[n]) return;
    var src = n === 2 ? document.querySelector('.act--2 .market-title')
            : (n === 3 ? document.querySelector('.act--3 .inner3d-title') : null);
    if (!src) return;
    capsShown[n] = true;
    var ov = document.createElement('div');
    ov.className = 'act-caption';
    ov.innerHTML = '<div class="act-caption__card">' + src.innerHTML + '<p class="act-caption__hint">轻触继续</p></div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('is-on'); });
    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      ov.classList.remove('is-on');
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 380);
    }
    ov.addEventListener('click', dismiss);
    ov.addEventListener('touchstart', dismiss, { passive: true });
    window.__dismissCaption = dismiss;
  }

  function goTo(n, delay) {
    if (busy || n === currentAct) return;
    busy = true;
    veil.classList.add('is-on');
    sfx.whoosh();
    setTimeout(function () {
      setAct(n);
      if (n === 2 || n === 3) setTimeout(function () { flashCaption(n); }, 150);
      var ab = document.getElementById('appBack');
      if (ab) ab.classList.toggle('is-on', n === 3);
      setTimeout(function () {
        veil.classList.remove('is-on');
        busy = false;
      }, 120);
    }, delay || 460);
  }

  /* ---------------- 街景生成 ---------------- */

  function shopHTML(s, i) {
    var goods = s.goods.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('');
    return '<article class="shop ' + (i % 2 ? 'shop--lantern-b' : 'shop--lantern-a') + ' shop--v' + (i % 3) + '" style="left:' + s.x + 'px;--accent:' + s.accent + '">' +
      '<div class="shop__roof"></div>' +
      '<div class="shop__body"><div class="shop__opening">' +
      '<span class="shop__shelf"></span>' +
      '<span class="shop__keeper"><svg viewBox="0 0 40 90" aria-hidden="true"><use href="#personShape"/></svg></span>' +
      '<span class="shop__counter"></span>' +
      '</div></div>' +
      '<div class="shop__sign">' + s.name + '</div>' +
      '<div class="shop__awning"></div>' +
      '<div class="shop__goods">' + goods + '</div>' +
      '<span class="shop__lantern"></span>' +
      '</article>';
  }

  function stallHTML(s) {
    var goods = s.goods.map(function (c) { return '<i style="background:' + c + '"></i>'; }).join('');
    return '<button class="stall' + (has(s.id) ? ' is-done' : '') + '" type="button" data-task="' + s.id + '" style="left:' + s.x + 'px;--stall-a:' + s.accent + '" aria-label="' + s.name + '">' +
      '<span class="stall__tag">' + (has(s.id) ? '已完成 · ' + s.name : s.tag) + '</span>' +
      '<span class="stall__back"></span>' +
      '<span class="stall__awning"></span>' +
      '<span class="stall__table"></span>' +
      '<span class="stall__cloth"></span>' +
      '<span class="stall__goods">' + goods + '</span>' +
      '<span class="stall__vendor"><svg viewBox="0 0 40 90" aria-hidden="true"><use href="#personShape"/></svg></span>' +
      '<span class="stall__sign">' + s.name + '</span>' +
      '<span class="stall__lamp"></span>' +
      '<span class="stall__ring"></span>' +
      '</button>';
  }

  function crowdHTML(width, count, seed) {
    var out = '';
    var rnd = mulberry(seed || 7);
    for (var i = 0; i < count; i++) {
      var x = Math.round(rnd() * width);
      var w = 28 + Math.round(rnd() * 26);
      var hat = rnd() > 0.72;
      var b = (1 + rnd() * 9).toFixed(1);
      var color = ROBES[Math.floor(rnd() * ROBES.length)];
      out += '<span class="person' + (hat ? ' person--hat' : '') + '" style="left:' + x + 'px;--w:' + w + 'px;--h:' + (w * 2.15).toFixed(0) + 'px;--b:' + b + '%;--c:' + color + ';--o:' + (0.7 + rnd() * 0.3).toFixed(2) + ';animation-delay:-' + (rnd() * 3).toFixed(2) + 's">' +
        '<svg viewBox="0 0 40 90" aria-hidden="true"><use href="#personShape"/></svg></span>';
    }
    return out;
  }

  function crowdFront() {
    var out = '';
    [40, 260, 2700, 2860].forEach(function (x, i) {
      var w = 90 + (i % 2) * 20;
      out += '<span class="person person--front" style="left:' + x + 'px;--w:' + w + 'px;--h:' + (w * 2.2) + 'px;--b:-1%;--c:#2E2822;--o:.75;animation-delay:-' + (i * 0.8) + 's">' +
        '<svg viewBox="0 0 40 90" aria-hidden="true"><use href="#personShape"/></svg></span>';
    });
    return out;
  }

  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function midStallHTML(x, name, accent) {
    return '<div class="mid-stall" style="left:' + x + 'px;--stall-a:' + accent + '">' +
      '<span class="mid-stall__awning"></span>' +
      '<span class="mid-stall__table"></span>' +
      '<span class="mid-stall__goods"><i style="background:#B19C84"></i><i style="background:#8A6A55"></i><i style="background:#8E8C79"></i></span>' +
      '<span class="mid-stall__vendor"><svg viewBox="0 0 40 90" aria-hidden="true"><use href="#personShape"/></svg></span>' +
      '<span class="mid-stall__sign">' + name + '</span>' +
      '</div>';
  }

  function bannerHTML(x, text, i) {
    return '<span class="banner" style="left:' + x + 'px;animation-delay:-' + (i * 0.7) + 's">' + text + '</span>';
  }

  function lanternHTML(x, i) {
    return '<span class="lantern" style="left:' + x + 'px;animation-delay:-' + (i * 0.55).toFixed(2) + 's"></span>';
  }

  function farHTML(count) {
    var out = '';
    for (var i = 0; i < count; i++) {
      out += '<div class="far-hall" style="left:' + (i * 380 - 40) + 'px;opacity:' + (0.35 + (i % 3) * 0.08).toFixed(2) + ';transform:scale(' + (0.85 + (i % 4) * 0.08).toFixed(2) + ')">' +
        '<div class="far-hall__roof"></div><div class="far-hall__body"></div></div>';
    }
    return out;
  }

  function steamHTML(list) {
    return list.map(function (s, i) {
      return '<i style="--x:' + s.x + 'px;--b:' + s.b + '%;--s:' + s.s + 'px;--t:' + s.t + 's;--d:-' + (i * 0.6).toFixed(1) + 's;--dx:' + s.dx + 'px"></i>';
    }).join('');
  }

  function buildInner() {
    $('#innerShops').innerHTML = INNER_SHOPS.map(shopHTML).join('');
    $('#innerBanners').innerHTML = [
      [700, '朝祖'], [1700, '入陵']
    ].map(function (b, i) { return bannerHTML(b[0], b[1], i); }).join('');
    $('#innerLanterns').innerHTML = [100, 360, 620, 880, 1140, 1400, 1660, 1920, 2180, 2440, 2700, 2920].map(lanternHTML).join('');
    $('#innerStalls').innerHTML = [[240,'香烛','#7A5B48'],[760,'福袋','#8A6A55'],[1280,'书摊','#7C8285'],[1800,'茶汤','#8A6A55'],[2300,'面人','#B19C84']].map(function (m) { return midStallHTML(m[0], m[1], m[2]); }).join('') + INNER_STALLS.map(stallHTML).join('');
    $('#innerCrowd').innerHTML = crowdHTML(2960, 54, 29)
    $('#innerSteam').innerHTML = steamHTML([
      { x: 520, b: 17, s: 46, t: 7, dx: 12 },
      { x: 1280, b: 18, s: 52, t: 6.5, dx: -12 },
      { x: 1900, b: 16, s: 38, t: 8, dx: 8 }
    ]);
    var far = $('.far-roofs--temple');
    far.innerHTML = farHTML(7);
  }

  /* ---------------- 街景镜头 ---------------- */

  function createStreet(opts) {
    var world = opts.world;
    var viewport = opts.viewport;
    var bar = opts.bar;
    var label = opts.label;
    var title = opts.title;
    var name = opts.name;
    var inner = !!opts.inner;
    var gate = opts.gate || null;
    var p = 0;
    var dragging = false;
    var startX = 0;
    var startP = 0;
    var raf = null;

    function worldMax() {
      return Math.max(0, world.offsetWidth - viewport.clientWidth);
    }

    function maxPan() {
      var base = worldMax();
      if (!gate) return base;
      var gx = gate.offsetLeft + gate.offsetWidth / 2;
      var centerPan = gx - viewport.clientWidth / 2;
      return Math.max(0, Math.min(base, centerPan));
    }

    function apply() {
      var max = maxPan();
      world.style.transform = 'translate3d(' + (-p * max).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
      if (label) label.textContent = name + ' · ' + Math.round(p * 100) + '%';
      if (title) title.classList.toggle('is-hidden', p > (inner ? 0.52 : 0.055));
      if (opts.prompt) opts.prompt.classList.toggle('is-on', inner && p > 0.86);
      if (opts.walk) opts.walk.classList.toggle('is-hidden', p > 0.965);
    }

    function set(v) {
      p = Math.max(0, Math.min(1, v));
      apply();
    }

    function animateTo(target, duration) {
      var from = p;
      var t0 = performance.now();
      var dur = duration || 900;
      cancelAnimationFrame(raf);
      function step(now) {
        var t = Math.min(1, (now - t0) / dur);
        var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        set(from + (target - from) * e);
        if (t < 1) raf = requestAnimationFrame(step);
      }
      raf = requestAnimationFrame(step);
    }

    viewport.addEventListener('wheel', function (e) {
      if (currentAct !== opts.act || panel.classList.contains('is-open') || drawer.classList.contains('is-open') || gateway.classList.contains('is-open')) return;
      e.preventDefault();
      set(p + e.deltaY * 0.0011);
    }, { passive: false });

    viewport.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button, a, input, .panel, .drawer, .gateway')) return;
      dragging = true;
      startX = e.clientX;
      startP = p;
      try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var max = Math.max(1, maxPan());
      set(startP - (e.clientX - startX) / max);
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      viewport.addEventListener(type, function () { dragging = false; });
    });

    function resize() {
      p = Math.max(0, Math.min(1, p));
      apply();
    }

    apply();

    return {
      set: set,
      to: animateTo,
      resize: resize,
      get progress() { return p; }
    };
  }

  /* ---------------- 街景按钮 ---------------- */

  var streetInner;

  function initStreets() {
    buildInner();

    streetInner = createStreet({
      act: 3,
      world: $('#innerWorld'),
      viewport: $('#innerViewport'),
      bar: $('#innerBar'),
      label: $('#innerLabel'),
      title: $('.act-title--inner'),
      name: '内街',
      inner: true,
      gate: $('#gateEnd'),
      walk: $('#innerWalk'),
      prompt: $('#gatePrompt')
    });

    function forwardToInner() {
      if (busy) return;
      if (currentAct !== 2) return;
      if (!has('tiger') || !has('bun')) {
        toast('点击互动，再往前走吧');
        return;
      }
      goTo(3);
    }
    $('#marketWalk').addEventListener('click', forwardToInner);

    var marketSignBtn = document.getElementById('marketSign');
    if (marketSignBtn) marketSignBtn.addEventListener('click', forwardToInner);
  var innerWalkBtn = $('#innerWalk');
  if (innerWalkBtn) innerWalkBtn.addEventListener('click', function () {
      streetInner.to(1, 1100);
      toast('午朝门到了 · 点门推门');
    });
    $('#gatePrompt').addEventListener('click', openGateway);

    $('#innerViewport').addEventListener('click', function (e) {
      var stall = e.target.closest('.stall');
      if (stall) openTask(stall.getAttribute('data-task'));
    });

    $('#gateHit').addEventListener('click', openGateway);
    $('#gateEnd').addEventListener('click', function (e) {
      if (e.target.closest('button')) return;
      openGateway();
    });

    window.addEventListener('resize', function () {
      fitAerial();
      if (streetInner) streetInner.resize();
    });
  }

  /* ---------------- 幕一 ---------------- */

  function playIntroVideo() {
    var ov = document.createElement('div');
    ov.className = 'intro-video';
    ov.innerHTML = '<video class="intro-video__video" src="assets/intro-transition.mp4" playsinline muted preload="auto" aria-hidden="true"></video>';
    document.body.appendChild(ov);
    var v = ov.querySelector('video');
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      try { v.pause(); } catch (e) {}
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      goTo(2);
    }
    v.addEventListener('ended', finish);
    v.addEventListener('error', finish);
    setTimeout(finish, 2600);
    var p = v.play();
    if (p && p.catch) p.catch(finish);
  }

  $('#enterBtn').addEventListener('click', function () {
    if (this.disabled) return;
    this.disabled = true;
    playIntroVideo();
  });

  /* ---------------- 章节导航 ---------------- */

  $$('.chapter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var n = parseInt(btn.getAttribute('data-jump'), 10);
      if (n === currentAct) return;
      if (n === 1 || state.visited.indexOf(n) !== -1) {
        goTo(n);
      } else {
        toast('先顺着集市走到午朝门，再回来。');
      }
    });
  });

  function updateChapters() {
    $$('.chapter').forEach(function (btn) {
      var n = parseInt(btn.getAttribute('data-jump'), 10);
      btn.classList.toggle('is-active', n === currentAct);
      btn.classList.toggle('is-done', state.visited.indexOf(n) !== -1);
    });
  }

  /* ---------------- 打卡 HUD ---------------- */

  function updateHUD() {
  var appBack = document.getElementById('appBack');
  if (appBack) appBack.classList.toggle('is-on', currentAct === 3);
    $('#taskCount').textContent = state.tasks.length + '/' + ORDER.length;
    $('#allCount').textContent = state.tasks.length;
    $('#spotCount').textContent = SPOTS.filter(function (s) { return has(s.id); }).length;
    updateAllStalls();
    updateSpots();
    updateShopTabs();
    renderBag();
    updateFinish();
    updateChapters();
  }

  function updateFinish() {
    var finish = $('#finishBtn');
    var remain = ORDER.length - state.tasks.length;
    finish.disabled = remain > 0;
    finish.innerHTML = remain > 0
      ? '还差 ' + remain + ' 个打卡 <span class="btn__arrow">→</span>'
      : '领取完赛证书 <span class="btn__arrow">→</span>';
    $('#finishHint').textContent = remain > 0
      ? '把集市、内街和陵庙的打卡都走完，才能领证书。'
      : '所有打卡完成。这一趟，走完了。';
    var tf = document.getElementById('templeFinish');
    if (tf) {
      tf.disabled = remain > 0;
      tf.innerHTML = remain > 0 ? '还差 ' + remain + ' 个打卡' : '领取完赛证书 <span class="btn__arrow">→</span>';
    }
  }

  /* ---------------- 打卡册 ---------------- */

  var drawerBuilt = false;

  function openDrawer() {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    renderTaskList();
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  function renderTaskList() {
    var groups = [
      { act: 1, name: '第一幕 · 远观', note: '镜头推进' },
      { act: 2, name: '第二幕 · 入市', note: '集市摊位' },
      { act: 3, name: '第三幕 · 朝门', note: '内街与午朝门' },
      { act: 4, name: '第四幕 · 陵庙', note: '五处场景' }
    ];
    var html = groups.map(function (g) {
      var ids = g.act === 1 ? [] : ORDER.filter(function (id) { return TASKS[id].act === g.act; });
      var done = ids.filter(function (id) { return has(id); }).length;
      var rows;
      if (g.act === 1) {
        rows = '<div class="task-row is-done"><i>✓</i><span>从远到近，落入集市</span></div>';
      } else {
        rows = ids.map(function (id) {
          var d = has(id);
          return '<div class="task-row' + (d ? ' is-done' : '') + '"><i>' + (d ? '✓' : '') + '</i><span>' + TASKS[id].label + '</span></div>';
        }).join('');
      }
      return '<section class="task-group"><div class="task-group__head"><span>' + g.name + '</span><span>' + (g.act === 1 ? '1/1' : done + '/' + ids.length) + ' · ' + g.note + '</span></div>' + rows + '</section>';
    }).join('');

    $('#taskList').innerHTML = html;
  }

  $('#tasksBtn').addEventListener('click', openDrawer);
  $$('[data-close-drawer]').forEach(function (el) { el.addEventListener('click', closeDrawer); });

  function resetJourney() {
    state.tasks = [];
    state.visited = [1];
    save();
    updateHUD();
    closeDrawer();
    closePanel();
    closeGateway();
    bigSeal.classList.remove('is-stamped');
    $('#cert').classList.remove('is-stamped');
    mapCamera.classList.remove('is-diving');
    if (streetInner) streetInner.set(0);
    setAct(1);
  }

  $('#resetBtn').addEventListener('click', function () {
    resetJourney();
    toast('重新开始 · 从远观再走一遍');
  });

  /* 演示通关：放在打卡册底部，方便面试时直接看结尾 */
  (function addDemoButton() {
    var foot = $('.drawer__foot');
    if (!foot) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'drawer__reset';
    btn.textContent = '演示通关';
    btn.style.marginLeft = '10px';
    btn.addEventListener('click', function () {
      state.tasks = ORDER.slice();
      [2, 3, 4].forEach(function (n) { if (state.visited.indexOf(n) === -1) state.visited.push(n); });
      save();
      updateHUD();
      closeDrawer();
      toast('已演示通关 · 去第四幕领证书');
    });
    foot.appendChild(btn);
  })();

  /* ---------------- 交互面板 ---------------- */

  function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function openTask(id) {
    if (id === 'bagua') { if (window.__openBaguaAltar) window.__openBaguaAltar(); return; }
    var t = TASKS[id];
    if (!t) return;
    if (id === 'tiger' || id === 'bun') { openShopDetail(id); return; }
  if (id === 'sachet') { openSachet(); return; }
  if (id === 'sugar') { openClay(); return; }
    if (id === 'gate') { openGateway(); return; }
    if (id === 'beilin') { openBeilin(); return; }
    if (id === 'shicao') { openShicao(); return; }
    if (id === 'tomb') { openTomb(); return; }
    if (id === 'tongtian') { openTongtian(); return; }

    $('#panelKicker').textContent = t.kicker;
    $('#panelTitle').textContent = t.title;
    $('#panelBody').textContent = t.body;
    $('#panelArt').innerHTML = artFor(t.art);
    $('#panelArt').classList.toggle('is-lit', has(id));
    $('#panelStage').innerHTML = stageFor(id);
    $('#panelActions').innerHTML = '';
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');

    if (has(id)) {
      $('#panelStage').innerHTML = '<div class="mini-note">这处已经打过卡了。' + t.body + '</div>';
      $('#panelActions').innerHTML = '<button class="btn btn--primary" type="button" data-close-panel>关闭</button>';
      bindClose();
      return;
    }

    var need = t.need || 1;
    var count = 0;
    var completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = 'btn btn--primary';
    completeBtn.textContent = '完成打卡';
    completeBtn.disabled = true;
    completeBtn.addEventListener('click', function () {
      completeTask(id);
      closePanel();
    });

    var status = document.createElement('div');
    status.className = 'mini-count';
    status.innerHTML = '<span>进度</span><b>0</b>/' + need;

    var stage = $('#panelStage');
    if (t.stage === 'repeat') {
      var rep = document.createElement('button');
      rep.type = 'button';
      rep.className = 'mini-tap';
      rep.textContent = t.action || '再来一次';
      rep.addEventListener('click', function () {
        if (count >= need) return;
        count++;
        if (id === 'bell') sfx.bell();
        else sfx.tick();
        status.innerHTML = '<span>进度</span><b>' + count + '</b>/' + need;
        if (count >= need) {
          completeBtn.disabled = false;
          rep.disabled = true;
        }
        $('#panelArt').classList.add('is-lit');
      });
      stage.appendChild(rep);
      stage.appendChild(status);
    } else {
      var opts = $$('[data-mini]', stage);
      opts.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.classList.contains('is-on')) return;
          if (t.stage === 'choices') {
            opts.forEach(function (x) { x.classList.remove('is-on'); });
            btn.classList.add('is-on');
            count = 1;
          } else {
            btn.classList.add('is-on');
            count++;
          }
          if (id === 'bell') sfx.bell();
          else sfx.tick();
          status.innerHTML = '<span>进度</span><b>' + count + '</b>/' + need;
          if (count >= need) {
            completeBtn.disabled = false;
            opts.forEach(function (x) { x.disabled = true; });
          }
          $('#panelArt').classList.add('is-lit');
        });
      });
      stage.appendChild(status);
    }

    $('#panelActions').appendChild(completeBtn);
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn btn--ghost';
    close.textContent = '先不拿';
    close.setAttribute('data-close-panel', '');
    close.addEventListener('click', closePanel);
    $('#panelActions').appendChild(close);

    bindClose();
  }

  function bindClose() {
    $$('[data-close-panel]', panel).forEach(function (el) {
      el.onclick = closePanel;
    });
  }

  function stageFor(id) {
    var t = TASKS[id];
    if (!t) return '';
    if (t.stage === 'dots') {
      return '<div class="mini-dots">' +
        '<button class="mini-dot" type="button" data-mini style="--dot:#3A332C" aria-label="黑色"></button>' +
        '<button class="mini-dot" type="button" data-mini style="--dot:#B19C84" aria-label="金色"></button>' +
        '<button class="mini-dot" type="button" data-mini style="--dot:#8A6A55" aria-label="朱砂红"></button>' +
        '</div>';
    }
    if (t.stage === 'eyes') {
      return '<div class="mini-row" style="justify-content:center">' +
        '<button class="mini-choice" type="button" data-mini>点左眼</button>' +
        '<button class="mini-choice" type="button" data-mini>点右眼</button>' +
        '</div>';
    }
    if (t.stage === 'incense') {
      return '<div class="mini-row" style="justify-content:center">' +
        '<button class="mini-choice" type="button" data-mini>第一炷</button>' +
        '<button class="mini-choice" type="button" data-mini>第二炷</button>' +
        '<button class="mini-choice" type="button" data-mini>第三炷</button>' +
        '</div>';
    }
    if (t.stage === 'grass') {
      return '<div class="mini-row" style="justify-content:center">' +
        '<button class="mini-choice" type="button" data-mini>一株</button>' +
        '<button class="mini-choice" type="button" data-mini>两株</button>' +
        '<button class="mini-choice" type="button" data-mini>三株</button>' +
        '</div>';
    }
    if (t.stage === 'choices') {
      return '<div class="mini-row">' + t.choices.map(function (c) {
        return '<button class="mini-choice" type="button" data-mini>' + c + '</button>';
      }).join('') + '</div>';
    }
    return '';
  }

  /* ---------------- 完成打卡 ---------------- */

  function showNextStep(onNext) {
    if (document.getElementById('nextStep')) return;
    var btn = document.createElement('button');
    btn.id = 'nextStep';
    btn.className = 'next-step';
    btn.type = 'button';
    btn.innerHTML = '下一步 <span>→</span>';
    btn.addEventListener('click', function () {
      btn.remove();
      if (typeof onNext === 'function') onNext();
      try { closePanel(); } catch (e) {}
      try { closeShopDetail(); } catch (e) {}
      try { closeGateway(); } catch (e) {}
      try { closeBag(); } catch (e) {}
      ['tombStory','beilinStory','tongtianDone','shicaoIntro','baguaIntro','baguaQuiz','beilinScene','beilinHall','tongtianScene','tombScene','gatePhoto'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.remove();
      });
      if (document.getElementById('baguaPhoto')) { var bpp = document.getElementById('baguaPhoto'); bpp.hidden = true; bpp.setAttribute('aria-hidden', 'true'); }
      setAct(4);
      renderSpots();
      updateHUD();
    });
    document.body.appendChild(btn);
  }

  function completeTask(id) {
    if (has(id)) return;
    state.tasks.push(id);
    var act = TASKS[id] && TASKS[id].act;
    if (act && state.visited.indexOf(act) === -1) state.visited.push(act);
    save();
    updateHUD();
    sfx.chime();
    showStamp('已打卡');
    toast(TASKS[id].label + ' · 打卡完成');
    if (state.tasks.length === ORDER.length) {
      setTimeout(function () { toast('全部打卡完成 · 去第四幕领完赛证书'); }, 1300);
    }
  }

  /* ---------------- 第四幕 ---------------- */

  function renderSpots() {
    var list = $('#spotList');
    var hot = $('#hotspots');
    if (!list || !hot) return;

    list.innerHTML = SPOTS.map(function (s) {
      var t = TASKS[s.id];
      var done = has(s.id);
      return '<button class="spot-item' + (done ? ' is-done' : '') + '" type="button" data-task="' + s.id + '">' +
        '<i>' + (done ? '✓' : '') + '</i><span>' + s.name + ' · ' + t.label.split(' · ')[1] + '</span></button>';
    }).join('');

    hot.innerHTML = SPOTS.map(function (s, i) {
      var done = has(s.id);
      return '<button class="hotspot' + (done ? ' is-done' : '') + (s.round ? ' is-round' : '') + '" type="button" data-task="' + s.id + '" style="left:' + s.x + '%;top:' + s.y + '%;width:' + (s.w || 19) + '%;height:' + (s.h || 16) + '%" aria-label="' + s.name + '">' +
        '<span class="hotspot__seal">' + (i + 1) + '</span>' +
        '<span class="hotspot__label">' + s.name + (done ? ' · 已打卡' : '') + '</span></button>';
    }).join('');

    $$('[data-task]', list).forEach(function (el) { el.addEventListener('click', function () { openTask(el.getAttribute('data-task')); }); });
    $$('[data-task]', hot).forEach(function (el) { el.addEventListener('click', function () { openTask(el.getAttribute('data-task')); }); });
  }

  function updateSpots() {
    var spots = SPOTS.filter(function (s) { return has(s.id); });
    var count = $('#spotCount');
    if (count) count.textContent = spots.length;
    $$('.spot-item').forEach(function (el) {
      var done = has(el.getAttribute('data-task'));
      el.classList.toggle('is-done', done);
      var i = el.querySelector('i');
      if (i) i.textContent = done ? '✓' : '';
    });
    $$('.hotspot').forEach(function (el) {
      var done = has(el.getAttribute('data-task'));
      el.classList.toggle('is-done', done);
      var label = el.querySelector('.hotspot__label');
      var id = el.getAttribute('data-task');
      var name = (SPOTS.filter(function (s) { return s.id === id; })[0] || {}).name || '';
      if (label) label.textContent = name + (done ? ' · 已打卡' : '');
    });
  }

  $('#finishBtn').addEventListener('click', function () {
    if (state.tasks.length < ORDER.length) {
      var remain = ORDER.length - state.tasks.length;
      toast('还差 ' + remain + ' 个打卡 · 打开打卡册看看');
      openDrawer();
      return;
    }
    openCertificate();
  });

  (function bindTempleFinish() {
    var tf = document.getElementById('templeFinish');
    if (!tf) return;
    tf.addEventListener('click', function () {
      var fb = document.getElementById('finishBtn');
      if (fb) fb.click();
    });
  })();

  /* ---------------- 推门 ---------------- */

  function bindGateInfo() {
    var gate = document.querySelector('.inner2d-hot--gate');
    var info = document.getElementById('gateInfo');
    var go = document.getElementById('gateInfoGo');
    var close = document.getElementById('gateInfoClose');
    if (!gate || !info) return;
    gate.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      info.hidden = false;
    }, true);
    if (go) go.addEventListener('click', function () {
      info.hidden = true;
      openGateway();
    });
    if (close) close.addEventListener('click', function () { info.hidden = true; });
  }




  /* ---------------- 祈福 ---------------- */
  var PRAY_WISHES = [
    'assets/pray/wish-1.jpg', 'assets/pray/wish-2.jpg', 'assets/pray/wish-3.jpg',
    'assets/pray/wish-4.jpg', 'assets/pray/wish-5.jpg', 'assets/pray/wish-6.jpg',
    'assets/pray/wish-7.jpg', 'assets/pray/wish-8.jpg', 'assets/pray/wish-9.jpg'
  ];
  var prayLastWish = -1;
  var prayCardBound = false;
  var prayPreloaded = false;
  function preloadPrayAssets() {
    if (prayPreloaded) return;
    prayPreloaded = true;
    ['assets/pray/tree.jpg', 'assets/pray/wish-1.jpg'].forEach(function (src) {
      var im = new Image();
      im.decoding = 'async';
      im.src = src;
    });
  }
  function openPrayTree() {
    var tp = document.getElementById('prayTree');
    if (!tp) return;
    preloadPrayAssets();
    tp.hidden = false;
    tp.setAttribute('aria-hidden', 'false');
    if (!tp.dataset.bound) {
      tp.dataset.bound = '1';
      var close = document.getElementById('prayTreeClose');
      $$('.pray-tree__tag', tp).forEach(function (el) {
        el.addEventListener('click', openPrayCard);
      });
      if (close) close.addEventListener('click', closePrayTree);
    }
  }
  function closePrayTree() {
    var tp = document.getElementById('prayTree');
    if (tp) { tp.hidden = true; tp.setAttribute('aria-hidden', 'true'); }
  }
  function rollPray() {
    var img = document.getElementById('prayWishImg');
    if (!img || !PRAY_WISHES.length) return;
    var idx = Math.floor(Math.random() * PRAY_WISHES.length);
    if (PRAY_WISHES.length > 1 && idx === prayLastWish) idx = (idx + 1) % PRAY_WISHES.length;
    prayLastWish = idx;
    img.classList.remove('is-in');
    void img.offsetWidth;
    img.src = PRAY_WISHES[idx];
    img.classList.add('is-in');
  }
  function openPrayCard() {
    var cp = document.getElementById('prayCard');
    if (!cp) return;
    closePrayTree();
    cp.hidden = false;
    cp.setAttribute('aria-hidden', 'false');
    rollPray();
    if (!prayCardBound) {
      prayCardBound = true;
      var again = document.getElementById('prayAgain');
      var keep = document.getElementById('prayKeep');
      var close = document.getElementById('prayCardClose');
      if (again) again.addEventListener('click', rollPray);
      if (keep) keep.addEventListener('click', function () {
        closePrayCard();
        toast('福牌已收下 · 平安顺遂');
      });
      if (close) close.addEventListener('click', closePrayCard);
    }
  }
  function closePrayCard() {
    var cp = document.getElementById('prayCard');
    if (cp) { cp.hidden = true; cp.setAttribute('aria-hidden', 'true'); }
  }
  // 预加载各关卡的图片：等首屏 ready 后空闲时慢慢下，进关卡时就不用等
  (function preloadSceneAssets() {
    var list = [
      // 第四幕（碑林/伏羲陵/蓍草园/通天殿/八卦坛）大图优先，进关卡不黑屏
      'assets/beilin/stele.jpg', 'assets/beilin/pavilion.jpg',
      'assets/tomb/tomb-before.jpg', 'assets/tomb/tomb-after.jpg',
      'assets/tomb/incense-gold.jpg', 'assets/tomb/incense-red.jpg',
      'assets/shicao/garden.jpg', 'assets/shicao/herb.jpg',
      'assets/tongtian/hall.jpg',
      'assets/tongtian/offer-flower.png', 'assets/tongtian/offer-pastry.png',
      'assets/tongtian/offer-bun.png', 'assets/tongtian/offer-fruit.png',
      'assets/bagua-altar.jpg',
      // 内街 / 集市
      'assets/clay-shop-web.jpg', 'assets/gate-closeup.jpg',
      'assets/gate-door-left.jpg', 'assets/gate-door-right.jpg',
      'assets/pray/tree.jpg',
      // 店铺关卡
      'assets/tiger/jigsaw/0.jpg', 'assets/tiger/jigsaw/1.jpg', 'assets/tiger/jigsaw/2.jpg',
      'assets/tiger/jigsaw/3.jpg', 'assets/tiger/jigsaw/4.jpg', 'assets/tiger/jigsaw/5.jpg',
      'assets/tiger/jigsaw/6.jpg', 'assets/tiger/jigsaw/7.jpg', 'assets/tiger/jigsaw/8.jpg',
      'assets/tiger/plush-source.jpg',
      'assets/bun/bun-main.jpg',
      'assets/sachet/sachet-cutout.png', 'assets/sachet/sachet-frame.jpg',
      'assets/clay-charm.jpg'
    ];
    var i = 0;
    function next() {
      if (i >= list.length) return;
      var im = new Image();
      im.decoding = 'async';
      im.onload = im.onerror = function () { i++; setTimeout(next, 180); };
      im.src = list[i];
      setTimeout(function () { if (im.complete) { i++; next(); } }, 4000);
    }
    window.addEventListener('load', function () { setTimeout(next, 1200); });
  })();

  // 通用：背景图按 cover 铺满后，把「图上某个百分比区域」换算成屏幕像素热区
  function layoutCoverHot(el, imgW, imgH, rect, padRatio) {
    if (!el) return;
    var W = window.innerWidth, H = window.innerHeight;
    var scale = Math.max(W / imgW, H / imgH);
    var dispW = imgW * scale, dispH = imgH * scale;
    var offX = (W - dispW) / 2, offY = (H - dispH) / 2;
    var pad = (padRatio || 0) * scale;
    var padX = pad * imgW, padY = pad * imgH;
    el.style.position = 'absolute';
    el.style.left = Math.round(offX + rect.l * dispW - padX) + 'px';
    el.style.top = Math.round(offY + rect.t * dispH - padY) + 'px';
    el.style.width = Math.round(rect.w * dispW + padX * 2) + 'px';
    el.style.height = Math.round(rect.h * dispH + padY * 2) + 'px';
  }
  window.__layoutCoverHot = layoutCoverHot;

  // 开始页：海报按 cover 铺满后，换算红色「游览」按钮在屏幕上的真实位置
  var INTRO_IMG_W = 1152, INTRO_IMG_H = 2048;
  var INTRO_BTN = { l: 0.2925, t: 0.835, w: 0.4167, h: 0.0688 }; // 图片内百分比（实测）
  function layoutIntroHot() {
    var btn = document.getElementById('enterBtn');
    if (!btn) return;
    var W = window.innerWidth, H = window.innerHeight;
    var scale = Math.max(W / INTRO_IMG_W, H / INTRO_IMG_H);
    var dispW = INTRO_IMG_W * scale, dispH = INTRO_IMG_H * scale;
    var offX = (W - dispW) / 2, offY = (H - dispH) / 2;
    // 左右各留 1.2% 余量，手指更好点
    var padX = INTRO_IMG_W * 0.012 * scale, padY = INTRO_IMG_H * 0.010 * scale;
    var l = offX + INTRO_BTN.l * dispW - padX;
    var t = offY + INTRO_BTN.t * dispH - padY;
    var w = INTRO_BTN.w * dispW + padX * 2;
    var h = INTRO_BTN.h * dispH + padY * 2;
    btn.style.left = Math.round(l) + 'px';
    btn.style.top = Math.round(t) + 'px';
    btn.style.width = Math.round(w) + 'px';
    btn.style.height = Math.round(h) + 'px';
  }
  window.__layoutIntroHot = layoutIntroHot;
  if (document.readyState !== 'loading') setTimeout(layoutIntroHot, 0); else document.addEventListener('DOMContentLoaded', layoutIntroHot);
  window.addEventListener('resize', layoutIntroHot);
  window.addEventListener('orientationchange', function () { setTimeout(layoutIntroHot, 120); });

  // 进入某一幕时，把该幕要用的图并行拉一遍（比顺序预加载快得多）
  function preloadNow(urls) {
    (urls || []).forEach(function (src) {
      try { var im = new Image(); im.decoding = 'async'; im.src = src; } catch (e) {}
    });
  }
  var ACT3_IMAGES = ['assets/clay-shop-web.jpg', 'assets/gate-closeup.jpg'];
  var ACT4_IMAGES = [
    'assets/beilin/stele.jpg', 'assets/beilin/pavilion.jpg',
    'assets/tomb/tomb-before.jpg', 'assets/tomb/tomb-after.jpg',
    'assets/shicao/garden.jpg', 'assets/tongtian/hall.jpg', 'assets/bagua-altar.jpg'
  ];
  // 图片没加载完时先淡入，避免中途露黑底
  function fadeInWhenReady(img) {
    if (!img) return;
    function done() { img.classList.add('is-ready'); }
    if (img.complete && img.naturalWidth) { done(); return; }
    img.addEventListener('load', done);
    img.addEventListener('error', done);
  }

  // 意外刷新恢复：等初始化完成、第一幕渲染后再切回上一幕
  window.addEventListener('load', function () {
    if (state._restoreAct && state._restoreAct > 1) {
      var ra = state._restoreAct;
      delete state._restoreAct;
      setTimeout(function () {
        setAct(ra);
        if (ra >= 4) renderSpots();
        renderBag();
        updateHUD();
      }, 150);
    }
  });

  window.__openPrayTree = openPrayTree;
  setTimeout(preloadPrayAssets, 1500);
  (function bindPrayBtn() {
    var btn = document.getElementById('prayBtn');
    if (btn) btn.addEventListener('click', openPrayTree);
  })();

  /* ---------------- 八卦坛 ---------------- */
  var BAGUA = {
    qian: { name: '乾', sym: '☰', nature: '天', text: '乾为天，纯阳之卦。刚健、创始，元亨利贞。象曰：天行健，君子以自强不息。', hint: '记住「天行健，君子以自强不息」——坛心问卦会考到。' },
    dui: { name: '兑', sym: '☱', nature: '泽', text: '兑为泽，喜悦之卦。主沟通、和悦。象曰：丽泽兑，君子以朋友讲习。', hint: '「有朋自远方来，不亦乐乎」正合此卦——问卦会考到。' },
    li: { name: '离', sym: '☲', nature: '火', text: '离为火，光明之卦。主依附、明亮。象曰：明两作离，大人以继明照于四方。', hint: '记住「明两作离，大人以继明照于四方」——问卦会考到。' },
    zhen: { name: '震', sym: '☳', nature: '雷', text: '震为雷，震动之卦。主奋起、惊动。象曰：洊雷震，君子以恐惧修省。', hint: '记住「洊雷震，君子以恐惧修省」——问卦会考到。' },
    xun: { name: '巽', sym: '☴', nature: '风', text: '巽为风，顺入之卦。主顺从、渗入。象曰：随风巽，君子以申命行事。', hint: '记住「随风巽，君子以申命行事」——问卦会考到。' },
    kan: { name: '坎', sym: '☵', nature: '水', text: '坎为水，险陷之卦。主智慧、磨砺。象曰：水洊至，习坎；君子以常德行，习教事。', hint: '记住「水洊至，习坎；君子以常德行，习教事」——问卦会考到。' },
    gen: { name: '艮', sym: '☶', nature: '山', text: '艮为山，止静之卦。主安定、知止。象曰：兼山艮，君子以思不出其位。', hint: '记住「兼山艮，君子以思不出其位」——问卦会考到。' },
    kun: { name: '坤', sym: '☷', nature: '地', text: '坤为地，纯阴之卦。柔顺、承载，厚德载物。象曰：地势坤，君子以厚德载物。', hint: '记住「地势坤，君子以厚德载物」——问卦会考到。' }
  };
  var baguaSeen = {};
  function openBaguaAltar() {
    var bp = document.getElementById('baguaPhoto');
    if (!bp) return;
    bp.hidden = false;
    bp.setAttribute('aria-hidden', 'false');
    if (!bp.dataset.bound) {
      var taiji = document.getElementById('baguaTaiji');
      if (taiji) taiji.addEventListener('click', function () {
        if (taiji.classList.contains('is-spinning')) return;
        taiji.classList.add('is-spinning');
        sfx.tick();
        setTimeout(function () {
          taiji.classList.remove('is-spinning');
          openBaguaIntro();
        }, 620);
      });
      bp.dataset.bound = '1';
      document.querySelectorAll('.bagua-photo__gua', bp).forEach(function (btn) {
        btn.addEventListener('click', function () { showBagua(btn.getAttribute('data-gua'), btn); });
      });
      var infoClose = document.getElementById('baguaInfoClose');
      var photoClose = document.getElementById('baguaPhotoClose');
      if (infoClose) infoClose.addEventListener('click', function () {
        document.getElementById('baguaInfo').hidden = true;
      });
      if (photoClose) photoClose.addEventListener('click', closeBaguaAltar);
    }
  }
  function closeBaguaAltar() {
    var bp = document.getElementById('baguaPhoto');
    if (bp) { bp.hidden = true; bp.setAttribute('aria-hidden', 'true'); }
    var info = document.getElementById('baguaInfo');
    if (info) info.hidden = true;
  }
  function showBagua(id, btn) {
    var g = BAGUA[id];
    if (!g) return;
    var info = document.getElementById('baguaInfo');
    document.getElementById('baguaInfoName').textContent = g.name + '卦 · ' + g.nature;
    document.getElementById('baguaInfoSym').textContent = g.sym;
    document.getElementById('baguaInfoText').textContent = g.text + (g.hint ? ' ' + g.hint : '');
    if (info) info.hidden = false;
    if (btn) btn.classList.add('is-seen');
    if (!baguaSeen[id]) {
      baguaSeen[id] = true;
      var n = Object.keys(baguaSeen).length;
      var hint = document.getElementById('baguaHint');
      if (hint) hint.textContent = '点击八卦 · 看卦象（已看 ' + n + ' / 8）';
      if (n >= 8) {
        var infoEl = document.getElementById('baguaInfo');
        if (infoEl) infoEl.hidden = true;
        setTimeout(function () {
          if (window.__openBaguaQuiz) window.__openBaguaQuiz();
        }, 650);
      }
    }
  }
  window.__openBaguaAltar = openBaguaAltar;

  var GUA_META = {
    qian: { name: '乾卦', sym: '☰', pinyin: 'qián', nature: '天' },
    dui:  { name: '兑卦', sym: '☱', pinyin: 'duì',  nature: '泽' },
    li:   { name: '离卦', sym: '☲', pinyin: 'lí',   nature: '火' },
    zhen: { name: '震卦', sym: '☳', pinyin: 'zhèn', nature: '雷' },
    kun:  { name: '坤卦', sym: '☷', pinyin: 'kūn',  nature: '地' },
    gen:  { name: '艮卦', sym: '☶', pinyin: 'gèn',  nature: '山' },
    kan:  { name: '坎卦', sym: '☵', pinyin: 'kǎn',  nature: '水' },
    xun:  { name: '巽卦', sym: '☴', pinyin: 'xùn',  nature: '风' }
  };

  var BAGUA_QUIZ = [
    {
      quote: '天行健，君子以自强不息。',
      ask: '这句话对应的是哪一卦？',
      answer: 'qian',
      options: ['qian', 'kun', 'li', 'xun'],
      explain: '乾为天，坤为地。「天行健」说的正是乾卦的刚健不息，所以选乾卦。'
    },
    {
      quote: '有朋自远方来，不亦乐乎。',
      ask: '这句契合哪一卦？',
      answer: 'dui',
      options: ['dui', 'xun', 'li', 'kan'],
      explain: '兑为泽、为悦；「丽泽兑，君子以朋友讲习」，朋友讲习相悦，故取兑卦。'
    },
    {
      quote: '地势坤，君子以厚德载物。',
      ask: '这句话对应的是哪一卦？',
      answer: 'kun',
      options: ['kun', 'qian', 'zhen', 'gen'],
      explain: '坤为地。大地厚重而能载万物，「厚德载物」说的正是坤卦的柔顺包容。'
    },
    {
      quote: '洊雷震，君子以恐惧修省。',
      ask: '这句话对应的是哪一卦？',
      answer: 'zhen',
      options: ['zhen', 'li', 'qian', 'kan'],
      explain: '震为雷。雷声接连而至，君子因此心怀敬畏、反省修身，故取震卦。'
    },
    {
      quote: '随风巽，君子以申命行事。',
      ask: '这句话对应的是哪一卦？',
      answer: 'xun',
      options: ['xun', 'dui', 'kun', 'li'],
      explain: '巽为风。风行无孔不入，君子效法它申明政令、推行政事，故取巽卦。'
    },
    {
      quote: '水洊至，习坎；君子以常德行，习教事。',
      ask: '这句话对应的是哪一卦？',
      answer: 'kan',
      options: ['kan', 'li', 'dui', 'xun'],
      explain: '坎为水。水流接连不断，君子因此恒守德行、熟习教化之事，故取坎卦。'
    },
    {
      quote: '明两作离，大人以继明照于四方。',
      ask: '这句话对应的是哪一卦？',
      answer: 'li',
      options: ['li', 'zhen', 'qian', 'kan'],
      explain: '离为火、为明。光明相继而起，大人因此以光明照临四方，故取离卦。'
    },
    {
      quote: '兼山艮，君子以思不出其位。',
      ask: '这句话对应的是哪一卦？',
      answer: 'gen',
      options: ['gen', 'kun', 'xun', 'dui'],
      explain: '艮为山。两山相重、静止不动，君子因此思虑不越出自己的本位，故取艮卦。'
    }
  ];

  var baguaLastQuiz = -1;

  function openBaguaIntro() {
    var old = document.getElementById('baguaIntro');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'bagua-intro';
    box.id = 'baguaIntro';
    box.innerHTML =
      '<div class="bagua-intro__card" role="dialog" aria-label="一画开天">' +
        '<button class="bagua-intro__close" type="button" id="baguaIntroClose" aria-label="关闭">×</button>' +
        '<p class="bagua-intro__kicker">陵庙 · 八卦坛</p>' +
        '<h3 class="bagua-intro__title">一画开天</h3>' +
        '<p class="bagua-intro__text">伏羲八卦坛相传是伏羲推演先天八卦的地方。</p>' +
        '<p class="bagua-intro__text">传说伏羲把八卦盘传给仁善的老九黄龙氏，黄龙氏没有独自占有，而是在太昊陵前筑坛供奉，让天下人共享八卦里的智慧——这便是淮阳八卦坛的由来。</p>' +
        '<button class="bagua-intro__btn" type="button" id="baguaIntroBtn">继续看卦 · 看遍八卦自动抽签</button>' +
      '</div>';
    document.body.appendChild(box);
    var close = function () { box.remove(); };
    var c1 = document.getElementById('baguaIntroClose');
    var c2 = document.getElementById('baguaIntroBtn');
    if (c1) c1.addEventListener('click', close);
    if (c2) c2.addEventListener('click', close);
  }
  window.__openBaguaIntro = openBaguaIntro;

  function openBaguaQuiz() {
    var old = document.getElementById('baguaQuiz');
    if (old) old.remove();
    var idx = Math.floor(Math.random() * BAGUA_QUIZ.length);
    if (BAGUA_QUIZ.length > 1 && idx === baguaLastQuiz) idx = (idx + 1 + Math.floor(Math.random() * (BAGUA_QUIZ.length - 1))) % BAGUA_QUIZ.length;
    if (idx === baguaLastQuiz) idx = (idx + 1) % BAGUA_QUIZ.length;
    baguaLastQuiz = idx;
    var q = BAGUA_QUIZ[idx];
    var opts = q.options.slice();
    if (Math.random() < 0.5) opts.reverse();
    var firstWin = !has('bagua');
    var box = document.createElement('div');
    box.className = 'bagua-quiz';
    box.id = 'baguaQuiz';
    box.innerHTML =
      '<div class="bagua-quiz__card" role="dialog" aria-label="揲蓍问卦">' +
        '<button class="bagua-quiz__close" type="button" id="baguaQuizClose" aria-label="关闭">×</button>' +
        '<p class="bagua-quiz__kicker">陵庙 · 八卦坛 · 揲蓍问卦 · 第 ' + (idx + 1) + ' / ' + BAGUA_QUIZ.length + ' 签</p>' +
        '<h3 class="bagua-quiz__title">抽一签，问一卦</h3>' +
        '<p class="bagua-quiz__quote">「' + q.quote + '」</p>' +
        '<p class="bagua-quiz__ask">' + q.ask + '</p>' +
        '<div class="bagua-quiz__opts" id="baguaQuizOpts">' + opts.map(function (id) {
          var m = GUA_META[id];
          return '<button class="bagua-quiz__opt" type="button" data-id="' + id + '">' +
            '<span class="bagua-quiz__sym">' + m.sym + '</span>' +
            '<span class="bagua-quiz__name">' + m.name + '</span>' +
            '<span class="bagua-quiz__pinyin">' + m.pinyin + ' · ' + m.nature + '</span>' +
          '</button>';
        }).join('') + '</div>' +
        '<div class="bagua-quiz__result" id="baguaQuizResult" hidden></div>' +
        '<button class="bagua-quiz__btn" type="button" id="baguaQuizBtn" hidden></button>' +
      '</div>';
    document.body.appendChild(box);
    var result = document.getElementById('baguaQuizResult');
    var btn = document.getElementById('baguaQuizBtn');
    var closeBtn = document.getElementById('baguaQuizClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { box.remove(); });
    var answered = false;
    function choose(el) {
      if (answered) return;
      var id = el.getAttribute('data-id');
      if (id === q.answer) {
        answered = true;
        el.classList.add('is-right');
        box.querySelectorAll('.bagua-quiz__opt').forEach(function (o) { if (o !== el) o.classList.add('is-dim'); });
        result.hidden = false;
        result.innerHTML = '<b>答对了</b><span>' + q.explain + '</span>';
        btn.hidden = false;
        if (firstWin) {
          btn.textContent = '收下八卦阵挂件 · 通关';
          btn.onclick = function () {
            completeTask('bagua');
            renderBag();
            updateHUD();
            toast('八卦阵挂件 · 已收进背包');
            box.remove();
            showNextStep();
          };
        } else {
          btn.textContent = '再抽一签';
          btn.onclick = function () { box.remove(); openBaguaQuiz(); };
        }
      } else {
        el.classList.add('is-wrong');
        sfx.tick();
        result.hidden = false;
        result.innerHTML = '<b class="is-wrong">再想想</b><span>卦象之间各有其象，回想一下它的自然之象。</span>';
        setTimeout(function () { el.classList.remove('is-wrong'); }, 900);
      }
    }
    box.querySelectorAll('.bagua-quiz__opt').forEach(function (el) {
      el.addEventListener('click', function () { choose(el); });
    });
  }


  window.__openBaguaQuiz = openBaguaQuiz;

  function bagBaguaSVG() {
    var gua = [['☰'], ['☱'], ['☲'], ['☳'], ['☷'], ['☶'], ['☵'], ['☴']];
    return '<svg viewBox="0 0 80 80" aria-hidden="true">' +
      '<circle cx="40" cy="40" r="32" fill="#fbf3e4" stroke="#c9a063" stroke-width="2.4"/>' +
      '<circle cx="40" cy="40" r="14" fill="#2b2320"/>' +
      '<path d="M40 26a14 14 0 0 1 0 28 7 7 0 0 0 0-14 7 7 0 0 1 0-14z" fill="#fbf3e4"/>' +
      '<circle cx="40" cy="33" r="2.6" fill="#fbf3e4"/><circle cx="40" cy="47" r="2.6" fill="#2b2320"/>' +
      '<g stroke="#8a5a2e" stroke-width="2.2" stroke-linecap="round">' +
        '<path d="M36 9h8"/><path d="M36 13h8"/><path d="M36 17h8"/>' +
        '<path d="M36 63h8"/><path d="M36 67h8"/><path d="M36 71h8"/>' +
        '<path d="M7 36v8"/><path d="M11 36v8"/><path d="M15 36v8"/>' +
        '<path d="M65 36v8"/><path d="M69 36v8"/><path d="M73 36v8"/>' +
      '</g></svg>';
  }


  /* ---------------- 午朝门近景 / 开门 ---------------- */
  function openGatePhoto() {
    if (!has('sachet') || !has('sugar')) {
      toast('点击互动，再往前走吧');
      return;
    }
    var gp = document.getElementById('gatePhoto');
    if (!gp) return;
    gp.hidden = false;
    gp.setAttribute('aria-hidden', 'false');
    gp.classList.remove('is-opening');
    if (!gp.dataset.bound) {
      gp.dataset.bound = '1';
      var doorEl = document.getElementById('gatePhotoDoor');
      var closeEl = document.getElementById('gatePhotoClose');
      if (doorEl) doorEl.addEventListener('click', pushGatePhoto);
      if (closeEl) closeEl.addEventListener('click', closeGatePhoto);
    }
  }
  function closeGatePhoto() {
    var gp = document.getElementById('gatePhoto');
    if (!gp) return;
    gp.hidden = true;
    gp.setAttribute('aria-hidden', 'true');
    gp.classList.remove('is-opening');
  }
  function pushGatePhoto() {
    var gp = document.getElementById('gatePhoto');
    if (!gp || gp.hidden || gp.classList.contains('is-opening')) return;
    gp.classList.add('is-opening');
    sfx.creak();
    sfx.whoosh();
    completeTask('gate');
    setTimeout(function () {
      veil.classList.add('veil--warm');
      veil.classList.add('is-on');
      setTimeout(function () {
        closeGatePhoto();
        setAct(4);
        veil.classList.remove('is-on');
        toast('进入午朝门，解锁六处场景，溯源伏羲文脉');
        capsShown[3] = true;
        setTimeout(function () { veil.classList.remove('veil--warm'); }, 900);
      }, 900);
    }, 1900);
  }
  window.__openGatePhoto = openGatePhoto;
  (function bindGatePhoto() {
    var door = document.getElementById('gatePhotoDoor');
    var close = document.getElementById('gatePhotoClose');
    if (door) door.addEventListener('click', pushGatePhoto);
    if (close) close.addEventListener('click', closeGatePhoto);
  })();

  function openGateway() {
    gateway.classList.add('is-open');
    gateway.setAttribute('aria-hidden', 'false');
    gateway.classList.remove('is-open-doors');
    sfx.creak();
  }
  function closeGateway() {
    gateway.classList.remove('is-open', 'is-open-doors');
    gateway.setAttribute('aria-hidden', 'true');
  }

  $('#pushGate').addEventListener('click', function () {
    if (gateway.classList.contains('is-open-doors')) return;
    gateway.classList.add('is-open-doors');
    sfx.creak();
    sfx.whoosh();
    completeTask('gate');
    setTimeout(function () {
      veil.classList.add('is-on');
      setTimeout(function () {
        closeGateway();
        setAct(4);
        veil.classList.remove('is-on');
        toast('进入午朝门，解锁六处场景，溯源伏羲文脉');
        capsShown[3] = true;
      }, 480);
    }, 1350);
  });
  $('#closeGate').addEventListener('click', closeGateway);
  $$('[data-close-panel]', panel).forEach(function (el) { el.addEventListener('click', closePanel); });

  /* ---------------- 证书 ---------------- */

  var bigSeal = $('#bigSeal');

  /* ---------------- 纪念册（完赛） ---------------- */

  function certDateText() {
    var now = new Date();
    var m = now.getMonth() + 1, d = now.getDate();
    return now.getFullYear() + '.' + (m < 10 ? '0' + m : m) + '.' + (d < 10 ? '0' + d : d);
  }

  function drawCertScroll() {
    var cv = document.getElementById('certScrollCanvas');
    if (!cv) return;
    var img = new Image();
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      cv.width = w;
      cv.height = h;
      var ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // 卷轴底部「游玩日期」后的留白处写上当天日期，字体与卷轴一致
      var fs = Math.max(18, Math.round(w * 0.0128));
      ctx.font = fs + 'px "Kaiti SC", "STKaiti", "KaiTi", "楷体", "Songti SC", serif';
      ctx.fillStyle = 'rgba(58, 42, 30, .88)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(certDateText(), Math.round(w * 0.757), Math.round(h * 0.795));
    };
    img.src = 'assets/cert-scroll.jpg';
  }

  function openCertScroll() {
    var ov = document.createElement('div');
    ov.className = 'cert-scroll';
    ov.id = 'certScroll';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', '太昊陵纪念册');
    ov.innerHTML = '<canvas class="cert-scroll__canvas" id="certScrollCanvas"></canvas>' +
      '<button class="cert-scroll__close" type="button" id="certScrollClose" aria-label="关闭">×</button>' +
      '<button class="cert-scroll__btn" type="button" id="certScrollBtn">收下纪念册</button>';
    document.body.appendChild(ov);
    drawCertScroll();
    var close = function () { if (ov.parentNode) ov.parentNode.removeChild(ov); };
    var c = document.getElementById('certScrollClose');
    var b = document.getElementById('certScrollBtn');
    if (c) c.addEventListener('click', close);
    if (b) b.addEventListener('click', close);
  }

  function playCertVideo() {
    var ov = document.createElement('div');
    ov.className = 'cert-video';
    ov.innerHTML = '<video class="cert-video__video" src="assets/cert-video.mp4" playsinline preload="auto"></video>';
    document.body.appendChild(ov);
    var v = ov.querySelector('video');
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      try { v.pause(); } catch (e) {}
      if (ov.parentNode) ov.parentNode.removeChild(ov);
      openCertScroll();
    }
    v.addEventListener('ended', finish);
    v.addEventListener('error', finish);
    setTimeout(finish, 7500);
    var p = v.play();
    if (p && p.catch) p.catch(finish);
  }

  function openCertificate() {
    if (state.tasks.length < ORDER.length) {
      toast('还有打卡没完成。');
      openDrawer();
      return;
    }
    sfx.whoosh();
    veil.classList.add('is-on');
    setTimeout(function () {
      veil.classList.remove('is-on');
      playCertVideo();
    }, 320);
  }

  $('#certName').addEventListener('input', function () {
    state.name = this.value.slice(0, 18) || '羲皇故都探索者';
    save();
  });

  $('#againBtn').addEventListener('click', function () {
    resetJourney();
    toast('再走一遍 · 从远观开始');
  });

  $('#printBtn').addEventListener('click', function () {
    window.print();
  });

  /* ---------------- 背景音乐 ---------------- */

  var bgm = null;
  var bgmStarted = false;
  (function initBgm() {
    try {
      bgm = new Audio('assets/audio/bgm.mp3');
      bgm.loop = true;
      bgm.volume = 0.32;
      bgm.preload = 'none';
    } catch (err) { bgm = null; return; }
    function startBgm() {
      if (!bgm || state.muted || bgmStarted) return;
      var p = bgm.play();
      if (p && p.then) {
        p.then(function () { bgmStarted = true; }).catch(function () {});
      } else {
        bgmStarted = true;
      }
    }
    window.__startBgm = startBgm;
    window.__bgm = bgm;
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, startBgm, { passive: true });
    });
  })();

  /* ---------------- 声音开关 / 关闭 ---------------- */

  $('#soundBtn').addEventListener('click', function () {
    state.muted = !state.muted;
    save();
    this.classList.toggle('is-off', state.muted);
    this.setAttribute('aria-pressed', state.muted ? 'false' : 'true');
    if (bgm) {
      if (state.muted) {
        bgm.pause();
      } else {
        var ps = bgm.play();
        if (ps && ps.catch) ps.catch(function () {});
        bgmStarted = true;
      }
    }
    if (!state.muted) sfx.tick();
    toast(state.muted ? '声音与背景音乐已关' : '声音与背景音乐已开');
  });
  (function syncSoundBtn() {
    var b = document.getElementById('soundBtn');
    if (b && state.muted) {
      b.classList.add('is-off');
      b.setAttribute('aria-pressed', 'false');
    }
  })();

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (panel.classList.contains('is-open')) { closePanel(); return; }
      if (drawer.classList.contains('is-open')) { closeDrawer(); return; }
      if (gateway.classList.contains('is-open')) { closeGateway(); return; }
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && typeof currentAct === 'number' && (currentAct === 2 || currentAct === 3) && !panel.classList.contains('is-open')) {
      var st = streetInner;
      var dir = e.key === 'ArrowRight' ? 0.08 : -0.08;
      st.set(st.progress + dir);
    }
  });

  /* ---------------- 插图 ---------------- */

  function artFor(kind) {
    var A = {
      bagua: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
    '<ellipse cx="150" cy="138" rx="86" ry="8" fill="#4E4036" opacity=".14"/>' +
    '<circle cx="150" cy="76" r="62" fill="none" stroke="#4E4036" stroke-width="4"/>' +
    '<circle cx="150" cy="76" r="44" fill="none" stroke="#8A6A55" stroke-width="2"/>' +
    '<g stroke="#4E4036" stroke-width="6" stroke-linecap="round">' +
    '<path d="M150 26v16M136 26h28M136 42h28"/>' +
    '<path d="M196 50l-12 12M204 64l-17 5M196 78l-12-2"/>' +
    '<path d="M196 102l-12-12M204 88l-17-5M196 76l-12 2"/>' +
    '<path d="M150 126v-16M136 126h28M136 110h28"/>' +
    '<path d="M104 102l12-12M96 88l17-5M104 76l12 2"/>' +
    '</g>' +
    '<circle cx="150" cy="76" r="8" fill="#B19C84"/></svg>',
  beilin: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
    '<ellipse cx="150" cy="138" rx="80" ry="8" fill="#4E4036" opacity=".14"/>' +
    '<rect x="104" y="30" width="92" height="96" rx="8" fill="#B19C84" stroke="#5E4C40" stroke-width="4"/>' +
    '<rect x="116" y="44" width="68" height="68" rx="4" fill="#DED0BE" stroke="#8A6A55" stroke-width="2"/>' +
    '<path d="M130 58h40M130 72h32M130 86h38M130 100h26" stroke="#5E4C40" stroke-width="4" stroke-linecap="round"/>' +
    '<rect x="96" y="122" width="108" height="12" rx="4" fill="#8A6A55"/>' +
    '<path d="M184 60q18 20 10 44" fill="none" stroke="#8E8C79" stroke-width="5" stroke-linecap="round"/></svg>',
  clay: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="136" rx="86" ry="9" fill="#4E4036" opacity=".14"/>' +
        '<path d="M92 114C74 96 72 66 92 50L110 36 118 22 132 40 150 34 168 40 182 22 190 36 208 50C228 66 226 96 208 114L186 128 114 128Z" fill="#3A332C"/>' +
        '<circle cx="118" cy="34" r="10" fill="#3A332C"/><circle cx="182" cy="34" r="10" fill="#3A332C"/>' +
        '<circle cx="118" cy="34" r="5" fill="#B19C84"/><circle cx="182" cy="34" r="5" fill="#B19C84"/>' +
        '<circle cx="132" cy="28" r="3" fill="#8A6A55"/><circle cx="168" cy="30" r="3" fill="#8E8C79"/>' +
        '<circle cx="128" cy="88" r="4" fill="#DED0BE"/><circle cx="150" cy="80" r="3" fill="#8A6A55"/>' +
        '<circle cx="174" cy="92" r="3" fill="#8E8C79"/><circle cx="146" cy="108" r="3" fill="#B19C84"/>' +
        '<circle cx="126" cy="64" r="3" fill="#B19C84"/><circle cx="176" cy="64" r="3" fill="#8A6A55"/>' +
        '<path d="M108 100Q100 112 96 124M192 100Q200 112 204 124" stroke="#3A332C" stroke-width="9" stroke-linecap="round"/>' +
        '</svg>',
      tiger: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="138" rx="80" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<path d="M96 100C82 80 88 48 112 32L126 14 142 34 158 34 174 14 188 32C212 48 218 80 204 100L184 126 116 126Z" fill="#8A6A55"/>' +
        '<path d="M112 32L126 14 142 34 158 34 174 14 188 32" fill="none" stroke="#DED0BE" stroke-width="8" stroke-linecap="round"/>' +
        '<path d="M118 56L108 48M182 56L192 48M122 84L110 92M178 84L190 92" stroke="#8A6A55" stroke-width="6" stroke-linecap="round"/>' +
        '<ellipse cx="126" cy="78" rx="15" ry="12" fill="#F7F2E9"/><ellipse cx="174" cy="78" rx="15" ry="12" fill="#F7F2E9"/>' +
        '<circle cx="126" cy="78" r="6" fill="#4E4036"/><circle cx="174" cy="78" r="6" fill="#4E4036"/>' +
        '<path d="M150 96l-10 8h20z" fill="#7A5B48"/><path d="M150 104v14M140 118q10 10 20 0" fill="none" stroke="#8A6A55" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="150" cy="36" r="5" fill="#8A6A55"/></svg>',
      bun: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="136" rx="76" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<circle cx="150" cy="116" r="36" fill="#C7B49C"/><circle cx="150" cy="116" r="26" fill="#D2C2AD"/>' +
        '<circle cx="150" cy="78" r="34" fill="#C7B49C"/><circle cx="150" cy="78" r="24" fill="#D2C2AD"/>' +
        '<circle cx="150" cy="42" r="31" fill="#C7B49C"/><circle cx="150" cy="42" r="21" fill="#D2C2AD"/>' +
        '<path d="M132 34q18-12 36 0M128 70q22-12 44 0M126 108q24-12 48 0" fill="none" stroke="#B19C84" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="140" cy="78" r="3" fill="#7A5F4A"/><circle cx="160" cy="78" r="3" fill="#7A5F4A"/><circle cx="150" cy="42" r="3" fill="#7A5F4A"/></svg>',
      sachet: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="136" rx="60" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<path d="M150 24v26" stroke="#6F5B4A" stroke-width="3"/>' +
        '<path d="M108 66C108 50 132 40 150 40C168 40 192 50 192 66L184 116C184 128 166 134 150 134C134 134 116 128 116 116Z" fill="#8E8C79"/>' +
        '<path d="M118 66Q150 82 182 66" fill="none" stroke="#C7B49C" stroke-width="4"/>' +
        '<path d="M150 40v26M132 46l-8 18M168 46l8 18" stroke="#8B8C78" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="150" cy="100" r="16" fill="none" stroke="#C7B49C" stroke-width="3"/>' +
        '<path d="M150 88v24M138 100h24" stroke="#C7B49C" stroke-width="2"/></svg>',
      sugar: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="136" rx="72" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<path d="M92 118C78 100 92 80 112 84C104 62 128 46 148 58C146 36 176 30 186 52C206 44 222 66 206 82C228 88 224 118 200 120Z" fill="#B19C84"/>' +
        '<path d="M104 112C96 98 110 88 122 94M132 72C136 58 154 54 162 66M180 64C192 66 198 78 190 88" fill="none" stroke="#DED0BE" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="150" cy="100" r="4" fill="#7A5F4A"/><circle cx="176" cy="94" r="3" fill="#7A5F4A"/></svg>',
      incense: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="138" rx="66" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<path d="M110 132h80l-8-22h-64z" fill="#7A5B48"/>' +
        '<path d="M128 110V46M150 110V38M172 110V52" stroke="#6F5B4A" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="128" cy="44" r="4" fill="#B19C84"/><circle cx="150" cy="36" r="4" fill="#B19C84"/><circle cx="172" cy="50" r="4" fill="#B19C84"/>' +
        '<path d="M128 36c-8-12 8-18 0-30M150 28c-8-12 8-18 0-30M172 42c-8-12 8-18 0-30" fill="none" stroke="#CFC2B0" stroke-width="3" stroke-linecap="round" opacity=".8"/></svg>',
      ribbon: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="136" rx="58" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<path d="M150 86c-30-32-64-20-58 8 5 24 36 22 58-8Z" fill="#8A6A55"/>' +
        '<path d="M150 86c30-32 64-20 58 8-5 24-36 22-58-8Z" fill="#8A6A55"/>' +
        '<path d="M150 88c-10 22-10 34 0 44 10-10 10-22 0-44Z" fill="#6C5B4F"/>' +
        '<circle cx="150" cy="86" r="10" fill="#B19C84"/>' +
        '<path d="M138 100c-10 14-20 18-30 20M162 100c10 14 20 18 30 20" stroke="#8A6A55" stroke-width="4" stroke-linecap="round"/></svg>',
      tomb: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="138" rx="88" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<rect x="78" y="96" width="144" height="34" fill="#CFC2B0" stroke="#8A7663" stroke-width="2"/>' +
        '<path d="M86 96C86 54 214 54 214 96Z" fill="#8B8C78"/>' +
        '<path d="M104 96C104 66 196 66 196 96" fill="none" stroke="#A3A38C" stroke-width="3"/>' +
        '<rect x="144" y="56" width="12" height="26" fill="#8A7663"/>' +
        '<text x="150" y="72" text-anchor="middle" font-size="7" fill="#EFE9DF" font-family="Kaiti, STKaiti, KaiTi, serif">太昊伏羲氏之陵</text></svg>',
      grass: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="138" rx="80" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<path d="M80 136h140" stroke="#8A7663" stroke-width="3"/>' +
        '<path d="M110 132V48M150 132V32M190 132V56" stroke="#8B8C78" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M110 82l-14-16M110 96l14-14M150 66l-16-18M150 84l16-16M190 88l-14-14M190 104l14-16" stroke="#9C9C86" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="110" cy="48" r="5" fill="#B19C84"/><circle cx="150" cy="32" r="5" fill="#B19C84"/><circle cx="190" cy="56" r="5" fill="#B19C84"/></svg>',
      bell: '<svg viewBox="0 0 300 150" aria-hidden="true">' +
        '<ellipse cx="150" cy="138" rx="54" ry="8" fill="#4E4036" opacity=".14"/>' +
        '<path d="M150 26v12" stroke="#6F5B4A" stroke-width="4"/>' +
        '<path d="M108 112C108 84 116 62 150 58C184 62 192 84 192 112Z" fill="#8A6A55"/>' +
        '<path d="M100 112h100" stroke="#4E4036" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M108 112l-8 10h100l-8-10" fill="#4E4036"/>' +
        '<circle cx="150" cy="120" r="6" fill="#B19C84"/>' +
        '<path d="M120 72c8-10 20-14 30-14" fill="none" stroke="#C7B49C" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M96 48c-10 0-18 8-18 18M204 48c10 0 18 8 18 18" fill="none" stroke="#B19C84" stroke-width="3" stroke-linecap="round" opacity=".7"/></svg>'
    };
    return A[kind] || A.clay;
  }

  /* 第一幕地图：手机上换成竖幅中轴取景 */
  function fitAerial() {
    var aerial = $('.aerial');
    if (!aerial) return;
    if (window.innerWidth < 860) {
      aerial.setAttribute('viewBox', '400 30 820 970');
    } else {
      aerial.setAttribute('viewBox', '0 0 1600 1000');
    }
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    fitAerial();
    initStreets();
    renderSpots();
    updateHUD();
    $('#soundBtn').classList.toggle('is-off', state.muted);
    $('#soundBtn').setAttribute('aria-pressed', state.muted ? 'false' : 'true');
    $('#certName').value = state.name;
    setAct(1);
  }

  function updateAllStalls() {
    $$('.stall').forEach(function (el) {
      var id = el.getAttribute('data-task');
      var done = has(id);
      el.classList.toggle('is-done', done);
      var tag = el.querySelector('.stall__tag');
      if (tag) tag.textContent = done ? '已完成 · ' + TASKS[id].label.split(' · ')[0] : (MARKET_STALLS.concat(INNER_STALLS).filter(function (s) { return s.id === id; })[0] || {}).tag;
    });
  }

  /* ====================== 集市互动：布老虎 / 压缩馍 ====================== */
  /* ============================================================
     集市两间可进店：布老虎拼装 + 压缩馍吃掉
     ============================================================ */

  var shopDetail = $('#shopDetail');
  var shopStage = $('#shopStage');
  var shopActions = $('#shopActions');
  var shopProgress = $('#shopProgress');
  var shopProgressLabel = $('#shopProgressLabel');
  var plushGame = null;
  var bunGame = null;

  function openShopDetail(kind) {
    shopDetail.classList.add('is-open');
    shopDetail.classList.remove('is-tiger');
    shopDetail.classList.remove('is-clay');
    shopDetail.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
    if (kind === 'tiger') openPlush();
    else if (kind === 'bun') openBun();
  }
  function closeShopDetail() {
    var _act2 = document.querySelector('.act--2');
    if (_act2) _act2.classList.remove('is-shop-open', 'is-entering-shop');
    var _vid = document.getElementById('market2dVideo');
    if (_vid) { try { _vid.play(); } catch (e) {} }
    shopDetail.classList.remove('is-open', 'is-immersive', 'is-clay', 'is-tiger');
    shopDetail.setAttribute('aria-hidden', 'true');
    if (app) app.classList.remove('is-detail');
    plushGame = null;
    bunGame = null;
  }
  $$('[data-close-shop]').forEach(function (el) { el.addEventListener('click', closeShopDetail); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && shopDetail.classList.contains('is-open')) { closeShopDetail(); }
  });

  /* ------------------------------ 布老虎 ------------------------------ */

  var PLUSH_META = {
    body: { cx: 400, cy: 330, tray: [752, 330], rot: -6 },
    head: { cx: 235, cy: 205, tray: [674, 140], rot: 12 },
    legFL: { cx: 320, cy: 470, tray: [642, 470], rot: 18 },
    legFR: { cx: 380, cy: 475, tray: [706, 530], rot: -12 },
    legHL: { cx: 470, cy: 475, tray: [790, 530], rot: 12 },
    legHR: { cx: 530, cy: 470, tray: [852, 450], rot: -18 },
    tail: { cx: 565, cy: 285, tray: [846, 292], rot: 34 }
  };
  var PLUSH_TOTAL = Object.keys(PLUSH_META).length;

  function plushSVG() {
    function seam(d, cx, cy) {
      return '<path d="' + d + '" fill="none" stroke="#b49a79" stroke-width="2" stroke-dasharray="8 7" transform="translate(' + cx + ' ' + cy + ') scale(.9) translate(-' + cx + ' -' + cy + ')"/>';
    }
    function label(t, cx, cy) {
      return '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-family="Kaiti,STKaiti,KaiTi,serif" font-size="15" fill="#8a5a44" pointer-events="none">' + t + '</text>';
    }
    var bodyD = 'M286 330C286 268 330 248 400 248C476 248 528 278 534 336C540 398 480 420 400 420C320 420 282 394 286 330Z';
    var bellyD = 'M312 368C346 400 456 404 492 364C488 398 448 420 400 420C350 420 320 402 312 368Z';
    var legFL = 'M300 432L342 432Q352 480 340 518Q330 534 310 528Q296 498 300 432Z';
    var legFR = 'M358 432L400 432Q410 480 398 518Q388 534 368 528Q354 498 358 432Z';
    var legHL = 'M448 432L490 432Q500 480 488 518Q478 534 458 528Q444 498 448 432Z';
    var legHR = 'M508 432L550 432Q560 480 548 518Q538 534 518 528Q504 498 508 432Z';
    var tailD = 'M520 312C570 300 606 258 600 216C596 190 610 172 628 166';
    var earL = 'M166 158Q150 108 190 100Q210 110 212 148Z';
    var earR = 'M304 148Q306 110 326 100Q366 108 350 158Z';
    var face = '<circle cx="235" cy="212" r="50" fill="#f4ead7" stroke="#6e5a44" stroke-width="3"/>' +
      '<circle cx="214" cy="206" r="12" fill="none" stroke="#4e7a5a" stroke-width="4"/>' +
      '<circle cx="256" cy="206" r="12" fill="none" stroke="#4e7a5a" stroke-width="4"/>' +
      '<circle cx="214" cy="206" r="4" fill="#30241c"/><circle cx="256" cy="206" r="4" fill="#30241c"/>' +
      '<text x="235" y="186" text-anchor="middle" font-family="Kaiti,STKaiti,serif" font-size="18" fill="#30241c">王</text>' +
      '<path d="M222 234q13 8 26 0" fill="none" stroke="#8e2a25" stroke-width="3"/>' +
      '<path d="M214 240l7 10 7-10 7 10 7-10 7 10 7-10" fill="none" stroke="#6e2a22" stroke-width="2"/>';
    var pieces = [
      ['body', '身体', bodyD, 400, 330],
      ['head', '头', null, 235, 205],
      ['legFL', '前腿', legFL, 320, 470],
      ['legFR', '前腿', legFR, 380, 475],
      ['legHL', '后腿', legHL, 470, 475],
      ['legHR', '后腿', legHR, 530, 470],
      ['tail', '尾巴', null, 565, 285]
    ];
    var pieceHtml = pieces.map(function (pi) {
      var name = pi[0], labelText = pi[1], d = pi[2], cx = pi[3], cy = pi[4];
      var fig = '';
      if (name === 'head') {
        fig = '<circle cx="235" cy="205" r="72" fill="#f4ead7" stroke="#6e5a44" stroke-width="3"/>' +
          '<path d="' + earL + '" fill="#f4ead7" stroke="#6e5a44" stroke-width="3"/>' +
          '<path d="' + earR + '" fill="#f4ead7" stroke="#6e5a44" stroke-width="3"/>' +
          face +
          seam('M235 133a72 72 0 1 0 0 144a72 72 0 1 0 0 -144', 235, 205) +
          seam(earL, 192, 132) + seam(earR, 278, 132);
      } else if (name === 'tail') {
        fig = '<path d="' + tailD + '" fill="none" stroke="#f4ead7" stroke-width="34" stroke-linecap="round"/>' +
          '<path d="' + tailD + '" fill="none" stroke="#6e5a44" stroke-width="3" stroke-linecap="round"/>' +
          seam(tailD, 565, 285);
      } else {
        fig = '<path d="' + d + '" fill="#f4ead7" stroke="#6e5a44" stroke-width="3"/>' + seam(d, cx, cy);
        if (name === 'body') {
          fig += '<path d="' + bellyD + '" fill="#f6e7c8" stroke="#b49a79" stroke-width="2.5"/>' + seam(bellyD, 400, 352);
        }
      }
      return '<g class="tiger-piece" data-piece="' + name + '" tabindex="0" role="button" aria-label="' + labelText + '">' + fig + label(labelText, cx, cy) + '</g>';
    }).join('');
    var outline = '<g id="plushOutline" fill="none" stroke="#b49a79" stroke-width="2" stroke-dasharray="9 8" opacity=".5">' +
      '<circle cx="235" cy="205" r="72"/><circle cx="235" cy="212" r="50"/>' +
      '<path d="' + bodyD + '"/><path d="' + bellyD + '"/>' +
      '<path d="' + legFL + '"/><path d="' + legFR + '"/><path d="' + legHL + '"/><path d="' + legHR + '"/>' +
      '<path d="' + tailD + '"/></g>';
    return '<div class="plush-wrap" id="plushWrap">' +
      '<svg id="plushSvg" viewBox="0 0 900 620" role="group" aria-label="布老虎裁片拼图：把裁片拖到虚线位置">' +
      '<defs><filter id="pieceShadow" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#3e2b20" flood-opacity=".25"/></filter></defs>' +
      '<rect x="0" y="0" width="900" height="620" fill="#e9ddcb"/>' +
      '<rect x="24" y="24" width="850" height="570" rx="24" fill="#f4e9d6" stroke="#c9b497" stroke-width="2"/>' +
      '<path d="M24 470C200 500 650 500 876 470" fill="none" stroke="#d6c4a8" stroke-width="2"/>' +
      '<g id="plushTray"><rect x="606" y="42" width="268" height="536" rx="20" fill="#d8c7ae" stroke="#b49a79" stroke-width="2"/><rect x="616" y="52" width="248" height="516" rx="14" fill="#e6d7c0"/><text x="740" y="76" text-anchor="middle" font-family="Kaiti,STKaiti,serif" font-size="17" fill="#8a6a55" letter-spacing="3">裁片 · 拖到左边</text></g>' +
      outline +
      '<g id="plushTiger" filter="url(#pieceShadow)">' + pieceHtml + '</g>' +
      '<image id="plushPhoto" href="assets/tiger/tiger-photo.jpg" x="150" y="40" width="600" height="520" preserveAspectRatio="xMidYMid slice" opacity="0"/>' +
      '<g id="plushCotton"><circle class="fluff f1" cx="360" cy="330" r="30" fill="#fbf6ea"/><circle class="fluff f2" cx="430" cy="360" r="35" fill="#f7efdf"/><circle class="fluff f3" cx="400" cy="300" r="24" fill="#fffaf0"/></g>' +
      '</svg>' +
      '<p class="plush-tip" id="plushTip">把裁片从托盘中拖到左边虚线位置；七片摆好，小布老虎就做好了。</p>' +
      '</div>';
  }

  function setPlushPiece(name, dx, dy, rot, scale) {
    var st = plushGame && plushGame.state[name];
    if (!st) return;
    var m = PLUSH_META[name];
    st.dx = dx; st.dy = dy; st.rot = rot;
    st.scale = (scale === undefined ? 1 : scale);
    st.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg) scale(' + st.scale + ')';
  }

  function buildPlush() {
    var _st0 = document.getElementById('shopStage');
    if (_st0) _st0.classList.remove('is-stuffing');
    var _cue0 = document.getElementById('plushStuffCue');
    if (_cue0) _cue0.remove();
    $('#shopDetailKicker').textContent = '集市 · 瑞虎坊';
    $('#shopDetailTitle').textContent = '拼一只布老虎';
    $('#shopDetailDesc').innerHTML = '把左边需要的裁片从托盘拖到虚线位置；七片摆好，小布老虎就做好了。 <a class="shop-pattern-link" href="assets/pattern/tiger-pattern.png" target="_blank" rel="noopener">看 DIY 裁片图纸 →</a>';
    shopProgressLabel.textContent = '拼装';
    shopProgress.textContent = '0 / ' + PLUSH_TOTAL;
    shopActions.innerHTML = '';
    shopStage.innerHTML = plushSVG();
    shopActions.innerHTML = '<button class="btn btn--ghost" type="button" id="plushAuto">帮我摆好</button>';
    var plushAuto = $('#plushAuto');
    if (plushAuto) plushAuto.addEventListener('click', function () { Object.keys(PLUSH_META).forEach(function (name) { if (plushGame && !plushGame.done) placePlushPiece(name); }); });

    var svg = $('#plushSvg');
    var tray = document.getElementById('plushTray');
    if (tray) tray.style.display = '';
    var outline = document.getElementById('plushOutline');
    if (outline) { outline.style.display = ''; outline.style.opacity = '.52'; }
    var pieces = $$('.tiger-piece', svg);
    plushGame = { svg: svg, pieces: pieces, state: {}, placed: 0, cotton: 0, assembled: false, done: false };
    pieces.forEach(function (el) {
      var name = el.getAttribute('data-piece');
      var m = PLUSH_META[name];
      if (!m) return;
      el.style.transformOrigin = m.cx + 'px ' + m.cy + 'px';
      el.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)';
      plushGame.state[name] = { el: el, done: false, dx: 0, dy: 0, rot: 0 };
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      setPlushPiece(name, m.tray[0] - m.cx, m.tray[1] - m.cy, m.rot, 0.62);
      bindPlushPointer(el, name);
    });
    var tip = $('#plushTip');
    if (tip) tip.textContent = '把托盘里的裁片拖到左边虚线位置（点一下也能放）；七片摆好，小布老虎就做好了。';
  }

  function bindPlushPointer(el, name) {
    var drag = null;
    el.addEventListener('pointerdown', function (e) {
      if (!plushGame || plushGame.done || plushGame.state[name].done) return;
      e.preventDefault();
      var st = plushGame.state[name];
      var rect = plushGame.svg.getBoundingClientRect();
      drag = {
        id: e.pointerId, x: e.clientX, y: e.clientY,
        dx: st.dx, dy: st.dy, moved: 0,
        sx: rect.width / 900, sy: rect.height / 620
      };
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-drag');
      el.style.transition = 'none';
    });
    el.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id || !plushGame) return;
      var dx = drag.dx + (e.clientX - drag.x) / drag.sx;
      var dy = drag.dy + (e.clientY - drag.y) / drag.sy;
      drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
      drag.x = e.clientX; drag.y = e.clientY;
      drag.dx = dx; drag.dy = dy;
      setPlushPiece(name, dx, dy, 0, 1);
    });
    function end(e) {
      if (!drag || e.pointerId !== drag.id || !plushGame) return;
      var d = drag; drag = null;
      el.classList.remove('is-drag');
      el.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)';
      var near = Math.hypot(d.dx, d.dy) < 72;
      if (d.moved < 7 || near) placePlushPiece(name);
      else {
        var m = PLUSH_META[name];
        setPlushPiece(name, m.tray[0] - m.cx, m.tray[1] - m.cy, m.rot, 0.62);
      }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && plushGame && !plushGame.done) {
        e.preventDefault(); placePlushPiece(name);
      }
    });
  }

  function placePlushPiece(name) {
    var st = plushGame && plushGame.state[name];
    if (!st || st.done) return;
    st.done = true;
    st.el.classList.add('is-placed');
    st.el.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)';
    setPlushPiece(name, 0, 0, 0, 1);
    plushGame.placed++;
    sfx.pop();
    shopProgress.textContent = plushGame.placed + ' / ' + PLUSH_TOTAL;
    if (plushGame.placed >= PLUSH_TOTAL) finishPlushAssembly();
  }

  function finishPlushAssembly() {
    if (!plushGame) return;
    plushGame.assembled = true;
    var tray = $('#plushTray'), outline = $('#plushOutline'), tiger = $('#plushTiger'), photo = $('#plushPhoto');
    if (tray) tray.style.display = 'none';
    if (outline) outline.style.display = 'none';
    if (tiger) tiger.style.opacity = '0';
    if (photo) photo.style.opacity = '1';
    // 去掉塞棉花，七片摆好直接完成
    state.tiger = {};
    save();
    completeTask('tiger');
    renderBag();
    showTiger2Done();
  }
  function addPlushCotton() {
    if (!plushGame || !plushGame.assembled || plushGame.done) return;
    plushGame.cotton++;
    var photo = $('#plushPhoto');
    if (photo) {
      photo.style.opacity = '1';
      photo.classList.remove('is-flat');
      photo.classList.add('is-plump-' + plushGame.cotton);
    }
    var fluffs = $$('#plushCotton .fluff');
    if (fluffs[plushGame.cotton - 1]) fluffs[plushGame.cotton - 1].classList.add('is-on');
    shopProgress.textContent = plushGame.cotton + ' / 3';
    var _cueNow = document.getElementById('plushStuffCue');
    if (_cueNow) {
      if (plushGame.cotton < 3) _cueNow.querySelector('span').textContent = '再点一下 · 棉花 ' + plushGame.cotton + '/3';
      else _cueNow.remove();
    }
    var tip = $('#plushTip');
    if (tip) tip.textContent = plushGame.cotton < 3 ? '塞进一团棉花，布虎鼓了一点；再点它一下（' + plushGame.cotton + '/3）。' : '三团棉花塞好了，布老虎圆鼓鼓！';
    sfx.pop();
    if (plushGame.cotton >= 3) finishPlush();
  }

  function finishPlush() {
    if (!plushGame) return;
    var _st = document.getElementById('shopStage');
    if (_st) _st.classList.remove('is-stuffing');
    var _cueDone = document.getElementById('plushStuffCue');
    if (_cueDone) _cueDone.remove();
    plushGame.done = true;
    var btn = $('#plushCottonBtn');
    if (btn) btn.disabled = true;
    completeTask('tiger');
    showPlushDone();
  }

  function plushDoneSVG() {
    return '<svg viewBox="0 0 240 220" class="plush-done-svg" aria-hidden="true">' +
      '<defs><linearGradient id="tigerRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4483c"/><stop offset="1" stop-color="#982f27"/></linearGradient></defs>' +
      '<ellipse cx="120" cy="198" rx="86" ry="13" fill="#3e2b20" opacity=".14"/>' +
      '<path d="M172 132C202 124 220 102 216 78C214 62 222 52 232 48" fill="none" stroke="#6e2a22" stroke-width="16" stroke-linecap="round"/>' +
      '<path d="M172 132C202 124 220 102 216 78C214 62 222 52 232 48" fill="none" stroke="#744439" stroke-width="11" stroke-linecap="round"/>' +
      '<path d="M186 112q12-8 16-22" fill="none" stroke="#2c5f9e" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M120 160L120 190M144 158L144 190M166 156L166 188M190 152L190 184" stroke="#744439" stroke-width="13" stroke-linecap="round"/>' +
      '<path d="M114 186h14M138 186h14M160 184h14M184 182h14" stroke="#e9b84c" stroke-width="7" stroke-linecap="round"/>' +
      '<ellipse cx="146" cy="128" rx="64" ry="42" fill="url(#tigerRed)" stroke="#6e2a22" stroke-width="3"/>' +
      '<path d="M108 148q38 22 78 0" fill="#f6ebd6" opacity=".95"/>' +
      '<path d="M104 118q36-16 76 2" fill="none" stroke="#f0d28a" stroke-width="3"/>' +
      '<path d="M122 138q16-12 32 0q-4 16-18 14q9 9 20 3" fill="none" stroke="#2c5f9e" stroke-width="3.4"/>' +
      '<path d="M60 92L40 58L78 72Z" fill="#8e2a25" stroke="#6e2a22" stroke-width="2"/>' +
      '<path d="M50 86L42 68L62 76Z" fill="#e9b84c"/>' +
      '<path d="M120 82L138 52L146 92Z" fill="#8e2a25" stroke="#6e2a22" stroke-width="2"/>' +
      '<path d="M126 80L136 62L140 82Z" fill="#e9b84c"/>' +
      '<circle cx="92" cy="108" r="45" fill="url(#tigerRed)" stroke="#6e2a22" stroke-width="3"/>' +
      '<circle cx="92" cy="108" r="38" fill="none" stroke="#f0d28a" stroke-width="3"/>' +
      '<text x="92" y="88" text-anchor="middle" font-family="Kaiti, STKaiti, serif" font-size="16" font-weight="700" fill="#3a2a20">王</text>' +
      '<circle cx="73" cy="112" r="14" fill="#f6ebd6" stroke="#2c5f9e" stroke-width="3"/>' +
      '<circle cx="105" cy="112" r="14" fill="#f6ebd6" stroke="#2c5f9e" stroke-width="3"/>' +
      '<circle cx="73" cy="112" r="6" fill="#2a201a"/><circle cx="105" cy="112" r="6" fill="#2a201a"/>' +
      '<path d="M58 101q12-9 26-3M118 101q-12-9-26-3" fill="none" stroke="#2c5f9e" stroke-width="4" stroke-linecap="round"/>' +
      '<ellipse cx="89" cy="128" rx="22" ry="14" fill="#f6ebd6" stroke="#d4a24a" stroke-width="2"/>' +
      '<path d="M85 124q4-4 8 0" fill="none" stroke="#8e2a25" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M80 133q9 6 18 0" fill="none" stroke="#6e2a22" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M68 128L48 122M68 133L46 134M68 138L48 144M110 128L130 122M110 133L132 134M110 138L130 144" stroke="#3a2a20" stroke-width="1.6" fill="none"/>' +
      '</svg>';
  }

  function showPlushDone() {
    $('#shopDetailKicker').textContent = '集市 · 瑞虎坊';
    $('#shopDetailTitle').textContent = '布老虎做好了';
    $('#shopDetailDesc').textContent = '布老虎已经收进你的背包。';
    shopProgressLabel.textContent = '收藏';
    shopProgress.textContent = '已收进背包';
    shopStage.innerHTML = '<div class="shop-done"><img class="plush-done-img" src="assets/tiger/tiger-photo.jpg" alt="做好的布老虎玩偶"><div class="plush-done__replay"><button class="btn btn--ghost" type="button" data-replay="plush">再拼一只</button></div><p class="shop-done__name">布老虎玩偶</p><p class="shop-done__meta">布老虎 · 已收进背包</p></div>';
    shopActions.innerHTML = '<button class="btn btn--ghost" type="button" data-replay="plush">再拼一只</button><button class="btn btn--primary" type="button" data-close-shop>收进背包 · 回街市</button>';
    $$('[data-close-shop]', shopActions).forEach(function (el) { el.addEventListener('click', closeShopDetail); });
  }

  var tiger2Game = null;
  var TIGER2_COLORS = [
    { name: '明黄', hue: 0 }, { name: '朱红', hue: -28 }, { name: '竹青', hue: 118 },
    { name: '靛蓝', hue: 208 }, { name: '紫藤', hue: 272 }, { name: '藕粉', hue: 320 }
  ];
  function openPlush() {
    closeBag();
    buildPlush();
  }

  var TIGER3_DOTS = [
    { x: 28, y: 44 }, { x: 30, y: 32 }, { x: 36, y: 25 }, { x: 45, y: 22.5 },
    { x: 54, y: 22 }, { x: 62, y: 22.5 }, { x: 70, y: 23 }, { x: 78, y: 26 },
    { x: 85, y: 32 }, { x: 88, y: 42 }, { x: 87, y: 50 }, { x: 82, y: 57 },
    { x: 73, y: 61 }, { x: 62, y: 62 }, { x: 51, y: 62 }, { x: 40, y: 60 },
    { x: 31, y: 53 }
  ];
  var tiger3State = null;
  function openTiger3() {
    shopDetail.classList.add('is-open');
    shopDetail.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
    $('#shopDetailKicker').textContent = '集市 · 瑞虎坊';
    $('#shopDetailTitle').textContent = '缝一只布老虎';
    $('#shopDetailDesc').textContent = '按顺序点虚线针脚，把布老虎一点点缝起来；全部缝完，就能收下这只小布老虎。';
    shopProgressLabel.textContent = '针脚';
    shopProgress.textContent = '0 / ' + TIGER3_DOTS.length;
    shopActions.innerHTML = '';
    tiger3State = { next: 0 };
    var dots = TIGER3_DOTS.map(function (d, i) {
      return '<button class="tiger3-dot' + (i === 0 ? ' is-next' : '') + '" type="button" data-i="' + i + '" style="left:' + d.x + '%;top:' + d.y + '%">' + (i + 1) + '</button>';
    }).join('');
    shopStage.innerHTML =
      '<div class="tiger3-game">' +
        '<div class="tiger3-board" id="tiger3Board">' +
          '<img class="tiger3-design" src="assets/tiger2/design2.jpg" alt="布老虎纸样">' +
          '<svg class="tiger3-thread" id="tiger3Thread" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>' +
          dots +
          '<div class="tiger3-done" id="tiger3Done"><img src="assets/tiger2/finished.png" alt="缝好的布老虎"></div>' +
        '</div>' +
        '<p class="tiger3-progress" id="tiger3Progress">已缝 0 / ' + TIGER3_DOTS.length + ' 针</p>' +
        '<p class="tiger3-hint">按编号顺序点虚线针脚；点错会提示你。</p>' +
      '</div>';
    bindTiger3();
  }
  function bindTiger3() {
    document.querySelectorAll('.tiger3-dot', shopStage).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!tiger3State) return;
        var i = parseInt(btn.getAttribute('data-i'), 10);
        if (i !== tiger3State.next) {
          toast('按顺序来 · 下一针是 ' + (tiger3State.next + 1) + ' 号');
          return;
        }
        btn.classList.remove('is-next');
        btn.classList.add('is-done');
        var nextBtn = document.querySelector('.tiger3-dot[data-i="' + (i + 1) + '"]', shopStage);
        if (nextBtn) nextBtn.classList.add('is-next');
        // 画线
        if (i > 0) {
          var thread = document.getElementById('tiger3Thread');
          var a = TIGER3_DOTS[i - 1], b = TIGER3_DOTS[i];
          var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
          line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
          line.setAttribute('class', 'tiger3-stitch');
          thread.appendChild(line);
          var shade = document.getElementById('tiger3Done');
          if (shade) shade.style.opacity = String(Math.min(.92, i / TIGER3_DOTS.length));
        }
        tiger3State.next++;
        var n = tiger3State.next;
        shopProgress.textContent = n + ' / ' + TIGER3_DOTS.length;
        var prog = document.getElementById('tiger3Progress');
        if (prog) prog.textContent = '已缝 ' + n + ' / ' + TIGER3_DOTS.length + ' 针';
        sfx.pop && sfx.pop();
        if (n >= TIGER3_DOTS.length) tiger3Complete();
      });
    });
  }
  function tiger3Complete() {
    var board = document.getElementById('tiger3Board');
    if (board) board.classList.add('is-done');
    var done = document.getElementById('tiger3Done');
    if (done) done.style.opacity = '1';
    var hint = document.querySelector('.tiger3-hint', shopStage);
    if (hint) hint.textContent = '缝好了 · 布老虎做好了';
    setTimeout(function () {
      state.tiger = {};
      save();
      completeTask('tiger');
      renderBag();
      showTiger2Done();
    }, 900);
  }

  function openTiger2() {
    shopDetail.classList.add('is-open');
    shopDetail.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
    $('#shopDetailKicker').textContent = '集市 · 瑞虎坊';
    $('#shopDetailTitle').textContent = '拼一只布老虎';
    $('#shopDetailDesc').textContent = '左边是布老虎设计图：把下面七片布片拖到对应编号位置上；拼好就会出现一只小布老虎。';
    shopProgressLabel.textContent = '布片';
    shopProgress.textContent = '0 / 7';
    shopActions.innerHTML = '';
    tiger2Game = { placed: {}, done: false };
    shopStage.innerHTML =
      '<div class="tiger2-game">' +
        '<div class="tiger2-design">' +
          '<p class="tiger2-cap">设计图 · 把下面的布片拖到对应编号位置</p>' +
          '<div class="tiger2-board" id="tiger2Board">' +
            '<img class="tiger2-sheet" src="assets/tiger2/design2.jpg" alt="布老虎设计图">' +
            '<div class="tiger2-slot tiger2-slot--sil" data-slot="sil" data-need="silhouette"></div>' +
            '<div class="tiger2-slot tiger2-slot--bodyL" data-slot="bodyL" data-need="bodyL"></div>' +
            '<div class="tiger2-slot tiger2-slot--bodyR" data-slot="bodyR" data-need="bodyR"></div>' +
            '<div class="tiger2-slot tiger2-slot--c1" data-slot="c1" data-need="yellow"></div>' +
            '<div class="tiger2-slot tiger2-slot--c2" data-slot="c2" data-need="yellow"></div>' +
            '<div class="tiger2-slot tiger2-slot--c3" data-slot="c3" data-need="red"></div>' +
            '<div class="tiger2-slot tiger2-slot--c4" data-slot="c4" data-need="red"></div>' +
            '<div class="tiger2-final" id="tiger2Final"><img src="assets/tiger2/finished.png" alt="拼好的布老虎"></div>' +
          '</div>' +
        '</div>' +
        '<div class="tiger2-tray">' +
          '<p class="tiger2-cap">布片 · 拖到设计图上</p>' +
          '<div class="tiger2-pieces" id="tiger2Pieces">' +
            '<button class="tiger2-piece" type="button" data-piece="sil" data-type="silhouette"><img src="assets/tiger2/paper.png" alt=""><span>纸样</span></button>' +
            '<button class="tiger2-piece" type="button" data-piece="bodyL" data-type="bodyL"><img src="assets/tiger2/body-left.png" alt=""><span>左半身</span></button>' +
            '<button class="tiger2-piece" type="button" data-piece="bodyR" data-type="bodyR"><img src="assets/tiger2/body-right.png" alt=""><span>右半身</span></button>' +
            '<button class="tiger2-piece" type="button" data-piece="yellow1" data-type="yellow"><img src="assets/tiger2/circle-yellow.png" alt=""><span>黄布片</span></button>' +
            '<button class="tiger2-piece" type="button" data-piece="red1" data-type="red"><img src="assets/tiger2/circle-red.png" alt=""><span>红布片</span></button>' +
            '<button class="tiger2-piece" type="button" data-piece="yellow2" data-type="yellow"><img src="assets/tiger2/circle-yellow.png" alt=""><span>黄布片</span></button>' +
            '<button class="tiger2-piece" type="button" data-piece="red2" data-type="red"><img src="assets/tiger2/circle-red.png" alt=""><span>红布片</span></button>' +
          '</div>' +
        '</div>' +
      '</div>';
    bindTiger2();
  }
  function bindTiger2() {
    document.querySelectorAll('.tiger2-piece', shopStage).forEach(function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        if (btn.classList.contains('is-used') || (tiger2Game && tiger2Game.done)) return;
        e.preventDefault();
        var piece = btn.getAttribute('data-piece');
        var type = btn.getAttribute('data-type');
        var img = btn.querySelector('img');
        var ghost = document.createElement('div');
        ghost.className = 'tiger2-ghost';
        ghost.innerHTML = '<img src="' + img.getAttribute('src') + '" alt="">';
        document.body.appendChild(ghost);
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';
        var moved = false, startX = e.clientX, startY = e.clientY;
        function move(ev) {
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
          if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) moved = true;
          var over = tiger2SlotAt(ev.clientX, ev.clientY, type);
          document.querySelectorAll('.tiger2-slot', shopStage).forEach(function (s) { s.classList.toggle('is-over', s === over); });
        }
        function up(ev) {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          ghost.remove();
          document.querySelectorAll('.tiger2-slot', shopStage).forEach(function (s) { s.classList.remove('is-over'); });
          var slot = tiger2SlotAt(ev.clientX, ev.clientY, type);
          if (!slot && !moved) {
            slot = document.querySelector('.tiger2-slot[data-need="' + type + '"]:not(.is-filled)', shopStage);
          }
          if (slot) tiger2Place(piece, slot);
        }
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      });
    });
    document.querySelectorAll('.tiger2-color', shopStage).forEach(function (b) {
      b.addEventListener('click', function () {
        if (!tiger2Game) return;
        tiger2Game.hue = parseFloat(b.getAttribute('data-hue'));
        tiger2Game.colorName = b.getAttribute('data-name');
        var fin = document.querySelector('#tiger2Final img');
        if (fin) fin.style.filter = 'hue-rotate(' + tiger2Game.hue + 'deg)';
        document.querySelectorAll('.tiger2-color', shopStage).forEach(function (x) { x.classList.toggle('is-on', x === b); });
      });
    });
  }
  function tiger2SlotAt(x, y, type) {
    var slots = document.querySelectorAll('.tiger2-slot', shopStage);
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (s.classList.contains('is-filled')) continue;
      if (s.getAttribute('data-need') !== type) continue;
      var r = s.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return s;
    }
    return null;
  }
  function tiger2Place(piece, slot) {
    if (!tiger2Game || tiger2Game.done) return;
    var btn = document.querySelector('.tiger2-piece[data-piece="' + piece + '"]', shopStage);
    if (!btn || btn.classList.contains('is-used')) return;
    var src = btn.querySelector('img').getAttribute('src');
    var id = slot.getAttribute('data-slot');
    if (tiger2Game.placed[id]) return;
    tiger2Game.placed[id] = piece;
    btn.classList.add('is-used');
    slot.classList.add('is-filled');
    slot.innerHTML = '<img src="' + src + '" alt="">';
    var n = Object.keys(tiger2Game.placed).length;
    shopProgress.textContent = n + ' / 7';
    var fill = document.getElementById('tiger2Fill');
    if (fill) fill.textContent = '已拼 ' + n + ' / 7 片';
    sfx.pop();
    if (n >= 7) tiger2Finish();
  }
  function tiger2Finish() {
    if (!tiger2Game || tiger2Game.done) return;
    tiger2Game.done = true;
    var board = document.getElementById('tiger2Board');
    if (board) board.classList.add('is-done');
    var pieces = document.getElementById('tiger2Pieces');
    if (pieces) pieces.classList.add('is-hidden');
    var fill = document.getElementById('tiger2Fill');
    if (fill) fill.textContent = '拼好了 · 给小布老虎挑个颜色';
    shopActions.innerHTML = '<button class="btn btn--primary" type="button" id="tiger2Keep">收下这只布老虎</button>';
    document.getElementById('tiger2Keep').addEventListener('click', function () {
      state.tiger = {};
      save();
      completeTask('tiger');
      renderBag();
      showTiger2Done();
    });
    sfx.chime();
  }
  function showTiger2Done() {
    shopDetail.classList.add('is-open');
    shopDetail.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
    var g = state.tiger || {};
    $('#shopDetailTitle').textContent = '布老虎做好了';
    $('#shopDetailDesc').textContent = '七片裁片摆好，一只布老虎就做好了。收进背包，带回街市。';
    shopProgressLabel.textContent = '收藏';
    shopProgress.textContent = '已收进背包';
    shopStage.innerHTML = '<div class="tiger2-done"><img src="assets/tiger2/finished.png" alt="布老虎"><p class="tiger2-done__name">布老虎 · 已拼好</p></div>';
    shopActions.innerHTML = '<button class="btn btn--ghost" type="button" data-replay="tiger">再拼一只</button><button class="btn btn--primary" type="button" data-close-shop>收进背包 · 回街市</button>';
    document.querySelectorAll('[data-close-shop]', shopActions).forEach(function (el) { el.addEventListener('click', closeShopDetail); });
  }

  /* ------------------------------ 压缩馍 ------------------------------ */

  var BUN_BITES = [
    { x: 212, y: 212, r: 40 }, { x: 404, y: 218, r: 44 }, { x: 300, y: 318, r: 46 },
    { x: 210, y: 304, r: 32 }, { x: 420, y: 306, r: 34 }
  ];

  function bunSVG() {
    // 水彩压缩馍：螺旋纹、千层边、咬痕遮罩
    var spiral = (function () {
      var pts = [], turns = 5.4, r0 = 20, r1 = 150;
      for (var i = 0; i <= 320; i++) {
        var t = i / 320;
        var a = t * turns * Math.PI * 2;
        var r = r0 + (r1 - r0) * t;
        var x = 320 + Math.cos(a) * r;
        var y = 300 + Math.sin(a) * r * 0.92;
        pts.push((i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1));
      }
      return pts.join(' ');
    })();
    var washes = '';
    var spots = [
      [242, 226, 48, 30, .20], [404, 218, 40, 26, .17], [382, 336, 54, 30, .14],
      [222, 350, 42, 26, .13], [310, 398, 38, 20, .11], [456, 306, 46, 26, .12]
    ];
    spots.forEach(function (s) {
      washes += '<ellipse cx="' + s[0] + '" cy="' + s[1] + '" rx="' + s[2] + '" ry="' + s[3] + '" fill="#d98b3f" opacity="' + s[4] + '"/>';
    });
    var speckles = '';
    for (var i = 0; i < 44; i++) {
      var a = i * 2.39996, rr = Math.sqrt((i % 19) / 19);
      var sx = 320 + Math.cos(a) * rr * 152, sy = 300 + Math.sin(a) * rr * 122;
      speckles += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="' + (1.3 + (i % 3) * 0.7) + '" fill="#b56a2e" opacity=".26"/>';
    }
    return '<div class="bun-wrap">' +
      '<svg id="bunSvg" viewBox="0 0 640 520" role="group" aria-label="压缩馍：点一下咬一口">' +
      '<defs>' +
      '<mask id="bunMask"><rect x="0" y="0" width="640" height="520" fill="#fff"/><g id="bunBites"></g></mask>' +
      '<radialGradient id="bunTop" cx=".42" cy=".34" r=".74"><stop offset="0" stop-color="#fbf3df"/><stop offset=".45" stop-color="#f6e6c4"/><stop offset=".78" stop-color="#e9cfa4"/><stop offset="1" stop-color="#d6b487"/></radialGradient>' +
      '<linearGradient id="bunSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2c194"/><stop offset=".55" stop-color="#c99a63"/><stop offset="1" stop-color="#a97442"/></linearGradient>' +
      '<filter id="bunShadow" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#4a3020" flood-opacity=".26"/></filter>' +
      '</defs>' +
      '<rect x="0" y="0" width="640" height="520" fill="#efe3cf"/>' +
      '<rect x="22" y="22" width="596" height="476" rx="18" fill="#f7eeda" stroke="#d3bb94" stroke-width="1.6"/>' +
      '<g id="bunPlate">' +
      '<ellipse cx="320" cy="404" rx="212" ry="52" fill="#4a3020" opacity=".12"/>' +
      '<ellipse cx="320" cy="392" rx="196" ry="46" fill="none" stroke="#cdb98f" stroke-width="1.4" stroke-dasharray="2 6" opacity=".8"/>' +
      '</g>' +
      '<g id="bunGroup" filter="url(#bunShadow)" style="transform-origin:320px 300px;transition:transform .28s cubic-bezier(.2,.8,.2,1)">' +
      '<g mask="url(#bunMask)">' +
      '<ellipse cx="320" cy="332" rx="200" ry="124" fill="url(#bunSide)" stroke="#7d4a22" stroke-width="3.4"/>' +
      '<ellipse cx="320" cy="300" rx="196" ry="132" fill="url(#bunTop)" stroke="#7d4a22" stroke-width="3.6"/>' +
      washes +
      '<path d="' + spiral + '" fill="none" stroke="#8a4a22" stroke-width="4.2" stroke-linecap="round" opacity=".6"/>' +
      '<path d="' + spiral + '" fill="none" stroke="#fdf6e6" stroke-width="1.3" stroke-linecap="round" opacity=".3" transform="translate(0 1.6)"/>' +
      speckles +
      '</g>' +
      '</g>' +
      '<g id="bunCrumbs"></g>' +
      '<g id="bunCharm" class="bun-charm" opacity="0">' +
      '<path d="M320 320V288" stroke="#744439" stroke-width="3"/>' +
      '<circle cx="320" cy="284" r="5" fill="#744439"/>' +
      '<ellipse cx="320" cy="382" rx="44" ry="22" fill="#c99a63" stroke="#7d4a22" stroke-width="2.6"/>' +
      '<ellipse cx="320" cy="376" rx="42" ry="20" fill="url(#bunTop)" stroke="#8a5a2e" stroke-width="2"/>' +
      '<path d="M292 376c10-10 46-10 56 0-10 10-46 10-56 0z" fill="none" stroke="#8a4a22" stroke-width="2" opacity=".6"/>' +
      '<path d="M300 372c8-6 32-6 40 0" fill="none" stroke="#8a4a22" stroke-width="1.6" opacity=".5"/>' +
      '<path d="M306 382c6-5 22-5 28 0" fill="none" stroke="#8a4a22" stroke-width="1.4" opacity=".45"/>' +
      '</g>' +
      '<text x="320" y="486" text-anchor="middle" font-family="Kaiti, STKaiti, serif" font-size="16" fill="#9a8066" letter-spacing="4">点一下 · 咬一口 · 共五口</text>' +
      '</svg>' +
      '</div>';
  }

  function buildBun() {
    $('#shopDetailKicker').textContent = '集市 · 馍香坊';
    $('#shopDetailTitle').textContent = '吃一个压缩馍';
    $('#shopDetailDesc').textContent = '刚出炉的压缩馍，放在盘子里。点一下咬一口，一共五口，吃完会剩一个小挂件。';
    shopProgressLabel.textContent = '已吃';
    shopProgress.textContent = '0 / 6 口';
    shopActions.innerHTML = '';
    shopStage.innerHTML = bunSVG();
    bunGame = { count: 0, busy: false, done: false, svg: $('#bunSvg') };
    var svg = $('#bunSvg');
    svg.addEventListener('click', function (e) { biteBun(e); });
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); biteBun(e); } });
  }

  var BUN5_BITES = [
    { a: -16, r: 116, off: 0.58 },
    { a: 50, r: 120, off: 0.58 },
    { a: 122, r: 124, off: 0.58 },
    { a: 196, r: 128, off: 0.58 },
    { a: 268, r: 132, off: 0.6 },
    { final: true }
  ];
  function biteBun(e) {
    if (!bun5Game || bun5Game.busy || bun5Game.done) return;
    if (bun5Game.count >= 6) return;
    var svg = document.getElementById('bun5Svg');
    var card = document.getElementById('bun5Card');
    var r = svg.getBoundingClientRect();
    var sy = 853 / r.height;
    var x = BUN5_CX, y = BUN5_CY;
    if (e && typeof e.clientX === 'number' && e.clientX > 0) {
      x = (e.clientX - r.left) * (903 / r.width);
      y = (e.clientY - r.top) * sy;
      // 只认馍身上的点击
      var hx = (x - BUN5_CX) / BUN5_RX, hy = (y - BUN5_CY) / BUN5_RY;
      if (hx * hx + hy * hy > 1.0) { toast('点在馍上才有得吃'); return; }
    }
    var n = bun5Game.count;
    var spec = BUN5_BITES[n];
    var ns = 'http://www.w3.org/2000/svg';
    var circles = [];
    var bx, by, rad;
    if (spec.final) {
      bx = BUN5_CX; by = BUN5_CY; rad = 205;
      circles.push({ x: bx, y: by, r: rad });
      for (var i = 0; i < 6; i++) {
        var aa = (i / 6) * Math.PI * 2;
        circles.push({ x: bx + Math.cos(aa) * rad * 0.8, y: by + Math.sin(aa) * rad * 0.8, r: rad * 0.3 });
      }
    } else {
      var ang = spec.a * Math.PI / 180;
      var rimX = BUN5_CX + Math.cos(ang) * BUN5_RX;
      var rimY = BUN5_CY + Math.sin(ang) * BUN5_RY;
      bx = rimX + Math.cos(ang) * spec.r * spec.off;
      by = rimY + Math.sin(ang) * spec.r * spec.off;
      rad = spec.r;
      circles.push({ x: bx, y: by, r: rad });
      // 咬痕：沿咬口内缘排一圈牙印
      var inA = Math.atan2(BUN5_CY - by, BUN5_CX - bx);
      for (var k = 0; k < 7; k++) {
        var off2 = (k - 3) * 0.28;
        circles.push({
          x: bx + Math.cos(inA + off2) * rad * 0.86,
          y: by + Math.sin(inA + off2) * rad * 0.86,
          r: rad * 0.3
        });
      }
    }
    // 遮罩洞
    var hole = document.createElementNS(ns, 'g');
    hole.setAttribute('class', 'bun5-bite-pop');
    circles.forEach(function (c) {
      var el = document.createElementNS(ns, 'circle');
      el.setAttribute('cx', c.x.toFixed(1)); el.setAttribute('cy', c.y.toFixed(1)); el.setAttribute('r', c.r.toFixed(1));
      el.setAttribute('fill', '#000');
      hole.appendChild(el);
    });
    document.getElementById('bun5Holes').appendChild(hole);
    // 馍缩小
    var bun = document.getElementById('bun5Bun');
    if (bun) bun.style.transform = 'scale(' + (1 - (n + 1) * 0.03) + ')';
    // 抖动 + 碎屑（从咬口位置飞出）
    if (card) { card.classList.remove('is-biting'); void card.offsetWidth; card.classList.add('is-biting'); }
    var ca = card.getBoundingClientRect();
    var px = ((spec.final ? BUN5_CX : bx) / 903) * ca.width;
    var py = ((spec.final ? BUN5_CY : by) / 853) * ca.height;
    for (var i2 = 0; i2 < (spec.final ? 12 : 8); i2++) {
      var cr = document.createElement('i');
      cr.className = 'bun5-crumb';
      cr.style.left = px + 'px';
      cr.style.top = py + 'px';
      var a2 = Math.random() * Math.PI * 2, dist = 28 + Math.random() * 70;
      cr.style.setProperty('--dx', Math.cos(a2) * dist + 'px');
      cr.style.setProperty('--dy', (Math.sin(a2) * dist + 22) + 'px');
      cr.style.animationDelay = (Math.random() * 0.06) + 's';
      card.appendChild(cr);
      setTimeout(function (el) { if (el.parentNode) el.parentNode.removeChild(el); }.bind(null, cr), 760);
    }
    sfx.crunch();
    bun5Game.count++;
    if (shopProgress) shopProgress.textContent = bun5Game.count + ' / 6 口';
    setTimeout(function () {
      if (!bun5Game) return;
      bun5Game.busy = false;
      if (card) card.classList.remove('is-biting');
      if (bun5Game.count >= 6) finishBun();
    }, 460);
  }

  function finishBun() {
    if (!bunGame) return;
    bunGame.done = true;
    var g = $('#bunGroup');
    if (g) { g.style.transition = 'opacity .4s linear, transform .5s var(--ease)'; g.style.opacity = '0'; g.style.transform = 'scale(.8)'; }
    var charm = $('#bunCharm');
    if (charm) charm.setAttribute('opacity', '1');
    completeTask('bun');
    showBunDone();
  }

  function bunDoneSVG() {
    return '<svg viewBox="0 0 240 220" class="plush-done-svg" aria-hidden="true">' +
      '<defs>' +
      '<radialGradient id="miniBun" cx=".4" cy=".3" r=".7"><stop offset="0" stop-color="#f4dba4"/><stop offset=".55" stop-color="#dfad62"/><stop offset="1" stop-color="#a86a32"/></radialGradient>' +
      '</defs>' +
      '<ellipse cx="120" cy="190" rx="76" ry="12" fill="#3e2b20" opacity=".12"/>' +
      '<path d="M120 38V16" stroke="#744439" stroke-width="4"/>' +
      '<circle cx="120" cy="14" r="5" fill="#744439"/>' +
      '<ellipse cx="120" cy="150" rx="82" ry="24" fill="#c7d0c4" stroke="#8e9a8c" stroke-width="3"/>' +
      '<ellipse cx="120" cy="144" rx="70" ry="18" fill="#eef0e8"/>' +
      '<ellipse cx="120" cy="120" rx="54" ry="30" fill="#a86a32" stroke="#6e4422" stroke-width="3"/>' +
      '<ellipse cx="120" cy="106" rx="52" ry="32" fill="url(#miniBun)" stroke="#8a5a2e" stroke-width="2"/>' +
      '<ellipse cx="120" cy="112" rx="34" ry="15" fill="#8f5626" opacity=".3"/>' +
      '<path d="M98 104q22 10 44 0" fill="none" stroke="#7a4420" stroke-width="2.6" opacity=".6"/>' +
      '<ellipse cx="100" cy="94" rx="24" ry="9" fill="#fff7e4" opacity=".35" transform="rotate(-12 100 94)"/>' +
      '<g fill="#f6e7c5"><circle cx="94" cy="96" r="2"/><circle cx="106" cy="90" r="2"/><circle cx="120" cy="94" r="2"/><circle cx="134" cy="90" r="2"/><circle cx="146" cy="98" r="2"/><circle cx="100" cy="110" r="2"/><circle cx="116" cy="114" r="2"/><circle cx="134" cy="110" r="2"/><circle cx="146" cy="112" r="2"/><circle cx="110" cy="124" r="2"/><circle cx="130" cy="124" r="2"/></g>' +
      '<path d="M94 84q26-12 52 0" fill="none" stroke="#f0d6a4" stroke-width="2" opacity=".7"/>' +
      '</svg>';
  }

  function showReward(title, meta, svg) {
    var old = document.querySelector('.reward-showcase');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'reward-showcase';
    el.innerHTML = '<div class="reward-showcase__panel">' +
      '<div class="reward-showcase__seal">得</div>' +
      '<div class="reward-showcase__stage">' +
        '<div class="reward-showcase__ring"></div>' +
        '<div class="reward-showcase__art">' + svg + '</div>' +
        '<div class="reward-showcase__shine"></div>' +
      '</div>' +
      '<p class="reward-showcase__title">' + title + '</p>' +
      '<p class="reward-showcase__meta">' + meta + '</p>' +
      '<p class="reward-showcase__hint">已收入背包</p>' +
    '</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-on'); });
    var bag = document.getElementById('bagBtn');
    if (bag) { bag.classList.add('is-pop'); setTimeout(function () { bag.classList.remove('is-pop'); }, 700); }
    setTimeout(function () {
      var stage = el.querySelector('.reward-showcase__stage');
      if (bag && stage) {
        var br = bag.getBoundingClientRect(), sr = stage.getBoundingClientRect();
        el.style.setProperty('--fly-x', (br.left + br.width / 2 - (sr.left + sr.width / 2)) + 'px');
        el.style.setProperty('--fly-y', (br.top + br.height / 2 - (sr.top + sr.height / 2)) + 'px');
      }
      el.classList.add('is-flying');
      setTimeout(function () { el.classList.add('is-out'); setTimeout(function () { el.remove(); }, 500); }, 700);
    }, 2200);
  }
  function showBunDone() {
    $('#shopDetailKicker').textContent = '集市 · 馍香坊';
    $('#shopDetailTitle').textContent = '吃得干干净净';
    $('#shopDetailDesc').textContent = '最后一口也吃完了，盘子里只剩一点渣。压缩馍挂件已经收进你的背包。';
    shopProgressLabel.textContent = '收藏';
    shopProgress.textContent = '已收进背包';
    shopStage.innerHTML = '<div class="shop-done">' + bunDoneSVG() + '<p class="shop-done__name">压缩馍挂件</p><p class="shop-done__meta">压缩馍 · 已收进背包</p></div>';
    shopActions.innerHTML = '<button class="btn btn--ghost" type="button" data-replay="bun">再吃一个</button><button class="btn btn--primary" type="button" data-close-shop>收进背包 · 回街市</button>';
    $$('[data-close-shop]', shopActions).forEach(function (el) { el.addEventListener('click', closeShopDetail); });
  }

  function openBun() { closeBag(); buildBun(); }

  /* ------------------------------ 店铺入口 ------------------------------ */

  $$('[data-shop]').forEach(function (btn) {
    btn.addEventListener('click', function () { enterShopFromStreet(btn.getAttribute('data-shop'), btn); });
  });

  function enterShopFromStreet(id) {
    var v = document.getElementById('market2dVideo');
    if (v) { try { v.pause(); } catch (e) {} }
    openShopDetail(id);
  }

  (function initMarket2D() {
    var market = document.getElementById('market2d');
    var act = document.querySelector('.act--2');
    if (!market || !act) return;
    act.addEventListener('pointermove', function (e) {
      var r = market.getBoundingClientRect();
      var mx = ((e.clientX - r.left) / r.width - .5) * 2;
      var my = ((e.clientY - r.top) / r.height - .5) * 2;
      market.style.setProperty('--mx', mx.toFixed(2));
      market.style.setProperty('--my', my.toFixed(2));
    });
    act.addEventListener('pointerleave', function () {
      market.style.setProperty('--mx', 0);
      market.style.setProperty('--my', 0);
    });
  })();

  function updateShopTabs() {
    $$('.market-tab').forEach(function (btn) {
      var id = btn.getAttribute('data-shop');
      var done = has(id);
      btn.classList.toggle('is-done', done);
      var i = btn.querySelector('i');
      if (i) i.textContent = done ? '已收进背包 · 可再看' : (id === 'tiger' ? '拼一只 · 摆裁片' : '点一个 · 吃掉');
    });
  }

  window.__openDetail = function (kind) {
    if (kind === 'tiger' || kind === 'bun') openShopDetail(kind);
    else toast('这家只是看看 · 前面两家可以进');
  };
  window.__marketForward = function () {
    if (!has('tiger') || !has('bun')) {
      toast('点击互动，再往前走吧');
      return;
    }
    goTo(3);
  };

  /* ------------------------------ 背包 ------------------------------ */

  var bagDrawer = $('#bagDrawer');

  function bagTigerSVG() {
    return '<img class="bag-tiger-img" src="assets/tiger/plush-source.jpg" alt="布老虎玩偶">';
  }

  function bagBunSVG() {
    return '<img class="bag-bun-img" src="assets/bun/charm.jpg" alt="压缩馍挂件">';
  }

  function bagSachetSVG() {
    var g = state.sachet || { hue: 0 };
    var hue = (g && typeof g.hue === 'number') ? g.hue : 0;
    return '<img class="bag-sachet-img" src="assets/sachet/sachet.png" alt="手作香囊" style="filter:hue-rotate(' + hue + 'deg)">';
  }

  function bagClaySVG() {
    return '<img class="bag-clay-img" src="assets/clay-charm.png" alt="泥泥狗挂件">';
  }

  function renderBag() {
    if (!bagDrawer) return;
    var items = [];
    if (has('tiger')) items.push({ key: 'tiger', name: '布老虎玩偶', meta: '集市 · 纸样拼布', svg: bagTigerSVG() });
    if (has('bun')) items.push({ key: 'bun', name: '压缩馍挂件', meta: '集市 · 一口一口吃掉', svg: bagBunSVG() });
  if (has('sachet')) items.push({ key: 'sachet', name: '手作香囊', meta: '内街 · 配香', svg: bagSachetSVG() });
  if (has('sugar')) items.push({ key: 'clay', name: '泥泥狗', meta: '内街 · 泥塑', svg: bagClaySVG() });
    if (has('bagua')) items.push({ key: 'bagua', name: '八卦阵挂件', meta: '陵庙 · 揲蓍问卦', svg: bagBaguaSVG() });
    var count = $('#bagCount');
    if (count) count.textContent = items.length;
    var list = $('#bagList');
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="bag__empty"><span>空</span><p>还没有收下的小物件。<br>去集市和內街里做一只布老虎、香囊或泥泥狗吧。</p></div>';
      return;
    }
    list.innerHTML = items.map(function (it) {
      return '<article class="bag-item"><div class="bag-item__icon">' + it.svg + '</div><div><h3>' + it.name + '</h3><p>' + it.meta + '</p></div><span class="bag-item__tag">已收藏</span></article>';
    }).join('');
  }

  function openBag() {
    if (!bagDrawer) return;
    renderBag();
    bagDrawer.classList.add('is-open');
    bagDrawer.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
  }
  function closeBag() {
    if (!bagDrawer) return;
    bagDrawer.classList.remove('is-open');
    bagDrawer.setAttribute('aria-hidden', 'true');
    if (app && !shopDetail.classList.contains('is-open')) app.classList.remove('is-detail');
  }
  var appBackBtn = $('#appBack');
if (appBackBtn) appBackBtn.addEventListener('click', function () { goTo(2); setTimeout(function () { if (window.Scene3D && Scene3D.resetView) Scene3D.resetView(); }, 1000); });
var bagBtn = $('#bagBtn');
  if (bagBtn) bagBtn.addEventListener('click', openBag);
  $$('[data-close-bag]').forEach(function (el) { el.addEventListener('click', closeBag); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && bagDrawer && bagDrawer.classList.contains('is-open')) closeBag();
  });


  /* ------------------------------ 香囊 / 泥泥狗 ------------------------------ */
  var SACHET_INGREDIENTS = [
    { key: 'mint', name: '薄荷', img: 'assets/sachet/herb-mint.jpg' },
    { key: 'baizhi', name: '白芷', img: 'assets/sachet/herb-baizhi.jpg' },
    { key: 'chenpi', name: '陈皮', img: 'assets/sachet/herb-chenpi.jpg' },
    { key: 'sandal', name: '檀香', img: 'assets/sachet/herb-sandal.jpg' },
    { key: 'lavender', name: '薰衣草', img: 'assets/sachet/herb-lavender.jpg' },
    { key: 'chamomile', name: '洋甘菊', img: 'assets/sachet/herb-chamomile.jpg' }
  ];
  var SACHET_COLORS = [
    { name: '藕粉', hue: 0 }, { name: '朱红', hue: -22 }, { name: '杏黄', hue: 42 },
    { name: '竹青', hue: 118 }, { name: '靛蓝', hue: 212 }, { name: '紫藤', hue: 272 }
  ];
  /* 六组推荐搭配（按香氛作用方向划分） */
  var SACHET_COMBOS = [
    { key: 'chamomile+chenpi+lavender', dir: '舒缓安神', label: '清甜花香，舒缓安神',
      aroma: '淡淡的清甜花香，整体气味偏淡。',
      feel: '薰衣草和洋甘菊帮助舒缓紧绷的心情，陈皮中和花香，不会甜得让人发腻，适合想要放松、平复焦虑的人，醒神的作用很弱。' },
    { key: 'baizhi+chenpi+mint', dir: '醒神除闷', label: '清爽草木香，提神除闷',
      aroma: '清爽的草木香气，浓淡刚好。',
      feel: '薄荷帮助赶走困意，白芷祛除杂味，陈皮缓和气息，适合容易犯困、心里觉得烦闷的人。' },
    { key: 'chamomile+chenpi+mint', dir: '醒神除闷', label: '清凉微花，轻轻醒神',
      aroma: '清凉感混上淡淡的花香，味道清淡。',
      feel: '有轻度的醒神效果，还能舒缓轻微烦躁，大部分人都比较容易接受。' },
    { key: 'baizhi+lavender+sandal', dir: '辟秽净味', label: '温润厚重，辟秽净味',
      aroma: '温润厚重的香气，香味比较明显。',
      feel: '檀香气息安稳，白芷可以遮盖不好闻的杂味，薰衣草舒缓心绪。香气偏重，不习惯浓香味的人会觉得刺鼻。' },
    { key: 'baizhi+chenpi+sandal', dir: '辟秽净味', label: '木香清雅，稳住情绪',
      aroma: '木香搭配清雅药香，质感稳重。',
      feel: '可以弱化环境里面的异味，安抚浮躁的情绪。' },
    { key: 'chamomile+lavender+mint', dir: '平衡兼顾', label: '清凉转柔花，先醒后松',
      aroma: '清凉感搭配柔和花香，层次对比明显。',
      feel: '薄荷带来短时间的清醒感，之后薰衣草、洋甘菊慢慢舒缓情绪，风格比较均衡。' }
  ];
  var sachetGame = null;

  function sachetState() {
    if (!sachetGame) sachetGame = { mats: [], hue: 0, colorName: '藕粉' };
    return sachetGame;
  }

  function sachetSwatchColor(hue) {
    return 'hsl(' + ((342 + hue + 360) % 360) + ', 62%, 78%)';
  }

  function sachetHueFilter() {
    return 'hue-rotate(' + sachetState().hue + 'deg)';
  }

  function sachetHerb(key) {
    var arr = SACHET_INGREDIENTS.filter(function (x) { return x.key === key; });
    return arr.length ? arr[0] : { key: key, name: key, img: '' };
  }

  function sachetComboFor(mats) {
    var k = mats.slice().sort().join('+');
    for (var i = 0; i < SACHET_COMBOS.length; i++) {
      if (SACHET_COMBOS[i].key === k) return SACHET_COMBOS[i];
    }
    return null;
  }

  function openSachet() {
    shopDetail.classList.add('is-open');
    shopDetail.classList.remove('is-tiger');
    shopDetail.classList.remove('is-clay');
    shopDetail.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
    $('#shopDetailKicker').textContent = '内街 · 香薰坊';
    $('#shopDetailDesc').textContent = '把下面的香药拖进上方的香囊里，再选一个喜欢的囊袋颜色；装够三味，系上袋口。';
    sachetGame = { mats: [], hue: 0, colorName: '藕粉' };
    $('#shopDetailTitle').textContent = '配一只香囊';
    shopProgressLabel.textContent = '香药';
    shopProgress.textContent = '0 / 3';
    var matsHtml = SACHET_INGREDIENTS.map(function (m) {
      return '<button class="sachet2-mat" type="button" data-mat="' + m.key + '">' +
        '<img src="' + m.img + '" alt="' + m.name + '">' +
        '<span>' + m.name + '</span></button>';
    }).join('');
    var colorsHtml = SACHET_COLORS.map(function (c) {
      return '<button class="sachet-swatch' + (c.hue === 0 ? ' is-on' : '') + '" type="button" data-hue="' + c.hue + '" data-name="' + c.name + '" aria-label="' + c.name + '" style="background:' + sachetSwatchColor(c.hue) + '"></button>';
    }).join('');
    shopStage.innerHTML = '<div class="sachet2-game">' +
      '<div class="sachet2-left">' +
        '<div class="sachet2-scene" id="sachet2Scene"><img class="sachet2-img" id="sachet2Img" src="assets/sachet/sachet-cutout.png" alt="香囊" style="filter:' + sachetHueFilter() + '"></div>' +
        '<p class="sachet2-fill" id="sachet2Fill">已放入 0 / 3 味香药</p>' +
        '<p class="sachet2-result" id="sachet2Result" hidden></p>' +
        '<p class="sachet-label">囊袋颜色</p>' +
        '<div class="sachet-swatches">' + colorsHtml + '</div>' +
      '</div>' +
      '<div class="sachet2-right">' +
        '<p class="sachet-label">香药 · 拖进香囊</p>' +
        '<div class="sachet2-mats">' + matsHtml + '</div>' +
        '<p class="sachet2-tip">拖 3 味香药进香囊；点一下也可以放进去。</p>' +
      '</div>' +
    '</div>';
    shopActions.innerHTML = '<button class="btn btn--primary" type="button" id="sachetFinish">系上袋口 · 收下香囊</button>';
    document.getElementById('sachetFinish').addEventListener('click', finishSachet);
    bindSachet2();
  }

  function bindSachet2() {
    var stage = shopStage;
    document.querySelectorAll('.sachet2-mat', stage).forEach(function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        if (btn.classList.contains('is-added')) return;
        e.preventDefault();
        var mat = btn.getAttribute('data-mat');
        var startX = e.clientX, startY = e.clientY, moved = false;
        var ghost = document.createElement('div');
        ghost.className = 'sachet2-ghost';
        ghost.innerHTML = '<img src="' + sachetHerb(mat).img + '" alt="">';
        document.body.appendChild(ghost);
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';
        function move(ev) {
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
          if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 4) moved = true;
          var sc = document.getElementById('sachet2Scene');
          if (sc) {
            var r = sc.getBoundingClientRect();
            var over = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
            sc.classList.toggle('is-over', over);
          }
        }
        function up(ev) {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          ghost.remove();
          var sc = document.getElementById('sachet2Scene');
          var over = false;
          if (sc) {
            var r = sc.getBoundingClientRect();
            over = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
            sc.classList.remove('is-over');
          }
          if (over || !moved) sachetAdd(mat);
        }
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        move(e);
      });
    });
    document.querySelectorAll('.sachet-swatch[data-hue]', stage).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var g = sachetState();
        g.hue = parseFloat(btn.getAttribute('data-hue'));
        g.colorName = btn.getAttribute('data-name');
        refreshSachet2();
      });
    });
  }

  function refreshSachet2() {
    var g = sachetState();
    var img = document.getElementById('sachet2Img');
    if (img) {
      img.style.filter = 'hue-rotate(' + g.hue + 'deg)';
      var n = g.mats.length;
      img.style.transform = 'scale(' + (1 + n * 0.05) + ',' + (1 + n * 0.07) + ')';
      img.classList.remove('is-plump');
      void img.offsetWidth;
      if (n) img.classList.add('is-plump');
    }
    var fill = document.getElementById('sachet2Fill');
    if (fill) fill.textContent = '已放入 ' + g.mats.length + ' / 3 味香药';
    var res = document.getElementById('sachet2Result');
    if (res) {
      if (g.mats.length >= 3) {
        var combo = sachetComboFor(g.mats);
        res.textContent = combo ? ('香气 · ' + combo.label) : '小众搭配 · 可自行体验';
        res.classList.toggle('is-alt', !combo);
        res.hidden = false;
      } else {
        res.hidden = true;
        res.textContent = '';
      }
    }
    document.querySelectorAll('.sachet-swatch[data-hue]', shopStage).forEach(function (b) {
      b.classList.toggle('is-on', parseFloat(b.getAttribute('data-hue')) === g.hue);
    });
    document.querySelectorAll('.sachet2-mat', shopStage).forEach(function (b) {
      b.classList.toggle('is-added', g.mats.indexOf(b.getAttribute('data-mat')) >= 0);
    });
    shopProgress.textContent = g.mats.length + ' / 3';
  }

  function sachetAdd(key) {
    var g = sachetState();
    if (!key || g.mats.indexOf(key) >= 0 || g.mats.length >= 3) return;
    g.mats.push(key);
    refreshSachet2();
  }

  function finishSachet() {
    var g = sachetState();
    if (g.mats.length < 3) { toast('还差一味香药'); return; }
    var combo = sachetComboFor(g.mats);
    if (!combo) toast('这是小众搭配，可以自行体验，暂无对应的推荐描述');
    state.sachet = {
      mats: g.mats.slice(), hue: g.hue, colorName: g.colorName,
      combo: combo ? { dir: combo.dir, label: combo.label, aroma: combo.aroma, feel: combo.feel } : null
    };
    save();
    completeTask('sachet');
    renderBag();
    showSachetDone();
  }

  function sachetWrapText(ctx, text, x, y, maxW, lineH) {
    var line = '', lines = [];
    for (var i = 0; i < text.length; i++) {
      var t = line + text[i];
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = text[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    lines.forEach(function (l, idx) { ctx.fillText(l, x, y + idx * lineH); });
    return lines.length;
  }

  function openSachetCard() {
    if (!sachetCardBg.naturalWidth && !sachetCardBg.__failed) {
      var go = function () { openSachetCard(); };
      sachetCardBg.onload = go;
      sachetCardBg.onerror = function () { sachetCardBg.__failed = true; go(); };
      if (sachetCardBg.complete && !sachetCardBg.naturalWidth) { sachetCardBg.__failed = true; go(); }
      return;
    }
    var g = state.sachet || { mats: [], hue: 0, colorName: '藕粉', combo: null };
    var names = (g.mats || []).map(function (k) { return sachetHerb(k).name; });
    var W = 620, H = 1080;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    drawCardBase(ctx, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9a6a3c';
    ctx.font = '600 27px "Kaiti SC","STKaiti",KaiTi,serif';
    ctx.fillText('内 街 · 香 薰 坊', W / 2, 96);
    ctx.fillStyle = '#3a2a1c';
    ctx.font = '700 52px "Songti SC","STSong",serif';
    ctx.fillText('一只香囊', W / 2, 164);

    var sachetImg = new Image();
    sachetImg.onerror = function () { showSachetCard(safeCardDataUrl(null, g)); };
    sachetImg.onload = function () {
      var sw = 250, sh = sachetImg.height * (sw / sachetImg.width);
      var tintCanvas = document.createElement('canvas');
      tintCanvas.width = Math.max(1, Math.round(sw));
      tintCanvas.height = Math.max(1, Math.round(sh));
      var tctx = tintCanvas.getContext('2d');
      tctx.drawImage(sachetImg, 0, 0, tintCanvas.width, tintCanvas.height);
      var tinted = hueShiftCanvas(tintCanvas, g.hue || 0) || tintCanvas;
      ctx.drawImage(tinted, (W - sw) / 2, 196, sw, sh);
      var y = 196 + sh + 34;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7a5b42';
      ctx.font = '32px "Kaiti SC","STKaiti",KaiTi,serif';
      ctx.fillText((g.colorName || '藕粉') + ' 囊袋', W / 2, y);
      y += 52;
      ctx.fillStyle = '#3a2a1c';
      ctx.font = '700 36px "Songti SC","STSong",serif';
      ctx.fillText(names.join(' · ') || '薄荷 · 白芷 · 陈皮', W / 2, y);
      y += 54;
      ctx.fillStyle = '#a8642f';
      ctx.font = '700 36px "Kaiti SC","STKaiti",KaiTi,serif';
      ctx.fillText(g.combo ? g.combo.label : '小众搭配 · 可自行体验', W / 2, y);
      y += 46;
      ctx.fillStyle = '#6b5340';
      ctx.font = '27px "Songti SC","STSong",serif';
      var aroma = g.combo ? g.combo.aroma : '这一味组合没有对应的推荐描述，气味如何，全凭你自己体会。';
      var n1 = sachetWrapText(ctx, aroma, W / 2, y, W - 104, 38);
      y += n1 * 38 + 22;
      ctx.textAlign = 'left';
      var feel = g.combo ? g.combo.feel : '香药自由搭配，效果不必拘泥于推荐。';
      sachetWrapText(ctx, feel, 52, y, W - 104, 42);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a08363';
      ctx.font = '24px "Songti SC","STSong",serif';
      ctx.fillText('羲皇寻踪 · 淮阳太昊陵', W / 2, H - 52);
      showSachetCard(safeCardDataUrl(cv, g));
    };
    var finishWithSrc = function (src) { sachetImg.src = src; };
    if (typeof fetch === 'function') {
      fetch('assets/sachet/sachet-cutout.png').then(function (r) { return r.blob(); })
        .then(function (b) {
          var fr = new FileReader();
          fr.onload = function () { finishWithSrc(fr.result); };
          fr.onerror = function () { finishWithSrc('assets/sachet/sachet-cutout.png'); };
          fr.readAsDataURL(b);
        })
        .catch(function () { finishWithSrc('assets/sachet/sachet-cutout.png'); });
    } else {
      finishWithSrc('assets/sachet/sachet-cutout.png');
    }
  }

  var sachetCardBg = new Image();
  sachetCardBg.src = 'assets/sachet/sachet-frame.jpg';

  function drawCardBase(ctx, W, H) {
    ctx.fillStyle = '#f8f1e2'; ctx.fillRect(0, 0, W, H);
    if (sachetCardBg && sachetCardBg.naturalWidth) {
      var ir = sachetCardBg.width / sachetCardBg.height, cr = W / H;
      var dw, dh, dx, dy;
      if (ir > cr) { dh = H; dw = H * ir; dx = (W - dw) / 2; dy = 0; }
      else { dw = W; dh = W / ir; dx = 0; dy = (H - dh) / 2; }
      try { ctx.drawImage(sachetCardBg, dx, dy, dw, dh); } catch (e) {}
      var grad = ctx.createRadialGradient(W / 2, H * 0.42, W * 0.08, W / 2, H * 0.46, W * 0.92);
      grad.addColorStop(0, 'rgba(250,245,235,.935)');
      grad.addColorStop(0.55, 'rgba(250,245,235,.875)');
      grad.addColorStop(1, 'rgba(250,245,235,.30)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // 底部落款处压一条浅色带，花纸上也看得清
      var foot = ctx.createLinearGradient(0, H - 130, 0, H);
      foot.addColorStop(0, 'rgba(250,245,235,0)');
      foot.addColorStop(1, 'rgba(250,245,235,.72)');
      ctx.fillStyle = foot;
      ctx.fillRect(0, H - 130, W, 130);
    }
    ctx.strokeStyle = 'rgba(176,132,86,.5)'; ctx.lineWidth = 2.5;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.strokeStyle = 'rgba(176,132,86,.28)'; ctx.lineWidth = 1;
    ctx.strokeRect(26, 26, W - 52, H - 52);
  }

  /* 像素级色相旋转：手机上 canvas 的 ctx.filter 支持不全，改用逐像素计算 */
  function hueShiftCanvas(cv, deg) {
    if (!deg) return cv;
    try {
      var ctx2 = cv.getContext('2d');
      var img = ctx2.getImageData(0, 0, cv.width, cv.height);
      var p = img.data;
      var rad = deg * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
      var m0 = 0.213 + c * 0.787 - s * 0.213, m1 = 0.715 - c * 0.715 - s * 0.715, m2 = 0.072 - c * 0.072 + s * 0.928;
      var m3 = 0.213 - c * 0.213 + s * 0.143, m4 = 0.715 + c * 0.285 + s * 0.140, m5 = 0.072 - c * 0.072 - s * 0.283;
      var m6 = 0.213 - c * 0.213 - s * 0.787, m7 = 0.715 - c * 0.715 + s * 0.715, m8 = 0.072 + c * 0.928 + s * 0.072;
      for (var i = 0; i < p.length; i += 4) {
        if (p[i + 3] === 0) continue;
        var r = p[i], gg = p[i + 1], b = p[i + 2];
        var nr = m0 * r + m1 * gg + m2 * b;
        var ng = m3 * r + m4 * gg + m5 * b;
        var nb = m6 * r + m7 * gg + m8 * b;
        p[i] = nr < 0 ? 0 : (nr > 255 ? 255 : nr);
        p[i + 1] = ng < 0 ? 0 : (ng > 255 ? 255 : ng);
        p[i + 2] = nb < 0 ? 0 : (nb > 255 ? 255 : nb);
      }
      ctx2.putImageData(img, 0, 0);
      return cv;
    } catch (e) {
      return cv;
    }
  }

  function plainSachetCard(g) {
    var names = ((g && g.mats) || []).map(function (k) { return sachetHerb(k).name; });
    var W = 620, H = 1080;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    drawCardBase(ctx, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9a6a3c';
    ctx.font = '600 27px "Kaiti SC","STKaiti",KaiTi,serif';
    ctx.fillText('内 街 · 香 薰 坊', W / 2, 96);
    ctx.fillStyle = '#3a2a1c';
    ctx.font = '700 52px "Songti SC","STSong",serif';
    ctx.fillText('一只香囊', W / 2, 164);
    ctx.beginPath();
    ctx.fillStyle = sachetSwatchColor(g.hue || 0);
    ctx.ellipse(W / 2, 340, 110, 128, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,50,.45)'; ctx.lineWidth = 2.5; ctx.stroke();
    var y = 520;
    ctx.fillStyle = '#7a5b42';
    ctx.font = '32px "Kaiti SC","STKaiti",KaiTi,serif';
    ctx.fillText((g.colorName || '藕粉') + ' 囊袋', W / 2, y);
    y += 52;
    ctx.fillStyle = '#3a2a1c';
    ctx.font = '700 36px "Songti SC","STSong",serif';
    ctx.fillText(names.join(' · ') || '薄荷 · 白芷 · 陈皮', W / 2, y);
    y += 54;
    ctx.fillStyle = '#a8642f';
    ctx.font = '700 36px "Kaiti SC","STKaiti",KaiTi,serif';
    ctx.fillText(g.combo ? g.combo.label : '小众搭配 · 可自行体验', W / 2, y);
    y += 46;
    ctx.fillStyle = '#6b5340';
    ctx.font = '27px "Songti SC","STSong",serif';
    var n = sachetWrapText(ctx, g.combo ? g.combo.aroma : '这一味组合没有对应的推荐描述，气味如何，全凭你自己体会。', W / 2, y, W - 104, 38);
    y += n * 38 + 22;
    ctx.textAlign = 'left';
    sachetWrapText(ctx, g.combo ? g.combo.feel : '香药自由搭配，效果不必拘泥于推荐。', 52, y, W - 104, 42);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#a08363';
    ctx.font = '24px "Songti SC","STSong",serif';
    ctx.fillText('羲皇寻踪 · 淮阳太昊陵', W / 2, H - 52);
    return cv;
  }

  function safeCardDataUrl(cv, g) {
    if (cv) {
      try { return cv.toDataURL('image/png'); } catch (e) {}
    }
    try { return plainSachetCard(g).toDataURL('image/png'); } catch (e) { return null; }
  }

  function showSachetCard(dataUrl) {
    var old = document.getElementById('sachetShareOverlay');
    if (old) old.remove();
    var ov = document.createElement('div');
    ov.className = 'sachet-share';
    ov.id = 'sachetShareOverlay';
    ov.innerHTML = '<div class="sachet-share__box">' +
      (dataUrl ? '<img src="' + dataUrl + '" alt="香囊小卡片">' : '<p class="sachet-share__fail">卡片生成失败，请重试</p>') +
      '<p class="sachet-share__hint">长按图片保存，或点「保存图片」下载</p>' +
      '<div class="sachet-share__btns">' +
        (dataUrl ? '<a class="btn btn--primary" id="sachetShareSave" download="香囊卡片.png" href="' + dataUrl + '">保存图片</a>' : '') +
        '<button class="btn btn--ghost" type="button" id="sachetShareClose">关闭</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    var close = document.getElementById('sachetShareClose');
    if (close) close.addEventListener('click', function () { ov.remove(); });
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
  }

  function showSachetDone() {
    shopDetail.classList.add('is-open');
    shopDetail.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
    var g = state.sachet || { mats: [], hue: 0, colorName: '藕粉', combo: null };
    var names = (g.mats || []).map(function (k) { return sachetHerb(k).name; });
    $('#shopDetailTitle').textContent = '香囊配好了';
    $('#shopDetailDesc').textContent = g.combo ? ('这一味组合偏向「' + g.combo.dir + '」。') : '这是小众搭配，气味如何，全凭你自己体会。';
    shopProgressLabel.textContent = '收藏';
    shopProgress.textContent = '已收进背包';
    var hue = (typeof g.hue === 'number') ? g.hue : 0;
    shopStage.innerHTML = '<div class="sachet2-game sachet2-game--done">' +
      '<div class="sachet2-left">' +
        '<div class="sachet2-scene"><img class="sachet2-img is-done" src="assets/sachet/sachet-cutout.png" alt="香囊" style="filter:hue-rotate(' + hue + 'deg)"></div>' +
        '<p class="sachet2-fill">已放入 3 / 3 味香药</p>' +
        '<p class="sachet2-done-meta">' + (g.colorName || '藕粉') + ' 囊袋</p>' +
      '</div>' +
      '<div class="sachet2-right">' +
        '<p class="sachet-label">香药</p><p class="sachet2-done-mat">' + (names.join(' · ') || '薄荷 · 白芷 · 陈皮') + '</p>' +
        '<p class="sachet-label">香气</p><p class="sachet2-done-mat">' + (g.combo ? g.combo.label : '小众搭配 · 可自行体验') + '</p>' +
        (g.combo ? '<p class="sachet2-done-feel">' + g.combo.feel + '</p>' : '') +
      '</div>' +
    '</div>';
    shopActions.innerHTML = '<button class="btn btn--ghost" type="button" id="sachetShare">生成小卡片</button>' +
      '<button class="btn btn--ghost" type="button" data-replay="sachet">再配一只</button>' +
      '<button class="btn btn--primary" type="button" data-close-shop>收进背包 · 回街市</button>';
    var share = document.getElementById('sachetShare');
    if (share) share.addEventListener('click', openSachetCard);
    document.querySelectorAll('[data-close-shop]', shopActions).forEach(function (el) { el.addEventListener('click', closeShopDetail); });
  }

  var CLAY_PALETTES = [
    { base: '#2b2320', accent: '#e3b54a', red: '#744439', light: '#f6e7c8' },
    { base: '#8e3a2a', accent: '#f0c86a', red: '#2b2320', light: '#f6e7c8' },
    { base: '#c9973e', accent: '#f6e7c8', red: '#2b2320', light: '#f2c86a' },
    { base: '#3d5a6e', accent: '#f0c86a', red: '#744439', light: '#f6e7c8' }
  ];
  var CLAY_DOGS = [
    { name: '阿黑', pattern: '黑地彩纹 · 正面蹲姿',
      patternText: '黑地，黄、红、白三色回纹与云头，胸口一团团花，四爪红白相间。',
      principle: '取黄胶泥捏塑，阴干后以黑为底，矿物色一笔笔勾画，再罩一层桐油，久放不裂。',
      culture: '淮阳泥泥狗，人祖庙前“远古灵兽”；黑为地，红黄为阳，纹样是伏羲女娲时代的图腾记忆。',
      intro: '我是人祖庙前的阿黑，黑地红纹，耳朵尖尖，会看家，也会给你带路。' },
    { name: '红红', pattern: '红地吉祥纹 · 正面蹲姿',
      patternText: '红地，黄、黑双色回纹，胸口一朵云头团花，耳内点朱，四爪压黑边。',
      principle: '先捏身、头、四腿，再粘耳尾；阴干后刷红底，用细笔勾金线，最后罩桐油。',
      culture: '红为阳、为喜，淮阳人把泥泥狗当“人祖的灵兽”，红地彩纹是祈子、祈福的老纹样。',
      intro: '我叫红红，身上是红底的吉祥纹；捏我的时候要轻轻的，我会摇尾巴。' },
    { name: '阿黄', pattern: '黄地黑纹 · 正面蹲姿',
      patternText: '黄地，黑线勾云头与回纹，胸口一团黑花，耳尖、四爪压黑。',
      principle: '黄胶泥捏塑，阴干后以黄土色打底，黑线勾纹，再以红黄点睛，罩一层薄油。',
      culture: '黄为土、为中央，泥泥狗身上的黄黑纹样，是黄河流域泥土崇拜和伏羲图腾的叠影。',
      intro: '阿黄是我，黄地黑纹，最会闻香火味；你摸摸我的耳朵，我就冲你叫一声。' },
    { name: '小翠', pattern: '青地金纹 · 正面蹲姿',
      patternText: '青地，金线云头，胸口一枚团花，耳内点朱，四爪金线收边。',
      principle: '青底用矿物色，金线用细笔勾；泥胎阴干后先黑后彩，最后罩油，色久不褪。',
      culture: '青为东方、为春生；泥泥狗不只是玩具，也是人祖庙会上“还愿、求子”的泥灵。',
      intro: '我是小翠，青地金纹，是从泥里捏出来的小灵兽，带你逛逛太昊陵吧。' },
    { name: '小蓝', pattern: '蓝地金纹 · 正面蹲姿',
      patternText: '蓝地，金线回纹与云肩，胸口一朵白心团花，四爪金线，耳内点朱。',
      principle: '胶泥捏形，阴干后以蓝为地，金线勾纹，白粉点花心，罩桐油增亮。',
      culture: '蓝在民间是镇宅色；泥泥狗的黑、红、黄、青、蓝，对应五行，也对应人祖庙前的五方。',
      intro: '我是小蓝，蓝底金纹，是从泥里捏出来的小灵兽；我带你逛逛太昊陵吧。' }
  ];
  function clayDogFront(p, x, y, s, idx) {
    var d = idx == null ? '' : ' data-idx="' + idx + '"';
    return '<g class="clay-dog" ' + (idx == null ? '' : 'role="button" tabindex="0"') + d + ' transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      '<ellipse cx="0" cy="66" rx="48" ry="9" fill="#3a2418" opacity=".2"/>' +
      '<path d="M36 28C72 22 74 -20 50 -30C36 -36 28 -24 38 -12C50 2 50 18 36 28Z" fill="' + p.base + '" stroke="#2a1c14" stroke-width="3"/>' +
      '<path d="M52 -10C60 -22 50 -28 42 -24" fill="none" stroke="' + p.red + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M-42 10C-48 -38 -24 -56 0 -56C24 -56 48 -38 42 10L38 46C36 60 24 66 12 66L-12 66C-24 66 -36 60 -38 46Z" fill="' + p.base + '" stroke="#2a1c14" stroke-width="3.5"/>' +
      '<ellipse cx="-16" cy="4" rx="9" ry="26" fill="rgba(255,255,255,.12)" transform="rotate(-16 -16 4)"/>' +
      '<path d="M-20 -24L0 8L20 -24L12 -42H-12Z" fill="' + p.accent + '" stroke="' + p.red + '" stroke-width="2.5"/>' +
      '<path d="M-14 -6L0 14L14 -6" fill="none" stroke="' + p.red + '" stroke-width="4"/>' +
      '<path d="M-30 44L-30 62M-16 46L-16 64M16 46L16 64M30 44L30 62" stroke="' + p.light + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M-34 56L-36 68M-14 58L-14 70M14 58L14 70M34 56L36 68" stroke="' + p.red + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M-36 -68C-38 -98 -18 -112 0 -112C18 -112 38 -98 36 -68C34 -42 18 -30 0 -30C-18 -30 -34 -42 -36 -68Z" fill="' + p.base + '" stroke="#2a1c14" stroke-width="4"/>' +
      '<ellipse cx="-16" cy="-86" rx="9" ry="4" fill="rgba(255,255,255,.24)" transform="rotate(-24 -16 -86)"/>' +
      '<path d="M-30 -90L-52 -140L-8 -112Z" fill="' + p.base + '" stroke="#2a1c14" stroke-width="4"/><path d="M-32 -98L-46 -126L-16 -108Z" fill="' + p.red + '"/>' +
      '<path d="M30 -90L52 -140L8 -112Z" fill="' + p.base + '" stroke="#2a1c14" stroke-width="4"/><path d="M32 -98L46 -126L16 -108Z" fill="' + p.red + '"/>' +
      '<path d="M-26 -94Q-16 -102 -4 -92M26 -94Q16 -102 4 -92" fill="none" stroke="' + p.accent + '" stroke-width="5" stroke-linecap="round"/>' +
      '<text x="0" y="-82" text-anchor="middle" font-family="Kaiti,STKaiti,serif" font-weight="700" font-size="17" fill="' + p.accent + '">王</text>' +
      '<circle cx="-15" cy="-58" r="12" fill="' + p.light + '" stroke="' + p.red + '" stroke-width="3.5"/>' +
      '<circle cx="15" cy="-58" r="12" fill="' + p.light + '" stroke="' + p.red + '" stroke-width="3.5"/>' +
      '<circle cx="-14" cy="-58" r="5.5" fill="#2a1c14"/><circle cx="14" cy="-58" r="5.5" fill="#2a1c14"/>' +
      '<circle cx="-16" cy="-60" r="2" fill="#fff"/><circle cx="12" cy="-60" r="2" fill="#fff"/>' +
      '<path d="M-14 -39Q0 -31 14 -39" fill="none" stroke="' + p.red + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M-8 -36L-3 -28L2 -36L7 -28L12 -36" fill="none" stroke="' + p.light + '" stroke-width="2.4"/>' +
      '<path d="M-30 -10L-44 -4M-30 -2L-46 4M30 -10L44 -4M30 -2L46 4" stroke="' + p.light + '" stroke-width="2" stroke-linecap="round"/>' +
      '</g>';
  }
  function clayDogSide(p, x, y, s) {
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      '<ellipse cx="0" cy="52" rx="52" ry="8" fill="#3a2418" opacity=".18"/>' +
      '<path d="M46 16C74 10 76 -18 58 -26C50 -28 44 -20 52 -12C60 -4 62 6 46 16Z" fill="' + p.light + '" stroke="#2a1c14" stroke-width="3"/>' +
      '<path d="M-40 8C-44 -34 -18 -50 8 -48C38 -46 50 -20 44 10L40 44C38 56 26 60 12 60L-16 60C-30 60 -38 54 -40 44Z" fill="' + p.light + '" stroke="#2a1c14" stroke-width="3.5"/>' +
      '<path d="M-34 12C-20 -14 18 -16 36 4L30 26C12 6 -14 8 -28 30Z" fill="' + p.red + '" opacity=".9"/>' +
      '<path d="M-34 0C-18 -30 24 -34 42 -4" fill="none" stroke="' + p.accent + '" stroke-width="8"/>' +
      '<path d="M-28 32C-12 18 16 18 34 32" fill="none" stroke="' + p.red + '" stroke-width="5"/>' +
      '<circle cx="4" cy="-58" r="30" fill="' + p.light + '" stroke="#2a1c14" stroke-width="3.5"/>' +
      '<path d="M-12 -82L-28 -118L4 -94Z" fill="' + p.base + '" stroke="#2a1c14" stroke-width="3"/><path d="M-10 -88L-22 -108L2 -92Z" fill="' + p.red + '"/>' +
      '<path d="M20 -82L38 -116L8 -94Z" fill="' + p.base + '" stroke="#2a1c14" stroke-width="3"/><path d="M20 -88L34 -106L10 -92Z" fill="' + p.red + '"/>' +
      '<circle cx="-4" cy="-60" r="4" fill="#2a1c14"/><circle cx="17" cy="-60" r="4" fill="#2a1c14"/>' +
      '<circle cx="-5" cy="-61" r="1.4" fill="#fff"/><circle cx="16" cy="-61" r="1.4" fill="#fff"/>' +
      '<path d="M-2 -46Q6 -40 14 -46" fill="none" stroke="' + p.red + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M-38 44L-38 56M-20 46L-20 58M20 46L20 58M38 44L38 56" stroke="' + p.accent + '" stroke-width="4" stroke-linecap="round"/>' +
      '</g>';
  }
  function clayShopSVG() {
    return `<svg class="clay-v1-svg" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1280 800" role="img" aria-label="工笔设色风格泥泥狗铺：宋式铺面，老板站在柜台后，台面上摆满彩绘泥泥狗">
    <defs>
      <radialGradient id="paperWash" cx="42%" cy="30%" r="80%">
        <stop offset="0" stop-color="#fbf3e4"/>
        <stop offset=".65" stop-color="#f3e3c0"/>
        <stop offset="1" stop-color="#e9d5ad"/>
      </radialGradient>
      <linearGradient id="woodGrain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c79a63"/><stop offset=".55" stop-color="#b2804d"/><stop offset="1" stop-color="#8c5c34"/>
      </linearGradient>
      <linearGradient id="counterFace" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#b48450"/><stop offset="1" stop-color="#7f512c"/>
      </linearGradient>
      <linearGradient id="windowLight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f9f0d6"/><stop offset="1" stop-color="#dfe3c6"/>
      </linearGradient>
      <pattern id="lattice" width="54" height="54" patternUnits="userSpaceOnUse">
        <path d="M0 0H54M0 27H54M0 0V54M27 0V54" stroke="#8f6038" stroke-width="2" fill="none" opacity=".55"/>
      </pattern>
      <!-- 泥泥狗：正面，细线工笔 -->
      <symbol id="cd" viewBox="-92 -150 184 236">
        <ellipse cx="0" cy="78" rx="48" ry="8" fill="#3a2418" opacity=".13"/>
        <path d="M34 26C68 20 70 -18 48 -28C36 -34 28 -22 38 -10C50 4 52 18 34 26Z" fill="var(--body)" stroke="#3a241c" stroke-width="2.4"/>
        <path d="M50 -8C58 -20 48 -26 40 -22" fill="none" stroke="var(--red)" stroke-width="4" stroke-linecap="round"/>
        <path d="M-40 8C-44 -38 -20 -56 0 -56C22 -56 44 -38 40 8L36 44C34 58 22 64 10 64L-10 64C-22 64 -34 58 -36 44Z" fill="var(--body)" stroke="#3a241c" stroke-width="2.6"/>
        <path d="M-22 -30C-22 -12 -10 2 0 2C10 2 22 -12 22 -30L12 -44H-12Z" fill="var(--accent)" stroke="#3a241c" stroke-width="2"/>
        <path d="M-19 -24C-10 -12 10 -12 19 -24" fill="none" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/>
        <path d="M0 -4L9 8L0 20L-9 8Z" fill="var(--red)" stroke="#3a241c" stroke-width="1.6"/>
        <circle cx="0" cy="8" r="3" fill="var(--light)"/>
        <path d="M-32 44L-32 60M-16 46L-16 62M16 46L16 62M32 44L32 60" stroke="var(--light)" stroke-width="4" stroke-linecap="round"/>
        <path d="M-34 54L-36 66M-14 56L-14 68M14 56L14 68M34 54L36 66" stroke="var(--red)" stroke-width="3" stroke-linecap="round"/>
        <path d="M-34 -66C-36 -94 -16 -108 0 -108C16 -108 36 -94 34 -66C32 -42 16 -30 0 -30C-16 -30 -32 -42 -34 -66Z" fill="var(--body)" stroke="#3a241c" stroke-width="2.6"/>
        <path d="M-28 -86L-50 -134L-8 -108Z" fill="var(--body)" stroke="#3a241c" stroke-width="2.4"/>
        <path d="M-30 -94L-44 -120L-16 -106Z" fill="var(--red)"/>
        <path d="M28 -86L50 -134L8 -108Z" fill="var(--body)" stroke="#3a241c" stroke-width="2.4"/>
        <path d="M30 -94L44 -120L16 -106Z" fill="var(--red)"/>
        <path d="M-24 -94Q-14 -102 -4 -92M24 -94Q14 -102 4 -92" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>
        <text x="0" y="-82" text-anchor="middle" font-family="Songti SC,serif" font-weight="800" font-size="16" fill="var(--accent)">王</text>
        <ellipse cx="-15" cy="-58" rx="11.5" ry="10" fill="var(--light)" stroke="#3a241c" stroke-width="2.2"/>
        <ellipse cx="15" cy="-58" rx="11.5" ry="10" fill="var(--light)" stroke="#3a241c" stroke-width="2.2"/>
        <circle cx="-14" cy="-58" r="5.3" fill="#2a1410"/><circle cx="14" cy="-58" r="5.3" fill="#2a1410"/>
        <circle cx="-16" cy="-60" r="1.8" fill="#fff"/><circle cx="12" cy="-60" r="1.8" fill="#fff"/>
        <path d="M-4 -40q4-3 8 0" fill="none" stroke="var(--red)" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M-8 -36L-3 -28L2 -36L7 -28L12 -36" fill="none" stroke="var(--light)" stroke-width="2"/>
        <path d="M-28 -10L-42 -4M-28 -2L-44 4M28 -10L42 -4M28 -2L44 4" stroke="var(--light)" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M-30 20h60M-28 30h56" stroke="var(--accent)" stroke-width="2.4" opacity=".9"/>
      </symbol>

      <linearGradient id="robeWash" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#c3cba8"/><stop offset=".55" stop-color="#a9b18e"/><stop offset="1" stop-color="#879574"/>
      </linearGradient>
      <linearGradient id="skinWash" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f3d6b4"/><stop offset="1" stop-color="#e2b98e"/>
      </linearGradient>
      <linearGradient id="apronWash" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#faf1dd"/><stop offset="1" stop-color="#e6d2b0"/>
      </linearGradient>
      <linearGradient id="lightRay" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff6dc" stop-opacity=".5"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <rect width="1280" height="800" fill="url(#paperWash)"/>
    <g opacity=".35" fill="none" stroke="#c9a063">
      <path d="M-40 690C220 610 360 740 620 660C880 580 1050 700 1320 620" stroke-width="1.4"/>
      <path d="M-40 720C240 650 400 770 660 690C920 610 1080 730 1320 660" stroke-width="1"/>
    </g>

    <!-- 店招与后墙 -->
    <rect x="38" y="56" width="1204" height="500" rx="8" fill="#f1e2c2" stroke="#c9a063" stroke-width="2"/>
    <rect x="38" y="56" width="1204" height="26" fill="#8f6038"/>
    <rect x="38" y="82" width="1204" height="8" fill="#B88549" opacity=".7"/>

    <!-- 后窗与远山 -->
    <rect x="936" y="112" width="278" height="268" rx="4" fill="url(#windowLight)" stroke="#8f6038" stroke-width="4"/>
    <rect x="936" y="112" width="278" height="268" fill="url(#lattice)"/>
    <path d="M940 330C1000 300 1040 342 1096 312C1148 284 1186 316 1214 296V380H940Z" fill="#a9b18e" opacity=".7"/>
    <path d="M940 352C1002 332 1048 362 1108 340C1158 322 1192 346 1214 334V380H940Z" fill="#8f9d7a" opacity=".55"/>
    <rect x="936" y="112" width="278" height="268" rx="4" fill="none" stroke="#8f6038" stroke-width="6"/>
    <path d="M1075 112V380M936 246H1214" stroke="#8f6038" stroke-width="3" opacity=".5"/>


    <g stroke="#8f6038" stroke-width="1.2" opacity=".35">
      <path d="M960 300L1010 250M1020 330L1090 260M1110 340L1170 280M990 360L1060 300M1140 360L1200 310"/>
    </g>
    <!-- 竹帘、窗台与光带 -->
    <g id="windowDetails">
      <rect x="926" y="104" width="298" height="20" rx="10" fill="#b98a58" stroke="#5a3e2a" stroke-width="2"/>
      <path d="M936 112h278M936 118h278" stroke="#8f6038" stroke-width="1.4" opacity=".6"/>
      <rect x="918" y="378" width="312" height="16" rx="3" fill="#8f6038" stroke="#5a3e2a" stroke-width="1.6"/>
      <g transform="translate(1180 358)">
        <path d="M-18 20C-18 2 18 2 18 20L14 34H-14Z" fill="#8f9d7a" stroke="#3a241c" stroke-width="1.6"/>
        <path d="M18 16C30 12 32 26 20 26" fill="none" stroke="#8f9d7a" stroke-width="3"/>
        <path d="M-8 -2C-14 -18 -2 -28 6 -18C12 -8 2 2 -8 -2Z" fill="#a9b18e" stroke="#5d6f61" stroke-width="1.4"/>
      </g>
      <path d="M940 130L1214 130L1170 560L700 560Z" fill="url(#lightRay)" class="glow"/>
      <path d="M936 112v268M1214 112v268" stroke="#8f6038" stroke-width="2" opacity=".4"/>
    </g>
    <!-- 悬挂卷轴 -->
    <g transform="translate(810 100)">
      <rect x="-14" y="-10" width="28" height="8" rx="3" fill="#5a3e2a"/>
      <rect x="-10" y="-2" width="20" height="62" fill="#f8edd6" stroke="#c9a063"/>
      <text x="0" y="30" text-anchor="middle" font-family="Songti SC,serif" font-size="15" fill="#4a2f22" letter-spacing="3">手作</text>
    </g>
    <g transform="translate(900 104)">
      <rect x="-12" y="-8" width="24" height="7" rx="3" fill="#5a3e2a"/>
      <rect x="-8" y="-1" width="16" height="50" fill="#f8edd6" stroke="#c9a063"/>
    </g>


    <!-- 梁架、斗拱与布幔 -->
    <g id="roofDetails">
      <rect x="38" y="82" width="1204" height="10" fill="#5a3e2a"/>
      <path d="M40 92H930V104C918 124 900 124 888 104C876 124 858 124 846 104C834 124 816 124 804 104C792 124 774 124 762 104C750 124 732 124 720 104C708 124 690 124 678 104C666 124 648 124 636 104C624 124 606 124 594 104C582 124 564 124 552 104C540 124 522 124 510 104C498 124 480 124 468 104C456 124 438 124 426 104C414 124 396 124 384 104C372 124 354 124 342 104C330 124 312 124 300 104C288 124 270 124 258 104C246 124 228 124 216 104C204 124 186 124 174 104C162 124 144 124 132 104C120 124 102 124 90 104C78 124 60 124 48 104Z" fill="#f4e8cf" stroke="#c9a063" stroke-width="1.6"/>
      <path d="M40 92H930" stroke="#7C4D30" stroke-width="3"/>
      <g fill="#8f6038" stroke="#5a3e2a" stroke-width="1.4">
        <path d="M180 92h34v18h-34Z"/><path d="M168 102h58v8h-58Z"/>
        <path d="M520 92h34v18h-34Z"/><path d="M508 102h58v8h-58Z"/>
        <path d="M760 92h34v18h-34Z"/><path d="M748 102h58v8h-58Z"/>
      </g>
      <!-- 两条挂幡 -->
      <g transform="translate(420 106)">
        <path d="M-16 -6h32v10h-32Z" fill="#8f6038"/>
        <rect x="-13" y="4" width="26" height="104" fill="#f8edd6" stroke="#c9a063"/>
        <text x="0" y="34" text-anchor="middle" font-family="Songti SC,serif" font-size="13" fill="#662C18" letter-spacing="2">人祖</text>
        <text x="0" y="52" text-anchor="middle" font-family="Songti SC,serif" font-size="13" fill="#662C18" letter-spacing="2">庙前</text>
        <path d="M-13 96h26" stroke="#7C4D30" stroke-width="3"/>
      </g>
      <g transform="translate(640 106)">
        <path d="M-16 -6h32v10h-32Z" fill="#8f6038"/>
        <rect x="-13" y="4" width="26" height="104" fill="#f8edd6" stroke="#c9a063"/>
        <text x="0" y="34" text-anchor="middle" font-family="Songti SC,serif" font-size="13" fill="#662C18" letter-spacing="2">手作</text>
        <text x="0" y="52" text-anchor="middle" font-family="Songti SC,serif" font-size="13" fill="#662C18" letter-spacing="2">泥塑</text>
        <path d="M-13 96h26" stroke="#7C4D30" stroke-width="3"/>
      </g>
    </g>
    <!-- 货架 -->
    <g id="shelves">
      <rect x="92" y="142" width="760" height="16" rx="3" fill="#8f6038"/>
      <rect x="92" y="252" width="760" height="16" rx="3" fill="#8f6038"/>
      <rect x="92" y="362" width="760" height="16" rx="3" fill="#8f6038"/>
      <rect x="100" y="150" width="10" height="252" fill="#a8784a"/>
      <rect x="834" y="150" width="10" height="252" fill="#a8784a"/>
      <!-- 上层 -->
      <use href="#cd" class="dogUse" x="126" y="76" width="74" height="92" style="--body:#2a211c;--accent:#d5ab4e;--red:#662C18;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="208" y="80" width="68" height="84" style="--body:#662C18;--accent:#e7c16a;--red:#2a211c;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="286" y="78" width="72" height="90" style="--body:#c99a52;--accent:#f6e7c8;--red:#2a211c;--light:#f8e7c0"/>
      <use href="#cd" class="dogUse" x="370" y="80" width="66" height="84" style="--body:#5d6f61;--accent:#d5ab4e;--red:#662C18;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="452" y="76" width="74" height="92" style="--body:#2a211c;--accent:#662C18;--red:#d5ab4e;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="540" y="80" width="68" height="84" style="--body:#7a4a34;--accent:#e7c16a;--red:#2a211c;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="622" y="78" width="72" height="90" style="--body:#2a211c;--accent:#d5ab4e;--red:#5d6f61;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="708" y="80" width="66" height="84" style="--body:#662C18;--accent:#f6e7c8;--red:#2a211c;--light:#f8e7c0"/>
      <!-- 中层 -->
      <use href="#cd" class="dogUse" x="120" y="186" width="76" height="94" style="--body:#2a211c;--accent:#d5ab4e;--red:#662C18;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="212" y="190" width="68" height="84" style="--body:#5d6f61;--accent:#f6e7c8;--red:#662C18;--light:#f8e7c0"/>
      <use href="#cd" class="dogUse" x="292" y="188" width="72" height="90" style="--body:#662C18;--accent:#e7c16a;--red:#2a211c;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="376" y="190" width="66" height="84" style="--body:#c99a52;--accent:#2a211c;--red:#662C18;--light:#f8e7c0"/>
      <use href="#cd" class="dogUse" x="458" y="186" width="76" height="94" style="--body:#2a211c;--accent:#662C18;--red:#d5ab4e;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="546" y="190" width="68" height="84" style="--body:#7a4a34;--accent:#d5ab4e;--red:#2a211c;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="628" y="188" width="72" height="90" style="--body:#2a211c;--accent:#f6e7c8;--red:#5d6f61;--light:#f8e7c0"/>
      <use href="#cd" class="dogUse" x="712" y="190" width="66" height="84" style="--body:#662C18;--accent:#d5ab4e;--red:#2a211c;--light:#f6e7c8"/>
      <!-- 下层 -->
      <use href="#cd" class="dogUse" x="128" y="298" width="74" height="92" style="--body:#2a211c;--accent:#d5ab4e;--red:#662C18;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="216" y="300" width="70" height="86" style="--body:#662C18;--accent:#f6e7c8;--red:#2a211c;--light:#f8e7c0"/>
      <use href="#cd" class="dogUse" x="298" y="298" width="74" height="92" style="--body:#5d6f61;--accent:#d5ab4e;--red:#662C18;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="384" y="300" width="68" height="84" style="--body:#c99a52;--accent:#2a211c;--red:#662C18;--light:#f8e7c0"/>
      <use href="#cd" class="dogUse" x="466" y="298" width="74" height="92" style="--body:#2a211c;--accent:#662C18;--red:#d5ab4e;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="554" y="300" width="68" height="84" style="--body:#7a4a34;--accent:#e7c16a;--red:#2a211c;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="636" y="298" width="74" height="92" style="--body:#2a211c;--accent:#d5ab4e;--red:#5d6f61;--light:#f6e7c8"/>
      <use href="#cd" class="dogUse" x="722" y="300" width="68" height="84" style="--body:#662C18;--accent:#f6e7c8;--red:#2a211c;--light:#f6e7c8"/>
    </g>


      <g transform="translate(188 106)">
        <path d="M-10 30C-10 8 10 8 10 30L8 38H-8Z" fill="#8f9d7a" stroke="#3a241c" stroke-width="1.4"/>
        <path d="M-6 8q6-8 12 0" fill="none" stroke="#8f9d7a" stroke-width="2"/>
      </g>
      <g transform="translate(784 138)">
        <rect x="-20" y="0" width="40" height="8" rx="2" fill="#8f6038" stroke="#3a241c" stroke-width="1.2"/>
        <rect x="-16" y="-8" width="32" height="8" rx="2" fill="#b98a58" stroke="#3a241c" stroke-width="1.2"/>
      </g>
      <g transform="translate(804 238)">
        <path d="M-14 0C-14 -10 14 -10 14 0L11 16H-11Z" fill="#b98a58" stroke="#3a241c" stroke-width="1.3"/>
        <path d="M-10 14Q-16 26 0 28Q16 26 10 14" fill="#c9a063" stroke="#3a241c" stroke-width="1.3"/>
      </g>
      <g transform="translate(790 350)">
        <ellipse cx="0" cy="8" rx="20" ry="5" fill="#3a2418" opacity=".12"/>
        <path d="M-12 0h24l-3 10h-18Z" fill="#8f6038" stroke="#3a241c" stroke-width="1.3"/>
        <path d="M-8 0V-6h16V0" fill="#b98a58" stroke="#3a241c" stroke-width="1.3"/>
      </g>
    <!-- 悬挂招牌 -->
    <path d="M470 60L500 48M650 60L620 48" stroke="#5a3e2a" stroke-width="2"/>
    <g transform="translate(560 48)">
      <rect x="-132" y="-16" width="264" height="54" rx="6" fill="#4a2f22" stroke="#B88549" stroke-width="2"/>
      <text x="0" y="17" text-anchor="middle" font-family="Songti SC,serif" font-size="26" font-weight="800" fill="#f6e7c2" letter-spacing="10">泥 泥 狗</text>
      <rect x="168" y="-10" width="34" height="34" rx="4" fill="#662C18"/>
      <text x="185" y="12" text-anchor="middle" font-family="Songti SC,serif" font-size="16" fill="#f6e7c2">人</text>
    </g>

    <!-- 灯笼 -->
    <g transform="translate(930 92)" class="swing">
      <path d="M0 0V30" stroke="#6b4326" stroke-width="3"/>
      <ellipse cx="0" cy="58" rx="24" ry="30" fill="#7C4D30" stroke="#6b4326" stroke-width="2"/>
      <path d="M0 28V58M-18 44H18" stroke="#B88549" stroke-width="2" opacity=".8"/>
      <path d="M-6 88h12v12h-12Z" fill="#662C18"/>
    </g>
    <g transform="translate(86 92)" class="swing">
      <path d="M0 0V30" stroke="#6b4326" stroke-width="3"/>
      <ellipse cx="0" cy="58" rx="22" ry="28" fill="#7C4D30" stroke="#6b4326" stroke-width="2"/>
      <path d="M0 30V58M-16 44H16" stroke="#B88549" stroke-width="2" opacity=".8"/>
    </g>

    <!-- 绿植与竹篮 -->
    <g transform="translate(1188 430)">
      <path d="M0 90C-8 60 -22 40 -34 16M0 90C8 58 20 34 30 6" fill="none" stroke="#5d6f61" stroke-width="4" stroke-linecap="round"/>
      <path d="M-34 16C-52 6 -58 22 -44 32C-34 38 -26 28 -34 16ZM30 6C48 -6 58 10 46 22C36 30 26 20 30 6Z" fill="#a9b18e" stroke="#5d6f61" stroke-width="2"/>
      <path d="M-24 52C-44 40 -58 58 -40 68C-26 74 -18 64 -24 52ZM24 40C44 28 58 46 40 58C28 64 20 52 24 40Z" fill="#b7bd9c" stroke="#5d6f61" stroke-width="2"/>
      <path d="M-28 92h56l-8 42h-40Z" fill="#b98a58" stroke="#6b4326" stroke-width="2"/>
      <path d="M-28 102h56" stroke="#8f6038" stroke-width="3"/>
    </g>

    <!-- 老板：工笔设色，站在柜台后 -->
        <g id="owner" transform="translate(0 0)">
      <ellipse cx="338" cy="566" rx="120" ry="16" fill="#3a2418" opacity=".08"/>
      <!-- 发簪与头 -->
      <path d="M300 300C300 260 318 238 340 238C362 238 380 260 380 300C380 336 362 352 340 352C318 352 300 336 300 300Z" fill="url(#skinWash)" stroke="#3a241c" stroke-width="2.6"/>
      <path d="M296 296C296 254 316 232 340 232C364 232 384 254 384 296C384 306 380 312 376 314C372 286 360 270 340 270C320 270 306 286 302 314C298 312 296 306 296 296Z" fill="#2a211c" stroke="#2a1410" stroke-width="2"/>
      <path d="M340 232C338 214 346 204 360 202" fill="none" stroke="#2a211c" stroke-width="8" stroke-linecap="round"/>
      <path d="M360 202C382 196 392 214 384 230C376 244 360 240 354 228" fill="#2a211c" stroke="#2a1410" stroke-width="2"/>
      <path d="M354 228C366 230 374 238 374 248" fill="none" stroke="#662C18" stroke-width="3"/>
      <!-- 五官 -->
      <path d="M316 292q10-7 20 0M344 292q10-7 20 0" fill="none" stroke="#3a241c" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="326" cy="304" rx="4" ry="5" fill="#2a1410"/>
      <ellipse cx="354" cy="304" rx="4" ry="5" fill="#2a1410"/>
      <circle cx="325" cy="302" r="1.3" fill="#fff"/><circle cx="353" cy="302" r="1.3" fill="#fff"/>
      <path d="M340 308q-3 10 2 14" fill="none" stroke="#b87a58" stroke-width="2" stroke-linecap="round"/>
      <path d="M330 330q10 7 20 0" fill="none" stroke="#8e3a2a" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="312" cy="320" rx="9" ry="4" fill="#d99a86" opacity=".35"/>
      <ellipse cx="368" cy="320" rx="9" ry="4" fill="#d99a86" opacity=".35"/>
      <path d="M304 306q-10 0-8 12q2 10 12 6" fill="none" stroke="#3a241c" stroke-width="2"/>
      <path d="M376 306q10 0 8 12q-2 10-12 6" fill="none" stroke="#3a241c" stroke-width="2"/>
      <!-- 衣领 / 袍 / 围裙 -->
      <path d="M300 352C286 364 276 396 274 436L268 566H412L406 436C404 396 394 364 380 352C370 366 356 374 340 374C324 374 310 366 300 352Z" fill="url(#robeWash)" stroke="#3a241c" stroke-width="2.6"/>
      <path d="M300 352L340 392L380 352" fill="none" stroke="#f4e8cf" stroke-width="6"/>
      <path d="M318 374L340 410L362 374" fill="#6f7d63" stroke="#3a241c" stroke-width="2"/>
      <path d="M296 420C320 404 360 404 384 420L392 566H288Z" fill="url(#apronWash)" stroke="#3a241c" stroke-width="2.2"/>
      <path d="M300 466h80M298 500h84M296 534h88" stroke="#c9a063" stroke-width="2" opacity=".6"/>
      <rect x="306" y="474" width="66" height="38" rx="3" fill="none" stroke="#c9a063" stroke-width="1.4" opacity=".7"/>
      <path d="M312 486h54M312 498h54" stroke="#c9a063" stroke-width="1" opacity=".45"/>
      <path d="M286 430C272 456 270 500 282 534" fill="none" stroke="#a9b18e" stroke-width="22" stroke-linecap="round"/>
      <path d="M394 430C408 456 410 500 398 534" fill="none" stroke="#a9b18e" stroke-width="22" stroke-linecap="round"/>
      <path d="M280 530C276 548 282 560 300 562" fill="url(#skinWash)" stroke="#3a241c" stroke-width="2"/>
      <path d="M400 530C404 548 398 560 380 562" fill="url(#skinWash)" stroke="#3a241c" stroke-width="2"/>
      <path d="M292 530q10 10 22 6M388 530q-10 10-22 6" fill="none" stroke="#3a241c" stroke-width="2"/>
      <!-- 手中小泥泥狗 -->
      <use href="#cd" x="398" y="480" width="58" height="72" style="--body:#2a211c;--accent:#d5ab4e;--red:#662C18;--light:#f6e7c8"/>
      <!-- 木质椅背 -->
      <path d="M238 392V560M238 392C238 372 258 360 282 360" fill="none" stroke="#6e1f1c" stroke-width="8" stroke-linecap="round"/>
      <path d="M238 470h44" stroke="#6e1f1c" stroke-width="6"/>

      <!-- 眉眼与笑意 -->
      <path d="M318 290q8-5 16 0M346 290q8-5 16 0" fill="none" stroke="#3a241c" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="326" cy="304" rx="4.6" ry="5.2" fill="url(#skinWash)" stroke="#3a241c" stroke-width="0.8"/>
      <ellipse cx="354" cy="304" rx="4.6" ry="5.2" fill="url(#skinWash)" stroke="#3a241c" stroke-width="0.8"/>
      <ellipse cx="327" cy="305" rx="2.6" ry="3" fill="#4a2f22"/><ellipse cx="353" cy="305" rx="2.6" ry="3" fill="#4a2f22"/>
      <circle cx="326.2" cy="303.6" r="0.9" fill="#fff"/><circle cx="352.2" cy="303.6" r="0.9" fill="#fff"/>
      <path d="M332 334q8 5 16 0" fill="none" stroke="#8e3a2a" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M334 337q6 3 12 0" fill="none" stroke="#d99a86" stroke-width="1.2" opacity=".7"/>
      <path d="M306 286q6 3 10 8M374 286q-6 3-10 8" fill="none" stroke="#2a211c" stroke-width="1.4" opacity=".6"/>
      <!-- 发丝/发带/玉簪 -->
      <path d="M306 292C304 268 318 250 340 248C362 248 378 264 380 286" fill="none" stroke="#3a241c" stroke-width="2" opacity=".7"/>
      <path d="M334 246q10-8 22-2" fill="none" stroke="#3a241c" stroke-width="1.4" opacity=".6"/>
      <path d="M360 202l16-8" stroke="#B88549" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="378" cy="192" r="3.4" fill="#8f9d7a" stroke="#3a241c" stroke-width="1"/>
      <!-- 衣褶与玉坠 -->
      <path d="M296 438C306 452 308 480 304 508M384 438C374 452 372 480 376 508" fill="none" stroke="#7c8a69" stroke-width="2" opacity=".45"/>
      <path d="M300 466h80M298 500h84M296 534h88" stroke="#c9a063" stroke-width="1.6" opacity=".45"/>
      <path d="M340 434v18" stroke="#c9a063" stroke-width="1.4"/>
      <circle cx="340" cy="456" r="5" fill="#8f9d7a" stroke="#3a241c" stroke-width="1.2"/>
      <!-- 柜台上的毛笔与笔筒 -->
      <path d="M430 528L474 514" stroke="#5a3e2a" stroke-width="3" stroke-linecap="round"/>
      <path d="M474 514l14-5-5 12Z" fill="#2a211c"/>
      <g transform="translate(470 526)">
        <path d="M-12 0h24l-3 18h-18Z" fill="#8f9d7a" stroke="#3a241c" stroke-width="1.3"/>
        <path d="M-6 0V-22M0 0V-30M6 0V-20" stroke="#5a3e2a" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M-6 -22l-4-10M0 -30l2-10M6 -20l4-10" stroke="#2a211c" stroke-width="2" stroke-linecap="round"/>
      </g>
    </g>


    <!-- 背后矮柜、竹筐与柜台杂物 -->
    <g id="backProps">
      <g transform="translate(760 486)">
        <path d="M-30 0C-30 -18 30 -18 30 0L24 24H-24Z" fill="#b98a58" stroke="#5a3e2a" stroke-width="2"/>
        <path d="M-26 10h52" stroke="#8f6038" stroke-width="2"/>
        <path d="M-20 24Q-28 46 0 48Q28 46 20 24" fill="#c9a063" stroke="#5a3e2a" stroke-width="2"/>
      </g>
      <g transform="translate(880 494)">
        <path d="M-24 0C-24 -14 24 -14 24 0L20 20H-20Z" fill="#b98a58" stroke="#5a3e2a" stroke-width="2"/>
        <path d="M-20 18Q-26 36 0 38Q26 36 20 18" fill="#c9a063" stroke="#5a3e2a" stroke-width="2"/>
      </g>
      <rect x="520" y="516" width="92" height="14" rx="2" fill="#f4e8cf" stroke="#8f6038" stroke-width="1.4"/>
      <path d="M528 522h76M532 528h68" stroke="#c9a063" stroke-width="1.2"/>
      <rect x="560" y="500" width="16" height="10" rx="1" fill="#662C18"/>
    </g>

    <g transform="translate(690 404)">
      <path d="M-34 0h68v98h-68Z" fill="#f4e8cf" stroke="#c9a063" stroke-width="1.6"/>
      <path d="M-34 0h68" stroke="#7C4D30" stroke-width="4"/>
      <text x="0" y="34" text-anchor="middle" font-family="Songti SC,serif" font-size="14" fill="#662C18" letter-spacing="3">泥</text>
      <text x="0" y="54" text-anchor="middle" font-family="Songti SC,serif" font-size="14" fill="#662C18" letter-spacing="3">塑</text>
      <text x="0" y="74" text-anchor="middle" font-family="Songti SC,serif" font-size="14" fill="#662C18" letter-spacing="3">人</text>
    </g>
    <!-- 柜台 -->
    <g id="counter">
      <path d="M46 566H1234V660H46Z" fill="url(#counterFace)" stroke="#4a2f22" stroke-width="2"/>
      <path d="M46 566H1234V584H46Z" fill="url(#woodGrain)" stroke="#4a2f22" stroke-width="2"/>
      <path d="M46 584H1234" stroke="#B88549" stroke-width="2" opacity=".75"/>
      <rect x="72" y="602" width="1136" height="40" rx="4" fill="#662C18" opacity=".9"/>
      <path d="M86 622H1194" stroke="#B88549" stroke-width="2" opacity=".65"/>
      <text x="640" y="700" text-anchor="middle" font-family="Songti SC,serif" font-size="17" fill="#f6e7c2" letter-spacing="9">手 工 泥 塑 · 人 祖 庙 前</text>
      <path d="M64 566V760M1216 566V760" stroke="#5a3e2a" stroke-width="3"/>
    </g>

    <!-- 台面上的展示泥泥狗 -->
    <g id="display">
      <ellipse cx="816" cy="556" rx="92" ry="10" fill="#3a2418" opacity=".12"/>
      <circle cx="816" cy="520" r="76" fill="#f6e7c8" opacity=".18"/>
      <circle cx="816" cy="520" r="76" fill="none" stroke="#B88549" stroke-width="1.4" opacity=".55"/>
      <g class="float">
        <use class="clayDogHit" data-clay="0" href="#cd" x="742" y="414" width="148" height="184" style="--body:#2a211c;--accent:#d5ab4e;--red:#662C18;--light:#f6e7c8"/>
      </g>
      <use class="clayDogHit" data-clay="1" href="#cd" x="552" y="466" width="78" height="96" style="--body:#662C18;--accent:#e7c16a;--red:#2a211c;--light:#f6e7c8"/>
      <use class="clayDogHit" data-clay="2" href="#cd" x="638" y="470" width="72" height="88" style="--body:#c99a52;--accent:#2a211c;--red:#662C18;--light:#f6e7c8"/>
      <use class="clayDogHit" data-clay="3" href="#cd" x="906" y="468" width="80" height="96" style="--body:#5d6f61;--accent:#d5ab4e;--red:#662C18;--light:#f6e7c8"/>
      <use class="clayDogHit" data-clay="4" href="#cd" x="994" y="472" width="70" height="86" style="--body:#2a211c;--accent:#f6e7c8;--red:#5d6f61;--light:#f8e7c0"/>
      <text x="816" y="588" text-anchor="middle" font-family="Songti SC,serif" font-size="13" fill="#6f4a3a" letter-spacing="4">镇 店 · 阿 黑</text>
    </g>

    <!-- 柜台上的茶壶与印章 -->
    <g transform="translate(1160 540)">
      <ellipse cx="0" cy="22" rx="30" ry="7" fill="#3a2418" opacity=".12"/>
      <path d="M-24 0C-24 -18 24 -18 24 0L20 16H-20Z" fill="#8f9d7a" stroke="#3a241c" stroke-width="2"/>
      <path d="M24 0C40 -4 42 12 28 12" fill="none" stroke="#8f9d7a" stroke-width="4"/>
      <circle cx="0" cy="-18" r="4" fill="#B88549"/>
    </g>
    <g transform="translate(1112 610)">
      <rect x="-22" y="-22" width="44" height="44" rx="4" fill="#662C18"/>
      <text x="0" y="7" text-anchor="middle" font-family="Songti SC,serif" font-size="18" fill="#f6e7c2">泥</text>
    </g>
  </svg>`;
  }
  var CLAY_SHOP_DOGS = [
    { id: 'ahei', name: '阿黑', x: 17.5, y: 53.0, w: 16.0, h: 14.0, intro: '我是人祖庙前的阿黑，黑地红纹，耳朵尖尖，替人祖看家护院，也会给你带路。', pattern: '我身上是黑底红黄彩纹：一层压一层的回纹、胸口一团云头花，黑为水、为玄，是镇宅驱邪的老纹样。' },
    { id: 'bai1', name: '小白', x: 34.8, y: 57.4, w: 12.2, h: 9.6, intro: '我是柜台左边的小白，白地红纹，脖子上围着一圈红绒花。', pattern: '白为素，红为喜；庙会上把孩子交给我，是求平安、求长大的意思。' },
    { id: 'bai2', name: '小玉', x: 48.8, y: 57.4, w: 11.4, h: 9.6, intro: '我是右边的小玉，白地绿纹，和左边的小白是一对。', pattern: '绿为春、为生，我身上盘着云头，是盼着孩子像春天一样长起来。' },
    { id: 'hong', name: '红红', x: 61.3, y: 58.6, w: 7.6, h: 8.4, intro: '我是红红，红为阳、为喜，站在柜台右边。', pattern: '红地彩纹，胸口一团团花，耳内点朱；红是祈子、祈福的颜色，庙会上最讨喜。' },
    { id: 'cui', name: '小翠', x: 69.3, y: 58.6, w: 6.9, h: 8.4, intro: '我是小翠，青为东方、为春生，最爱凑热闹。', pattern: '青地金线，云头一圈圈盘着；青是春天和生气的颜色，盼着人丁兴旺。' },
    { id: 'huang', name: '阿黄', x: 75.3, y: 59.4, w: 6.9, h: 7.8, intro: '我是阿黄，黄为土、为中央，是黄土地里捏出来的。', pattern: '黄地黑线，勾的是云头和回纹；黄是土地的颜色，也是五方里的中央。' }
  ];
  function openClay() {
    shopDetail.classList.add('is-open');
    shopDetail.classList.remove('is-tiger');
    shopDetail.classList.add('is-clay');
    shopDetail.classList.remove('is-immersive');
    shopDetail.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
    $('#shopDetailKicker').textContent = '内街 · 泥泥狗工坊';
    $('#shopDetailTitle').textContent = '泥泥狗工坊';
    $('#shopDetailDesc').textContent = '';
    shopProgressLabel.textContent = '泥泥狗';
    shopProgress.textContent = '听 6 只';
    shopActions.innerHTML = '';
    var dogs = CLAY_SHOP_DOGS.map(function (d) {
      return '<button class="clay-shop__dog" type="button" data-dog="' + d.id + '" aria-label="点一点' + d.name + '" style="left:' + d.x + '%;top:' + d.y + '%;width:' + d.w + '%;height:' + d.h + '%"></button>';
    }).join('');
    shopStage.innerHTML =
      '<div class="clay-shop2">' +
        '<div class="clay-shop2__frame">' +
          '<img class="clay-shop2__img" src="assets/clay-shop-web.jpg" alt="泥泥狗工坊">' +
          dogs +
          '<div class="clay-shop2__info" id="clayShopInfo" hidden>' +
            '<div class="clay-shop2__info-head"><b id="clayInfoName">泥泥狗</b><span class="clay-shop2__info-fold">轻触收起</span></div>' +
            '<p id="clayInfoIntro"></p>' +
            '<p id="clayInfoPattern"></p>' +
          '</div>' +
        '</div>' +
        '<p class="clay-shop2__hint" id="clayShopHint">点台面上的小狗，听它们讲自己的故事（0 / 6）</p>' +
      '</div>';
    // 进入转场：把「泥泥狗工坊」标题与女娲自述合成一张文字卡，点一下进入画面
    showStoryCard(
      '<p class="act-caption__no">内街 · 泥泥狗工坊</p>' +
      '<h2>泥泥狗工坊</h2>' +
      '<p class="act-caption__story">人，你好，我是泥泥狗。<br>' +
      '三千多年前，女娲捏你的时候，顺手也捏了我。<br>' +
      '那时候她坐在淮阳的河边，挖起一大块黄土，<br>' +
      '揉揉捏捏变成了人，剩下的泥点撒向地面，<br>' +
      '变成了飞禽与走兽——我就是其中一只。<br>' +
      '所以，说不定我们来自同一块泥巴。</p>'
    );
    var info = document.getElementById('clayShopInfo');
    var seenDogs = {};
    document.querySelectorAll('.clay-shop__dog', shopStage).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-dog');
        var dog = CLAY_SHOP_DOGS.filter(function (d) { return d.id === id; })[0];
        if (!dog) return;
        document.getElementById('clayInfoName').textContent = '泥泥狗 · ' + dog.name;
        document.getElementById('clayInfoIntro').textContent = dog.intro;
        document.getElementById('clayInfoPattern').textContent = dog.pattern;
        showClayBubble();
        seenDogs[id] = true;
        updateClayHint();
        if (Object.keys(seenDogs).length >= CLAY_SHOP_DOGS.length && !state.sugar) {
          setTimeout(function () { showClayCheckin(); }, 420);
        }
      });
    });
    function updateClayHint() {
      var hint = document.getElementById('clayShopHint');
      if (!hint) return;
      var n = Object.keys(seenDogs).length;
      var total = CLAY_SHOP_DOGS.length;
      if (n >= total) {
        hint.innerHTML = '六只小狗都听完了 · 收下挂件吧';
      } else {
        hint.innerHTML = '点台面上的小狗，听它们讲自己的故事（' + n + ' / ' + total + '）';
      }
    }
    var shelf = document.getElementById('clayShelf');
    if (shelf) shelf.addEventListener('click', function () {
      document.getElementById('clayInfoName').textContent = '淮阳泥泥狗';
      document.getElementById('clayInfoIntro').textContent =
        '人，你好，我是泥泥狗。\n' +
        '三千多年前，\n' +
        '女娲捏你的时候顺手捏了我。\n' +
        '真的，那时候她坐在淮阳的河边，\n' +
        '挖起一大块黄土，\n' +
        '揉揉捏捏变成了人，\n' +
        '剩下的泥点撒向地面变成了飞禽与走兽，\n' +
        '我就是其中一只。\n' +
        '所以，说不定我们来自同一块泥巴。';
      document.getElementById('clayInfoPattern').textContent = '';
      showClayBubble();
    });
    function showClayBubble() {
      if (!info) return;
      info.hidden = false;
      info.classList.remove('is-fold');
      void info.offsetWidth;
      info.classList.add('is-pop');
    }
    if (info) info.addEventListener('click', function (e) {
      if (e.target.closest('.clay-shop__dog') || e.target.closest('.clay-shop__shelf')) return;
      info.classList.add('is-fold');
      setTimeout(function () { if (info.classList.contains('is-fold')) info.hidden = true; }, 260);
    });
  }
  function showClayCheckin() {
    var old = document.getElementById('clayCheckin');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'clay-checkin';
    box.id = 'clayCheckin';
    box.innerHTML =
      '<img class="clay-checkin__img" src="assets/clay/clay-checkin-bg.jpg" alt="打卡成功 · 泥泥狗挂件">' +
      '<button class="clay-checkin__hot" type="button" id="clayCheckinBtn" aria-label="收入纪念背包">收入纪念背包</button>';
    document.body.appendChild(box);
    if (window.__layoutCoverHot) window.__layoutCoverHot(document.getElementById('clayCheckinBtn'), 1152, 2048, { l: 0.2535, t: 0.7861, w: 0.5026, h: 0.0781 }, 0.010);
    var btn = document.getElementById('clayCheckinBtn');
    if (btn) btn.addEventListener('click', function () {
      box.remove();
      state.sugar = {};
      save();
      completeTask('sugar');
      renderBag();
      updateHUD();
      toast('泥泥狗挂件 · 已放入背包');
    });
  }

  function clayTexture() {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    var x = c.getContext('2d');
    x.fillStyle = '#221c18'; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = '#e3b54a'; x.lineWidth = 5;
    for (var i = 0; i < 6; i++) {
      x.beginPath(); x.arc(256, 256, 60 + i * 34, 0, Math.PI * 2); x.stroke();
    }
    x.strokeStyle = '#744439'; x.lineWidth = 8;
    for (var k = 0; k < 8; k++) {
      var a = k / 8 * Math.PI * 2;
      x.beginPath(); x.moveTo(256 + Math.cos(a) * 50, 256 + Math.sin(a) * 50); x.lineTo(256 + Math.cos(a) * 236, 256 + Math.sin(a) * 236); x.stroke();
    }
    x.fillStyle = '#f0c86a';
    for (var d = 0; d < 16; d++) {
      var ad = d / 16 * Math.PI * 2;
      x.beginPath(); x.arc(256 + Math.cos(ad) * 180, 256 + Math.sin(ad) * 180, 9, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#f6e7c8';
    for (var w = 0; w < 12; w++) {
      var aw = w / 12 * Math.PI * 2;
      x.beginPath(); x.arc(256 + Math.cos(aw) * 110, 256 + Math.sin(aw) * 110, 4, 0, Math.PI * 2); x.fill();
    }
    var g = x.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)');
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.2, 1);
    return t;
  }
  function initClay3D() {
    var canvas = document.getElementById('clay3dCanvas');
    if (!canvas || !window.THREE) return;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(0, 2.3, 5.6);
    camera.lookAt(0, 1.25, 0);
    scene.add(new THREE.HemisphereLight(0xfff1da, 0x3a2a20, 1.05));
    var key = new THREE.DirectionalLight(0xffe6c4, 1.8); key.position.set(3.5, 5.5, 3.5); scene.add(key);
    var fill = new THREE.DirectionalLight(0x9fc2c8, .8); fill.position.set(-4, 2, -3); scene.add(fill);
    var rim = new THREE.PointLight(0xffb96a, 1.1, 20); rim.position.set(0, 3, -4); scene.add(rim);
    var tex = clayTexture();
    var mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .32, metalness: .05, clearcoat: 1, clearcoatRoughness: .18, color: 0xffffff });
    var dark = new THREE.MeshPhysicalMaterial({ color: 0x221c18, roughness: .38, metalness: .04, clearcoat: .8, clearcoatRoughness: .22 });
    var red = new THREE.MeshPhysicalMaterial({ color: 0xb83a32, roughness: .34, clearcoat: .9 });
    var gold = new THREE.MeshPhysicalMaterial({ color: 0xe3b54a, roughness: .3, metalness: .1, clearcoat: .9 });
    var white = new THREE.MeshPhysicalMaterial({ color: 0xf6e7c8, roughness: .42 });
    var blackEye = new THREE.MeshPhysicalMaterial({ color: 0x14100d, roughness: .18, clearcoat: 1 });
    var dog = new THREE.Group();
    scene.add(dog);
    var body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat);
    body.scale.set(1.12, .9, 1.45); body.position.y = 1.2; body.castShadow = true; dog.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(.88, 48, 32), mat);
    head.position.set(0, 1.92, .95); head.castShadow = true; dog.add(head);
    var muzzle = new THREE.Mesh(new THREE.SphereGeometry(.4, 32, 24), white);
    muzzle.scale.set(1.1, .75, .8); muzzle.position.set(0, 1.68, 1.66); dog.add(muzzle);
    var nose = new THREE.Mesh(new THREE.SphereGeometry(.16, 24, 16), red);
    nose.position.set(0, 1.82, 2.0); dog.add(nose);
    [-1, 1].forEach(function (sx) {
      var ear = new THREE.Mesh(new THREE.ConeGeometry(.36, .95, 5), dark);
      ear.position.set(sx * .62, 2.88, .91); ear.rotation.z = sx * .22; ear.rotation.x = -.12; dog.add(ear);
      var inner = new THREE.Mesh(new THREE.ConeGeometry(.22, .62, 5), red);
      inner.position.set(sx * .62, 2.86, 1.0); inner.rotation.z = sx * .22; inner.rotation.x = -.12; dog.add(inner);
      var eye = new THREE.Mesh(new THREE.SphereGeometry(.2, 24, 16), white);
      eye.position.set(sx * .32, 2.05, 1.72); dog.add(eye);
      var pupil = new THREE.Mesh(new THREE.SphereGeometry(.11, 24, 16), blackEye);
      pupil.position.set(sx * .32, 2.05, 1.87); dog.add(pupil);
      var claw = new THREE.Mesh(new THREE.ConeGeometry(.1, .18, 4), white);
      claw.position.set(sx * .32, 1.9, 2.02); claw.rotation.x = Math.PI; dog.add(claw);
    });
    var wang = document.createElement('canvas'); wang.width = 128; wang.height = 128;
    var wx = wang.getContext('2d'); wx.fillStyle = 'rgba(0,0,0,0)'; wx.fillRect(0, 0, 128, 128);
    wx.fillStyle = '#e3b54a'; wx.font = 'bold 96px Kaiti,STKaiti,serif'; wx.textAlign = 'center'; wx.textBaseline = 'middle'; wx.fillText('王', 64, 68);
    var wangTex = new THREE.CanvasTexture(wang);
    var wangMat = new THREE.MeshBasicMaterial({ map: wangTex, transparent: true });
    var wangPlane = new THREE.Mesh(new THREE.PlaneGeometry(.42, .42), wangMat);
    wangPlane.position.set(0, 2.45, 1.68); wangPlane.rotation.x = -.25; dog.add(wangPlane);
    [-1, 1].forEach(function (sx) {
      [-1, 1].forEach(function (sz) {
        var leg = new THREE.Mesh(new THREE.CylinderGeometry(.2, .23, .82, 20), mat);
        leg.position.set(sx * .55, .48, sz * .72); dog.add(leg);
        var paw = new THREE.Mesh(new THREE.SphereGeometry(.23, 20, 14), red);
        paw.position.set(sx * .55, .1, sz * .72); dog.add(paw);
      });
    });
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.2, 1.5, -1.1), new THREE.Vector3(.7, 2.0, -1.8),
      new THREE.Vector3(.35, 2.6, -2.3), new THREE.Vector3(-.2, 2.9, -2.1)
    ]);
    var tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .16, 10, false), mat);
    dog.add(tail);
    var ground = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.ShadowMaterial({ opacity: .18 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0; scene.add(ground);
    renderer.shadowMap.enabled = true; key.castShadow = true;
    dog.position.y = .1;
    var drag = null;
    var rotY = -.5, rotX = -.08, dist = 5.6;
    function apply() { dog.rotation.y = rotY; dog.rotation.x = rotX; camera.position.set(0, 2.3, dist); camera.lookAt(0, 1.25, 0); }
    apply();
    canvas.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (!drag) return; rotY = drag.ry + (e.clientX - drag.x) * .012; rotX = Math.max(-.5, Math.min(.5, drag.rx + (e.clientY - drag.y) * .008)); apply(); });
    canvas.addEventListener('pointerup', function () { drag = null; });
    canvas.addEventListener('pointercancel', function () { drag = null; });
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); dist = Math.max(3.6, Math.min(9, dist + e.deltaY * .0025)); apply(); }, { passive: false });
    function resize() {
      var w = canvas.clientWidth || 720, h = canvas.clientHeight || 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);
    clay3dState = { renderer: renderer, scene: scene, camera: camera, running: false, resize: resize };
    clay3dState.loop = function () {
      if (!clay3dState.running) return;
      requestAnimationFrame(clay3dState.loop);
      if (!drag) { rotY += .0025; apply(); }
      renderer.render(scene, camera);
    };
  }
  function ensureThree(cb) {
    if (window.THREE) { cb(); return; }
    if (window.__threeLoading) { window.__threeLoading.push(cb); return; }
    window.__threeLoading = [cb];
    var s = document.createElement('script');
    s.src = 'assets/vendor/three.min.js';
    s.onload = s.onerror = function () {
      var q = window.__threeLoading || [];
      window.__threeLoading = null;
      q.forEach(function (fn) { try { fn(); } catch (e) {} });
    };
    document.body.appendChild(s);
  }
  function openClay3D() {
    var el = document.getElementById('clay3d');
    if (!el) return;
    el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
    ensureThree(function () {
      if (!clay3dState) initClay3D();
      if (!clay3dState) return;
      clay3dState.resize();
      if (!clay3dState.running) { clay3dState.running = true; clay3dState.loop(); }
    });
  }
  function closeClay3D() {
    var el = document.getElementById('clay3d');
    if (el) { el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); }
    if (clay3dState) clay3dState.running = false;
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-replay]');
    if (!b) return;
    var r = b.getAttribute('data-replay');
    if (r === 'plush') openPlush();
    else if (r === 'bun') openBun();
    else if (r === 'sachet') openSachet();
    else if (r === 'clay') openClay();
  });
  /* 第三幕 · 3D 内街入口 */
  window.__openTask = openTask;
  window.__hasTask = function (id) { return has(id); };
  window.__toast = toast;
  window.__backToMarket = function () {
    try {
      if (shopDetail.classList.contains('is-open')) closeShopDetail();
      var a2 = document.querySelector('.act--2');
      if (a2) a2.classList.remove('is-shop-open', 'is-entering-shop');
      var v = document.getElementById('market2dVideo');
      goTo(2);
      setTimeout(function () {
        if (v) { try { v.play().catch(function () {}); } catch (e) {} }
        if (window.Scene3D && Scene3D.resetView) Scene3D.resetView();
      }, 1000);
      setTimeout(function () {
        if (!document.querySelector('.act--2.is-active')) {
          try { busy = false; setAct(2); } catch (e) {}
        }
      }, 1300);
    } catch (e) { try { goTo(2); } catch (err) {} }
  };

  window.__globalBack = function () {
    try {
      var checkin = document.getElementById('clayCheckin');
      if (checkin) { checkin.remove(); return; }
      var tongtianEl = document.getElementById('tongtianScene');
      if (tongtianEl) { tongtianEl.remove(); return; }
      var tombIncenseEl = document.getElementById('tombIncense');
      if (tombIncenseEl) { tombIncenseEl.remove(); return; }
      var tombIntroEl = document.getElementById('tombIntro');
      if (tombIntroEl) { tombIntroEl.remove(); return; }
      var tombEl = document.getElementById('tombScene');
      if (tombEl) { tombEl.remove(); return; }
      var shicaoIntroEl = document.getElementById('shicaoIntro');
      if (shicaoIntroEl) { shicaoIntroEl.remove(); return; }
      var shicaoEl = document.getElementById('shicaoScene');
      if (shicaoEl) { shicaoEl.remove(); return; }
      var beilinEl = document.getElementById('beilinScene');
      if (beilinEl) { beilinEl.remove(); if (window.__openBeilin) window.__openBeilin(); return; }
      var beilinHallEl = document.getElementById('beilinHall');
      if (beilinHallEl) { beilinHallEl.remove(); return; }
      var prayCardEl = document.getElementById('prayCard');
      if (prayCardEl && !prayCardEl.hidden) { prayCardEl.hidden = true; return; }
      var prayTreeEl = document.getElementById('prayTree');
      if (prayTreeEl && !prayTreeEl.hidden) { prayTreeEl.hidden = true; return; }
      var baguaPhoto = document.getElementById('baguaPhoto');
      if (baguaPhoto && !baguaPhoto.hidden) { baguaPhoto.hidden = true; return; }
      var gatePhoto = document.getElementById('gatePhoto');
      if (gatePhoto && !gatePhoto.hidden) { gatePhoto.hidden = true; return; }
      var gateInfo = document.getElementById('gateInfo');
      if (gateInfo && !gateInfo.hidden) { gateInfo.hidden = true; return; }
      if (shopDetail && shopDetail.classList.contains('is-open')) { closeShopDetail(); return; }
      var gatewayEl = document.querySelector('.gateway');
      if (gatewayEl && gatewayEl.classList.contains('is-open')) { closeGateway(); return; }
      var drawerEl = document.getElementById('drawer');
      if (drawerEl && drawerEl.classList.contains('is-open')) { closeDrawer(); return; }
      var bagEl = document.getElementById('bag');
      if (bagEl && bagEl.classList.contains('is-open')) { closeBag(); return; }
      var cert = document.getElementById('certificate');
      if (cert && cert.classList.contains('is-open')) { closeCertificate && closeCertificate(); return; }
      var actEl = document.querySelector('.act.is-active');
      var act = actEl ? parseInt(actEl.getAttribute('data-act'), 10) : 1;
      if (act === 4) { capsShown[3] = true; goTo(3); return; }
      if (act === 3) { goTo(2); return; }
      if (act === 2) { goTo(1); return; }
    } catch (e) {}
  };
  (function bindGlobalBack() {
    var b = document.getElementById('globalBack');
    if (b) b.addEventListener('click', function () { window.__globalBack(); });
  })();

  window.__openGateway = openGateway;
  (function wireInner() {
    var sachet = $('#innerSachet'), sugar = $('#innerSugar');
    if (sachet) sachet.addEventListener('click', function () { openTask('sachet'); });
    if (sugar) sugar.addEventListener('click', function () { openTask('sugar'); });
    var gate = $('#innerGate');
    if (gate) gate.addEventListener('click', function () {
      if (!has('sachet') || !has('sugar')) {
        toast('点击互动，再往前走吧');
        return;
      }
      if (window.__openGatePhoto) window.__openGatePhoto();
      else openGateway();
    });
  })();

  function updateInnerTabs() {
    [['sachet', 'innerSachet'], ['sugar', 'innerSugar']].forEach(function (p) {
      var b = $('#' + p[1]);
      if (b) b.classList.toggle('is-done', has(p[0]));
    });
  }
  updateHUD = (function (prev) {
    return function () { prev(); updateInnerTabs(); };
  })(updateHUD);
  init();

  /* ============================================================
     布老虎：九宫格拼图
     ============================================================ */
  var jigsaw2Game = null;
  function shuffleJigsaw2() {
    var a = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function buildPlush() {
    shopDetail.classList.add('is-tiger');
    $('#shopDetailKicker').textContent = '集市 · 瑞虎坊';
    $('#shopDetailTitle').textContent = '拼一只布老虎';
    $('#shopDetailDesc').textContent = '把下面九块碎片拖到拼图板上，拼出这只布老虎；拼好就收进背包。';
    shopProgressLabel.textContent = '拼图';
    shopProgress.textContent = '0 / 9 块';
    shopActions.innerHTML = '';
    var slots = '', tiles = '';
    for (var i = 0; i < 9; i++) {
      slots += '<button class="jigsaw2-slot" type="button" data-slot="' + i + '" aria-label="第 ' + (i + 1) + ' 格"></button>';
    }
    shuffleJigsaw2().forEach(function (idx) {
      tiles += '<button class="jigsaw2-tile" type="button" data-tile="' + idx + '" data-src="assets/tiger/jigsaw/' + idx + '.jpg" style="background-image:url(assets/tiger/jigsaw/' + idx + '.jpg)" aria-label="第 ' + (idx + 1) + ' 块碎片"></button>';
    });
    shopStage.innerHTML =
      '<div class="jigsaw2-game">' +
        '<div class="jigsaw2-board" id="jigsaw2Board">' +
          '<img class="jigsaw2-ghost" src="assets/tiger/plush-silhouette.png" alt="布老虎拼图目标">' +
          '<div class="jigsaw2-slots" id="jigsaw2Slots">' + slots + '</div>' +
          '<div class="jigsaw2-done" id="jigsaw2Done" style="background-image:url(assets/tiger/plush-source.jpg)"></div>' +
        '</div>' +
        '<div class="jigsaw2-tray" id="jigsaw2Tray">' + tiles + '</div>' +
        '<p class="jigsaw2-hint">按住下面的碎片，拖到上方的拼图板上松手</p>' +
      '</div>';
    jigsaw2Game = { placed: 0, done: false };
    $$('.jigsaw2-tile', shopStage).forEach(bindJigsaw2Tile);
  }
  function highlightJigsaw2Slot(slot) {
    /* 不再显示红色目标框，保持拼图板干净 */
  }
  function bindJigsaw2Tile(tile) {
    var drag = null;
    var uid = tile.getAttribute('data-tile');
    function targetSlot() {
      return document.querySelector('.jigsaw2-slot[data-slot="' + uid + '"]');
    }
    function makeGhost(rect) {
      var g = document.createElement('div');
      g.className = 'jigsaw2-ghostpiece';
      g.style.width = rect.width + 'px';
      g.style.height = rect.height + 'px';
      g.style.backgroundImage = 'url(' + tile.getAttribute('data-src') + ')';
      document.body.appendChild(g);
      return g;
    }
    function moveGhost(x, y) {
      if (!drag) return;
      var r = drag.rect;
      drag.ghost.style.left = (x - r.width / 2) + 'px';
      drag.ghost.style.top = (y - r.height / 2 - 16) + 'px';
      highlightJigsaw2Slot(jigsaw2SlotAt(x, y));
    }
    function start(x, y, id) {
      if (drag) return false;
      if (!jigsaw2Game || jigsaw2Game.done || tile.classList.contains('is-placed')) return false;
      var r = tile.getBoundingClientRect();
      drag = { id: id, sx: x, sy: y, moved: 0, rect: r, ghost: makeGhost(r) };
      tile.classList.add('is-source');
      moveGhost(x, y);
      return true;
    }
    function move(x, y) {
      if (!drag) return;
      var dx = x - drag.sx, dy = y - drag.sy;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.sx = x; drag.sy = y;
      moveGhost(x, y);
    }
    function finishDrag(ok, target) {
      var d = drag; drag = null;
      highlightJigsaw2Slot(null);
      $$('.jigsaw2-slot.is-target', shopStage).forEach(function (s) { s.classList.remove('is-target'); });
      tile.classList.remove('is-source');
      var ghost = d.ghost;
      if (ok && target) {
        var tr = target.getBoundingClientRect();
        ghost.style.transition = 'left .2s ease, top .2s ease, transform .2s ease, opacity .2s ease';
        ghost.style.left = (tr.left + tr.width / 2 - d.rect.width / 2) + 'px';
        ghost.style.top = (tr.top + tr.height / 2 - d.rect.height / 2) + 'px';
        ghost.style.transform = 'scale(1)';
        setTimeout(function () { if (ghost.parentNode) ghost.remove(); }, 220);
        placeJigsaw2Tile(tile, target);
      } else {
        ghost.style.transition = 'opacity .22s ease, transform .22s ease';
        ghost.style.opacity = '0';
        ghost.style.transform = 'scale(.88)';
        setTimeout(function () { if (ghost.parentNode) ghost.remove(); }, 240);
      }
    }
    function end(x, y) {
      if (!drag) return;
      var d = drag;
      if (d.moved < 8) { finishDrag(false, null); return; }
      var slot = jigsaw2SlotAt(x, y);
      var ok = false;
      if (slot && !slot.classList.contains('is-filled')) {
        ok = slot.getAttribute('data-slot') === tile.getAttribute('data-tile');
        if (!ok) toast('这块位置不对 · 换一格试试');
      }
      finishDrag(ok, slot);
    }
    function cancel() {
      if (!drag) return;
      var d = drag; drag = null;
      highlightJigsaw2Slot(null);
      $$('.jigsaw2-slot.is-target', shopStage).forEach(function (s) { s.classList.remove('is-target'); });
      tile.classList.remove('is-source');
      if (d.ghost && d.ghost.parentNode) d.ghost.remove();
    }
    // 鼠标 / 触控笔
    tile.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!start(e.clientX, e.clientY, 'p' + e.pointerId)) return;
      e.preventDefault();
      try { tile.setPointerCapture(e.pointerId); } catch (err) { }
    });
    tile.addEventListener('pointermove', function (e) {
      if (!drag || drag.id !== 'p' + e.pointerId) return;
      e.preventDefault();
      move(e.clientX, e.clientY);
    });
    tile.addEventListener('pointerup', function (e) {
      if (!drag || drag.id !== 'p' + e.pointerId) return;
      end(e.clientX, e.clientY);
    });
    tile.addEventListener('pointercancel', function () {
      if (drag && String(drag.id).charAt(0) === 'p') cancel();
    });
    // 手指
    tile.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      if (!start(e.touches[0].clientX, e.touches[0].clientY, 't')) return;
      e.preventDefault();
    }, { passive: false });
    tile.addEventListener('touchmove', function (e) {
      if (!drag || drag.id !== 't' || e.touches.length !== 1) return;
      e.preventDefault();
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    tile.addEventListener('touchend', function (e) {
      if (!drag || drag.id !== 't') return;
      var t = e.changedTouches[0];
      end(t.clientX, t.clientY);
    });
    tile.addEventListener('touchcancel', function () {
      if (drag && drag.id === 't') cancel();
    });
  }

  function placeJigsaw2Tile(tile, slot) {
    if (!jigsaw2Game || jigsaw2Game.done || tile.classList.contains('is-placed')) return;
    if (!slot || slot.classList.contains('is-filled')) return;
    tile.classList.add('is-placed');
    tile.style.transform = '';
    slot.classList.add('is-filled');
    slot.dataset.filled = tile.getAttribute('data-tile');
    slot.style.backgroundImage = 'url(' + tile.getAttribute('data-src') + ')';
    jigsaw2Game.placed++;
    sfx.pop();
    if (shopProgress) shopProgress.textContent = jigsaw2Game.placed + ' / 9 块';
    if (jigsaw2Game.placed >= 9) finishJigsaw2();
  }
  function shuffleTiles(list) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  function resetJigsaw2() {
    if (!jigsaw2Game) return;
    var slots = document.querySelectorAll('.jigsaw2-slot');
    Array.prototype.forEach.call(slots, function (s) {
      s.classList.remove('is-filled');
      s.style.backgroundImage = '';
      s.dataset.filled = '';
    });
    var tray = document.getElementById('jigsaw2Tray');
    if (tray) {
      var tiles = Array.prototype.slice.call(tray.querySelectorAll('.jigsaw2-tile'));
      Array.prototype.forEach.call(tiles, function (t) { t.classList.remove('is-placed'); });
      tray.innerHTML = '';
      shuffleTiles(tiles).forEach(function (t) { tray.appendChild(t); });
    }
    jigsaw2Game.placed = 0;
    if (shopProgress) shopProgress.textContent = '0 / 9 块';
    toast('拼错了 · 九块碎片已退回右边，重新再拼一次');
  }
  function finishJigsaw2() {
    if (!jigsaw2Game) return;
    var allRight = true;
    Array.prototype.forEach.call(document.querySelectorAll('.jigsaw2-slot'), function (s) {
      if (s.getAttribute('data-filled') !== s.getAttribute('data-slot')) allRight = false;
    });
    if (!allRight) { resetJigsaw2(); return; }
    jigsaw2Game.done = true;
    var done = document.getElementById('jigsaw2Done');
    if (done) done.classList.add('is-on');
    state.tiger = {};
    save();
    completeTask('tiger');
    renderBag();
    setTimeout(showTiger2Done, 720);
  }
  function showTiger2Done() {
    shopDetail.classList.add('is-open');
    shopDetail.setAttribute('aria-hidden', 'false');
    if (app) app.classList.add('is-detail');
    $('#shopDetailKicker').textContent = '集市 · 瑞虎坊';
    $('#shopDetailTitle').textContent = '布老虎拼好了';
    $('#shopDetailDesc').textContent = '九块拼图凑成一只布老虎，已经收进你的背包。';
    shopProgressLabel.textContent = '收藏';
    shopProgress.textContent = '已收进背包';
    shopStage.innerHTML = '<div class="shop-done"><img class="plush-done-img" src="assets/tiger/plush-source.jpg" alt="拼好的布老虎"><p class="shop-done__name">布老虎玩偶</p><p class="shop-done__meta">布老虎 · 已收进背包</p><p class="shop-done__text">随处可以看到琳琅满目的布老虎，有单头虎、双头虎、直卧虎等，形态各异。它反映了华夏子孙对人祖伏羲、女娲的怀念与敬仰，是早期人类繁衍崇拜的物化和象征。</p></div>';
    shopActions.innerHTML = '<button class="btn btn--ghost" type="button" data-replay="plush">再拼一次</button><button class="btn btn--primary" type="button" data-close-shop>收进背包 · 回街市</button>';
    $$('[data-close-shop]', shopActions).forEach(function (el) { el.addEventListener('click', closeShopDetail); });
  }


  /* ============================================================
     压缩馍：逐口动画（参考图逐帧，咬一口擦出一张）
     ============================================================ */
  var bun4Game = null;
  var BUN4_FRAMES = [
    'assets/bun/frame0.jpg', 'assets/bun/frame1.jpg', 'assets/bun/frame2.jpg',
    'assets/bun/frame3.jpg', 'assets/bun/frame4.jpg', 'assets/bun/frame5.jpg', 'assets/bun/frame6.jpg'
  ];
  function buildBun() {
    $('#shopDetailKicker').textContent = '集市 · 馍香坊';
    $('#shopDetailTitle').textContent = '吃一个压缩馍';
    $('#shopDetailDesc').textContent = '刚出炉的压缩馍，点一下咬一口，一共五口，看着它一点点变小。';
    shopProgressLabel.textContent = '已吃';
    shopProgress.textContent = '0 / 6 口';
    shopActions.innerHTML = '';
    shopStage.innerHTML =
      '<div class="bun4-game">' +
        '<div class="bun4-card" id="bun4Card" role="button" tabindex="0" aria-label="点一下咬一口">' +
          '<img class="bun4-img bun4-img--old" id="bun4Old" src="' + BUN4_FRAMES[0] + '" alt="">' +
          '<img class="bun4-img bun4-img--new" id="bun4New" src="' + BUN4_FRAMES[0] + '" alt="压缩馍">' +
          '<div class="bun4-crumbs" id="bun4Crumbs"></div>' +
        '</div>' +
        '<p class="bun4-hint" id="bun4Hint">点一下 · 咬一口（共 6 口）</p>' +
      '</div>';
    bun4Game = { count: 0, busy: false, done: false };
    var card = document.getElementById('bun4Card');
    if (card) {
      card.addEventListener('click', function () { biteBun(); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); biteBun(); } });
    }
  }
  function spawnBun4Crumbs() {
    var wrap = document.getElementById('bun4Crumbs');
    if (!wrap) return;
    for (var i = 0; i < 8; i++) {
      var cr = document.createElement('i');
      cr.className = 'bun4-crumb';
      var ang = Math.random() * Math.PI * 2, dist = 30 + Math.random() * 70;
      cr.style.left = (66 + Math.random() * 16) + '%';
      cr.style.top = (40 + Math.random() * 16) + '%';
      cr.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      cr.style.setProperty('--dy', (Math.sin(ang) * dist + 26) + 'px');
      cr.style.animationDelay = (Math.random() * 0.08) + 's';
      wrap.appendChild(cr);
      setTimeout(function (el) { if (el.parentNode) el.parentNode.removeChild(el); }.bind(null, cr), 780);
    }
  }
  function biteBun() {
    if (!bun4Game || bun4Game.busy || bun4Game.done) return;
    if (bun4Game.count >= 5) return;
    bun4Game.busy = true;
    var card = document.getElementById('bun4Card');
    var oldImg = document.getElementById('bun4Old');
    var newImg = document.getElementById('bun4New');
    var idx = bun4Game.count;
    if (oldImg) oldImg.src = BUN4_FRAMES[idx];
    if (newImg) newImg.src = BUN4_FRAMES[idx + 1];
    if (card) {
      card.classList.remove('is-biting');
      void card.offsetWidth;
      card.classList.add('is-biting');
      if (newImg) {
        newImg.style.animation = 'none';
        void newImg.offsetWidth;
        newImg.style.animation = '';
      }
    }
    spawnBun4Crumbs();
    sfx.crunch();
    bun4Game.count++;
    if (shopProgress) shopProgress.textContent = bun4Game.count + ' / 5 口';
    setTimeout(function () {
      if (!bun4Game) return;
      bun4Game.busy = false;
      if (card) card.classList.remove('is-biting');
      if (bun4Game.count >= 5) finishBun();
    }, 540);
  }
  function finishBun() {
    if (!bun4Game || bun4Game.done) return;
    bun4Game.done = true;
    var card = document.getElementById('bun4Card');
    var oldImg = document.getElementById('bun4Old');
    var newImg = document.getElementById('bun4New');
    if (oldImg) oldImg.src = BUN4_FRAMES[6];
    if (newImg) newImg.src = BUN4_FRAMES[6];
    if (card) card.classList.add('is-finished');
    completeTask('bun');
    setTimeout(showBunDone, 750);
  }
  function showBunDone() {
    $('#shopDetailKicker').textContent = '集市 · 馍香坊';
    $('#shopDetailTitle').textContent = '压缩馍吃完了';
    $('#shopDetailDesc').textContent = '最后一口也吃完了，这个压缩馍做成了小挂件，已经收进背包。';
    shopProgressLabel.textContent = '收藏';
    shopProgress.textContent = '已收进背包';
    shopStage.innerHTML = '<div class="shop-done"><img class="bun4-done-img" src="assets/bun/frame6.jpg" alt="压缩馍吃完了"><p class="shop-done__name">压缩馍挂件</p><p class="shop-done__meta">压缩馍 · 已收进背包</p></div>';
    shopActions.innerHTML = '<button class="btn btn--ghost" type="button" data-replay="bun">再吃一个</button><button class="btn btn--primary" type="button" data-close-shop>收进背包 · 回街市</button>';
    $$('[data-close-shop]', shopActions).forEach(function (el) { el.addEventListener('click', closeShopDetail); });
  }

  /* ============================================================
     布老虎拼图：拖拽（pointer + touch 双通道）
     ============================================================ */
  function jigsaw2SlotAt(x, y) {
    var el = document.elementFromPoint(x, y);
    var slot = el && el.closest ? el.closest('.jigsaw2-slot') : null;
    if (slot) return slot;
    var best = null, bestD = 1e9;
    $$('.jigsaw2-slot', shopStage).forEach(function (s) {
      if (s.classList.contains('is-filled')) return;
      var r = s.getBoundingClientRect();
      if (x < r.left - 12 || x > r.right + 12 || y < r.top - 12 || y > r.bottom + 12) return;
      var d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }
  /* ============================================================
     压缩馍：图片遮罩咬痕（点击位置缺一块，逐口缩小）
     ============================================================ */
  var bun5Game = null;
  var BUN5_CX = 450, BUN5_CY = 430, BUN5_RX = 322, BUN5_RY = 288;
  function buildBun() {
    $('#shopDetailKicker').textContent = '集市 · 馍香坊';
    $('#shopDetailTitle').textContent = '吃一个压缩馍';
    $('#shopDetailDesc').textContent = '刚出炉的压缩馍，点一下咬一口，一共六口，从边上开始咬，最后一口吃完只剩小挂件。';
    shopProgressLabel.textContent = '已吃';
    shopProgress.textContent = '0 / 6 口';
    shopActions.innerHTML = '';
    shopStage.innerHTML =
      '<div class="bun5-game">' +
        '<div class="bun5-card" id="bun5Card" role="button" tabindex="0" aria-label="点一下咬一口">' +
          '<svg class="bun5-svg" id="bun5Svg" viewBox="0 0 903 853" role="img" aria-label="压缩馍：点一下咬一口">' +
            '<defs>' +
              '<mask id="bun5Mask"><rect x="0" y="0" width="903" height="853" fill="#fff"/><g id="bun5Holes" clip-path="url(#bun5Clip)"></g></mask>' +
              '<clipPath id="bun5Clip"><ellipse cx="450" cy="430" rx="330" ry="296"/></clipPath>' +
              '<filter id="bun5EdgeShadow" x="-6%" y="-6%" width="112%" height="112%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#3a2412" flood-opacity=".38"/></filter>' +
            '</defs>' +
            '<rect x="0" y="0" width="903" height="853" fill="#f2e7d3"/>' +
            '<g id="bun5Bun" class="bun5-bun">' +
              '<image href="assets/bun/bun-main.jpg" x="0" y="0" width="903" height="853" mask="url(#bun5Mask)" filter="url(#bun5EdgeShadow)"/>' +
            '</g>' +
          '</svg>' +
        '</div>' +
        '<p class="bun5-hint" id="bun5Hint">点一下 · 咬一口（共 6 口）</p>' +
      '</div>';
    bun5Game = { count: 0, busy: false, done: false };
    var card = document.getElementById('bun5Card');
    var svg = document.getElementById('bun5Svg');
    if (card && svg) {
      svg.addEventListener('click', function (e) { biteBun(e); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); biteBun(null); } });
    }
  }
  function bun5BiteShape(cx, cy, rad) {
    var circles = [{ x: cx, y: cy, r: rad }];
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2 + 0.35;
      circles.push({ x: cx + Math.cos(a) * rad * 0.82, y: cy + Math.sin(a) * rad * 0.82, r: rad * 0.34 });
    }
    return circles;
  }
  var BUN6_BITES = [
    { a: -16, r: 174, off: 0.22 },
    { a: 50, r: 180, off: 0.22 },
    { a: 122, r: 186, off: 0.22 },
    { a: 196, r: 192, off: 0.22 },
    { a: 268, r: 198, off: 0.22 },
    { final: true }
  ];
  function biteBun(e) {
    if (!bun5Game || bun5Game.busy || bun5Game.done) return;
    if (bun5Game.count >= 6) return;
    var svg = document.getElementById('bun5Svg');
    var card = document.getElementById('bun5Card');
    var r = svg.getBoundingClientRect();
    var sy = 853 / r.height;
    var x = BUN5_CX, y = BUN5_CY;
    if (e && typeof e.clientX === 'number' && e.clientX > 0) {
      x = (e.clientX - r.left) * (903 / r.width);
      y = (e.clientY - r.top) * sy;
      var hx = (x - BUN5_CX) / BUN5_RX, hy = (y - BUN5_CY) / BUN5_RY;
      if (hx * hx + hy * hy > 1.0) { toast('点在馍上才有得吃'); return; }
    }
    var n = bun5Game.count;
    var spec = BUN6_BITES[n];
    var ns = 'http://www.w3.org/2000/svg';
    var circles = [];
    var bx, by, rad;
    if (spec.final) {
      bx = BUN5_CX; by = BUN5_CY; rad = 205;
      circles.push({ x: bx, y: by, r: rad });
      for (var i = 0; i < 6; i++) {
        var aa = (i / 6) * Math.PI * 2;
        circles.push({ x: bx + Math.cos(aa) * rad * 0.8, y: by + Math.sin(aa) * rad * 0.8, r: rad * 0.3 });
      }
    } else {
      var ang = spec.a * Math.PI / 180;
      var rimX = BUN5_CX + Math.cos(ang) * BUN5_RX;
      var rimY = BUN5_CY + Math.sin(ang) * BUN5_RY;
      bx = rimX + Math.cos(ang) * spec.r * spec.off;
      by = rimY + Math.sin(ang) * spec.r * spec.off;
      rad = spec.r;
      circles.push({ x: bx, y: by, r: rad });
      var inA = Math.atan2(BUN5_CY - by, BUN5_CX - bx);
      for (var k = 0; k < 7; k++) {
        var off2 = (k - 3) * 0.27;
        circles.push({ x: bx + Math.cos(inA + off2) * rad * 1.0, y: by + Math.sin(inA + off2) * rad * 1.0, r: rad * 0.3 });
      }
    }
    var hole = document.createElementNS(ns, 'g');
    hole.setAttribute('class', 'bun5-bite-pop');
    circles.forEach(function (c) {
      var el = document.createElementNS(ns, 'circle');
      el.setAttribute('cx', c.x.toFixed(1)); el.setAttribute('cy', c.y.toFixed(1)); el.setAttribute('r', c.r.toFixed(1));
      el.setAttribute('fill', '#000');
      hole.appendChild(el);
    });
    document.getElementById('bun5Holes').appendChild(hole);
    var bun = document.getElementById('bun5Bun');
    if (bun) bun.style.transform = 'scale(' + (1 - (n + 1) * 0.03) + ')';
    if (card) { card.classList.remove('is-biting'); void card.offsetWidth; card.classList.add('is-biting'); }
    var ca = card.getBoundingClientRect();
    var px = ((spec.final ? BUN5_CX : bx) / 903) * ca.width;
    var py = ((spec.final ? BUN5_CY : by) / 853) * ca.height;
    for (var i2 = 0; i2 < (spec.final ? 12 : 8); i2++) {
      var cr = document.createElement('i');
      cr.className = 'bun5-crumb';
      cr.style.left = px + 'px';
      cr.style.top = py + 'px';
      var a2 = Math.random() * Math.PI * 2, dist = 28 + Math.random() * 70;
      cr.style.setProperty('--dx', Math.cos(a2) * dist + 'px');
      cr.style.setProperty('--dy', (Math.sin(a2) * dist + 22) + 'px');
      cr.style.animationDelay = (Math.random() * 0.06) + 's';
      card.appendChild(cr);
      setTimeout(function (el) { if (el.parentNode) el.parentNode.removeChild(el); }.bind(null, cr), 760);
    }
    sfx.crunch();
    bun5Game.count++;
    if (shopProgress) shopProgress.textContent = bun5Game.count + ' / 6 口';
    setTimeout(function () {
      if (!bun5Game) return;
      bun5Game.busy = false;
      if (card) card.classList.remove('is-biting');
      if (bun5Game.count >= 6) finishBun();
    }, 460);
  }

  function finishBun() {
    if (!bun5Game || bun5Game.done) return;
    bun5Game.done = true;
    completeTask('bun');
    setTimeout(showBunDone, 760);
  }
  function showBunDone() {
    $('#shopDetailKicker').textContent = '集市 · 馍香坊';
    $('#shopDetailTitle').textContent = '压缩馍吃完了';
    $('#shopDetailDesc').textContent = '五口吃完，这个压缩馍做成了小挂件，已经收进背包。';
    shopProgressLabel.textContent = '收藏';
    shopProgress.textContent = '已收进背包';
    shopStage.innerHTML = '<div class="shop-done"><img class="bun5-done-img" src="assets/bun/bun-main.jpg" alt="压缩馍"><p class="shop-done__name">压缩馍挂件</p><p class="shop-done__meta">压缩馍 · 已收进背包</p><p class="shop-done__text">压缩馍是太昊陵庙会特色面点，当地流传“小孩吃了考大学，大人吃了好干活”的俗语，寄托着朴素的美好期许。它兴起较晚，是庙会里承载烟火祝福的特色小吃。</p></div>';
    shopActions.innerHTML = '<button class="btn btn--ghost" type="button" data-replay="bun">再吃一个</button><button class="btn btn--primary" type="button" data-close-shop>收进背包 · 回街市</button>';
    $$('[data-close-shop]', shopActions).forEach(function (el) { el.addEventListener('click', closeShopDetail); });
  }


  /* ============================================================
     碑林：擦碑场景
     ============================================================ */
  var beilinState = null;
  function beilinWeb(cx, cy, r, n) {
    var out = '';
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n;
      out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(a) * r).toFixed(0) + '" y2="' + (cy + Math.sin(a) * r).toFixed(0) + '" stroke="#ece6d6" stroke-width="2" opacity=".5"/>';
    }
    for (var k = 1; k <= 4; k++) {
      var rr = r * k / 4, pts = '';
      for (var j = 0; j <= n; j++) {
        var a2 = -Math.PI / 2 + j * 2 * Math.PI / n;
        pts += (j ? 'L' : 'M') + (cx + Math.cos(a2) * rr).toFixed(0) + ' ' + (cy + Math.sin(a2) * rr).toFixed(0) + ' ';
      }
      out += '<path d="' + pts + 'Z" fill="none" stroke="#ece6d6" stroke-width="1.5" opacity=".4"/>';
    }
    return out;
  }
  function beilinRagSVG() {
    return '<svg viewBox="0 0 72 72" aria-hidden="true">' +
      '<path d="M13 30C13 18 23 9 36 10C50 11 61 20 61 33C61 48 50 61 35 62C22 63 12 52 12 40Z" fill="#e9ddc4" stroke="#8a7a5e" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M22 24C28 18 38 16 46 22C52 27 55 37 50 46" fill="none" stroke="#c9b894" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>' +
      '<path d="M17 44C24 50 33 52 42 48C48 45 52 39 52 33" fill="none" stroke="#c9b894" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M30 14C34 22 34 34 29 44C27 48 24 51 21 53" fill="none" stroke="#d8c8a8" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M18 28C24 26 30 28 34 33" fill="none" stroke="#fbf4e2" stroke-width="2" opacity=".7"/>' +
      '<path d="M42 50C46 47 50 42 52 37" fill="none" stroke="#fbf4e2" stroke-width="2" opacity=".6"/>' +
      '</svg>';
  }
  function openBeilinStele() {
    var old = document.getElementById('beilinScene');
    if (old) old.remove();
    var webs = beilinWeb(-20, -10, 330, 9) + beilinWeb(1300, 60, 300, 8) + beilinWeb(40, 1650, 260, 8);
    var box = document.createElement('div');
    box.className = 'beilin-scene';
    box.id = 'beilinScene';
    box.innerHTML =
      '<div class="beilin-scene__bg"></div>' +
      '<div class="beilin-scene__frame" id="beilinFrame">' +
        '<img class="beilin-scene__clean" src="assets/beilin/stele.jpg" alt="太昊陵碑林石碑">' +
        '<div class="beilin-scene__dirty" id="beilinDirty">' +
          '<svg viewBox="0 0 1152 2047" preserveAspectRatio="none" aria-hidden="true">' +
            '<defs>' +
              '<filter id="beilinBlur" x="-6%" y="-6%" width="112%" height="112%"><feGaussianBlur stdDeviation="9.5"/></filter>' +
              '<filter id="beilinGrain"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" seed="7"/><feColorMatrix type="saturate" values="0"/></filter>' +
            '</defs>' +
            '<image href="assets/beilin/stele.jpg" x="0" y="0" width="1152" height="2047" preserveAspectRatio="none" filter="url(#beilinBlur)"/>' +
            '<rect x="0" y="0" width="1152" height="2047" fill="#5a5040" opacity=".3"/>' +
            '<rect x="0" y="0" width="1152" height="2047" filter="url(#beilinGrain)" opacity=".18"/>' +
            '<g class="beilin-webs" opacity=".6">' + webs + '</g>' +
          '</svg>' +
        '</div>' +
        '<div class="beilin-scene__rag" id="beilinRag">' + beilinRagSVG() + '</div>' +
      '</div>' +
      '<p class="beilin-scene__hint" id="beilinHint">按住抹布，在石碑上移动擦拭</p>' +
      '<button class="beilin-scene__close" type="button" id="beilinClose" aria-label="关闭">×</button>';
    document.body.appendChild(box);
    fadeInWhenReady(box.querySelector('.beilin-scene__clean'));
    var frame = document.getElementById('beilinFrame');
    var dirty = document.getElementById('beilinDirty');
    var rag = document.getElementById('beilinRag');
    var hint = document.getElementById('beilinHint');
    var doneAlready = has('beilin');
    // 擦拭画布：白色底，擦过的地方擦成透明，作为脏层的遮罩
    var cv = document.createElement('canvas');
    cv.width = 320; cv.height = 427;
    var cctx = cv.getContext('2d');
    cctx.fillStyle = '#fff';
    cctx.fillRect(0, 0, 320, 427);
    function applyMask() {
      var url = 'url(' + cv.toDataURL('image/png') + ')';
      dirty.style.maskImage = url;
      dirty.style.webkitMaskImage = url;
      dirty.style.maskSize = '100% 100%';
      dirty.style.webkitMaskSize = '100% 100%';
      dirty.style.maskRepeat = 'no-repeat';
      dirty.style.webkitMaskRepeat = 'no-repeat';
    }
    applyMask();
    var st = { cleaning: false, done: !!doneAlready, holes: 0, covFrac: 0, lastX: -9999, lastY: -9999, lastPct: -1 };
    if (doneAlready) {
      box.classList.add('is-clean');
      if (hint) hint.textContent = '碑已擦净 · 碑林打卡完成';
    }
    var closeBtn = document.getElementById('beilinClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { box.remove(); openBeilin(); });
    function placeRag(cx, cy) {
      var r = frame.getBoundingClientRect();
      if (rag) { rag.style.left = (cx - r.left) + 'px'; rag.style.top = (cy - r.top) + 'px'; }
    }
    function paintStroke(x, y, px, py) {
      var sx = x / 1280 * 320, sy = y / 1707 * 427;
      cctx.globalCompositeOperation = 'destination-out';
      cctx.lineCap = 'round';
      cctx.lineJoin = 'round';
      // 外层软边（半透明宽笔）+ 内层实心笔，边缘更自然
      cctx.globalAlpha = 0.3;
      cctx.lineWidth = 62;
      cctx.beginPath();
      if (px < -9000) { cctx.moveTo(sx + 0.5, sy); cctx.lineTo(sx, sy); }
      else { cctx.moveTo(px / 1280 * 320, py / 1707 * 427); cctx.lineTo(sx, sy); }
      cctx.stroke();
      cctx.globalAlpha = 0.55;
      cctx.lineWidth = 50;
      cctx.beginPath();
      if (px < -9000) { cctx.moveTo(sx + 0.5, sy); cctx.lineTo(sx, sy); }
      else { cctx.moveTo(px / 1280 * 320, py / 1707 * 427); cctx.lineTo(sx, sy); }
      cctx.stroke();
      cctx.globalAlpha = 1;
      cctx.lineWidth = 36;
      cctx.beginPath();
      if (px < -9000) { cctx.moveTo(sx + 0.5, sy); cctx.lineTo(sx, sy); }
      else { cctx.moveTo(px / 1280 * 320, py / 1707 * 427); cctx.lineTo(sx, sy); }
      cctx.stroke();
      applyMask();
    }
    function wipeAt(cx, cy) {
      if (!st || st.done) return;
      var r = frame.getBoundingClientRect();
      var x = (cx - r.left) / r.width * 1280;
      var y = (cy - r.top) / r.height * 1707;
      if (x < 0 || x > 1280 || y < 0 || y > 1707) return;
      var px = -9999, py = -9999;
      if (st.lastX > -9000) {
        px = (st.lastX - r.left) / r.width * 1280;
        py = (st.lastY - r.top) / r.height * 1707;
        if (Math.hypot(x - px, y - py) < 14) return;
      }
      st.lastX = cx; st.lastY = cy;
      paintStroke(x, y, px, py);
      st.holes++;
      for (var di = 0; di < 3; di++) {
        var puff = document.createElement('i');
        puff.className = 'beilin-dust-puff';
        puff.style.left = (cx - r.left) + 'px';
        puff.style.top = (cy - r.top) + 'px';
        var pa = Math.random() * Math.PI * 2, pd = 16 + Math.random() * 44;
        puff.style.setProperty('--dx', Math.cos(pa) * pd + 'px');
        puff.style.setProperty('--dy', (Math.sin(pa) * pd - 12) + 'px');
        frame.appendChild(puff);
        setTimeout(function (el) { if (el.parentNode) el.parentNode.removeChild(el); }.bind(null, puff), 1000);
      }
      if (st.holes % 3 === 0) {
        var data = cctx.getImageData(0, 0, 320, 427).data;
        var clear = 0;
        for (var i = 3; i < data.length; i += 4) if (data[i] < 100) clear++;
        st.covFrac = clear / (320 * 427);
        var pct = Math.min(100, Math.round(st.covFrac / 0.36 * 100));
        if (hint && pct !== st.lastPct) { st.lastPct = pct; hint.textContent = '按住抹布擦石碑 · 已擦 ' + pct + '%'; }
        if (st.covFrac >= 0.36) {
          st.done = true;
          box.classList.add('is-clean');
          if (hint) hint.textContent = '碑已擦净 · 碑林打卡完成';
          if (rag) rag.classList.remove('is-pressed');
          completeTask('beilin');
          toast('碑林擦碑 · 打卡完成');
          showBeilinStory();
          return;
        }
      }
      if (sfx.tick && (st.holes % 4 === 0)) sfx.tick();
    }
    frame.addEventListener('pointerdown', function (e) {
      if (st.done) return;
      st.cleaning = true;
      st.lastX = -9999; st.lastY = -9999;
      placeRag(e.clientX, e.clientY);
      if (rag) { rag.classList.add('is-pressed'); rag.classList.add('is-wiping'); }
      box.classList.add('is-wiping');
      wipeAt(e.clientX, e.clientY);
      try { frame.setPointerCapture(e.pointerId); } catch (err) { }
      e.preventDefault();
    });
    frame.addEventListener('pointermove', function (e) {
      placeRag(e.clientX, e.clientY);
      if (st.cleaning) wipeAt(e.clientX, e.clientY);
    });
    function endWipe() {
      st.cleaning = false;
      if (rag) rag.classList.remove('is-pressed');
    }
    frame.addEventListener('pointerup', endWipe);
    frame.addEventListener('pointercancel', endWipe);
    frame.addEventListener('pointerleave', function () { if (!st.cleaning && rag) rag.classList.remove('is-wiping'); });
  }

  function openBeilin() {
    var old = document.getElementById('beilinHall');
    if (old) old.remove();
    var oldStele = document.getElementById('beilinScene');
    if (oldStele) oldStele.remove();
    var box = document.createElement('div');
    box.className = 'beilin-hall';
    box.id = 'beilinHall';
    box.innerHTML =
      '<div class="beilin-hall__bg"></div>' +
      '<div class="beilin-hall__frame">' +
        '<img class="beilin-hall__img" src="assets/beilin/pavilion.jpg" alt="碑林碑亭">' +
        '<button class="beilin-hall__stele" type="button" id="beilinHallStele" aria-label="走近石碑"></button>' +
      '</div>' +
      '<p class="beilin-hall__hint">点击亭中石碑 · 走近细看</p>' +
      '<button class="beilin-hall__close" type="button" id="beilinHallClose" aria-label="关闭">×</button>';
    document.body.appendChild(box);
    var hot = document.getElementById('beilinHallStele');
    var zooming = false;
    if (hot) hot.addEventListener('click', function () {
      if (zooming) return;
      zooming = true;
      fadeInWhenReady(box.querySelector('.beilin-hall__img'));
    var frame = box.querySelector('.beilin-hall__frame');
      if (frame) frame.classList.add('is-zooming');
      box.classList.add('is-zooming');
      setTimeout(function () {
        openBeilinStele();
      }, 1200);
      setTimeout(function () {
        box.remove();
      }, 2250);
    });
    var closeBtn = document.getElementById('beilinHallClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { box.remove(); });
  }

  function openShicao() {
    var old = document.getElementById('shicaoScene');
    if (old) old.remove();
    var oldIntro = document.getElementById('shicaoIntro');
    if (oldIntro) oldIntro.remove();
    var box = document.createElement('div');
    box.className = 'shicao-scene';
    box.id = 'shicaoScene';
    box.innerHTML =
      '<div class="shicao-scene__bg"></div>' +
      '<div class="shicao-scene__frame">' +
        '<img class="shicao-scene__img" src="assets/shicao/garden.jpg" alt="蓍草园">' +
        '<button class="shicao-scene__hot" type="button" id="shicaoHot" aria-label="细看园中蓍草"></button>' +
      '</div>' +
      '<p class="shicao-scene__hint">点击园中蓍草 · 细看神草</p>' +
      '<button class="shicao-scene__close" type="button" id="shicaoClose" aria-label="关闭">×</button>';
    document.body.appendChild(box);
    var closeBtn = document.getElementById('shicaoClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { box.remove(); });
    var hot = document.getElementById('shicaoHot');
    if (hot) hot.addEventListener('click', function () { box.remove(); openShicaoIntro(); });
  }

  function openShicaoIntro() {
    var old = document.getElementById('shicaoIntro');
    if (old) old.remove();
    var done = has('shicao');
    var box = document.createElement('div');
    box.className = 'shicao-intro';
    box.id = 'shicaoIntro';
    box.innerHTML =
      '<div class="shicao-intro__card" role="dialog" aria-label="蓍草介绍">' +
        '<button class="shicao-intro__close" type="button" id="shicaoIntroClose" aria-label="关闭">×</button>' +
        '<img class="shicao-intro__herb" src="assets/shicao/herb.jpg" alt="蓍草">' +
        '<p class="shicao-intro__kicker">陵庙 · 蓍草园</p>' +
        '<h3 class="shicao-intro__title">蓍草 · 神草</h3>' +
        '<p class="shicao-intro__text">蓍草是菊科多年生草本植物，相传伏羲曾以蓍草揲蓍画卦，因此被称作“神草”。</p>' +
        '<p class="shicao-intro__text">太昊陵后蓍草园就是淮阳八景之一“蓍草春荣”。</p>' +
        '<p class="shicao-intro__text">它既可入药、供观赏，更承载根脉文化：古时帝王遣使祭陵，会带回一束蓍草作为信物，是太昊陵里联结始祖传说与后世传承的灵物。</p>' +
        '<button class="shicao-intro__btn" type="button" id="shicaoIntroBtn">' + (done ? '已收下这束蓍草 · 关闭' : '收下这束蓍草 · 打卡') + '</button>' +
      '</div>';
    document.body.appendChild(box);
    var closeBtn = document.getElementById('shicaoIntroClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { box.remove(); });
    var btn = document.getElementById('shicaoIntroBtn');
    if (btn) btn.addEventListener('click', function () {
      box.remove();
      if (has('shicao')) return;
      completeTask('shicao');
      toast('蓍草 · 神草已收下，打卡成功');
    });
  }

  function openTomb() {
    var old = document.getElementById('tombScene');
    if (old) old.remove();
    ['tombIntro', 'tombIncense', 'tombStory', 'tombVideo'].forEach(function (k) { var el = document.getElementById(k); if (el) el.remove(); });
    var done = has('tomb');
    var box = document.createElement('div');
    box.className = 'tomb-scene';
    box.id = 'tombScene';
    box.style.setProperty('--tomb-bg', "url('" + (done ? 'assets/tomb/tomb-after.jpg' : 'assets/tomb/tomb-before.jpg') + "')");
    box.innerHTML =
      '<div class="tomb-scene__bg"></div>' +
      '<div class="tomb-scene__frame">' +
        '<img class="tomb-scene__img" id="tombSceneImg" src="' + (done ? 'assets/tomb/tomb-after.jpg' : 'assets/tomb/tomb-before.jpg') + '" alt="太昊伏羲陵">' +
        '<button class="tomb-scene__altar" type="button" id="tombAltar" aria-label="伏羲陵墓"></button>' +
      '</div>' +
      '<p class="tomb-scene__hint" id="tombSceneHint">' + (done ? '已上香 · 点香炉查看' : '点击香炉 · 上香祭陵') + '</p>' +
      '<button class="tomb-scene__close" type="button" id="tombClose" aria-label="关闭">×</button>';
    document.body.appendChild(box);
    var closeBtn = document.getElementById('tombClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { box.remove(); });
    var altar = document.getElementById('tombAltar');
    if (altar) altar.addEventListener('click', function () { openTombIntro(); });
  }

  function openTombIntro() {
    var old = document.getElementById('tombIntro');
    if (old) old.remove();
    var done = has('tomb');
    var box = document.createElement('div');
    box.className = 'tomb-intro';
    box.id = 'tombIntro';
    box.innerHTML =
      '<div class="tomb-intro__card" role="dialog" aria-label="陵前上香">' +
        '<button class="tomb-intro__close" type="button" id="tombIntroClose" aria-label="关闭">×</button>' +
        '<p class="tomb-intro__kicker">陵庙 · 伏羲陵墓</p>' +
        '<h3 class="tomb-intro__title">' + (done ? '已上香 · 礼成' : '陵前上香') + '</h3>' +
        '<figure class="tomb-intro__photo"><img src="assets/tomb/incense-gold.jpg" alt="陵前供香"></figure>' +
        '<button class="tomb-intro__btn" type="button" id="tombIntroBtn">' + (done ? '已上香 · 关闭' : '上香祭陵') + '</button>' +
      '</div>';
    document.body.appendChild(box);
    var closeBtn = document.getElementById('tombIntroClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { box.remove(); });
    var btn = document.getElementById('tombIntroBtn');
    if (btn) btn.addEventListener('click', function () {
      box.remove();
      if (has('tomb')) return;
      finishTomb();
    });
  }

  function finishTomb() {
    var sc = document.getElementById('tombScene');
    if (sc) {
      var im = sc.querySelector('.tomb-scene__img');
      if (im) im.src = 'assets/tomb/tomb-after.jpg';
      sc.style.setProperty('--tomb-bg', "url('assets/tomb/tomb-after.jpg')");
      var hint = document.getElementById('tombSceneHint');
      if (hint) hint.textContent = '已上香 · 点香炉查看';
    }
    completeTask('tomb');
    toast('伏羲陵 · 上香礼成，打卡完成');
    showTombStory();
  }

  function showTombStory() {
    var old = document.getElementById('tombStory');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'tomb-story';
    box.id = 'tombStory';
    box.innerHTML =
      '<div class="tomb-story__card" role="dialog" aria-label="伏羲陵介绍">' +
        '<p class="tomb-story__kicker">陵庙 · 伏羲陵墓</p>' +
        '<h3 class="tomb-story__title">伏羲 · 人文始祖</h3>' +
        '<p class="tomb-story__text">伏羲是“三皇之首”、中华人文始祖，他画八卦、定姓氏、制嫁娶，开启华夏文明根脉。</p>' +
        '<p class="tomb-story__text">太昊伏羲陵冢通高 13.5 米，上圆下方，方座周长 200 余米，陵前立有“太昊伏羲氏之陵”石碑。</p>' +
        '<button class="tomb-story__btn" type="button" id="tombStoryBtn">礼成 · 知道了</button>' +
      '</div>';
    document.body.appendChild(box);
    var btn = document.getElementById('tombStoryBtn');
    if (btn) btn.addEventListener('click', function () { box.remove(); showNextStep(); });
  }

  function showBeilinStory() {
    var old = document.getElementById('beilinStory');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'tomb-story';
    box.id = 'beilinStory';
    box.innerHTML =
      '<div class="tomb-story__card" role="dialog" aria-label="碑林 · 根脉">' +
        '<p class="tomb-story__kicker">陵庙 · 碑林</p>' +
        '<h3 class="tomb-story__title">碑 · 根脉</h3>' +
        '<p class="tomb-story__text">陈州伏羲碑林坐落于太昊陵景区东侧，采用环抱卦式布局，廊亭相连，共收纳三百余方碑刻。</p>' +
        '<p class="tomb-story__text">碑林汇集明清御祭古碑、历代文人题咏与当代书法名家作品，既是记录伏羲祭祀传统的实物史料，也是书法艺术的荟萃之地。</p>' +
        '<button class="tomb-story__btn" type="button" id="beilinStoryBtn">礼成 · 知道了</button>' +
      '</div>';
    document.body.appendChild(box);
    var btn = document.getElementById('beilinStoryBtn');
    if (btn) btn.addEventListener('click', function () { box.remove(); showNextStep(); });
  }
  window.__showBeilinStory = showBeilinStory;

  window.__openBeilin = openBeilin;  window.__openBeilin = openBeilin;
  window.__openShicao = openShicao;
  function showTongtianDone() {
    var old = document.getElementById('tongtianDone');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'tongtian-done';
    box.id = 'tongtianDone';
    box.innerHTML =
      '<div class="tongtian-done__card">' +
        '<p class="tongtian-done__kicker">陵庙 · 统天殿</p>' +
        '<h3 class="tongtian-done__title">万物由本源而生</h3>' +
        '<p class="tongtian-done__text">统天殿是太昊陵里的主殿，处在景区中轴线的核心位置，也是祭祀伏羲的中心场地。殿名里面“统天”这两个字出自《易经》，含义是万物由本源而生，统领天地。殿前宽阔的月台，可以容纳很多人一起参与祭拜，庙会里面比较正式的祭祖活动大多在这里举办。</p>' +
        '<button class="tongtian-done__btn" type="button" id="tongtianDoneBtn">礼成 · 知道了</button>' +
      '</div>';
    document.body.appendChild(box);
    var btn = document.getElementById('tongtianDoneBtn');
    if (btn) btn.addEventListener('click', function () { box.remove(); showNextStep(); });
  }

  window.__openTomb = openTomb;


  /* ============================================================
     通天殿：供奉
     ============================================================ */
  var TONGTIAN_OFFERS = [
    { id: 'flower', name: '花束', src: 'assets/tongtian/offer-flower.png', cls: 'tongtian-scene__card--flower' },
    { id: 'pastry', name: '点心', src: 'assets/tongtian/offer-pastry.png', cls: '' },
    { id: 'bun', name: '供饼', src: 'assets/tongtian/offer-bun.png', cls: '' },
    { id: 'fruit', name: '果盘', src: 'assets/tongtian/offer-fruit.png', cls: '' }
  ];
  function openTongtian() {
    var old = document.getElementById('tongtianScene');
    if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'tongtian-scene';
    box.id = 'tongtianScene';
    var slotsHtml = '';
    [20, 50, 80].forEach(function (x, i) {
      slotsHtml += '<div class="tongtian-scene__slot" id="ttSlot' + i + '" style="left:' + x + '%">' + (i + 1) + '</div>';
    });
    var cardsHtml = TONGTIAN_OFFERS.map(function (o) {
      return '<button class="tongtian-scene__card ' + o.cls + '" type="button" data-offer="' + o.id + '"><img src="' + o.src + '" alt="' + o.name + '"><span>' + o.name + '</span></button>';
    }).join('');
    box.innerHTML =
      '<div class="tongtian-scene__bg"></div>' +
      '<div class="tongtian-scene__frame">' +
        '<img class="tongtian-scene__img" src="assets/tongtian/hall.jpg" alt="通天殿伏羲像与供台">' +
        '<div class="tongtian-scene__table" id="tongtianTable"><span class="tongtian-scene__table-hint">点击供台 · 供奉贡品</span></div>' +
        '<div class="tongtian-scene__slots">' + slotsHtml + '</div>' +
      '</div>' +
      '<p class="tongtian-scene__hint" id="tongtianHint">点击供台 · 供奉贡品（0 / 3）</p>' +
      '<button class="tongtian-scene__close" type="button" id="tongtianClose" aria-label="关闭">×</button>' +
      '<div class="tongtian-scene__chooser" id="tongtianChooser" hidden>' +
        '<div class="tongtian-scene__chooser-head"><b>选一样供品</b><button class="tongtian-scene__chooser-close" type="button" id="tongtianChooserClose" aria-label="收起">×</button></div>' +
        '<div class="tongtian-scene__cards">' + cardsHtml + '</div>' +
      '</div>';
    document.body.appendChild(box);
    var hint = document.getElementById('tongtianHint');
    var chooser = document.getElementById('tongtianChooser');
    var table = document.getElementById('tongtianTable');
    var doneAlready = has('tongtian');
    var st = { count: 0, done: !!doneAlready };
    function fillSlot(i, offer) {
      var slot = document.getElementById('ttSlot' + i);
      if (!slot) return;
      slot.classList.add('is-filled');
      slot.innerHTML = '<img src="' + offer.src + '" alt="' + offer.name + '">';
    }
    if (doneAlready) {
      hint.textContent = '供奉完成 · 通天殿打卡完成';
      TONGTIAN_OFFERS.slice(0, 3).forEach(function (o, i) { fillSlot(i, o); });
      st.count = 3;
      var th = document.querySelector('.tongtian-scene__table-hint');
      if (th) th.style.display = 'none';
    }
    function closeChooser() {
      if (chooser) chooser.hidden = true;
      box.classList.remove('is-choosing');
    }
    table.addEventListener('click', function () {
      if (st.done) { toast('供台已经摆好了'); return; }
      if (chooser) chooser.hidden = false;
      box.classList.add('is-choosing');
    });
    var chClose = document.getElementById('tongtianChooserClose');
    if (chClose) chClose.addEventListener('click', closeChooser);
    box.addEventListener('click', function (e) {
      if (chooser && !chooser.hidden && !e.target.closest('.tongtian-scene__chooser') && !e.target.closest('#tongtianTable')) closeChooser();
    });
    function chooseOffer(offer) {
      if (!st || st.done || st.count >= 3) return;
      fillSlot(st.count, offer);
      st.count++;
      closeChooser();
      if (sfx.pop) sfx.pop();
      if (st.count < 3) {
        hint.textContent = '点击供台 · 供奉贡品（' + st.count + ' / 3）';
      } else {
        st.done = true;
        hint.textContent = '供奉完成 · 通天殿打卡完成';
        var thDone = document.querySelector('.tongtian-scene__table-hint');
        if (thDone) thDone.style.display = 'none';
        completeTask('tongtian');
        toast('通天殿 · 供奉完成');
        setTimeout(function () { showTongtianDone(); }, 420);
      }
    }
    box.querySelectorAll('[data-offer]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = btn.getAttribute('data-offer');
        var offer = TONGTIAN_OFFERS.filter(function (o) { return o.id === id; })[0];
        if (offer) chooseOffer(offer);
      });
    });
    var closeBtn = document.getElementById('tongtianClose');
    if (closeBtn) closeBtn.addEventListener('click', function () { box.remove(); });
  }
  window.__openTongtian = openTongtian;

})();

  (function start2dWalkers() {
    var els = Array.prototype.slice.call(document.querySelectorAll('.bg-walker'));
    if (!els.length) return;
    var data = els.map(function (el) {
      function v(name, def) { var raw = el.style.getPropertyValue(name); var n = parseFloat(raw); return isNaN(n) ? def : n; }
      return {
        el: el,
        x1: v('--x1', 48) / 100, y1: v('--y1', 55) / 100,
        x2: v('--x2', 52) / 100, y2: v('--y2', 59) / 100,
        s1: v('--s1', .7), s2: v('--s2', 1),
        dur: v('--dur', 18), delay: v('--delay', 0)
      };
    });
    var start = performance.now();
    function frame(now) {
      var t = (now - start) / 1000;
      data.forEach(function (d) {
        var p = ((t + d.delay) / d.dur) % 1;
        if (p < 0) p += 1;
        var op = Math.min(1, p * 10) * (p > .9 ? Math.max(0, (1 - p) / .1) : 1);
        var bob = Math.sin(p * Math.PI * 18) * .6;
        d.el.style.left = (d.x1 + (d.x2 - d.x1) * p) * 100 + '%';
        d.el.style.top = (d.y1 + (d.y2 - d.y1) * p) * 100 + '%';
        d.el.style.opacity = op.toFixed(3);
        d.el.style.transform = 'translate(-50%, calc(-100% + ' + bob.toFixed(2) + 'px)) scale(' + (d.s1 + (d.s2 - d.s1) * p).toFixed(3) + ')';
      });
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  (function initInner2D() {
    var act = document.querySelector('.act--3');
    var layer = document.querySelector('.inner2d');
    if (act && layer) {
      act.addEventListener('pointermove', function (e) {
        var r = layer.getBoundingClientRect();
        var ix = ((e.clientX - r.left) / r.width - .5) * 2;
        var iy = ((e.clientY - r.top) / r.height - .5) * 2;
        layer.style.setProperty('--ix', Math.max(-1, Math.min(1, ix)).toFixed(2));
        layer.style.setProperty('--iy', Math.max(-1, Math.min(1, iy)).toFixed(2));
      });
      act.addEventListener('pointerleave', function () {
        layer.style.setProperty('--ix', 0);
        layer.style.setProperty('--iy', 0);
      });
    }
    var gateInfo = document.getElementById('gateInfo');
    var gateGo = document.getElementById('gateInfoGo');
    var gateClose = document.getElementById('gateInfoClose');
    if (gateGo && gateInfo) {
      gateGo.addEventListener('click', function () {
        gateInfo.hidden = true;
        if (window.__openGateway) window.__openGateway();
      });
    }
    if (gateClose && gateInfo) {
      gateClose.addEventListener('click', function () { gateInfo.hidden = true; });
    }
    document.querySelectorAll('[data-inner]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-inner');
        if (kind === 'gate') {
          var _has = window.__hasTask || function () { return true; };
          var _toast = window.__toast || function () {};
          if (!_has('sachet') || !_has('sugar')) {
            _toast('点击互动，再往前走吧');
            return;
          }
          if (window.__openGatePhoto) window.__openGatePhoto();
          else if (window.__openGateway) window.__openGateway();
          return;
        }
        if (kind === 'sachet') { if (window.__openTask) window.__openTask('sachet'); return; }
        if (kind === 'clay') { if (window.__openTask) window.__openTask('sugar'); return; }
      });
    });
  if (app) app.classList.add('is-ready');
  var _enterBtn = document.getElementById('enterBtn');
  if (_enterBtn) {
    _enterBtn.innerHTML = '点击进入游览';
    _enterBtn.disabled = false;
    if (window.__layoutIntroHot) window.__layoutIntroHot();
  }
  })();

