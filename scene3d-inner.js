/* ============================================================================
   太昊陵前 · 宋代集市街景（原生 WebGL，无外部依赖）
   纵向长街：两侧店铺是真实几何体，行人是在同一深度缓冲里的广告牌 Sprite。
   左侧布老虎铺、右侧压缩馍铺为可交互店铺；其余为伞铺、花铺、算命、茶汤、
   香烛、泥泥狗。街尾立“往前 · 午朝门”牌坊。
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('glsceneInner');
  if (!canvas) return;
  var viewport = document.getElementById('viewportInner');
  var app = document.getElementById('app');
  var gl = canvas.getContext('webgl', { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl) { canvas.style.display = 'none'; return; }

  /* ---------------------------------- 数学 ---------------------------------- */
  var v3 = {
    sub: function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; },
    add: function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; },
    mul: function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; },
    dot: function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; },
    cross: function (a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; },
    norm: function (a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  };
  function mul4(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function lookAt(eye, target, up) {
    var z = v3.norm(v3.sub(eye, target));
    var x = v3.norm(v3.cross(up, z));
    var y = v3.cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -v3.dot(x, eye), -v3.dot(y, eye), -v3.dot(z, eye), 1]);
  }
  function projectPoint(vp, p) {
    var cx = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12];
    var cy = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13];
    var cw = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
    if (cw <= 0.001) return null;
    return [cx / cw, cy / cw];
  }

  /* --------------------------------- Shader --------------------------------- */
  var VS = [
    'attribute vec3 aPos;',
    'attribute vec2 aUV;',
    'uniform mat4 uModel, uView, uProj;',
    'uniform vec2 uUVScale;',
    'varying vec2 vUV;',
    'varying vec3 vWorld;',
    'void main() {',
    '  vec4 world = uModel * vec4(aPos, 1.0);',
    '  vWorld = world.xyz;',
    '  vUV = aUV * uUVScale;',
    '  gl_Position = uProj * uView * world;',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'uniform sampler2D uTex;',
    'uniform vec4 uColor;',
    'uniform vec3 uFogColor, uCamPos;',
    'uniform float uFogNear, uFogFar;',
    'varying vec2 vUV;',
    'varying vec3 vWorld;',
    'void main() {',
    '  vec4 t = texture2D(uTex, vUV);',
    '  vec4 c = t * uColor;',
    '  if (c.a < 0.03) discard;',
    '  float dist = length(vWorld - uCamPos);',
    '  float fog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);',
    '  c.rgb = mix(c.rgb, uFogColor, fog * 0.82);',
    '  gl_FragColor = c;',
    '}'
  ].join('\n');
  function compile(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var prog = gl.createProgram();
  var vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);
  var A = { pos: gl.getAttribLocation(prog, 'aPos'), uv: gl.getAttribLocation(prog, 'aUV') };
  var U = {};
  ['uModel', 'uView', 'uProj', 'uUVScale', 'uTex', 'uColor', 'uFogColor', 'uCamPos', 'uFogNear', 'uFogFar'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0, 0, 1, 0.5, -0.5, 0, 1, 1, 0.5, 0.5, 0, 1, 0, -0.5, 0.5, 0, 0, 0]), gl.STATIC_DRAW);
  var idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

  /* --------------------------------- 纹理工具 -------------------------------- */
  var FONT = '"Kaiti SC","STKaiti","KaiTi","Songti SC","SimSun",serif';
  function makeTex() {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var white = makeTex();
  function uploadSource(t, src, repeat) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  }
  function texFromCanvas(cv, repeat) {
    var t = makeTex();
    uploadSource(t, cv, !!repeat);
    return t;
  }
  function texFromImage(uri) {
    var t = makeTex();
    var img = new Image();
    img.onload = function () { uploadSource(t, img, false); };
    img.src = uri;
    return t;
  }
  function makeCanvas(w, h, draw, repeat) {
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var x = cv.getContext('2d');
    draw(x, w, h);
    return texFromCanvas(cv, !!repeat);
  }
  function rr(x, X, Y, W, H, R) {
    var r = Math.min(R || 0, W / 2, H / 2);
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + W, Y, X + W, Y + H, r);
    x.arcTo(X + W, Y + H, X, Y + H, r);
    x.arcTo(X, Y + H, X, Y, r);
    x.arcTo(X, Y, X + W, Y, r);
    x.closePath();
  }
  function inkLine(x, x1, y1, x2, y2, c, w) {
    x.strokeStyle = c; x.lineWidth = w || 1; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
  }

  /* --------------------------------- 店铺画面 -------------------------------- */
  var PAL = {
    wall: '#2f2419', wall2: '#3b2c1e', wood: '#6e4b32', woodDark: '#3c281b',
    cream: '#efe0c8', paper: '#f4e7d2', red: '#9d4a36', ochre: '#c49a5e',
    ink: '#2e2620', gold: '#c7a05e', green: '#7c8064', stone: '#c5b49c'
  };

  function drawClothTiger(x, cx, cy, s, bodyColor, stripe) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    // 身体
    x.fillStyle = bodyColor; x.strokeStyle = PAL.ink; x.lineWidth = 3;
    x.beginPath(); x.ellipse(0, 18, 34, 30, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    // 头
    x.beginPath(); x.arc(0, -24, 29, 0, Math.PI * 2); x.fill(); x.stroke();
    // 耳朵
    x.beginPath(); x.moveTo(-24, -44); x.lineTo(-32, -64); x.lineTo(-10, -52); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(24, -44); x.lineTo(32, -64); x.lineTo(10, -52); x.closePath(); x.fill(); x.stroke();
    // 腿
    [[-20, 44], [20, 44]].forEach(function (p) {
      x.beginPath(); x.ellipse(p[0], p[1], 12, 10, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    });
    // 尾巴
    x.beginPath(); x.moveTo(32, 20); x.quadraticCurveTo(58, 6, 50, -18); x.lineWidth = 9; x.strokeStyle = bodyColor; x.stroke();
    x.lineWidth = 2; x.strokeStyle = PAL.ink; x.stroke();
    // 条纹
    x.strokeStyle = stripe; x.lineWidth = 4; x.lineCap = 'round';
    [-14, 0, 14].forEach(function (dx) { x.beginPath(); x.moveTo(dx - 6, -2); x.lineTo(dx + 6, 10); x.stroke(); });
    x.beginPath(); x.moveTo(-18, -40); x.lineTo(-4, -30); x.stroke();
    x.beginPath(); x.moveTo(18, -40); x.lineTo(4, -30); x.stroke();
    // 脸
    x.fillStyle = PAL.paper;
    x.beginPath(); x.arc(-10, -28, 6, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(10, -28, 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = PAL.ink;
    x.beginPath(); x.arc(-10, -28, 3, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(10, -28, 3, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(-5, -16); x.lineTo(0, -12); x.lineTo(5, -16); x.closePath(); x.fill();
    // 红项圈
    x.strokeStyle = '#a33a2c'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(-24, -1); x.quadraticCurveTo(0, 8, 24, -1); x.stroke();
    x.restore();
  }
  function drawFlatBread(x, cx, cy, r) {
    x.save(); x.translate(cx, cy);
    x.fillStyle = '#d8b47a'; x.strokeStyle = '#8a6036'; x.lineWidth = 3;
    x.beginPath(); x.ellipse(0, 0, r, r * 0.72, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#e6c894';
    x.beginPath(); x.ellipse(0, -r * 0.1, r * 0.82, r * 0.55, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#a9773f';
    for (var i = 0; i < 12; i++) {
      var a = i / 12 * Math.PI * 2;
      x.beginPath(); x.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.35 - r * 0.1, r * 0.05, 0, Math.PI * 2); x.fill();
    }
    x.strokeStyle = '#b4844c'; x.lineWidth = 2;
    x.beginPath(); x.ellipse(0, -r * 0.1, r * 0.6, r * 0.34, 0, 0, Math.PI * 2); x.stroke();
    x.restore();
  }
  function drawUmbrella(x, cx, cy, r, c1, c2) {
    x.save(); x.translate(cx, cy);
    x.fillStyle = c1; x.strokeStyle = '#5a3a26'; x.lineWidth = 2;
    x.beginPath(); x.arc(0, 0, r, Math.PI, 0); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = c2;
    x.beginPath(); x.moveTo(-r, 0); x.arc(0, 0, r, Math.PI, Math.PI * 1.28); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(r * 0.35, 0); x.arc(0, 0, r, Math.PI * 1.7, Math.PI * 2); x.closePath(); x.fill();
    x.strokeStyle = '#7b4a2d'; x.lineWidth = 2;
    for (var i = 0; i <= 6; i++) {
      var a = Math.PI + i / 6 * Math.PI;
      x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * r, Math.sin(a) * r); x.stroke();
    }
    x.strokeStyle = '#5a3a26'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0, r * 0.95); x.stroke();
    x.restore();
  }
  function drawFlowerBasket(x, cx, cy, s) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    x.fillStyle = '#8a5a38'; x.strokeStyle = '#4a3020'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(-32, 0); x.lineTo(32, 0); x.lineTo(24, 34); x.lineTo(-24, 34); x.closePath(); x.fill(); x.stroke();
    var cols = ['#b75a5a', '#e0b07a', '#c98a9a', '#e8d2b0'];
    for (var i = 0; i < 7; i++) {
      var a = i / 7 * Math.PI * 2;
      x.fillStyle = cols[i % cols.length];
      x.beginPath(); x.arc(Math.cos(a) * 18, -8 + Math.sin(a) * 8, 10, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#6f7a52'; x.beginPath(); x.arc(0, -8, 6, 0, Math.PI * 2); x.fill();
    x.restore();
  }
  function drawKeeper(x, cx, cy, s, robe, hat) {
    x.save(); x.translate(cx, cy); x.scale(s, s);
    x.fillStyle = robe; x.strokeStyle = PAL.ink; x.lineWidth = 2;
    x.beginPath(); x.moveTo(-34, 96); x.quadraticCurveTo(-40, 20, -18, 2); x.lineTo(18, 2); x.quadraticCurveTo(40, 20, 34, 96); x.closePath(); x.fill(); x.stroke();
    // 交领
    x.fillStyle = PAL.cream;
    x.beginPath(); x.moveTo(-18, 2); x.lineTo(0, 44); x.lineTo(18, 2); x.lineTo(8, -2); x.lineTo(0, 16); x.lineTo(-8, -2); x.closePath(); x.fill();
    // 袖
    x.fillStyle = robe;
    x.beginPath(); x.moveTo(-24, 22); x.quadraticCurveTo(-64, 50, -48, 86); x.lineTo(-30, 80); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(24, 22); x.quadraticCurveTo(64, 50, 48, 86); x.lineTo(30, 80); x.closePath(); x.fill(); x.stroke();
    // 头
    x.fillStyle = '#e6c49e';
    x.beginPath(); x.arc(0, -22, 26, 0, Math.PI * 2); x.fill(); x.stroke();
    // 头发/帽
    x.fillStyle = PAL.ink;
    x.beginPath(); x.arc(0, -32, 27, Math.PI * 1.02, Math.PI * 1.98); x.closePath(); x.fill();
    if (hat === 'futou') { x.fillRect(-28, -48, 56, 16); x.fillRect(-36, -44, 8, 10); x.fillRect(28, -44, 8, 10); }
    if (hat === 'scholar') { x.fillRect(-20, -66, 40, 24); x.fillRect(-28, -44, 56, 8); }
    // 脸
    x.strokeStyle = PAL.ink; x.lineWidth = 2;
    x.beginPath(); x.arc(-9, -24, 2, 0, Math.PI * 2); x.fillStyle = PAL.ink; x.fill();
    x.beginPath(); x.arc(9, -24, 2, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(-7, -12); x.quadraticCurveTo(0, -7, 7, -12); x.stroke();
    // 围裙
    x.fillStyle = 'rgba(240,226,204,.85)';
    x.beginPath(); x.moveTo(-26, 44); x.lineTo(26, 44); x.lineTo(22, 96); x.lineTo(-22, 96); x.closePath(); x.fill();
    x.restore();
  }

  function shopFront(kind) {
    return makeCanvas(640, 512, function (x, w, h) {
      // 木墙
      x.fillStyle = PAL.wall; x.fillRect(0, 0, w, h);
      var g = x.createRadialGradient(w * 0.55, h * 0.35, 30, w * 0.55, h * 0.45, w * 0.8);
      g.addColorStop(0, 'rgba(255,214,150,.26)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      // 竖向木柱
      for (var i = 0; i < 6; i++) {
        x.fillStyle = i % 2 ? 'rgba(90,60,40,.5)' : 'rgba(60,40,28,.45)';
        x.fillRect(i * 110, 0, 24, h);
        inkLine(x, i * 110 + 24, 0, i * 110 + 24, h, 'rgba(30,20,14,.55)', 3);
      }
      // 格窗
      x.strokeStyle = 'rgba(230,205,168,.38)'; x.lineWidth = 3;
      for (var gx = 0; gx < 4; gx++) for (var gy = 0; gy < 2; gy++) {
        x.strokeRect(34 + gx * 146, 22 + gy * 84, 126, 70);
        inkLine(x, 34 + gx * 146 + 63, 22 + gy * 84, 34 + gx * 146 + 63, 22 + gy * 84 + 70, 'rgba(230,205,168,.22)', 2);
      }
      // 柜台
      x.fillStyle = PAL.woodDark; x.fillRect(0, h - 84, w, 84);
      x.fillStyle = PAL.wood; x.fillRect(0, h - 90, w, 18);
      inkLine(x, 0, h - 72, w, h - 72, 'rgba(20,12,8,.55)', 3);
      // 后架
      x.fillStyle = 'rgba(46,32,22,.8)'; x.fillRect(36, 190, w - 72, 10);
      x.fillRect(36, 300, w - 72, 10);
      // 店里的人
      var keeperRobe = kind === 'sachet' ? '#7a5a6e' : kind === 'sugar' ? '#8a6a44' : kind === 'flower' ? '#7a5a5e' : '#5e6a58';
      drawKeeper(x, w * 0.56, h - 92, 0.9, keeperRobe, kind === 'fortune' ? 'scholar' : 'futou');

      // 各店货品
      if (kind === 'tiger') {
        drawClothTiger(x, 100, 250, 1.05, '#c98a4a', '#8a4a2a');
        drawClothTiger(x, 212, 266, 0.9, '#b75a4a', '#6e2d24');
        drawClothTiger(x, 398, 258, 0.85, '#d8b47a', '#8a6036');
        drawClothTiger(x, 520, 272, 0.95, '#c98a4a', '#8a4a2a');
        // 布卷
        for (var b = 0; b < 5; b++) {
          x.fillStyle = ['#b75a4a', '#d8b47a', '#7c8064', '#6e7b8a', '#c49a5e'][b];
          rr(x, 40 + b * 32, 320, 24, 74, 10); x.fill();
          inkLine(x, 40 + b * 32, 330, 64 + b * 32, 330, 'rgba(30,20,14,.3)', 2);
        }
      } else if (kind === 'bun') {
        // 竹筐与压缩馍
        for (var k = 0; k < 3; k++) {
          var bx = 90 + k * 170;
          x.fillStyle = '#a97a46'; x.strokeStyle = '#5e3e24'; x.lineWidth = 3;
          x.beginPath(); x.ellipse(bx, 286, 66, 24, 0, 0, Math.PI * 2); x.fill(); x.stroke();
          x.fillStyle = '#c79a5e'; x.beginPath(); x.ellipse(bx, 280, 58, 18, 0, 0, Math.PI * 2); x.fill();
          for (var q = 0; q < 4; q++) drawFlatBread(x, bx - 26 + (q % 2) * 42, 248 - Math.floor(q / 2) * 18, 26);
        }
        // 蒸汽
        x.strokeStyle = 'rgba(245,235,215,.35)'; x.lineWidth = 4;
        for (var s = 0; s < 3; s++) { x.beginPath(); x.moveTo(120 + s * 160, 220); x.bezierCurveTo(100 + s * 160, 190, 150 + s * 160, 170, 130 + s * 160, 140); x.stroke(); }
      } else if (kind === 'umbrella') {
        drawUmbrella(x, 120, 246, 78, '#b75a4a', '#e8d2b0');
        drawUmbrella(x, 290, 232, 68, '#d8b47a', '#f0e2cc');
        drawUmbrella(x, 450, 252, 72, '#6e7b8a', '#e8d2b0');
        drawUmbrella(x, 560, 240, 52, '#b75a4a', '#f0e2cc');
      } else if (kind === 'flower') {
        drawFlowerBasket(x, 120, 300, 1.2);
        drawFlowerBasket(x, 290, 310, 1.1);
        drawFlowerBasket(x, 460, 300, 1.2);
        drawFlowerBasket(x, 580, 312, 0.9);
      } else if (kind === 'fortune') {
        // 算命摊：桌、签、八卦、幌子
        x.fillStyle = '#5a3a28'; x.fillRect(110, 300, 420, 22);
        x.fillStyle = '#6e4b32'; x.fillRect(120, 322, 20, 90); x.fillRect(500, 322, 20, 90);
        x.fillStyle = PAL.paper; x.fillRect(140, 250, 120, 58);
        x.fillStyle = '#8a3a2c'; x.font = 'bold 40px ' + FONT; x.textAlign = 'center'; x.fillText('卜', 200, 292);
        x.strokeStyle = '#3e2b20'; x.lineWidth = 3;
        x.beginPath(); x.arc(400, 270, 42, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.arc(400, 270, 22, 0, Math.PI * 2); x.stroke();
        x.beginPath(); x.moveTo(400, 228); x.lineTo(400, 312); x.moveTo(358, 270); x.lineTo(442, 270); x.stroke();
        // 签筒
        x.fillStyle = '#8a5a38'; x.fillRect(330, 260, 40, 44);
        for (var t = 0; t < 5; t++) { x.strokeStyle = '#d8b47a'; x.lineWidth = 4; x.beginPath(); x.moveTo(336 + t * 7, 262); x.lineTo(332 + t * 9, 240); x.stroke(); }
      } else if (kind === 'tea') {
        // 茶汤：铜壶、碗、热气
        for (var u = 0; u < 3; u++) {
          x.fillStyle = '#8a6a44'; x.beginPath(); x.ellipse(140 + u * 150, 300, 46, 18, 0, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#d8b47a'; x.beginPath(); x.ellipse(140 + u * 150, 294, 36, 12, 0, 0, Math.PI * 2); x.fill();
        }
        x.fillStyle = '#8a6a44'; x.fillRect(430, 220, 70, 60);
        x.fillStyle = '#6e4b32'; x.fillRect(446, 200, 38, 26);
        x.strokeStyle = '#6e4b32'; x.lineWidth = 8; x.beginPath(); x.arc(500, 246, 22, -Math.PI / 2, Math.PI / 2); x.stroke();
      } else if (kind === 'incense') {
        for (var c = 0; c < 3; c++) {
          x.fillStyle = '#a33a2c'; x.fillRect(110 + c * 110, 236, 30, 110);
          x.fillStyle = '#d8b47a'; x.fillRect(118 + c * 110, 226, 14, 14);
          x.fillStyle = '#f0d9a4'; x.beginPath(); x.ellipse(125 + c * 110, 220, 8, 14, 0, 0, Math.PI * 2); x.fill();
        }
        x.fillStyle = '#8a5a38'; x.fillRect(440, 280, 120, 60);
        for (var i2 = 0; i2 < 9; i2++) {
          x.strokeStyle = '#7a5a3a'; x.lineWidth = 3; x.beginPath(); x.moveTo(452 + i2 * 12, 286); x.lineTo(448 + i2 * 12, 210); x.stroke();
        }
      } else if (kind === 'clay') {
        for (var d = 0; d < 4; d++) {
          var cx = 100 + d * 145;
          x.fillStyle = '#2e2620'; x.strokeStyle = '#1a1512'; x.lineWidth = 3;
          x.beginPath(); x.ellipse(cx, 280, 34, 28, 0, 0, Math.PI * 2); x.fill(); x.stroke();
          x.beginPath(); x.arc(cx, 244, 22, 0, Math.PI * 2); x.fill(); x.stroke();
          x.fillStyle = ['#c7a05e', '#a33a2c', '#7c8064'][d % 3];
          x.beginPath(); x.arc(cx - 8, 242, 3, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(cx + 8, 242, 3, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(cx, 282, 4, 0, Math.PI * 2); x.fill();
        }
      } else if (kind === 'sachet') {
        // 香囊：横杆 + 一排小香囊 + 流苏
        x.strokeStyle = '#5a3a28'; x.lineWidth = 6;
        x.beginPath(); x.moveTo(70, 210); x.lineTo(w - 70, 210); x.stroke();
        for (var sc = 0; sc < 5; sc++) {
          var sx = 110 + sc * 100;
          x.strokeStyle = '#7a5a3a'; x.lineWidth = 2;
          x.beginPath(); x.moveTo(sx, 210); x.lineTo(sx, 232); x.stroke();
          x.fillStyle = ['#7c8064', '#a33a2c', '#c7a05e', '#7a5a6e', '#6e7b8a'][sc];
          x.strokeStyle = '#4e3a2a'; x.lineWidth = 2;
          x.beginPath(); x.ellipse(sx, 258, 28, 34, 0, 0, Math.PI * 2); x.fill(); x.stroke();
          x.strokeStyle = 'rgba(244,231,210,.65)'; x.lineWidth = 2;
          x.beginPath(); x.moveTo(sx - 12, 240); x.quadraticCurveTo(sx, 250, sx + 12, 240); x.stroke();
          x.strokeStyle = '#c7a05e'; x.lineWidth = 3;
          for (var ts = 0; ts < 3; ts++) { x.beginPath(); x.moveTo(sx - 8 + ts * 8, 292); x.lineTo(sx - 8 + ts * 8, 310); x.stroke(); }
          x.fillStyle = '#b75a4a'; x.beginPath(); x.arc(sx, 260, 5, 0, Math.PI * 2); x.fill();
        }
      } else if (kind === 'sugar') {
        // 泥泥狗：后货架一排 + 前桌一排
        x.fillStyle = '#5a3a28'; x.fillRect(80, 206, 500, 12);
        x.fillRect(80, 254, 500, 10);
        x.fillStyle = '#8a5a38'; x.fillRect(80, 300, 500, 26);
        var dogCols = ['#2b2320', '#8e3a2a', '#c9973e', '#3d5a6e'];
        for (var i = 0; i < 7; i++) {
          var dx = 112 + i * 66, dy = 178;
          x.fillStyle = dogCols[i % 4]; x.strokeStyle = '#3a2418'; x.lineWidth = 2;
          x.beginPath(); x.ellipse(dx, dy + 18, 17, 14, 0, 0, Math.PI * 2); x.fill(); x.stroke();
          x.beginPath(); x.moveTo(dx - 12, dy + 8); x.lineTo(dx - 20, dy - 12); x.lineTo(dx - 2, dy + 2); x.closePath(); x.fill(); x.stroke();
          x.beginPath(); x.moveTo(dx + 12, dy + 8); x.lineTo(dx + 20, dy - 12); x.lineTo(dx + 2, dy + 2); x.closePath(); x.fill(); x.stroke();
          x.fillStyle = '#f6e7c8'; x.beginPath(); x.arc(dx - 6, dy + 16, 3.5, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(dx + 6, dy + 16, 3.5, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#3a2418'; x.beginPath(); x.arc(dx - 6, dy + 16, 1.6, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(dx + 6, dy + 16, 1.6, 0, Math.PI * 2); x.fill();
          x.strokeStyle = '#e3b54a'; x.lineWidth = 2;
          x.beginPath(); x.moveTo(dx - 16, dy + 26); x.lineTo(dx + 16, dy + 26); x.stroke();
        }
        for (var k = 0; k < 3; k++) {
          var tx = 180 + k * 150, ty = 262;
          x.fillStyle = dogCols[(k + 1) % 4]; x.strokeStyle = '#3a2418'; x.lineWidth = 3;
          x.beginPath(); x.ellipse(tx, ty + 24, 30, 25, 0, 0, Math.PI * 2); x.fill(); x.stroke();
          x.beginPath(); x.moveTo(tx - 22, ty + 10); x.lineTo(tx - 36, ty - 20); x.lineTo(tx - 4, ty + 2); x.closePath(); x.fill(); x.stroke();
          x.beginPath(); x.moveTo(tx + 22, ty + 10); x.lineTo(tx + 36, ty - 20); x.lineTo(tx + 4, ty + 2); x.closePath(); x.fill(); x.stroke();
          x.fillStyle = '#f6e7c8'; x.beginPath(); x.arc(tx - 10, ty + 20, 6, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(tx + 10, ty + 20, 6, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#3a2418'; x.beginPath(); x.arc(tx - 10, ty + 20, 2.8, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(tx + 10, ty + 20, 2.8, 0, Math.PI * 2); x.fill();
          x.strokeStyle = '#e3b54a'; x.lineWidth = 3;
          x.beginPath(); x.moveTo(tx - 4, ty + 34); x.lineTo(tx + 4, ty + 34); x.stroke();
          x.beginPath(); x.moveTo(tx - 24, ty + 44); x.lineTo(tx + 24, ty + 44); x.stroke();
        }
        x.fillStyle = '#6b4326'; x.fillRect(300, 312, 130, 24);
        x.fillStyle = '#f6e7c8'; x.font = '16px ' + FONT; x.textAlign = 'center'; x.fillText('泥泥狗', 365, 329);
      }
      // 前景微暗
      var vg = x.createLinearGradient(0, h - 120, 0, h);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)');
      x.fillStyle = vg; x.fillRect(0, h - 120, w, 120);
    }, false);
  }

  function signTex(name, accent, interactive) {
    return makeCanvas(512, 160, function (x, w, h) {
      x.fillStyle = PAL.paper; x.fillRect(0, 0, w, h);
      x.strokeStyle = accent; x.lineWidth = 10; x.strokeRect(8, 8, w - 16, h - 16);
      x.strokeStyle = 'rgba(60,40,26,.22)'; x.lineWidth = 2; x.strokeRect(20, 20, w - 40, h - 40);
      x.fillStyle = accent;
      x.font = 'bold 64px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(name, w / 2 - (interactive ? 26 : 0), h / 2 + 4);
      if (interactive) {
        x.fillStyle = '#9d3a2c'; x.beginPath(); x.arc(w - 62, h / 2, 28, 0, Math.PI * 2); x.fill();
        x.fillStyle = PAL.paper; x.font = 'bold 20px ' + FONT; x.fillText('可进', w - 62, h / 2 + 2);
      }
    }, false);
  }
  function awningTex(accent) {
    return makeCanvas(256, 128, function (x, w, h) {
      for (var i = 0; i < 8; i++) {
        x.fillStyle = i % 2 ? PAL.cream : accent;
        x.fillRect(i * 32, 0, 32, h);
      }
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,235,200,.12)'); g.addColorStop(.6, 'rgba(0,0,0,.08)'); g.addColorStop(1, 'rgba(0,0,0,.3)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, false);
  }
  function roofTex() {
    return makeCanvas(512, 512, function (x, w, h) {
      x.fillStyle = '#7c7467'; x.fillRect(0, 0, w, h);
      for (var row = 0; row < 10; row++) {
        var y = row * 52;
        for (var col = 0; col < 10; col++) {
          var px = col * 54 + (row % 2) * 27;
          x.strokeStyle = 'rgba(50,45,38,.55)'; x.lineWidth = 3;
          x.beginPath(); x.arc(px, y + 30, 26, Math.PI, 0); x.stroke();
          x.fillStyle = 'rgba(150,142,128,.18)';
          x.beginPath(); x.arc(px, y + 30, 24, Math.PI, 0); x.fill();
        }
        inkLine(x, 0, y + 4, w, y + 4, 'rgba(45,40,34,.5)', 3);
      }
      for (var i = 0; i < 30; i++) {
        x.strokeStyle = 'rgba(50,60,45,.18)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(Math.random() * w, Math.random() * h); x.lineTo(Math.random() * w, Math.random() * h); x.stroke();
      }
    }, true);
  }
  function groundTex() {
    return makeCanvas(1024, 1024, function (x, w, h) {
      x.fillStyle = '#b9a78e'; x.fillRect(0, 0, w, h);
      var rows = 5, cols = 4, sh = h / rows, sw = w / cols;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var off = (r % 2) * sw * 0.5;
          var px = c * sw + off - sw * 0.25, py = r * sh;
          var tone = 196 + ((r * 7 + c * 11) % 26);
          x.fillStyle = 'rgb(' + tone + ',' + (tone - 22) + ',' + (tone - 46) + ')';
          x.fillRect(px + 3, py + 3, sw - 6, sh - 6);
          x.strokeStyle = 'rgba(92,74,54,.55)'; x.lineWidth = 4;
          x.strokeRect(px + 3, py + 3, sw - 6, sh - 6);
          x.strokeStyle = 'rgba(240,225,200,.18)'; x.lineWidth = 2;
          x.strokeRect(px + 12, py + 12, sw - 24, sh - 24);
          // 石纹
          x.strokeStyle = 'rgba(100,84,64,.28)'; x.lineWidth = 2;
          x.beginPath(); x.moveTo(px + 18, py + sh * 0.4); x.lineTo(px + sw * 0.55, py + sh * 0.55); x.lineTo(px + sw - 20, py + sh * 0.4); x.stroke();
        }
      }
      // 青苔/磨损
      for (var i = 0; i < 90; i++) {
        x.fillStyle = 'rgba(' + (90 + Math.random() * 30) + ',' + (100 + Math.random() * 30) + ',' + (70 + Math.random() * 20) + ',' + (0.05 + Math.random() * 0.12) + ')';
        x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 18, 0, Math.PI * 2); x.fill();
      }
    }, true);
  }
  function backdropTex() {
    return makeCanvas(1600, 900, function (x, w, h) {
      var sky = x.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#f2e5cf'); sky.addColorStop(.55, '#e7d2b4'); sky.addColorStop(1, '#cfb99d');
      x.fillStyle = sky; x.fillRect(0, 0, w, h);
      // 日轮
      var sun = x.createRadialGradient(w * 0.72, h * 0.18, 10, w * 0.72, h * 0.18, 150);
      sun.addColorStop(0, 'rgba(255,247,224,.95)'); sun.addColorStop(.4, 'rgba(246,214,160,.55)'); sun.addColorStop(1, 'rgba(246,214,160,0)');
      x.fillStyle = sun; x.fillRect(w * 0.45, 0, w * 0.55, h * 0.45);
      // 远山
      x.fillStyle = 'rgba(150,146,124,.55)';
      x.beginPath(); x.moveTo(0, 520); x.quadraticCurveTo(220, 380, 430, 500); x.quadraticCurveTo(640, 330, 900, 500); x.quadraticCurveTo(1120, 390, 1600, 510); x.lineTo(1600, 700); x.lineTo(0, 700); x.closePath(); x.fill();
      x.fillStyle = 'rgba(120,118,100,.45)';
      x.beginPath(); x.moveTo(0, 570); x.quadraticCurveTo(280, 470, 520, 560); x.quadraticCurveTo(820, 450, 1100, 570); x.quadraticCurveTo(1360, 500, 1600, 580); x.lineTo(1600, 760); x.lineTo(0, 760); x.closePath(); x.fill();
      // 远处城墙与屋脊
      x.fillStyle = 'rgba(90,72,54,.62)'; x.fillRect(250, 560, 1100, 120);
      for (var i = 0; i < 7; i++) {
        var bx = 300 + i * 150;
        x.fillStyle = 'rgba(80,62,46,.75)';
        x.beginPath(); x.moveTo(bx - 54, 560); x.quadraticCurveTo(bx, 510, bx + 54, 560); x.closePath(); x.fill();
        x.fillStyle = 'rgba(110,90,68,.9)'; x.fillRect(bx - 48, 560, 96, 40);
      }
      // 城门/牌楼剪影
      x.fillStyle = 'rgba(70,54,40,.82)';
      x.fillRect(730, 470, 30, 190); x.fillRect(840, 470, 30, 190);
      x.fillRect(700, 500, 200, 22);
      x.beginPath(); x.moveTo(690, 500); x.quadraticCurveTo(800, 440, 910, 500); x.closePath(); x.fill();
      x.fillStyle = 'rgba(160,92,60,.65)'; x.fillRect(760, 520, 80, 34);
      // 柳树
      for (var t = 0; t < 4; t++) {
        var tx = 90 + t * 460, ty = 640;
        x.strokeStyle = 'rgba(78,64,46,.55)'; x.lineWidth = 10;
        x.beginPath(); x.moveTo(tx, ty); x.quadraticCurveTo(tx + 6, ty - 70, tx - 10, ty - 120); x.stroke();
        x.strokeStyle = 'rgba(110,122,86,.45)'; x.lineWidth = 4;
        for (var b = 0; b < 6; b++) { x.beginPath(); x.moveTo(tx - 10, ty - 110); x.quadraticCurveTo(tx - 60 - b * 8, ty - 80, tx - 40 - b * 10, ty - 20 + b * 8); x.stroke(); }
      }
      // 飞鸟
      x.strokeStyle = 'rgba(80,64,48,.45)'; x.lineWidth = 2;
      for (var bird = 0; bird < 6; bird++) {
        var bx2 = 200 + bird * 210, by2 = 160 + (bird % 3) * 40;
        x.beginPath(); x.moveTo(bx2 - 10, by2); x.quadraticCurveTo(bx2, by2 - 8, bx2 + 10, by2); x.stroke();
      }
      // 底下一条暖雾，让街尾融进远景
      var fog = x.createLinearGradient(0, 620, 0, h);
      fog.addColorStop(0, 'rgba(207,185,157,0)'); fog.addColorStop(1, 'rgba(207,185,157,.92)');
      x.fillStyle = fog; x.fillRect(0, 620, w, h - 620);
    }, false);
  }
  function lanternTex() {
    return makeCanvas(96, 144, function (x) {
      var g = x.createRadialGradient(48, 66, 4, 48, 72, 62);
      g.addColorStop(0, 'rgba(255,246,206,1)'); g.addColorStop(.3, 'rgba(246,186,96,1)'); g.addColorStop(.72, 'rgba(180,64,42,.96)'); g.addColorStop(1, 'rgba(120,34,24,0)');
      x.fillStyle = g; x.beginPath(); x.ellipse(48, 72, 38, 52, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#4a2c1c'; x.fillRect(34, 8, 28, 12); x.fillRect(34, 126, 28, 10);
      x.strokeStyle = 'rgba(180,60,40,.7)'; x.lineWidth = 2;
      for (var i = 0; i < 5; i++) { x.beginPath(); x.ellipse(48, 72, 8 + i * 7, 48, 0, 0, Math.PI * 2); x.stroke(); }
    }, false);
  }
  function shadowTex() {
    return makeCanvas(128, 128, function (x, w, h) {
      var g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(46,28,16,.62)');
      g.addColorStop(.45, 'rgba(46,28,16,.34)');
      g.addColorStop(1, 'rgba(46,28,16,0)');
      x.clearRect(0, 0, w, h);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, false);
  }
  function flagTex(name, accent) {
    return makeCanvas(96, 256, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#f4e7d2';
      x.fillRect(8, 0, w - 16, h - 22);
      x.fillStyle = accent;
      x.fillRect(8, 0, w - 16, 22);
      x.strokeStyle = 'rgba(80,50,30,.5)'; x.lineWidth = 3;
      x.strokeRect(8, 0, w - 16, h - 22);
      x.fillStyle = '#f4e7d2';
      x.beginPath(); x.moveTo(8, h - 22); x.lineTo(w / 2, h); x.lineTo(w - 8, h - 22); x.fill();
      x.strokeStyle = 'rgba(80,50,30,.45)'; x.stroke();
      x.fillStyle = '#4e3a2a';
      x.font = 'bold 33px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
      var chars = String(name).split('');
      chars.forEach(function (ch, i) { x.fillText(ch, w / 2, 58 + i * 46); });
      x.fillStyle = accent; x.fillRect(8, h - 34, w - 16, 5);
    }, false);
  }

  /* --------------------------------- 行人 ---------------------------------- */
  var PED_STYLES = window.__PED_STYLES || [
    { kind: 'man', robe: '#63705e', sash: '#9d4a36', trim: '#efe0c8', hat: 'futou' },
    { kind: 'woman', robe: '#9d5a4a', sash: '#d8b47a', trim: '#f4e7d2', hair: 'bun', prop: 'basket' },
    { kind: 'man', robe: '#4e5d6e', sash: '#c49a5e', trim: '#efe0c8', hat: 'futou' },
    { kind: 'woman', robe: '#7a5a6e', sash: '#d8b47a', trim: '#f4e7d2', hair: 'bun', prop: 'umbrella' },
    { kind: 'child', robe: '#c49a5e', sash: '#9d4a36', trim: '#f4e7d2', hair: 'knot', prop: 'fan' },
    { kind: 'elder', robe: '#7d7466', sash: '#8a5a44', trim: '#efe0c8', hair: '#cfc6ba', prop: 'cane' },
    { kind: 'scholar', robe: '#5e6a58', sash: '#c49a5e', trim: '#f4e7d2', hat: 'scholar', prop: 'scroll' },
    { kind: 'man', robe: '#8a5a44', sash: '#63705e', trim: '#efe0c8', hat: 'futou' },
    { kind: 'woman', robe: '#6e7b8a', sash: '#b75a4a', trim: '#f4e7d2', hair: 'bun' },
    { kind: 'man', robe: '#7c8064', sash: '#8a5a44', trim: '#efe0c8', hat: 'futou' },
    { kind: 'child', robe: '#b75a4a', sash: '#d8b47a', trim: '#f4e7d2', hair: 'knot' },
    { kind: 'woman', robe: '#a05a4a', sash: '#7c8064', trim: '#f4e7d2', hair: 'bun' },
    { kind: 'woman', robe: '#d98a95', sash: '#f4e7d2', trim: '#f8d8c8', hair: 'bun', ribbon: '#b75a4a', prop: 'basket', eye: '#6e4a2e' },
    { kind: 'woman', robe: '#7fa7c8', sash: '#e8d4a8', trim: '#f6ead6', hair: 'bun', ribbon: '#d8b47a', prop: 'umbrella', eye: '#3a5a7a' },
    { kind: 'man', robe: '#4e6a5a', sash: '#b0754a', trim: '#efe0c8', hat: 'futou', prop: 'fan', eye: '#4a3424' },
    { kind: 'man', robe: '#8a6a4a', sash: '#63705e', trim: '#f4e7d2', hat: 'headwrap', prop: 'basket', apron: true, eye: '#4a3424' },
    { kind: 'child', robe: '#e2b85a', sash: '#b75a4a', trim: '#f4e7d2', hair: 'twin', ribbon: '#b75a4a', prop: 'fan', eye: '#6e4a2e' }
  ];
  function pedTex(style, back, frame) {
    frame = (frame === 0 || frame === 1 || frame === 2) ? frame : 1;
    return makeCanvas(288, 720, function (x) {
      x.scale(2.4, 2.4);
      x.clearRect(0, 0, 120, 300);
      var skin = style.kind === 'elder' ? '#dcc0a0' : '#e8c6a0';
      var hair = style.hair || '#2b211a';
      var small = style.kind === 'child';
      var scale = small ? 0.82 : 1;
      var legSwing = frame === 0 ? 6.5 : frame === 2 ? -6.5 : 0;
      var armSwing = frame === 0 ? -3 : frame === 2 ? 3 : 0;
      x.save();
      x.translate(60, small ? 34 : 0);
      x.scale(scale, scale);
      // 腿/鞋（三帧步态）
      x.fillStyle = '#4a3426';
      x.fillRect(-22 + legSwing, 236, 14, 46);
      x.fillRect(8 - legSwing, 236, 14, 46);
      x.fillStyle = '#2e2620';
      x.beginPath(); x.ellipse(-14 + legSwing, 288, 14, 7, 0, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(16 - legSwing, 288, 14, 7, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(58,42,30,.45)';
      x.fillRect(-24 + legSwing, 292, 22, 3);
      x.fillRect(6 - legSwing, 292, 22, 3);
      // 袍身
      x.fillStyle = style.robe; x.strokeStyle = '#2e2620'; x.lineWidth = 3;
      x.beginPath();
      x.moveTo(-35, 230); x.quadraticCurveTo(-45, 120, -25, 82); x.lineTo(25, 82); x.quadraticCurveTo(45, 120, 35, 230); x.closePath();
      x.fill(); x.stroke();
      // 下摆暗部 + 缘边
      x.fillStyle = 'rgba(0,0,0,.12)'; x.beginPath(); x.moveTo(-35, 204); x.quadraticCurveTo(0, 220, 35, 204); x.lineTo(35, 230); x.quadraticCurveTo(0, 246, -35, 230); x.closePath(); x.fill();
      x.fillStyle = style.trim; x.fillRect(-33, 218, 66, 8);
      x.strokeStyle = 'rgba(60,40,26,.35)'; x.lineWidth = 1.6; x.strokeRect(-33, 218, 66, 8);
      // 膝下衣褶
      x.strokeStyle = 'rgba(60,40,26,.22)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(-20, 196); x.quadraticCurveTo(-16, 214, -18, 228); x.stroke();
      x.beginPath(); x.moveTo(18, 196); x.quadraticCurveTo(14, 214, 16, 228); x.stroke();
      // 袖
      x.fillStyle = style.robe;
      x.beginPath(); x.moveTo(-26, 96); x.quadraticCurveTo(-72, 130, -62, 192 + armSwing); x.lineTo(-42, 188 + armSwing); x.quadraticCurveTo(-48, 142, -18, 120); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(26, 96); x.quadraticCurveTo(72, 130, 62, 192 - armSwing); x.lineTo(42, 188 - armSwing); x.quadraticCurveTo(48, 142, 18, 120); x.closePath(); x.fill(); x.stroke();
      // 袖口缘边
      x.fillStyle = style.trim;
      x.beginPath(); x.moveTo(-60, 178 + armSwing); x.lineTo(-44, 174 + armSwing); x.lineTo(-42, 188 + armSwing); x.lineTo(-58, 192 + armSwing); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(60, 178 - armSwing); x.lineTo(44, 174 - armSwing); x.lineTo(42, 188 - armSwing); x.lineTo(58, 192 - armSwing); x.closePath(); x.fill();
      // 手
      x.fillStyle = skin; x.strokeStyle = '#2e2620'; x.lineWidth = 2.4;
      x.beginPath(); x.arc(-52, 192 + armSwing, 9, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.arc(52, 192 - armSwing, 9, 0, Math.PI * 2); x.fill(); x.stroke();
      // 腰带
      x.fillStyle = style.sash;
      x.fillRect(-34, 158, 68, 16);
      x.strokeStyle = 'rgba(60,40,26,.35)'; x.lineWidth = 2; x.strokeRect(-34, 158, 68, 16);
      x.fillStyle = 'rgba(255,245,225,.18)'; x.fillRect(-32, 160, 64, 3);
      // 交领
      if (!back) {
        x.fillStyle = style.trim;
        x.beginPath(); x.moveTo(-26, 82); x.lineTo(0, 138); x.lineTo(26, 82); x.lineTo(14, 76); x.lineTo(0, 112); x.lineTo(-14, 76); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(60,40,26,.35)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(-14, 76); x.lineTo(0, 112); x.lineTo(14, 76); x.stroke();
      }
      // 衣褶 / 内衬 / 腰结
      x.strokeStyle = 'rgba(60,40,26,.24)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(-22, 100); x.quadraticCurveTo(-16, 140, -20, 176); x.stroke();
      x.beginPath(); x.moveTo(22, 100); x.quadraticCurveTo(16, 140, 20, 176); x.stroke();
      x.beginPath(); x.moveTo(-28, 182); x.quadraticCurveTo(0, 196, 28, 182); x.stroke();
      x.strokeStyle = 'rgba(246,234,214,.42)'; x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(-25, 88); x.quadraticCurveTo(0, 122, 25, 88); x.stroke();
      x.strokeStyle = 'rgba(60,40,26,.2)'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(-52, 150 + armSwing); x.quadraticCurveTo(-46, 170 + armSwing, -46, 184 + armSwing); x.stroke();
      x.beginPath(); x.moveTo(52, 150 - armSwing); x.quadraticCurveTo(46, 170 - armSwing, 46, 184 - armSwing); x.stroke();
      // 腰带结 + 玉坠
      x.fillStyle = style.sash;
      x.beginPath(); x.arc(0, 166, 5, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(60,40,26,.35)'; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(-5, 166); x.lineTo(-13, 178); x.moveTo(5, 166); x.lineTo(13, 178); x.stroke();
      if (style.kind !== 'child') {
        x.fillStyle = '#8fae8a'; x.strokeStyle = '#4e6a4a'; x.lineWidth = 1.2;
        x.beginPath(); x.arc(0, 186, 4, 0, Math.PI * 2); x.fill(); x.stroke();
        x.strokeStyle = 'rgba(80,60,40,.4)'; x.lineWidth = 1;
        x.beginPath(); x.moveTo(0, 168); x.lineTo(0, 182); x.stroke();
      }
      // 女性裙层 / 围裙
      if (style.kind === 'woman') {
        x.fillStyle = 'rgba(246,234,214,.3)';
        x.beginPath(); x.moveTo(-31, 188); x.quadraticCurveTo(-38, 212, -31, 230); x.lineTo(-19, 230); x.quadraticCurveTo(-25, 208, -20, 190); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(31, 188); x.quadraticCurveTo(38, 212, 31, 230); x.lineTo(19, 230); x.quadraticCurveTo(25, 208, 20, 190); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(60,40,26,.22)'; x.lineWidth = 1.4;
        x.beginPath(); x.moveTo(-22, 192); x.quadraticCurveTo(-24, 212, -20, 228); x.stroke();
        x.beginPath(); x.moveTo(22, 192); x.quadraticCurveTo(24, 212, 20, 228); x.stroke();
      }
      if (style.apron) {
        x.fillStyle = 'rgba(246,234,214,.78)';
        x.beginPath(); x.moveTo(-22, 172); x.lineTo(22, 172); x.lineTo(26, 230); x.lineTo(-26, 230); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(120,90,60,.35)'; x.lineWidth = 1.6; x.stroke();
      }
      // 脖子/头
      x.fillStyle = skin;
      x.fillRect(-9, 60, 18, 22);
      x.fillStyle = back ? '#2b211a' : skin;
      x.beginPath(); x.arc(0, 44, 30, 0, Math.PI * 2); x.fill(); x.stroke();
      // 头发/帽
      if (back) {
        x.fillStyle = hair;
        x.beginPath(); x.arc(0, 40, 31, Math.PI, Math.PI * 2); x.closePath(); x.fill();
        x.beginPath(); x.arc(0, 20, 13, 0, Math.PI * 2); x.fill();
        // 后脑勺整片头发，避免看起来像光头
        x.beginPath(); x.ellipse(0, 45, 29, 30, 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(60,40,26,.25)'; x.lineWidth = 1.4;
        x.beginPath(); x.moveTo(-16, 18); x.quadraticCurveTo(-6, 30, -8, 48); x.stroke();
        x.beginPath(); x.moveTo(16, 18); x.quadraticCurveTo(6, 30, 8, 48); x.stroke();
        if (style.hat === 'futou') {
          x.fillStyle = '#241c16';
          rr(x, -30, -12, 60, 20, 8); x.fill();
          x.fillRect(-42, -6, 10, 12); x.fillRect(32, -6, 10, 12);
        } else if (style.hat === 'scholar') {
          x.fillStyle = '#241c16';
          x.fillRect(-20, -18, 40, 24);
          x.fillRect(-32, 4, 64, 8);
        } else if (style.hat === 'headwrap') {
          x.fillStyle = '#8a5a44'; x.fillRect(-31, -8, 62, 12);
          x.fillStyle = '#f4e7d2'; x.fillRect(-31, 2, 62, 3);
        } else if (style.hair === 'bun') {
          x.fillStyle = hair; x.beginPath(); x.arc(0, -2, 15, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#c49a5e'; x.beginPath(); x.arc(14, 1, 5, 0, Math.PI * 2); x.fill();
        } else if (style.hair === 'twin') {
          x.fillStyle = hair;
          x.beginPath(); x.arc(-16, -4, 7, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(16, -4, 7, 0, Math.PI * 2); x.fill();
        }
      } else {
        // 前额发
        x.fillStyle = hair;
        x.beginPath(); x.arc(0, 38, 31, Math.PI * 1.04, Math.PI * 1.96); x.closePath(); x.fill();
        x.beginPath(); x.arc(-20, 22, 10, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(20, 22, 10, 0, Math.PI * 2); x.fill();
        if (style.hat === 'futou') {
          x.fillStyle = '#241c16';
          rr(x, -30, 2, 60, 18, 8); x.fill();
          x.fillRect(-42, 8, 10, 12); x.fillRect(32, 8, 10, 12);
        } else if (style.hat === 'scholar') {
          x.fillStyle = '#241c16';
          x.fillRect(-20, -22, 40, 28);
          x.fillRect(-32, 2, 64, 8);
        } else if (style.hat === 'headwrap') {
          x.fillStyle = '#8a5a44';
          x.fillRect(-31, -2, 62, 12);
          x.fillStyle = '#f4e7d2'; x.fillRect(-31, 8, 62, 3);
          x.fillStyle = style.hair || '#2b211a';
          x.beginPath(); x.arc(-26, 20, 5, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(26, 20, 5, 0, Math.PI * 2); x.fill();
        } else if (style.hair === 'bun') {
          x.fillStyle = hair;
          x.beginPath(); x.arc(0, 10, 16, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#c49a5e';
          x.beginPath(); x.arc(16, 12, 6, 0, Math.PI * 2); x.fill();
        } else if (style.hair === 'knot') {
          x.fillStyle = hair;
          x.beginPath(); x.arc(0, 8, 12, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#9d4a36';
          x.fillRect(-3, -8, 6, 12);
        } else if (style.kind === 'elder') {
          x.fillStyle = '#d8d0c6';
          x.beginPath(); x.arc(0, 36, 32, Math.PI * 1.02, Math.PI * 1.98); x.closePath(); x.fill();
          x.beginPath(); x.moveTo(-18, 60); x.quadraticCurveTo(0, 78, 18, 60); x.lineWidth = 6; x.strokeStyle = '#d8d0c6'; x.stroke();
        }
        // 发丝 / 鬓发 / 发饰
        x.strokeStyle = hair; x.lineWidth = 2.6; x.lineCap = 'round';
        x.beginPath(); x.moveTo(-23, 0); x.quadraticCurveTo(-16, 8, -7, 10); x.stroke();
        x.beginPath(); x.moveTo(-13, -8); x.quadraticCurveTo(-6, 2, 2, 4); x.stroke();
        x.beginPath(); x.moveTo(23, 0); x.quadraticCurveTo(16, 8, 7, 10); x.stroke();
        x.beginPath(); x.moveTo(13, -8); x.quadraticCurveTo(6, 2, -2, 4); x.stroke();
        if (style.kind === 'woman') {
          x.fillStyle = hair;
          x.beginPath(); x.ellipse(-28, 32, 5.5, 18, .1, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.ellipse(28, 32, 5.5, 18, -.1, 0, Math.PI * 2); x.fill();
          // 发带 / 蝴蝶结
          x.fillStyle = style.ribbon || '#b75a4a';
          x.beginPath(); x.ellipse(-11, 2, 5, 3, -.5, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.ellipse(11, 2, 5, 3, .5, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#d8b47a'; x.beginPath(); x.arc(0, 4, 2.2, 0, Math.PI * 2); x.fill();
        }
        if (style.kind === 'child' && style.hair === 'twin') {
          x.fillStyle = hair;
          x.beginPath(); x.arc(-17, 4, 7, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(17, 4, 7, 0, Math.PI * 2); x.fill();
          x.fillStyle = style.ribbon || '#b75a4a';
          x.beginPath(); x.ellipse(-22, 8, 4, 2.6, -.5, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.ellipse(22, 8, 4, 2.6, .5, 0, Math.PI * 2); x.fill();
        }
        // Q版五官：豆豆眼 + 小嘴 + 腮红
        x.fillStyle = '#3a2a20';
        x.beginPath(); x.ellipse(-11, 43, 2.7, 4, 0, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.ellipse(11, 43, 2.7, 4, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#fff';
        x.beginPath(); x.arc(-12, 41.5, 1.1, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.arc(10, 41.5, 1.1, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#3a2a20'; x.lineWidth = 1.6; x.lineCap = 'round';
        x.beginPath(); x.moveTo(-17, 34); x.quadraticCurveTo(-11, 31.5, -6, 34); x.stroke();
        x.beginPath(); x.moveTo(6, 34); x.quadraticCurveTo(11, 31.5, 17, 34); x.stroke();
        x.fillStyle = 'rgba(120,70,50,.35)'; x.beginPath(); x.arc(0, 49, 1.4, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#a04a3c'; x.lineWidth = 1.8;
        x.beginPath(); x.moveTo(-4, 55.5); x.quadraticCurveTo(0, 58, 4, 55.5); x.stroke();
        x.fillStyle = 'rgba(210,110,90,.22)';
        x.beginPath(); x.ellipse(-19, 51, 6.5, 3.8, 0, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.ellipse(19, 51, 6.5, 3.8, 0, 0, Math.PI * 2); x.fill();
      }
      // 衣服纹样
      x.strokeStyle = 'rgba(240,226,204,.18)'; x.lineWidth = 2;
      for (var p = 0; p < 3; p++) { x.beginPath(); x.moveTo(-26 + p * 4, 120 + p * 20); x.quadraticCurveTo(0, 132 + p * 20, 26 - p * 4, 120 + p * 20); x.stroke(); }
      // 发饰 / 耳饰 / 胡须
      if (!back) {
        if (style.kind === 'woman') {
          x.fillStyle = '#c49a5e';
          x.beginPath(); x.arc(-27, 52, 2.4, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(27, 52, 2.4, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#b75a4a';
          for (var pet = 0; pet < 5; pet++) {
            var pa = pet / 5 * Math.PI * 2;
            x.beginPath(); x.ellipse(20 + Math.cos(pa) * 4, 10 + Math.sin(pa) * 4, 2.5, 1.7, pa, 0, Math.PI * 2); x.fill();
          }
          x.fillStyle = '#d8b47a'; x.beginPath(); x.arc(20, 10, 2, 0, Math.PI * 2); x.fill();
          // 发带
          x.strokeStyle = 'rgba(157,74,54,.8)'; x.lineWidth = 2.2;
          x.beginPath(); x.moveTo(-22, 16); x.quadraticCurveTo(-8, 6, 6, 14); x.stroke();
        } else if (style.kind === 'elder') {
          x.fillStyle = 'rgba(216,208,198,.9)';
          x.beginPath(); x.moveTo(-12, 60); x.quadraticCurveTo(0, 82, 12, 60); x.quadraticCurveTo(0, 72, -12, 60); x.fill();
        } else if (style.kind === 'child') {
          x.fillStyle = 'rgba(200,100,80,.22)';
          x.beginPath(); x.arc(-18, 50, 6, 0, Math.PI * 2); x.fill();
          x.beginPath(); x.arc(18, 50, 6, 0, Math.PI * 2); x.fill();
        }
      }
      // 随身小物
      var prop = style.prop;
      if (prop === 'basket') {
        x.strokeStyle = '#6e4b32'; x.lineWidth = 2.6;
        x.beginPath(); x.arc(54, 196, 15, Math.PI, 0); x.stroke();
        x.fillStyle = '#a97a46'; x.strokeStyle = '#5e3e24'; x.lineWidth = 2;
        x.beginPath(); x.ellipse(54, 214, 17, 10, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#c79a5e'; x.beginPath(); x.ellipse(54, 210, 14, 6, 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(80,50,30,.5)'; x.lineWidth = 1.4;
        for (var wb = 0; wb < 3; wb++) { x.beginPath(); x.moveTo(40 + wb * 5, 210); x.lineTo(38 + wb * 6, 220); x.stroke(); }
      } else if (prop === 'umbrella') {
        x.strokeStyle = '#5e4c40'; x.lineWidth = 2.6;
        x.beginPath(); x.moveTo(82, 82); x.lineTo(82, 186); x.stroke();
        x.fillStyle = '#b75a4a'; x.strokeStyle = '#5e3c30'; x.lineWidth = 2;
        x.beginPath(); x.ellipse(82, 82, 34, 16, 0, Math.PI, Math.PI * 2); x.fill(); x.stroke();
        x.strokeStyle = 'rgba(244,231,210,.7)'; x.lineWidth = 1.5;
        for (var ub = 0; ub < 4; ub++) { x.beginPath(); x.moveTo(50 + ub * 6, 82); x.quadraticCurveTo(82, 58, 114 - ub * 6, 82); x.stroke(); }
        x.fillStyle = '#d8b47a'; x.beginPath(); x.arc(82, 80, 3, 0, Math.PI * 2); x.fill();
      } else if (prop === 'fan') {
        x.fillStyle = '#f4e7d2'; x.strokeStyle = '#9d4a36'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(52, 192); x.arc(52, 192, 20, -Math.PI * 0.9, -Math.PI * 0.1); x.closePath(); x.fill(); x.stroke();
        x.strokeStyle = 'rgba(157,74,54,.6)'; x.lineWidth = 1.3;
        for (var fb = 0; fb < 4; fb++) { x.beginPath(); x.moveTo(52, 192); x.lineTo(52 + Math.cos(-Math.PI * 0.9 + fb * 0.22) * 18, 192 + Math.sin(-Math.PI * 0.9 + fb * 0.22) * 18); x.stroke(); }
      } else if (prop === 'scroll') {
        x.fillStyle = '#f4e7d2'; x.strokeStyle = '#8a6a55'; x.lineWidth = 2;
        x.fillRect(44, 182, 20, 34); x.strokeRect(44, 182, 20, 34);
        x.strokeStyle = '#9d4a36'; x.lineWidth = 2.6;
        x.beginPath(); x.moveTo(44, 192); x.lineTo(64, 192); x.moveTo(44, 206); x.lineTo(64, 206); x.stroke();
      } else if (prop === 'cane') {
        x.strokeStyle = '#6e4b32'; x.lineWidth = 3;
        x.beginPath(); x.moveTo(54, 190); x.lineTo(64, 292); x.stroke();
        x.beginPath(); x.moveTo(50, 187); x.quadraticCurveTo(57, 180, 62, 188); x.stroke();
      }
      x.restore();
    }, false);
  }

  /* --------------------------------- 纹理集 --------------------------------- */

  function gateTex() {
    var svg = document.querySelector('#gateEnd .gate-svg');
    if (!svg) {
      return makeCanvas(1000, 700, function (x, w, h) {
        x.fillStyle = '#6c5b4f'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#3e332b'; x.fillRect(300, 260, 400, 380);
        x.fillStyle = '#b19c84'; x.fillRect(280, 220, 440, 60);
      }, false);
    }
    var clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('width', '1000');
    clone.setAttribute('height', '700');
    var uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(clone.outerHTML);
    return texFromImage(uri);
  }

  function flowerTex() {
    return makeCanvas(240, 320, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#7d9a62';
      for (var i = 0; i < 9; i++) {
        var cx = 50 + (i * 47) % 150, cy = 180 + (i * 31) % 70;
        x.beginPath(); x.ellipse(cx, cy, 34, 22, (i % 3) * .4, 0, Math.PI * 2); x.fill();
      }
      x.fillStyle = '#9bb27c';
      for (var k = 0; k < 8; k++) { x.beginPath(); x.ellipse(60 + (k * 39) % 130, 160 + (k * 23) % 60, 26, 14, k, 0, Math.PI * 2); x.fill(); }
      var pinks = ['#f4a7b9', '#f7c0ce', '#e98ea5', '#fbd6df'];
      for (var f = 0; f < 16; f++) {
        var px = 40 + (f * 67) % 170, py = 120 + (f * 43) % 150;
        var r = 8 + (f % 4) * 2;
        x.fillStyle = pinks[f % 4];
        for (var pet = 0; pet < 5; pet++) {
          var a = pet / 5 * Math.PI * 2;
          x.beginPath(); x.ellipse(px + Math.cos(a) * r * .8, py + Math.sin(a) * r * .8, r * .7, r * .5, a, 0, Math.PI * 2); x.fill();
        }
        x.fillStyle = '#f6d26a'; x.beginPath(); x.arc(px, py, r * .32, 0, Math.PI * 2); x.fill();
      }
    }, false);
  }
  function treeTex() {
    return makeCanvas(256, 460, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.strokeStyle = '#5a4634'; x.lineWidth = 13; x.lineCap = 'round';
      x.beginPath(); x.moveTo(w / 2, h - 6); x.quadraticCurveTo(w / 2 - 12, h * 0.58, w / 2 + 2, h * 0.34); x.stroke();
      x.strokeStyle = '#4a3a2c'; x.lineWidth = 6;
      x.beginPath(); x.moveTo(w / 2, h * 0.6); x.lineTo(w / 2 - 40, h * 0.44); x.stroke();
      x.beginPath(); x.moveTo(w / 2, h * 0.52); x.lineTo(w / 2 + 38, h * 0.36); x.stroke();
      var greens = ['#435441', '#50634b', '#5f7356', '#6e8162', '#7d8e6c'];
      for (var i = 0; i < 6; i++) {
        x.fillStyle = greens[i % greens.length];
        x.beginPath();
        x.ellipse(w / 2 + (i % 2 ? 16 : -14), 78 + i * 42, 74 - i * 6, 38 - i * 2, (i % 2 ? -0.16 : 0.14), 0, Math.PI * 2);
        x.fill();
      }
      x.fillStyle = 'rgba(225,230,205,.18)';
      x.beginPath(); x.ellipse(w / 2 - 18, 92, 40, 20, 0.2, 0, Math.PI * 2); x.fill();
    }, false);
  }
  function smokeTex() {
    return makeCanvas(160, 300, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      var g = x.createRadialGradient(w / 2, h * 0.62, 4, w / 2, h * 0.5, w * 0.5);
      g.addColorStop(0, 'rgba(245,238,224,.36)');
      g.addColorStop(.55, 'rgba(240,230,212,.16)');
      g.addColorStop(1, 'rgba(240,230,212,0)');
      x.fillStyle = g;
      x.beginPath(); x.ellipse(w / 2, h * 0.58, w * 0.42, h * 0.4, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(250,244,232,.3)'; x.lineWidth = 6; x.lineCap = 'round';
      for (var i = 0; i < 3; i++) {
        x.beginPath(); x.moveTo(w / 2 + i * 8 - 8, h * 0.8); x.bezierCurveTo(w / 2 - 26, h * 0.55, w / 2 + 30, h * 0.36, w / 2 + 4, h * 0.1); x.stroke();
      }
    }, false);
  }

  var TEX = {
    backdrop: backdropTex(),
    ground: groundTex(),
    roof: roofTex(),
    lantern: lanternTex(),
    shadow: shadowTex(),
    gate: gateTex(),
    tree: treeTex(),
  flower: flowerTex(),
    smoke: smokeTex(),
    pinwheel: window.__PINWHEEL_TEX || null,
    shops: {},
    peds: []
  };
  var SHOP_DEFS = [
    { side: -1, z: 0, kind: 'sachet', name: '香囊', accent: '#7e8c79', interactive: true },
    { side: 1, z: 0, kind: 'sugar', name: '泥泥狗', accent: '#b07a3e', interactive: true },
    { side: -1, z: -5.2, kind: 'tea', name: '茶棚', accent: '#8a6a55' },
    { side: 1, z: -5.2, kind: 'incense', name: '香烛', accent: '#a33a2c' },
    { side: -1, z: -10.2, kind: 'flower', name: '花铺', accent: '#a35a5a' },
    { side: 1, z: -10.2, kind: 'fortune', name: '算命', accent: '#6e5a44' }
  ];
  SHOP_DEFS.forEach(function (d) {
    TEX.shops[d.kind] = {
      front: shopFront(d.kind),
      sign: signTex(d.name, d.accent, !!d.interactive),
      awning: awningTex(d.accent),
      flag: flagTex(d.name, d.accent)
    };
  });
  TEX.paifangSign = signTex('往前 · 午朝门', '#7a5a3e', false);
  PED_STYLES.forEach(function (s) {
    TEX.peds.push({
      front: [0, 1, 2].map(function (f) { return pedTex(s, false, f); }),
      back: [0, 1, 2].map(function (f) { return pedTex(s, true, f); })
    });
  });

  /* --------------------------------- 场景 ---------------------------------- */
  var quads = [];
  var sprites = [];
  function addQuad(o) {
    quads.push({
      c: o.c, u: o.u, v: o.v,
      tex: o.tex || white, color: o.color || [1, 1, 1, 1],
      uv: o.uv || [1, 1]
    });
  }
  function addSprite(o) { sprites.push(o); }
  var shadowQuads = [];
  function addShadow(o) {
    shadowQuads.push({ c: o.c, u: o.u, v: o.v, tex: TEX.shadow, color: [1, 1, 1, 1], uv: [1, 1] });
  }

  addQuad({ c: [0, 0, -11], u: [48, 0, 0], v: [0, 0, -56], tex: TEX.ground, uv: [5, 10] });
  addQuad({ c: [0, 12, -25], u: [48, 0, 0], v: [0, 24, 0], tex: TEX.backdrop, uv: [1, 1], color: [.98, .96, .92, 1] });

  var WOOD = [0.72, 0.52, 0.38, 1];
  var WOOD_DARK = [0.42, 0.3, 0.22, 1];
  var ROOF = [0.52, 0.48, 0.42, 1];
  var COUNTER = [0.78, 0.58, 0.4, 1];

  function addBox(cx, cy, cz, sx, sy, sz, color) {
    addQuad({ c: [cx, cy + sy / 2, cz], u: [sx, 0, 0], v: [0, 0, -sz], tex: TEX.shops.tiger ? null : null, color: color });
    addQuad({ c: [cx, cy, cz], u: [sx, 0, 0], v: [0, 0, -sz], tex: null, color: color });
    addQuad({ c: [cx, cy + sy / 2, cz + sz / 2], u: [sx, 0, 0], v: [0, sy, 0], tex: null, color: color });
    addQuad({ c: [cx - sx / 2, cy + sy / 2, cz], u: [0, 0, sz], v: [0, sy, 0], tex: null, color: color });
    addQuad({ c: [cx + sx / 2, cy + sy / 2, cz], u: [0, 0, -sz], v: [0, sy, 0], tex: null, color: color });
  }

  function addShop(side, z, kind, name, accent, interactive) {
    var shopStart = quads.length;
    var inner = side * 3.05;
    var center = side * 4.3;
    var depth = 1.5;
    var len = 4.2;
    var h = 3.35;
    var outX = center + side * depth / 2;
    var yaw = side * 25 * Math.PI / 180;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var pivot = [inner, 0, -len / 2];
    function rotP(p) {
      var dx = p[0] - pivot[0], dz = p[2] - pivot[2];
      return [pivot[0] + dx * cy + dz * sy, p[1], pivot[2] - dx * sy + dz * cy];
    }
    function rotV(v) { return [v[0] * cy + v[2] * sy, v[1], -v[0] * sy + v[2] * cy]; }

    var t = TEX.shops[kind];
    // 营业面
    addQuad({ c: [inner, h / 2, 0], u: [0, 0, len], v: [0, h, 0], tex: t.front });
    // 南/北/外侧
    addQuad({ c: [center, h / 2, len / 2], u: [depth, 0, 0], v: [0, h, 0], tex: null, color: WOOD });
    addQuad({ c: [center, h / 2, -len / 2], u: [-depth, 0, 0], v: [0, h, 0], tex: null, color: WOOD_DARK });
    addQuad({ c: [outX, h / 2, 0], u: [0, 0, -len], v: [0, h, 0], tex: null, color: WOOD_DARK });
    // 平顶
    addQuad({ c: [center, h, 0], u: [depth, 0, 0], v: [0, 0, -len], tex: null, color: ROOF });
    // 瓦檐：朝街面
    addQuad({ c: [inner - side * 0.95, h + 0.32, 0], u: [0, 0, len + 0.9], v: [-side * 1.7, -0.6, 0], tex: TEX.roof, uv: [3, 1], color: [.95, .92, .86, 1] });
    // 瓦檐：南端朝镜头
    addQuad({ c: [center, h + 0.12, len / 2 + 0.5], u: [depth + 0.95, 0, 0], v: [0, -0.34, 0.78], tex: TEX.roof, uv: [2, 1], color: [.95, .92, .86, 1] });
    // 屋脊/檐口
    addQuad({ c: [inner, h + 0.64, 0], u: [0, 0, len + 1], v: [-side * 0.16, 0, 0], tex: null, color: [0.38, 0.27, 0.2, 1] });
    addQuad({ c: [inner - side * 1.6, h - 0.12, 0], u: [0, 0, len + 0.9], v: [0, -0.14, 0], tex: null, color: [0.6, 0.28, 0.22, 1] });
    // 柜台
    var cw = 0.55, ch = 0.95, clen = 3.8;
    var cx = inner - side * cw / 2;
    var cf = inner - side * cw;
    addQuad({ c: [cf, ch / 2, 0], u: [0, 0, clen], v: [0, ch, 0], tex: null, color: COUNTER });
    addQuad({ c: [cx, ch, 0], u: [cw, 0, 0], v: [0, 0, -clen], tex: null, color: [0.88, 0.68, 0.48, 1] });
    addQuad({ c: [cx, ch / 2, clen / 2], u: [cw, 0, 0], v: [0, ch, 0], tex: null, color: [0.7, 0.5, 0.34, 1] });
    // 布棚/帘
    addQuad({ c: [inner - side * 1.0, h - 0.55, 0], u: [0, 0, len + 0.3], v: [-side * 1.1, -0.5, 0], tex: t.awning });
    addQuad({ c: [inner - side * 1.1, h - 0.66, 0], u: [0, 0, len + 0.3], v: [0, -0.18, 0], tex: t.awning, color: [.92, .88, .8, 1] });
    // 南端招牌（朝镜头）
    addQuad({ c: [center, 2.72, len / 2 + 0.03], u: [depth * 0.86, 0, 0], v: [0, 0.78, 0], tex: t.sign });
    // 街心招牌
    addQuad({ c: [inner - side * 0.06, 3.06, -0.2], u: [0, 0, 2.3], v: [0, 0.62, 0], tex: t.sign, color: [.92, .92, .9, 1] });
    // 柱子
    var px = inner - side * 0.06;
    [-len / 2 + 0.12, len / 2 - 0.12].forEach(function (pz) {
      addQuad({ c: [px, h / 2, pz], u: [0.13, 0, 0], v: [0, h, 0], tex: null, color: [0.45, 0.3, 0.21, 1] });
      addQuad({ c: [px, h / 2, pz], u: [0, 0, 0.13], v: [0, h, 0], tex: null, color: [0.36, 0.24, 0.17, 1] });
    });
    // 木箱/货筐（店前）
    var crate = [0.58, 0.42, 0.3, 1];
    addBox(inner - side * 0.35, 0.02, len / 2 + 0.55, 0.72, 0.62, 0.72, crate);
    addBox(inner - side * 0.55, 0.02, len / 2 + 1.18, 0.56, 0.48, 0.56, [0.5, 0.36, 0.26, 1]);
    // 店前竖幡（每家店一条，颜色跟店招走）
    [-len / 2 + 0.32, len / 2 - 0.32].forEach(function (pz) {
      addQuad({ c: [inner - side * 0.2, h - 1.08, pz], u: [0.48, 0, 0], v: [0, 1.0, 0], tex: t.flag });
    });

    // 旋转
    for (var qi = shopStart; qi < quads.length; qi++) {
      var q = quads[qi];
      q.c = rotP(q.c); q.u = rotV(q.u); q.v = rotV(q.v); q.c[2] += z;
    }
    var corners = [];
    [[inner, -len / 2], [outX, -len / 2], [inner, len / 2], [outX, len / 2]].forEach(function (p) {
      [0, h + 0.5].forEach(function (y) { corners.push(rotP([p[0], y, p[1]])); });
    });
    corners.forEach(function (c) { c[2] += z; });
    // 檐下灯笼
    addSprite({ x: inner - side * 0.5, y: h - 0.55, z: z + len / 2 - 0.15, w: 0.34, h: 0.5, tex: TEX.lantern });
    // 落地阴影
    var sc = rotP([center, 0, 0]); sc[2] += z;
    addShadow({ c: [sc[0], 0.014, sc[2]], u: rotV([depth * 1.9, 0, 0]), v: rotV([0, 0, -(len + 1.4)]) });
    return { side: side, inner: inner, center: center, len: len, h: h, corners: corners, z: z, kind: kind, interactive: !!interactive, name: name };
  }

  var shops = SHOP_DEFS.map(function (d) {
    return addShop(d.side, d.z, d.kind, d.name, d.accent, d.interactive);
  });

  // 午朝门：内街尽头
  var GATE = { w: 9.2, h: 6.6, z: -17.4 };
  addQuad({ c: [0, GATE.h / 2, GATE.z], u: [GATE.w, 0, 0], v: [0, GATE.h, 0], tex: TEX.gate, color: [1, 1, 1, 1] });
  addQuad({ c: [-GATE.w / 2 - 1.7, 2.2, GATE.z + 0.35], u: [3.4, 0, 0], v: [0, 4.4, 0], tex: null, color: [0.42, 0.17, 0.13, 1] });
  addQuad({ c: [GATE.w / 2 + 1.7, 2.2, GATE.z + 0.35], u: [-3.4, 0, 0], v: [0, 4.4, 0], tex: null, color: [0.42, 0.17, 0.13, 1] });
  addShadow({ c: [0, 0.014, GATE.z + 1.2], u: [12, 0, 0], v: [0, 0, -3], tex: TEX.shadow });

  // 街边灯笼
  [-3.2, -8.2, -13.2].forEach(function (z) {
    addSprite({ x: -1.7, y: 4.25, z: z, w: 0.36, h: 0.54, tex: TEX.lantern });
    addSprite({ x: 1.7, y: 4.25, z: z, w: 0.36, h: 0.54, tex: TEX.lantern });
  });

  // 跨街灯笼绳
  [-3.2, -8.2, -13.2].forEach(function (z) {
    addQuad({ c: [0, 4.42, z], u: [5.6, 0, 0], v: [0, 0.022, 0], tex: null, color: [0.26, 0.19, 0.14, 1] });
    [-1.5, 0, 1.5].forEach(function (x) {
      addSprite({ x: x, y: 4.3, z: z, w: 0.3, h: 0.44, tex: TEX.lantern });
    });
  });

  // 内街两侧柏树
  [-1, 1].forEach(function (side) {
    [-3.0, -8.0, -13.0].forEach(function (z) {
      addSprite({ x: side * 5.6, y: 2.55, z: z, w: 2.6, h: 5.0, tex: TEX.tree });
    });
  });
  // 街边盆栽柏树
  [-1, 1].forEach(function (side) {
    [-1.6, -6.6, -11.6].forEach(function (z) {
      addSprite({ x: side * 2.72, y: 0.9, z: z, w: 1.05, h: 1.9, tex: TEX.tree });
    });
  });
  // 街边粉花丛
  [-2.0, -5.0, -8.0, -11.0, -14.0, -17.0].forEach(function (z, i) {
    addSprite({ x: (i % 2 ? 1 : -1) * 2.78, y: 0.62, z: z, w: .92, h: 1.15, tex: TEX.flower });
  });

  // 街边更多花丛与草叶：靠近镜头也有，边缘不空
  [[-2.7, -1.2, .8, 1.0], [2.72, -2.0, .7, .9], [-2.78, -3.6, .65, .85],
   [2.75, -4.9, .85, 1.05], [-2.72, -6.4, .72, .92], [2.78, -7.8, .66, .86],
   [-2.8, -9.2, .9, 1.1], [2.72, -10.6, .7, .9], [-2.75, -12.2, .78, .98],
   [2.8, -13.6, .64, .84], [-2.72, -15.2, .86, 1.06], [2.7, -16.6, .74, .94],
   [-2.8, -18.0, .66, .86], [2.78, -19.2, .78, 1.0]].forEach(function (f) {
    addSprite({ x: f[0], y: .55 + (f[3] - 1) * .3, z: f[1], w: f[2], h: f[3], tex: TEX.flower });
  });
  // 店门口两侧的低矮草叶（用花丛纹理缩小）
  [[-2.45, -2.0, .45, .55], [2.45, -2.4, .45, .55], [-2.5, -10.4, .5, .6], [2.5, -10.8, .45, .55]].forEach(function (f) {
    addSprite({ x: f[0], y: .35, z: f[1], w: f[2], h: f[3], tex: TEX.flower });
  });



  // 尽头暖灯，避免远处发黑
  [[-1.7, 3.8, -17.4], [0, 4.0, -18.2], [1.7, 3.8, -17.4]].forEach(function (l, i) {
    addSprite({ x: l[0], y: l[1], z: l[2], w: .42, h: .62, tex: TEX.lantern, wind: true, phase: 1.2 + i * .7 });
  });
  // 没有锦缎后：屋檐小风车 + 跨街灯串 + 店前小桌凳
  if (TEX.pinwheel) {
    [[-2.55, 4.05, .2], [2.55, 4.1, -1.4], [-2.6, 4.0, -5.2], [2.6, 4.05, -9.4]].forEach(function (p, i) {
      addSprite({ x: p[0], y: p[1], z: p[2], w: .8, h: 1.2, tex: TEX.pinwheel, wind: true, phase: i * 1.1 });
    });
  }
  [-3.0, -6.6, -10.4].forEach(function (z, row) {
    for (var i = 0; i < 5; i++) {
      var lx = -1.75 + i * .875;
      addSprite({ x: lx, y: 3.85 + (row % 2) * .08, z: z, w: .28, h: .42, tex: TEX.lantern, wind: true, phase: row + i * .5 });
    }
  });
  // 两间互动店前的小桌、凳子
  [[-1, -1.2], [1, -1.2]].forEach(function (side) {
    var sx = side[0] * 2.5, sz = .9;
    addQuad({ c: [sx, .48, sz], u: [1.1, 0, 0], v: [0, .14, 0], tex: null, color: [.66, .47, .32, 1] });
    addQuad({ c: [sx, .24, sz], u: [1.05, 0, 0], v: [0, .48, 0], tex: null, color: [.55, .38, .26, 1] });
    addQuad({ c: [sx - .42, .24, sz], u: [.08, 0, 0], v: [0, .48, 0], tex: null, color: [.42, .3, .2, 1] });
    addQuad({ c: [sx + .42, .24, sz], u: [.08, 0, 0], v: [0, .48, 0], tex: null, color: [.42, .3, .2, 1] });
    addQuad({ c: [sx + side[0] * .85, .28, sz + .15], u: [.34, 0, 0], v: [0, .08, 0], tex: null, color: [.58, .42, .3, 1] });
  });
  // 香烛摊前的青烟
  [[1.55, 2.6, -4.7], [1.9, 3.2, -5.0], [1.35, 3.9, -5.2]].forEach(function (sm) {
    addSprite({ x: sm[0], y: sm[1], z: sm[2], w: 1.15, h: 2.7, tex: TEX.smoke });
  });

  /* --------------------------------- 行人 ---------------------------------- */
  var PED_N = 16;
  var peds = [];
  for (var pi = 0; pi < PED_N; pi++) {
    var variant = pi % PED_STYLES.length;
    peds.push({
      x: -1.65 + Math.random() * 3.3,
      z: -15 + Math.random() * 13.2,
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: 0.38 + Math.random() * 0.38,
      targetX: -1.0 + Math.random() * 2.0,
      pause: Math.random() * 1.4,
      nextX: 2.5 + Math.random() * 4,
      nextTurn: 7 + Math.random() * 7,
      phase: Math.random() * Math.PI * 2,
      stepPhase: Math.random() * Math.PI * 2,
      stepFreq: 1.25 + Math.random() * 0.7,
      move: 0, curSpeed: 0, turn: -1, turnTo: 0, turnDur: 0.45,
      variant: variant,
      texFront: TEX.peds[variant].front,
      texBack: TEX.peds[variant].back
    });
  }

  /* --------------------------------- 相机 ---------------------------------- */
  var cam = {
    yaw: 0, pitch: 0.09, dist: 12.4, baseDist: 12.4, focusDist: 6.9,
    target: [0, 1.55, -5.0], home: [0, 1.55, -5.0],
    introFrom: { dist: 16.5, pitch: 0.3, ty: 2.0 }, introDur: 2.2,
    focus: null
  };
  var dragging = false, dragX = 0, dragY = 0, moved = 0, lastPointer = null;
  var pointers = new Map(), panning = false, panLast = null;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function camEye() {
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    return [cam.target[0] + Math.sin(cam.yaw) * cp * cam.dist, cam.target[1] + sp * cam.dist, cam.target[2] + Math.cos(cam.yaw) * cp * cam.dist];
  }
  function midPoint() {
    var a = Array.from(pointers.values());
    if (a.length < 2) return a[0] || null;
    return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
  }
  canvas.addEventListener('pointerdown', function (e) {
    if (app && app.classList.contains('is-detail')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size >= 2 || e.button === 2) {
      panning = true; dragging = false; cam.focus = null;
      panLast = pointers.size >= 2 ? midPoint() : { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId); viewport.classList.add('is-dragging'); return;
    }
    dragging = true; moved = 0; dragX = e.clientX; dragY = e.clientY; lastPointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId); viewport.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', function (e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (panning) {
      var m = pointers.size >= 2 ? midPoint() : { x: e.clientX, y: e.clientY };
      if (panLast && m) {
        var dx = m.x - panLast.x, dy = m.y - panLast.y;
        cam.home[0] = clamp(cam.home[0] - dx * 0.005, -2.0, 2.0);
        cam.home[2] = clamp(cam.home[2] + dy * 0.012, -12, 1.5);
        cam.target[0] += (cam.home[0] - cam.target[0]) * 0.5;
        cam.target[2] += (cam.home[2] - cam.target[2]) * 0.5;
      }
      panLast = m; return;
    }
    if (!dragging || e.pointerId !== lastPointer) return;
    var ddx = e.clientX - dragX, ddy = e.clientY - dragY;
    dragX = e.clientX; dragY = e.clientY; moved += Math.abs(ddx) + Math.abs(ddy);
    if (moved > 5) {
      cam.yaw = clamp(cam.yaw - ddx * 0.0035, -0.5, 0.5);
      cam.pitch = clamp(cam.pitch + ddy * 0.0026, 0.02, 0.4);
    }
  });
  function endPointer(e) {
    if (e) pointers.delete(e.pointerId);
    if (panning && pointers.size < 2) {
      panning = false; panLast = null; viewport.classList.remove('is-dragging');
      if (e && canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      return;
    }
    if (!dragging) return;
    dragging = false; viewport.classList.remove('is-dragging');
    if (lastPointer !== null && canvas.hasPointerCapture(lastPointer)) canvas.releasePointerCapture(lastPointer);
    lastPointer = null;
    if (moved < 8 && e && e.type === 'pointerup') hitTest(e.clientX, e.clientY);
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('wheel', function (e) {
    if (app && app.classList.contains('is-detail')) return;
    e.preventDefault();
    cam.dist = clamp(cam.dist * (1 + e.deltaY * 0.001), 5.2, 13.5);
  }, { passive: false });
  canvas.addEventListener('dblclick', function () { if (!app || !app.classList.contains('is-detail')) resetView(); });

  /* ------------------------------- 命中/交互 -------------------------------- */
  var currentVP = null;
  function projectShopBox(shop) {
    if (!currentVP) return null;
    var pts = [];
    shop.corners.forEach(function (p3) { var p = projectPoint(currentVP, p3); if (p) pts.push(p); });
    if (!pts.length) return null;
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }
  function hitTest(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var nx = ((clientX - rect.left) / rect.width) * 2 - 1;
    var ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
    // 先测午朝门
    var gp = [[-GATE.w / 2, 0, GATE.z], [GATE.w / 2, 0, GATE.z], [GATE.w / 2, GATE.h, GATE.z], [-GATE.w / 2, GATE.h, GATE.z]];
    var pts = [];
    for (var g = 0; g < gp.length; g++) { var pp = projectPoint(currentVP, gp[g]); if (pp) pts.push(pp); }
    if (pts.length === 4) {
      var gminX = 1e9, gmaxX = -1e9, gminY = 1e9, gmaxY = -1e9;
      pts.forEach(function (p) { gminX = Math.min(gminX, p[0]); gmaxX = Math.max(gmaxX, p[0]); gminY = Math.min(gminY, p[1]); gmaxY = Math.max(gmaxY, p[1]); });
      if (nx >= gminX && nx <= gmaxX && ny >= gminY && ny <= gmaxY) {
        if (window.__openGateway) window.__openGateway();
        return;
      }
    }
    for (var i = 0; i < shops.length; i++) {
      var shop = shops[i], b = shop.screenBox;
      if (!b) continue;
      if (nx >= b.minX && nx <= b.maxX && ny >= b.minY && ny <= b.maxY) {
        if (shop.kind === 'sachet' || shop.kind === 'sugar') {
          if (window.__openTask) window.__openTask(shop.kind);
        }
        return;
      }
    }
  }

  /* -------------------------------- 渲染 ----------------------------------- */
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = viewport.clientWidth || window.innerWidth;
    var h = viewport.clientHeight || window.innerHeight;
    canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    var portrait = h > w * 1.08;
    cam.baseDist = portrait ? 14.4 : 10.6;
    cam.focusDist = portrait ? 8.8 : 7.0;
    cam.introFrom.dist = cam.baseDist + 4.4;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  var FOG = [0.82, 0.76, 0.66];
  var startT = performance.now();
  var lastT = startT;
  var advancing = false;

  function updateCamera(t) {
    var intro = clamp((t - startT) / 1000 / cam.introDur, 0, 1);
    if (intro < 1) {
      var e = 1 - Math.pow(1 - intro, 3);
      cam.dist = cam.introFrom.dist + (cam.baseDist - cam.introFrom.dist) * e;
      cam.pitch = cam.introFrom.pitch + (0.08 - cam.introFrom.pitch) * e;
      cam.target[1] = cam.introFrom.ty + (1.45 - cam.introFrom.ty) * e;
    } else if (cam.focus) {
      var f = cam.focus;
      cam.target[0] += (f.x - cam.target[0]) * 0.08;
      cam.target[1] += (f.y - cam.target[1]) * 0.08;
      cam.target[2] += (f.z - cam.target[2]) * 0.08;
      cam.dist += (f.dist - cam.dist) * 0.08;
    } else {
      cam.target[0] += (cam.home[0] - cam.target[0]) * 0.08;
      cam.target[1] += (cam.home[1] - cam.target[1]) * 0.08;
      cam.target[2] += (cam.home[2] - cam.target[2]) * 0.08;
      cam.dist += (cam.baseDist - cam.dist) * 0.08;
    }
  }
  function startTurn(p, dir) {
    if (p.turn >= 0) return;
    p.turn = 0; p.turnTo = dir; p.turnDur = 0.38 + Math.random() * 0.22;
    p.pause = Math.max(p.pause, p.turnDur + 0.08);
  }
  function updatePeds(dt, time) {
    for (var i = 0; i < peds.length; i++) {
      var p = peds[i];
      if (p.turn >= 0) {
        p.turn += dt / p.turnDur;
        if (p.turn >= 0.5 && p.dir !== p.turnTo) p.dir = p.turnTo;
        if (p.turn >= 1) p.turn = -1;
      }
      var moving = p.pause <= 0 && p.turn < 0;
      p.move += ((moving ? 1 : 0) - p.move) * Math.min(1, dt * 5);
      p.curSpeed += (p.speed - p.curSpeed) * Math.min(1, dt * 1.6);
      if (moving) {
        p.nextX -= dt;
        if (p.nextX <= 0) { p.targetX = clamp(p.x + (Math.random() * 1.1 - .55), -1.65, 1.65); p.nextX = 2.5 + Math.random() * 4.5; if (Math.random() < 0.18) p.pause = 0.4 + Math.random() * 0.9; }
        var weave = Math.sin(time * 0.9 + p.phase) * 0.08;
        p.x += ((p.targetX + weave) - p.x) * Math.min(1, dt * .9);
        p.z += p.dir * p.curSpeed * p.move * dt;
        p.stepPhase += dt * p.stepFreq * Math.PI * 2;
      }
      if (p.pause > 0) p.pause -= dt;
      p.nextTurn -= dt;
      if (p.nextTurn <= 0) { startTurn(p, -p.dir); p.nextTurn = 7 + Math.random() * 8; }
      if (p.z > -1.2) { p.z = -1.2; startTurn(p, -1); }
      if (p.z < -15.3) { p.z = -15.3; startTurn(p, 1); }
      if (moving && Math.abs(p.z) < 3 && Math.abs(p.x) > 0.72 && Math.random() < dt * 0.08) {
        p.pause = 0.6 + Math.random() * 1.2; p.targetX = p.x > 0 ? 1.65 : -1.65;
      }
      for (var j = 0; j < peds.length; j++) {
        if (j === i) continue;
        var q = peds[j], dx = q.x - p.x, dz = q.z - p.z;
        if (Math.abs(dz) < 0.5 && Math.abs(dx) < 0.55) {
          p.x += (dx === 0 ? (Math.random() - 0.5) : (dx > 0 ? -1 : 1)) * 0.6 * dt;
        }
      }
      p.x = clamp(p.x, -1.7, 1.7);
    }
  }
  function drawQuad(q, view, proj, eye, billboard) {
    var Ux, Uy, Uz, Vx, Vy, Vz;
    if (billboard) {
      var fwd = v3.norm(v3.sub(cam.target, eye));
      var right = v3.norm(v3.cross(fwd, [0, 1, 0]));
      var up = v3.cross(right, fwd);
      var r = right;
      if (q.roll) {
        var c = Math.cos(q.roll), s = Math.sin(q.roll);
        var r2 = [r[0] * c + up[0] * s, r[1] * c + up[1] * s, r[2] * c + up[2] * s];
        var u2 = [up[0] * c - r[0] * s, up[1] * c - r[1] * s, up[2] * c - r[2] * s];
        r = r2; up = u2;
      }
      var sx = q.scaleX == null ? 1 : q.scaleX;
      Ux = r[0] * q.w * sx; Uy = r[1] * q.w * sx; Uz = r[2] * q.w * sx;
      Vx = up[0] * q.h; Vy = up[1] * q.h; Vz = up[2] * q.h;
    } else {
      Ux = q.u[0]; Uy = q.u[1]; Uz = q.u[2];
      Vx = q.v[0]; Vy = q.v[1]; Vz = q.v[2];
    }
    var n = v3.norm(v3.cross([Ux, Uy, Uz], [Vx, Vy, Vz]));
    var model = new Float32Array([Ux, Uy, Uz, 0, Vx, Vy, Vz, 0, n[0], n[1], n[2], 0, q.c[0], q.c[1], q.c[2], 1]);
    gl.uniformMatrix4fv(U.uModel, false, model);
    gl.uniformMatrix4fv(U.uView, false, view);
    gl.uniformMatrix4fv(U.uProj, false, proj);
    gl.uniform2fv(U.uUVScale, q.uv || [1, 1]);
    gl.uniform4fv(U.uColor, q.color || [1, 1, 1, 1]);
    gl.uniform3fv(U.uCamPos, eye);
    gl.uniform3fv(U.uFogColor, FOG);
    gl.uniform1f(U.uFogNear, 18);
    gl.uniform1f(U.uFogFar, 48);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, q.tex || white);
    gl.uniform1i(U.uTex, 0);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }
  function frame(now) {
    var t = now || performance.now();
    var dt = Math.min(0.05, Math.max(0, (t - lastT) / 1000));
    lastT = t;
    updateCamera(t);
    updatePeds(dt, t / 1000);
    gl.clearColor(FOG[0], FOG[1], FOG[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(A.pos); gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(A.uv); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, 20, 12);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    var eye = camEye();
    var view = lookAt(eye, cam.target, [0, 1, 0]);
    var proj = perspective(54 * Math.PI / 180, canvas.width / canvas.height, 0.1, 120);
    currentVP = mul4(proj, view);
    quads.forEach(function (q) { drawQuad(q, view, proj, eye, false); });
    // 地面阴影：店铺 + 行人
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    shadowQuads.forEach(function (q) { drawQuad(q, view, proj, eye, false); });
    peds.forEach(function (p) {
      drawQuad({ c: [p.x, 0.016, p.z], u: [0.8, 0, 0], v: [0, 0, -0.4], tex: TEX.shadow, color: [1, 1, 1, 1] }, view, proj, eye, false);
    });
    gl.depthMask(true); gl.disable(gl.BLEND);
    shops.forEach(function (s) { s.screenBox = projectShopBox(s); });
    var list = [];
    peds.forEach(function (p) { list.push({ kind: 'ped', ref: p, d: (p.x - eye[0]) * (p.x - eye[0]) + (0.9 - eye[1]) * (0.9 - eye[1]) + (p.z - eye[2]) * (p.z - eye[2]) }); });
    sprites.forEach(function (l) { list.push({ kind: 'sprite', ref: l, d: (l.x - eye[0]) * (l.x - eye[0]) + (l.y - eye[1]) * (l.y - eye[1]) + (l.z - eye[2]) * (l.z - eye[2]) }); });
    list.sort(function (a, b) { return b.d - a.d; });
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    list.forEach(function (item) {
      if (item.kind === 'ped') {
        var p = item.ref;
        var frameIdx = p.move > .3 ? Math.floor((p.stepPhase / (Math.PI * 2 / 3)) % 3) : 1;
    if (frameIdx < 0) frameIdx += 3;
    var texArr = p.dir > 0 ? p.texFront : p.texBack;
    var tex = texArr[frameIdx] || texArr[1] || texArr[0];
        var mv = p.move, idle = 1 - mv, step = p.stepPhase;
        var bob = Math.sin(step * 2) * 0.024 * mv + Math.sin(t / 650 + p.phase) * 0.005 * idle;
        var sway = Math.sin(step) * 0.016 * mv + Math.sin(t / 900 + p.phase) * 0.004 * idle;
        var roll = Math.sin(step) * 0.035 * mv;
        var sy = 1 + Math.sin(step * 2) * 0.012 * mv;
        var turnScale = p.turn >= 0 ? Math.abs(Math.cos(p.turn * Math.PI)) : 1;
        drawQuad({ w: 0.7, h: 1.74 * sy, c: [p.x + sway, 0.87 + bob, p.z], tex: tex, color: [1, 1, 1, 1], roll: roll, scaleX: turnScale }, view, proj, eye, true);
      } else {
        var l = item.ref;
        drawQuad({ w: l.w, h: l.h, c: [l.x, l.y, l.z], tex: l.tex, color: [1, 1, 1, 1] }, view, proj, eye, true);
      }
    });
    gl.depthMask(true); gl.disable(gl.BLEND);
    requestAnimationFrame(frame);
  }

  /* ------------------------------- 对外接口 -------------------------------- */
  function focusShop(kind) {
    var shop = shops.find(function (s) { return s.kind === kind; });
    if (!shop) return;
    cam.focus = { x: shop.inner - shop.side * 0.8, y: 1.6, z: 0.5, dist: cam.focusDist };
  }
  function resetView() {
    cam.focus = null;
    cam.home = [0, 1.55, -5.0];
    cam.yaw = 0; cam.pitch = 0.09;
  }
  function advance() {
    cam.focus = { x: 0, y: 1.7, z: -14.2, dist: 6.6 };
  }
  window.InnerScene = { focusShop: focusShop, resetView: resetView, advance: advance, resize: resize };
  requestAnimationFrame(frame);
})();
