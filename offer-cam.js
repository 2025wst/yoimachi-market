/* ============================================================
   羲皇寻踪 · 添供：拍一件
   ------------------------------------------------------------
   拍下现实里的一件东西，在本机把它「描」成一幅小供画，
   落在统天殿的供案上。

   全部计算在本地完成：照片不上传、不出设备。
   ============================================================ */
(function () {
  'use strict';

  var ART_S = 400;                 // 画心分辨率
  var BOOK_KEY = 'xihuang_offer_book_v1';
  var BOOK_MAX = 9;

  var root = null;                 // 当前打开的层
  var state = null;                // 当前流程状态

  /* ---------------------------------------------------------- 小工具 */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function supportFilter() {
    var c = document.createElement('canvas');
    var x = c.getContext('2d');
    return !!x && typeof x.filter === 'string';
  }
  var HAS_FILTER = supportFilter();

  function loadImageFromFile(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('这句读不出来'));
      };
      img.src = url;
    });
  }

  /* ---------------------------------------------------------- 淡彩渲染 */

  var TEX = null;
  function paperTex() {
    if (TEX) return TEX;
    var n = 200;
    var c = document.createElement('canvas');
    c.width = c.height = n;
    var x = c.getContext('2d');
    var id = x.createImageData(n, n);
    var d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = 128 + (Math.random() * 2 - 1) * 52;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    TEX = c;
    return TEX;
  }

  function squareBox(img) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var s = Math.min(w, h);
    return [(w - s) / 2 | 0, (h - s) / 2 | 0, s];
  }

  /* 把照片压成「淡彩」：降采样压平细节 -> 回放大 + 轻模糊 -> 色阶 -> 纸纹 */
  function stylize(img) {
    var S = ART_S;
    var box = squareBox(img);
    var c1 = el('canvas'); c1.width = c1.height = S;
    var x1 = c1.getContext('2d', { willReadFrequently: true });
    x1.drawImage(img, box[0], box[1], box[2], box[2], 0, 0, S, S);

    var mid = 196;
    var c2 = el('canvas'); c2.width = c2.height = mid;
    var x2 = c2.getContext('2d');
    if (HAS_FILTER) x2.filter = 'saturate(0.78) contrast(1.10) brightness(1.06)';
    x2.drawImage(c1, 0, 0, mid, mid);

    x1.clearRect(0, 0, S, S);
    if (HAS_FILTER) x1.filter = 'blur(1.6px)';
    x1.drawImage(c2, 0, 0, S, S);
    if (HAS_FILTER) x1.filter = 'none';

    var q = 16;
    var id = x1.getImageData(0, 0, S, S);
    var d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      d[i] = Math.round(d[i] / q) * q + q / 2 + 5;
      d[i + 1] = Math.round(d[i + 1] / q) * q + q / 2 + 1;
      d[i + 2] = Math.round(d[i + 2] / q) * q + q / 2 - 5;
    }
    x1.putImageData(id, 0, 0);

    x1.save();
    x1.globalCompositeOperation = 'overlay';
    x1.globalAlpha = 0.30;
    x1.drawImage(paperTex(), 0, 0, S, S);
    x1.restore();
    return c1;
  }

  /* 淡墨描线：只描主轮廓，线色取深褐 */
  function inkOverlay(canvas, strength) {
    if (!strength) return canvas;
    var w = canvas.width, h = canvas.height;
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var src = ctx.getImageData(0, 0, w, h);
    var d = src.data;
    var lum = new Float32Array(w * h);
    for (var i = 0, p = 0; i < d.length; i += 4, p++) {
      lum[p] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    var out = ctx.createImageData(w, h);
    var o = out.data;
    o.set(d);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var idx = y * w + x;
        var gx = -lum[idx - w - 1] - 2 * lum[idx - 1] - lum[idx + w - 1] +
                  lum[idx - w + 1] + 2 * lum[idx + 1] + lum[idx + w + 1];
        var gy = -lum[idx - w - 1] - 2 * lum[idx - w] - lum[idx - w + 1] +
                  lum[idx + w - 1] + 2 * lum[idx + w] + lum[idx + w + 1];
        var m = Math.sqrt(gx * gx + gy * gy) / 8;
        var a = Math.max(0, (m - 20) / 52) * strength;
        if (a <= 0.004) continue;
        var i4 = idx * 4;
        o[i4] = o[i4] * (1 - a) + 76 * a;
        o[i4 + 1] = o[i4 + 1] * (1 - a) + 50 * a;
        o[i4 + 2] = o[i4 + 2] * (1 - a) + 32 * a;
      }
    }
    ctx.putImageData(out, 0, 0);
    return canvas;
  }

  /* 手绘感的圆：半径带极轻微抖动，像手工画的光圈 */
  function handArc(x, cx, cy, r, seed) {
    var n = 72;
    x.beginPath();
    for (var i = 0; i <= n; i++) {
      var a = i / n * Math.PI * 2;
      var wob = 1 + Math.sin(a * 3 + seed) * 0.0055 + Math.sin(a * 7 + seed * 2) * 0.0035;
      var px = cx + Math.cos(a) * r * wob;
      var py = cy + Math.sin(a) * r * wob;
      if (i) x.lineTo(px, py); else x.moveTo(px, py);
    }
    x.closePath();
  }

  /* 圆形画心：淡彩 + 墨线 + 边缘积色 + 中心柔光 */
  function paintedDisc(img) {
    var S = ART_S;
    var c = el('canvas'); c.width = c.height = S;
    var x = c.getContext('2d');
    var flat = stylize(img);
    inkOverlay(flat, 0.56);
    x.save();
    handArc(x, S / 2, S / 2, S / 2, 1.7);
    x.clip();
    x.drawImage(flat, 0, 0);

    var g = x.createRadialGradient(S / 2, S / 2, S * 0.36, S / 2, S / 2, S * 0.5);
    g.addColorStop(0, 'rgba(104,78,52,0)');
    g.addColorStop(0.80, 'rgba(104,78,52,0)');
    g.addColorStop(1, 'rgba(92,64,38,.28)');
    x.globalCompositeOperation = 'multiply';
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);

    x.globalCompositeOperation = 'screen';
    var g2 = x.createRadialGradient(S / 2, S * 0.40, 0, S / 2, S / 2, S * 0.56);
    g2.addColorStop(0, 'rgba(255,246,222,.10)');
    g2.addColorStop(1, 'rgba(255,246,222,0)');
    x.fillStyle = g2;
    x.fillRect(0, 0, S, S);
    x.restore();
    return c;
  }

  /* 供碟：米纸边 + 铜环 + 画心 + 瓷面弧光 */
  function plateCanvas(flat, D, seed) {
    var c = el('canvas'); c.width = c.height = D;
    var x = c.getContext('2d');
    var cx = D / 2;
    var R = D / 2 * 0.965;
    var inner = R * 0.878;
    var sd = seed || 2.3;

    x.clearRect(0, 0, D, D);

    handArc(x, cx, cx, R, sd);
    x.fillStyle = '#F0E1BF';
    x.fill();

    var lg = x.createLinearGradient(D * 0.1, 0, D * 0.9, D);
    lg.addColorStop(0, '#EBD091');
    lg.addColorStop(0.40, '#BD8B4C');
    lg.addColorStop(1, '#7A4E1E');
    handArc(x, cx, cx, R, sd);
    x.arc(cx, cx, inner, 0, Math.PI * 2, true);
    x.fillStyle = lg;
    x.fill();

    handArc(x, cx, cx, R - D * 0.004, sd);
    x.strokeStyle = 'rgba(110,70,26,.8)';
    x.lineWidth = D * 0.009;
    x.stroke();

    x.beginPath();
    x.arc(cx, cx, inner + D * 0.010, 0, Math.PI * 2);
    x.strokeStyle = 'rgba(138,94,38,.28)';
    x.lineWidth = D * 0.004;
    x.stroke();

    x.save();
    handArc(x, cx, cx, inner, sd);
    x.clip();
    x.drawImage(flat, 0, 0, D, D);
    var gg = x.createLinearGradient(0, 0, D * 0.9, D * 0.9);
    gg.addColorStop(0, 'rgba(255,252,238,.16)');
    gg.addColorStop(0.35, 'rgba(255,252,238,.04)');
    gg.addColorStop(0.56, 'rgba(255,252,238,0)');
    gg.addColorStop(1, 'rgba(255,252,238,.06)');
    x.globalCompositeOperation = 'screen';
    x.fillStyle = gg;
    x.fillRect(0, 0, D, D);
    x.restore();
    return c;
  }

  /* ---------------------------------------------------------- 辨识 */

  var CLS = [
    { id: 'fruit', name: '鲜果', tag: '时令鲜果', luck: '平安', msg: '果香盈案，愿四时平安。', h: [[340, 30], [30, 55]], s: [0.42, 1], v: [0.32, 0.95], w: 1.0, sp: [0, 3] },
    { id: 'cake', name: '甜供', tag: '甘饴之供', luck: '甘美', msg: '一口甜，敬一份心意。', h: [[300, 40], [55, 75]], s: [0.18, 0.62], v: [0.48, 1], w: 1.0, sp: [0, 4] },
    { id: 'flower', name: '花供', tag: '花供', luck: '敬献', msg: '花开一时，敬在一心。', h: [[280, 60]], s: [0.14, 0.7], v: [0.38, 1], w: 1.0, sp: [3, 12] },
    { id: 'grain', name: '面食', tag: '麦香面供', luck: '丰足', msg: '麦香一线，岁岁丰足。', h: [[25, 60]], s: [0, 0.22], v: [0.62, 1], w: 1.0, sp: [0, 3] },
    { id: 'tea', name: '清茶', tag: '一盏清茶', luck: '清心', msg: '茶烟淡淡，心自清宁。', h: [[60, 180]], s: [0, 0.3], v: [0.1, 0.7], w: 1.0, sp: [0, 4] },
    { id: 'green', name: '园蔬', tag: '园中青蔬', luck: '清吉', msg: '一蔬一饭，皆是清吉。', h: [[70, 170]], s: [0.22, 1], v: [0.2, 0.9], w: 1.0, sp: [0, 4] },
    { id: 'dry', name: '干果', tag: '枣栗干果', luck: '早成', msg: '枣栗成实，所愿早成。', h: [[340, 22], [10, 35]], s: [0.35, 1], v: [0.1, 0.48], w: 1.0, sp: [0, 3] },
    { id: 'cooked', name: '熟食', tag: '案上熟食', luck: '烟火', msg: '人间烟火，最是实在。', h: [[10, 45], [180, 240]], s: [0.2, 0.85], v: [0.2, 0.8], w: 1.0, sp: [1, 6] },
    { id: 'toy', name: '玩物', tag: '一件心爱', luck: '欢喜', msg: '心头所爱，也愿同享。', h: [[0, 360]], s: [0.34, 1], v: [0.24, 1], w: 1.0, sp: [5, 16] },
    { id: 'other', name: '随喜', tag: '随喜之物', luck: '心诚', msg: '心之所至，即是供养。', h: [[0, 360]], s: [0, 1], v: [0, 1], w: 1.0, sp: [0, 16] }
  ];

  function inRanges(v, ranges) {
    for (var i = 0; i < ranges.length; i++) {
      var r = ranges[i];
      if (r[1] > r[0]) {
        if (v >= r[0] && v <= r[1]) return true;
      } else if (v >= r[0] || v <= r[1]) return true;
    }
    return false;
  }

  function classify(img) {
    var S = 160;
    var box = squareBox(img);
    var c = el('canvas'); c.width = c.height = S;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, box[0], box[1], box[2], box[2], 0, 0, S, S);
    var d = x.getImageData(0, 0, S, S).data;

    var hb = new Float32Array(36), hs = 0, hurt = 0, vt = 0, cnt = 0;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      var v = mx, s = mx === 0 ? 0 : (mx - mn) / mx;
      var hh = 0;
      if (mx !== mn) {
        if (mx === r) hh = 60 * (((g - b) / (mx - mn)) % 6);
        else if (mx === g) hh = 60 * ((b - r) / (mx - mn) + 2);
        else hh = 60 * ((r - g) / (mx - mn) + 4);
      }
      if (hh < 0) hh += 360;
      hb[Math.min(35, Math.floor(hh / 10))] += s * 0.6 + 0.4;
      hs += s; vt += v; cnt++;
    }
    hs /= cnt; vt /= cnt;

    var total = 0;
    for (var k = 0; k < 36; k++) total += hb[k];
    var prof = new Float32Array(36);
    for (k = 0; k < 36; k++) prof[k] = hb[k] / (total || 1);
    /* 色相分散度：覆盖超过 2.5% 的色相桶数，用来区分「单色物」和「多色物」 */
    var spread = 0;
    for (k = 0; k < 36; k++) if (prof[k] > 0.025) spread++;

    var scored = CLS.map(function (c2) {
      var hs2 = 0;
      for (var b2 = 0; b2 < 36; b2++) {
        if (inRanges(b2 * 10 + 5, c2.h)) hs2 += prof[b2];
      }
      var sMid = (c2.s[0] + c2.s[1]) / 2;
      var sWidth = Math.max(0.12, (c2.s[1] - c2.s[0]) / 2);
      var sScore = Math.max(0, 1 - Math.abs(hs - sMid) / (sWidth * 1.7));
      var vMid = (c2.v[0] + c2.v[1]) / 2;
      var vWidth = Math.max(0.14, (c2.v[1] - c2.v[0]) / 2);
      var vScore = Math.max(0, 1 - Math.abs(vt - vMid) / (vWidth * 1.6));
      var spMid = (c2.sp[0] + c2.sp[1]) / 2;
      var spWidth = Math.max(2.2, (c2.sp[1] - c2.sp[0]) / 2);
      var spScore = Math.max(0, 1 - Math.abs(spread - spMid) / (spWidth * 1.5));
      var score = (hs2 * 0.48 + sScore * 0.16 + vScore * 0.14 + spScore * 0.22) * (c2.w || 1);
      return { c: c2, score: score };
    }).sort(function (a, b3) { return b3.score - a.score; });

    var top = scored[0];
    var sum = scored.slice(0, 4).reduce(function (t, o) { return t + o.score; }, 0) || 1;
    var conf = Math.max(0.32, Math.min(0.96, top.score / sum * 1.45));

    return {
      cls: top.c.id,
      name: top.c.name,
      tag: top.c.tag,
      luck: top.c.luck,
      msg: top.c.msg,
      conf: conf,
      spread: spread,
      alts: scored.slice(1, 4).map(function (o) { return { id: o.c.id, name: o.c.name, tag: o.c.tag, luck: o.c.luck, msg: o.c.msg, cls: o.c.id }; })
    };
  }

  /* ---------------------------------------------------------- 存档 */

  function readBook() {
    try {
      var raw = localStorage.getItem(BOOK_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function writeBook(arr) {
    try { localStorage.setItem(BOOK_KEY, JSON.stringify(arr.slice(0, BOOK_MAX))); } catch (e) {}
  }

  /* ---------------------------------------------------------- 样式注入 */
  /* 样式写在 offer-cam.css，这里只保证万一没加载时有最简可用形态 */

  /* ---------------------------------------------------------- 主流程 */

  function open(opts) {
    opts = opts || {};
    if (root) close();
    state = {
      stage: 'cam',
      stream: null,
      photo: null,
      painted: null,
      plate: null,
      info: null,
      onDone: opts.onDone || null,
      samples: opts.samples || null,
      scanMs: opts.scanMs || 0
    };

    root = el('div', 'ocam');
    root.innerHTML =
      '<div class="ocam__shade"></div>' +

      /* 取景 */
      '<div class="ocam__cam" data-stage="cam">' +
        '<video class="ocam__video" playsinline autoplay muted></video>' +
        '<div class="ocam__reticle">' +
          '<div class="ocam__disc"></div>' +
          '<div class="ocam__guide" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.3">' +
              '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1-1.6A1 1 0 0 1 9.5 4h5a1 1 0 0 1 .8.4L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"/>' +
              '<circle cx="12" cy="12.2" r="3.4"/>' +
            '</svg>' +
            '<p>盘里还空着</p>' +
          '</div>' +
          '<span class="ocam__cross ocam__cross--v"></span>' +
          '<span class="ocam__cross ocam__cross--h"></span>' +
        '</div>' +
        '<p class="ocam__tip" id="ocamTip">把要供的东西放进盘里</p>' +
        '<div class="ocam__bar">' +
          '<button class="ocam__album" type="button" id="ocamAlbum" aria-label="从相册选">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-4 4 3 3-2 4 3"/></svg>' +
          '</button>' +
          '<button class="ocam__shutter" type="button" id="ocamShutter" aria-label="拍下"><i></i></button>' +
          '<button class="ocam__x" type="button" id="ocamCancel" aria-label="取消">×</button>' +
        '</div>' +
        '<input class="ocam__file" type="file" accept="image/*" capture="environment" id="ocamFileCam">' +
        '<input class="ocam__file" type="file" accept="image/*" id="ocamFileGal">' +
      '</div>' +

      /* 描形 */
      '<div class="ocam__scan" data-stage="scan" hidden>' +
        '<div class="ocam__scan-stage">' +
          '<canvas class="ocam__raw" width="400" height="400"></canvas>' +
          '<canvas class="ocam__art" width="400" height="400"></canvas>' +
          '<span class="ocam__sweep"></span>' +
        '</div>' +
        '<p class="ocam__stage-txt" id="ocamStageTxt">正在辨形</p>' +
        '<p class="ocam__pct"><b id="ocamPct">0</b>%</p>' +
      '</div>' +

      /* 结果 */
      '<div class="ocam__result" data-stage="result" hidden>' +
        '<div class="ocam__plate" id="ocamPlate"></div>' +
        '<div class="ocam__meta">' +
          '<p class="ocam__kicker">辨作 <span id="ocamTag">时令鲜果</span> · 供于统天殿</p>' +
          '<h3 class="ocam__name" id="ocamName">鲜果</h3>' +
          '<p class="ocam__luck">祈 <b id="ocamLuck">平安</b></p>' +
          '<p class="ocam__msg" id="ocamMsg">果香盈案，愿四时平安。</p>' +
          '<p class="ocam__alts-label">不像？换作</p>' +
          '<div class="ocam__alts" id="ocamAlts"></div>' +
        '</div>' +
        '<div class="ocam__actions">' +
          '<button class="ocam__act ocam__act--ghost" type="button" id="ocamRetake">重拍</button>' +
          '<button class="ocam__act" type="button" id="ocamOffer">供上</button>' +
        '</div>' +
      '</div>' +

      '<p class="ocam__privacy">照片只在本机处理，不会上传</p>';

    document.body.appendChild(root);
    bind(opts);
    return root;
  }

  function q(sel) { return root ? root.querySelector(sel) : null; }

  function opts_scanMs() {
    return (state && state.scanMs) || 1500;
  }

  function goStage(name) {
    if (!root) return;
    state.stage = name;
    ['cam', 'scan', 'result'].forEach(function (s) {
      var n = root.querySelector('[data-stage="' + s + '"]');
      if (n) n.hidden = s !== name;
    });
    root.setAttribute('data-stage', name);
  }

  function bind(opts) {
    var video = q('.ocam__video');
    var fileCam = q('#ocamFileCam');
    var fileGal = q('#ocamFileGal');
    var shutter = q('#ocamShutter');
    var album = q('#ocamAlbum');
    var cancel = q('#ocamCancel');

    function takeFrom(input) {
      var f = input.files && input.files[0];
      if (!f) return;
      loadImageFromFile(f).then(onPhoto).catch(function () { tip('这张读不出来，换一张试试'); });
      input.value = '';
    }
    fileCam.addEventListener('change', function () { takeFrom(fileCam); });
    fileGal.addEventListener('change', function () { takeFrom(fileGal); });

    cancel.addEventListener('click', close);
    album.addEventListener('click', function () { fileGal.click(); });
    shutter.addEventListener('click', function () {
      var track = state.stream && state.stream.getVideoTracks()[0];
      if (!track || track.readyState !== 'live') { fileCam.click(); return; }
      var w = video.videoWidth, h = video.videoHeight;
      if (!w || !h) { fileCam.click(); return; }
      var size = Math.min(w, h);
      var c = el('canvas');
      c.width = c.height = 720;
      var x = c.getContext('2d');
      x.drawImage(video, (w - size) / 2, (h - size) / 2, size, size, 0, 0, 720, 720);
      stopStream();
      onPhoto(c);
    });

    /* 相机：优先实时取景；不可用时自动退到系统相机/相册 */
    if (opts.samples && opts.samples.length) {
      /* 演示态：跳过相机，直接用样张 */
      loadSample(opts.samples[0]);
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camUnavailable();
      return;
    }
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }
    }).then(function (stream) {
      state.stream = stream;
      video.srcObject = stream;
      video.play().catch(function () {});
      var track = stream.getVideoTracks && stream.getVideoTracks()[0];
      var st = track && track.getSettings ? track.getSettings() : {};
      root.classList.toggle('is-portrait-cam', (st.width || 1) < (st.height || 1));
      root.classList.add('is-live');
    }).catch(camUnavailable);
  }

  function camUnavailable() {
    if (!root) return;
    root.classList.add('is-nocam');
    root.classList.remove('is-live');
    var t = q('#ocamTip');
    if (t) t.textContent = '相机打不开 · 点快门用系统相机拍';
  }

  function tip(msg) {
    var t = q('#ocamTip');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-warn');
    setTimeout(function () { t.classList.remove('is-warn'); }, 1800);
  }

  function loadSample(src) {
    var im = new Image();
    im.onload = function () { onPhoto(im); };
    im.onerror = function () { tip('样张加载失败'); };
    im.src = src;
  }

  function stopStream() {
    if (state && state.stream) {
      state.stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
      state.stream = null;
    }
    if (root) root.classList.remove('is-live');
  }

  /* 拿到照片 -> 开始描形 */
  function onPhoto(img) {
    if (!root) return;
    stopStream();
    state.photo = img;
    goStage('scan');

    var raw = q('.ocam__raw');
    var art = q('.ocam__art');
    var rx = raw.getContext('2d');
    var box = squareBox(img);
    rx.save();
    rx.beginPath();
    rx.arc(200, 200, 200, 0, Math.PI * 2);
    rx.clip();
    rx.drawImage(img, box[0], box[1], box[2], box[2], 0, 0, 400, 400);
    rx.restore();

    /* 先算好淡彩（约 30–60ms），再用 clip 逐行揭示，模拟"描"的过程 */
    var painted = paintedDisc(img);
    state.painted = painted;
    state.info = classify(img);

    var ax = art.getContext('2d');
    ax.clearRect(0, 0, 400, 400);

    var dur = opts_scanMs();
    /* 演示/极速模式：不做逐行描形，直接成形 */
    if (dur <= 80) {
      ax.drawImage(painted, 0, 0);
      showResult();
      return;
    }

    var t0 = performance.now();

    function frame(now) {
      if (!root || state.stage !== 'scan') return;
      var p = Math.min(1, (now - t0) / dur);
      var eased = p < 0.15 ? p / 0.15 * 0.10 : 0.10 + (p - 0.15) / 0.85 * 0.90;
      var y = Math.round(eased * 400);
      ax.clearRect(0, 0, 400, 400);
      ax.save();
      ax.beginPath();
      ax.rect(0, 0, 400, y);
      ax.clip();
      ax.drawImage(painted, 0, 0);
      ax.restore();

      var sweep = q('.ocam__sweep');
      if (sweep) sweep.style.transform = 'translateY(' + y + 'px)';
      var pct = q('#ocamPct');
      if (pct) pct.textContent = Math.round(p * 100);
      var txt = q('#ocamStageTxt');
      if (txt) {
        txt.textContent = p < 0.34 ? '正在辨形' : p < 0.80 ? '描作供画' : '落款';
      }
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        ax.clearRect(0, 0, 400, 400);
        ax.drawImage(painted, 0, 0);
        setTimeout(showResult, dur < 400 ? 30 : 280);
      }
    }
    requestAnimationFrame(frame);
  }

  /* 成形 -> 结果 */
  function showResult() {
    if (!root || !state.painted) return;
    var plate = plateCanvas(state.painted, 360, 2.3);
    state.plate = plate;

    var holder = q('#ocamPlate');
    holder.innerHTML = '';
    var img = el('img');
    img.alt = '由照片描成的供品画';
    img.src = plate.toDataURL('image/png');
    holder.appendChild(img);
    holder.classList.add('is-in');

    var info = state.info;
    q('#ocamTag').textContent = info.tag;
    q('#ocamName').textContent = info.name;
    q('#ocamLuck').textContent = info.luck;
    q('#ocamMsg').textContent = info.msg;

    var alts = q('#ocamAlts');
    alts.innerHTML = '';
    info.alts.forEach(function (a) {
      var b = el('button', 'ocam__alt', '<span>' + a.name + '</span><em>' + a.luck + '</em>');
      b.type = 'button';
      b.addEventListener('click', function () {
        info.name = a.name; info.tag = a.tag; info.luck = a.luck; info.msg = a.msg; info.cls = a.cls;
        q('#ocamTag').textContent = a.tag;
        q('#ocamName').textContent = a.name;
        q('#ocamLuck').textContent = a.luck;
        q('#ocamMsg').textContent = a.msg;
        alts.querySelectorAll('.ocam__alt').forEach(function (n2) { n2.classList.remove('is-on'); });
        b.classList.add('is-on');
      });
      if (a.cls === info.cls) b.classList.add('is-on');
      alts.appendChild(b);
    });

    goStage('result');

    q('#ocamRetake').onclick = function () {
      state.painted = null;
      state.plate = null;
      startCam();
    };
    q('#ocamOffer').onclick = offer;
  }

  function startCam() {
    if (!root) return;
    goStage('cam');
    var video = q('.ocam__video');
    if (state.stream) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { camUnavailable(); return; }
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } }
    }).then(function (stream) {
      state.stream = stream;
      video.srcObject = stream;
      video.play().catch(function () {});
      root.classList.add('is-live');
    }).catch(camUnavailable);
  }

  /* 供上：写入供品册，回调给场景 */
  function offer() {
    if (!state || !state.plate) return;
    /* 只缓存缩略图：供台上显示尺寸约 110px，220px 足够，且能把整册控制在 150KB 内 */
    var tiny = el('canvas');
    tiny.width = tiny.height = 220;
    tiny.getContext('2d').drawImage(state.plate, 0, 0, 220, 220);

    var item = {
      id: 'my_' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
      name: state.info.name,
      tag: state.info.tag,
      luck: state.info.luck,
      msg: state.info.msg,
      cls: state.info.cls,
      thumb: tiny.toDataURL('image/jpeg', 0.86),
      at: Date.now()
    };

    var book = readBook();
    book.unshift(item);
    writeBook(book);

    var cb = state.onDone;
    close();
    if (cb) cb(item);
  }

  function close() {
    stopStream();
    if (root && root.parentNode) root.parentNode.removeChild(root);
    root = null;
    state = null;
  }

  /* ---------------------------------------------------------- 对外 */
  window.OfferingCam = {
    open: open,
    close: close,
    book: readBook,
    remove: function (id) {
      writeBook(readBook().filter(function (o) { return o.id !== id; }));
    },
    plateFrom: function (dataUrl) {
      return new Promise(function (resolve) {
        var im = new Image();
        im.onload = function () {
          var flat = paintedDisc(im);
          resolve(plateCanvas(flat, 360, 2.3).toDataURL('image/png'));
        };
        im.onerror = function () { resolve(null); };
        im.src = dataUrl;
      });
    }
  };
})();
