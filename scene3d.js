/* ============================================================================
   太昊陵前 · 宋代集市街景（原生 WebGL，无外部依赖）
   纵向长街：两侧店铺是真实几何体，行人是在同一深度缓冲里的广告牌 Sprite。
   左侧布老虎铺、右侧压缩馍铺为可交互店铺；其余为伞铺、花铺、算命、茶汤、
   香烛、泥泥狗。街尾立“往前 · 午朝门”牌坊。
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('glscene');
  if (!canvas) return;
  var viewport = document.getElementById('viewport');
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
    return makeCanvas(1280, 1024, function (x, w, h) {
      x.scale(2, 2); w = 640; h = 512;
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
      var keeperRobe = kind === 'tiger' ? '#7b4a3c' : kind === 'bun' ? '#8a6a44' : kind === 'flower' ? '#7a5a5e' : '#5e6a58';
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
      }
      // 前景微暗
      var vg = x.createLinearGradient(0, h - 120, 0, h);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.28)');
      x.fillStyle = vg; x.fillRect(0, h - 120, w, 120);
    }, false);
  }

  function signTex(name, accent, interactive) {
    return makeCanvas(1024, 320, function (x, w, h) {
      x.scale(2, 2); w = 512; h = 160;
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
    return makeCanvas(512, 256, function (x, w, h) {
      x.scale(2, 2); w = 256; h = 128;
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
    return makeCanvas(1024, 1024, function (x, w, h) {
      x.scale(2, 2); w = 512; h = 512;
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
    return makeCanvas(2048, 2048, function (x, w, h) {
      // 底缝
      x.fillStyle = '#7c6b57'; x.fillRect(0, 0, w, h);
      var rows = 10, cols = 8, sh = h / rows, sw = w / cols;
      for (var r = 0; r < rows; r++) {
        for (var c = -1; c <= cols; c++) {
          var off = (r % 2) * sw * 0.5;
          var px = c * sw + off, py = r * sh;
          var tone = 184 + ((r * 17 + c * 23 + 60) % 24);
          // 石板主体
          x.fillStyle = 'rgb(' + tone + ',' + (tone - 14) + ',' + (tone - 32) + ')';
          x.fillRect(px + 2.5, py + 2.5, sw - 5, sh - 5);
          // 倒角：上/左亮，下/右暗
          var bev = x.createLinearGradient(px, py, px + sw, py + sh);
          bev.addColorStop(0, 'rgba(255,246,226,.20)');
          bev.addColorStop(.45, 'rgba(255,246,226,0)');
          bev.addColorStop(1, 'rgba(50,38,26,.20)');
          x.fillStyle = bev; x.fillRect(px + 2.5, py + 2.5, sw - 5, sh - 5);
          // 石面细纹
          x.strokeStyle = 'rgba(96,78,58,.20)'; x.lineWidth = 1.6;
          for (var k = 0; k < 3; k++) {
            var yy = py + sh * (0.22 + k * 0.26);
            x.beginPath(); x.moveTo(px + 8, yy + Math.sin(r + k) * 3);
            x.quadraticCurveTo(px + sw * 0.5, yy - 4 + Math.cos(c + k) * 4, px + sw - 8, yy + Math.sin(c + k) * 2);
            x.stroke();
          }
          // 局部磨损 / 小坑
          for (var n = 0; n < 4; n++) {
            x.fillStyle = 'rgba(70,56,42,' + (0.04 + Math.random() * 0.08) + ')';
            x.beginPath(); x.arc(px + 8 + Math.random() * (sw - 16), py + 6 + Math.random() * (sh - 12), 1 + Math.random() * 3, 0, Math.PI * 2); x.fill();
          }
        }
      }
      // 大范围明暗，避免纹理平
      var toneGrad = x.createLinearGradient(0, 0, 0, h);
      toneGrad.addColorStop(0, 'rgba(255,244,220,.10)');
      toneGrad.addColorStop(.5, 'rgba(255,244,220,0)');
      toneGrad.addColorStop(1, 'rgba(56,42,28,.12)');
      x.fillStyle = toneGrad; x.fillRect(0, 0, w, h);
      // 细颗粒
      for (var i = 0; i < 2600; i++) {
        x.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,248,232' : '60,48,34') + ',' + (0.015 + Math.random() * 0.03) + ')';
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
      // 缝隙边的青苔
      for (var m = 0; m < 140; m++) {
        x.fillStyle = 'rgba(' + (88 + Math.random() * 26) + ',' + (100 + Math.random() * 30) + ',' + (68 + Math.random() * 18) + ',' + (0.05 + Math.random() * 0.10) + ')';
        x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 10, 0, Math.PI * 2); x.fill();
      }
    }, true);
  }
    function backdropTex() {
    return makeCanvas(2048, 1152, function (x, w, h) {
      // 白天天空：淡青到暖米
      var sky = x.createLinearGradient(0, 0, 0, h * 0.72);
      sky.addColorStop(0, '#7fb2d2');
      sky.addColorStop(.38, '#b9d6dd');
      sky.addColorStop(.72, '#dfe8dc');
      sky.addColorStop(1, '#f7e9cd');
      x.fillStyle = sky; x.fillRect(0, 0, w, h * 0.72);
      x.fillStyle = '#e9dcc4'; x.fillRect(0, h * 0.66, w, h * 0.34);

    
  // 白云与薄云，让天空透气
  var clouds = [
    [w * .18, h * .16, 150, 42, .55], [w * .34, h * .24, 110, 32, .4],
    [w * .55, h * .12, 170, 46, .5], [w * .78, h * .28, 130, 36, .42],
    [w * .9, h * .18, 90, 28, .35]
  ];
  clouds.forEach(function (c) {
    var g = x.createRadialGradient(c[0], c[1], 2, c[0], c[1], c[2]);
    g.addColorStop(0, 'rgba(255,253,245,' + c[4] + ')');
    g.addColorStop(.6, 'rgba(255,252,240,' + (c[4] * .55) + ')');
    g.addColorStop(1, 'rgba(255,252,240,0)');
    x.fillStyle = g;
    x.beginPath(); x.ellipse(c[0], c[1], c[2], c[3], 0, 0, Math.PI * 2); x.fill();
  });
  // 日晕
      var sunX = w * 0.72, sunY = h * 0.16;
      var sun = x.createRadialGradient(sunX, sunY, 8, sunX, sunY, 210);
      sun.addColorStop(0, 'rgba(255,252,235,.98)');
      sun.addColorStop(.25, 'rgba(255,240,200,.55)');
      sun.addColorStop(1, 'rgba(255,240,200,0)');
      x.fillStyle = sun; x.fillRect(sunX - 230, sunY - 230, 460, 460);

      // 云：几团软边
      function cloud(cx, cy, rx, ry, alpha) {
        var cg = x.createRadialGradient(cx, cy, 2, cx, cy, rx);
        cg.addColorStop(0, 'rgba(255,252,244,' + alpha + ')');
        cg.addColorStop(.55, 'rgba(255,250,238,' + (alpha * 0.55) + ')');
        cg.addColorStop(1, 'rgba(255,250,238,0)');
        x.fillStyle = cg;
        x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill();
      }
      cloud(250, 190, 240, 80, .55);
      cloud(470, 160, 170, 55, .40);
      cloud(1050, 230, 300, 95, .45);
      cloud(1380, 150, 200, 62, .36);
      cloud(1700, 260, 260, 80, .38);

      // 远山
      x.fillStyle = 'rgba(150,172,166,.42)';
      x.beginPath(); x.moveTo(0, h * 0.56); x.quadraticCurveTo(w * 0.18, h * 0.36, w * 0.34, h * 0.55);
      x.quadraticCurveTo(w * 0.5, h * 0.38, w * 0.66, h * 0.56);
      x.quadraticCurveTo(w * 0.82, h * 0.40, w, h * 0.57);
      x.lineTo(w, h * 0.72); x.lineTo(0, h * 0.72); x.closePath(); x.fill();
      x.fillStyle = 'rgba(126,150,138,.36)';
      x.beginPath(); x.moveTo(0, h * 0.62); x.quadraticCurveTo(w * 0.24, h * 0.48, w * 0.46, h * 0.62);
      x.quadraticCurveTo(w * 0.72, h * 0.47, w, h * 0.62);
      x.lineTo(w, h * 0.76); x.lineTo(0, h * 0.76); x.closePath(); x.fill();

      // 远处城郭 / 屋脊
      var wallY = h * 0.58;
      x.fillStyle = 'rgba(112,92,70,.38)';
      x.fillRect(w * 0.12, wallY, w * 0.76, h * 0.09);
      for (var i = 0; i < 9; i++) {
        var bx = w * 0.16 + i * w * 0.08;
        x.fillStyle = 'rgba(92,74,56,.46)';
        x.beginPath(); x.moveTo(bx - 54, wallY + 4); x.quadraticCurveTo(bx, wallY - 52, bx + 54, wallY + 4); x.closePath(); x.fill();
        x.fillStyle = 'rgba(132,109,82,.34)'; x.fillRect(bx - 48, wallY + 4, 96, h * 0.04);
      }
      // 远处牌楼
      x.fillStyle = 'rgba(80,62,48,.55)';
      x.fillRect(w * 0.455, wallY - 60, 26, 120); x.fillRect(w * 0.505, wallY - 60, 26, 120);
      x.fillRect(w * 0.435, wallY - 76, w * 0.12, 20);
      x.beginPath(); x.moveTo(w * 0.43, wallY - 76); x.quadraticCurveTo(w * 0.495, wallY - 118, w * 0.56, wallY - 76); x.closePath(); x.fill();
      x.fillStyle = 'rgba(150,92,64,.5)'; x.fillRect(w * 0.47, wallY - 72, w * 0.05, 18);

      // 树带：柏树 / 柳树
      for (var t = 0; t < 26; t++) {
        var tx = 30 + t * (w / 26) + ((t * 37) % 26);
        var th = 70 + (t * 53 % 80);
        var ty = h * 0.66;
        x.fillStyle = t % 3 === 0 ? 'rgba(92,112,82,.55)' : 'rgba(112,132,98,.42)';
        x.beginPath(); x.ellipse(tx, ty - th * 0.45, 18 + (t % 4) * 5, th * 0.62, 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(72,58,42,.4)'; x.lineWidth = 4;
        x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx, ty - th * 0.5); x.stroke();
      }
      // 柳枝
      for (var v = 0; v < 7; v++) {
        var vx = w * (0.06 + v * 0.14), vy = h * 0.66;
        x.strokeStyle = 'rgba(96,118,84,.35)'; x.lineWidth = 3;
        for (var q = 0; q < 5; q++) {
          x.beginPath(); x.moveTo(vx, vy - 90); x.quadraticCurveTo(vx - 30 - q * 5, vy - 40, vx - 12 - q * 8, vy - 4 + q * 4); x.stroke();
        }
      }

      // 飞鸟
      x.strokeStyle = 'rgba(70,62,52,.42)'; x.lineWidth = 3;
      for (var bird = 0; bird < 8; bird++) {
        var bx2 = w * 0.12 + bird * w * 0.09, by2 = h * 0.14 + (bird % 4) * 34;
        x.beginPath(); x.moveTo(bx2 - 12, by2); x.quadraticCurveTo(bx2, by2 - 9, bx2 + 12, by2); x.stroke();
      }

      // 底部暖雾，让街尾融进远景
      var fog = x.createLinearGradient(0, h * 0.62, 0, h);
      fog.addColorStop(0, 'rgba(232,220,196,0)');
      fog.addColorStop(1, 'rgba(232,220,196,.95)');
      x.fillStyle = fog; x.fillRect(0, h * 0.62, w, h * 0.38);
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
  var PED_STYLES = [
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
  function treeTex() {
    return makeCanvas(320, 560, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      // 树干与枝
      x.strokeStyle = '#4e3a2a'; x.lineCap = 'round';
      x.lineWidth = 18; x.beginPath(); x.moveTo(w / 2, h - 8); x.quadraticCurveTo(w / 2 - 6, h * .72, w / 2 + 2, h * .42); x.stroke();
      x.lineWidth = 9;
      x.beginPath(); x.moveTo(w / 2, h * .58); x.quadraticCurveTo(w * .30, h * .46, w * .22, h * .33); x.stroke();
      x.beginPath(); x.moveTo(w / 2, h * .52); x.quadraticCurveTo(w * .70, h * .40, w * .79, h * .28); x.stroke();
      x.beginPath(); x.moveTo(w / 2, h * .46); x.quadraticCurveTo(w * .54, h * .30, w * .50, h * .20); x.stroke();
      // 分层树冠：外轮廓 + 内亮部 + 叶簇
      var cl = [
        [160, 118, 132, 86], [88, 178, 82, 62], [232, 178, 88, 64],
        [126, 218, 82, 56], [204, 222, 82, 56], [160, 76, 94, 58]
      ];
      cl.forEach(function (c, i) {
        x.fillStyle = ['#4f7047', '#5a7c4e', '#668a59', '#729663', '#7fa06c'][i % 5];
        x.strokeStyle = '#31502f'; x.lineWidth = 5;
        x.beginPath(); x.ellipse(c[0], c[1], c[2], c[3], (i % 2 ? -.12 : .1), 0, Math.PI * 2); x.fill(); x.stroke();
      });
      // 叶簇高光/阴影，增加动漫线稿感
      for (var i = 0; i < 26; i++) {
        var a = i * 2.399, rx = 48 + (i % 7) * 12, ry = 26 + (i % 5) * 7;
        var px = 160 + Math.cos(a) * rx, py = 150 + Math.sin(a) * ry;
        x.fillStyle = i % 3 === 0 ? 'rgba(196,214,158,.5)' : 'rgba(62,92,55,.35)';
        x.beginPath(); x.ellipse(px, py, 18 + (i % 4) * 4, 9 + (i % 3) * 3, a, 0, Math.PI * 2); x.fill();
      }
      x.strokeStyle = 'rgba(240,234,205,.4)'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(70, 132); x.quadraticCurveTo(120, 96, 176, 84); x.stroke();
    }, false);
  }
  function willowTex() {
    return makeCanvas(360, 760, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      // 主干
      x.strokeStyle = '#4a3828'; x.lineCap = 'round';
      x.lineWidth = 22; x.beginPath(); x.moveTo(w / 2, h - 6); x.quadraticCurveTo(w / 2 - 14, h * .62, w / 2 + 8, h * .34); x.stroke();
      x.lineWidth = 10;
      var branches = [
        [w / 2 + 8, h * .34, w * .28, h * .26],
        [w / 2 + 8, h * .34, w * .72, h * .24],
        [w / 2 + 4, h * .46, w * .18, h * .40],
        [w / 2 + 4, h * .46, w * .82, h * .38],
        [w / 2 + 6, h * .30, w * .50, h * .16]
      ];
      branches.forEach(function (b) {
        x.beginPath(); x.moveTo(b[0], b[1]); x.quadraticCurveTo((b[0] + b[2]) / 2 + 10, (b[1] + b[3]) / 2, b[2], b[3]); x.stroke();
      });
      // 垂柳枝条：长而柔，带小叶子
      var greens = ['#5f824f', '#6f9360', '#7fa06c', '#8cac78', '#4e7044'];
      for (var i = 0; i < 34; i++) {
        var sx = w * .18 + (i / 34) * w * .64 + Math.sin(i * 2.1) * 12;
        var sy = h * .22 + (i % 5) * 14;
        var ex = sx + (i % 2 ? 34 : -30) + Math.sin(i * 1.3) * 20;
        var ey = h * .78 + (i % 7) * 10;
        x.strokeStyle = greens[i % greens.length]; x.lineWidth = 3.2;
        x.beginPath(); x.moveTo(sx, sy);
        x.bezierCurveTo(sx + 22, sy + h * .18, ex, ey - h * .22, ex, ey);
        x.stroke();
        // 叶子
        for (var k = 0; k < 7; k++) {
          var t = k / 7;
          var lx = sx + (ex - sx) * t + Math.sin(t * 6 + i) * 8;
          var ly = sy + (ey - sy) * t;
          x.fillStyle = greens[(i + k) % greens.length];
          x.beginPath(); x.ellipse(lx + 3, ly, 5.5, 2.2, -.6 + Math.sin(i) * .3, 0, Math.PI * 2); x.fill();
        }
      }
      // 树冠顶部叶团 + 轮廓
      var cl = [[w * .5, h * .2, 120, 54], [w * .32, h * .26, 88, 44], [w * .68, h * .26, 92, 46]];
      cl.forEach(function (c, i) {
        x.fillStyle = i % 2 ? '#729663' : '#668a59'; x.strokeStyle = '#3e5a3a'; x.lineWidth = 4;
        x.beginPath(); x.ellipse(c[0], c[1], c[2], c[3], 0, 0, Math.PI * 2); x.fill(); x.stroke();
      });
      x.strokeStyle = 'rgba(244,238,214,.35)'; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(w * .28, h * .22); x.quadraticCurveTo(w * .42, h * .14, w * .58, h * .16); x.stroke();
    }, false);
  }


  function pinwheelTex() {
    return makeCanvas(256, 320, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      // 木杆
      x.strokeStyle = '#8a5a38'; x.lineWidth = 6; x.lineCap = 'round';
      x.beginPath(); x.moveTo(128, 136); x.lineTo(128, 312); x.stroke();
      x.strokeStyle = 'rgba(90,62,40,.35)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(128, 140); x.lineTo(128, 306); x.stroke();
      // 四片风车叶
      var cols = ['#b8453a', '#d8b47a', '#5d8a7a', '#7a6aa0'];
      for (var i = 0; i < 4; i++) {
        var a = i * Math.PI / 2 + .35;
        var bx = 128 + Math.cos(a) * 70, by = 128 + Math.sin(a) * 70;
        var nx = Math.cos(a + 1.2) * 34, ny = Math.sin(a + 1.2) * 34;
        var px = 128 + nx, py = 128 + ny;
        x.fillStyle = cols[i];
        x.beginPath(); x.moveTo(128, 128); x.lineTo(bx, by); x.quadraticCurveTo(bx - nx * .4, by - ny * .4, px, py); x.closePath(); x.fill();
        x.strokeStyle = 'rgba(60,36,24,.35)'; x.lineWidth = 2; x.stroke();
        x.fillStyle = 'rgba(255,246,220,.22)';
        x.beginPath(); x.moveTo(128, 128); x.lineTo(bx, by); x.lineTo((128 + bx) / 2, (128 + by) / 2); x.closePath(); x.fill();
      }
      // 轴心
      x.fillStyle = '#f6e7c8'; x.strokeStyle = '#5a3a28'; x.lineWidth = 3;
      x.beginPath(); x.arc(128, 128, 11, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#b8453a'; x.beginPath(); x.arc(128, 128, 4, 0, Math.PI * 2); x.fill();
      // 尾飘带
      x.strokeStyle = '#b8453a'; x.lineWidth = 4; x.lineCap = 'round';
      x.beginPath(); x.moveTo(128, 300); x.quadraticCurveTo(104, 318, 116, 330); x.stroke();
      x.strokeStyle = '#d8b47a';
      x.beginPath(); x.moveTo(128, 300); x.quadraticCurveTo(150, 316, 142, 328); x.stroke();
    });
  }
  function kiteTex() {
    return makeCanvas(240, 340, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.save(); x.translate(120, 108); x.rotate(.1);
      x.fillStyle = '#b8453a'; x.strokeStyle = '#5a3a28'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(0, -78); x.lineTo(58, 0); x.lineTo(0, 66); x.lineTo(-58, 0); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = '#f6e7c8';
      x.beginPath(); x.moveTo(0, -78); x.lineTo(58, 0); x.lineTo(0, 0); x.closePath(); x.fill();
      x.fillStyle = '#d8b47a';
      x.beginPath(); x.moveTo(0, 0); x.lineTo(58, 0); x.lineTo(0, 66); x.closePath(); x.fill();
      x.strokeStyle = '#5a3a28'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, -78); x.lineTo(0, 66); x.moveTo(-58, 0); x.lineTo(58, 0); x.stroke();
      x.restore();
      x.strokeStyle = '#8a5a38'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(120, 174); x.quadraticCurveTo(140, 220, 110, 262); x.quadraticCurveTo(90, 296, 104, 326); x.stroke();
      x.fillStyle = '#d8b47a';
      x.beginPath(); x.moveTo(112, 236); x.lineTo(132, 246); x.lineTo(112, 256); x.lineTo(104, 246); x.closePath(); x.fill();
      x.fillStyle = '#5d8a7a';
      x.beginPath(); x.moveTo(104, 288); x.lineTo(122, 298); x.lineTo(104, 308); x.lineTo(96, 298); x.closePath(); x.fill();
    });
  }
  function birdsTex() {
    return makeCanvas(320, 160, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.strokeStyle = 'rgba(58,44,32,.7)'; x.lineWidth = 3; x.lineCap = 'round';
      var pts = [[36, 92, 18], [92, 62, 14], [150, 96, 16], [210, 54, 12], [266, 84, 15], [300, 44, 10]];
      pts.forEach(function (p) {
        x.beginPath(); x.moveTo(p[0] - p[2], p[1]); x.quadraticCurveTo(p[0] - p[2] * .5, p[1] - p[2] * .55, p[0], p[1]);
        x.quadraticCurveTo(p[0] + p[2] * .5, p[1] - p[2] * .55, p[0] + p[2], p[1]); x.stroke();
      });
    });
  }


  function counterClothTex() {
    return makeCanvas(256, 128, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      for (var i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#efe2c6' : '#9e2b26'; x.fillRect(i * 32, 0, 32, h); }
      x.fillStyle = 'rgba(255,246,224,.16)'; x.fillRect(0, 0, w, 8);
      x.fillStyle = 'rgba(60,30,20,.18)'; x.fillRect(0, h - 10, w, 10);
    }, false);
  }
  function sailTex() {
    return makeCanvas(512, 256, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      var g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(250,243,226,.97)');
      g.addColorStop(.55, 'rgba(242,231,207,.95)');
      g.addColorStop(1, 'rgba(224,208,178,.92)');
      x.fillStyle = g;
      x.beginPath(); x.moveTo(8, 18); x.quadraticCurveTo(w / 2, 2, w - 8, 20); x.lineTo(w - 4, h - 12); x.quadraticCurveTo(w / 2, h + 6, 4, h - 10); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(150,120,84,.35)'; x.lineWidth = 2; x.stroke();
      for (var i = 1; i < 7; i++) {
        var px = i / 7 * w;
        x.strokeStyle = 'rgba(170,140,100,.22)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(px, 16); x.quadraticCurveTo(px + 10, h / 2, px - 8, h - 8); x.stroke();
      }
      x.fillStyle = 'rgba(160,60,40,.75)'; x.fillRect(0, h - 9, w, 6);
    }, false);
  }
  function canopyTex() {
    return makeCanvas(1024, 640, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      // 枝干
      x.strokeStyle = 'rgba(92,66,42,.75)'; x.lineWidth = 12; x.lineCap = 'round';
      x.beginPath(); x.moveTo(w * .5, h); x.quadraticCurveTo(w * .46, h * .6, w * .38, h * .34); x.stroke();
      x.lineWidth = 7;
      x.beginPath(); x.moveTo(w * .46, h * .55); x.quadraticCurveTo(w * .2, h * .36, w * .08, h * .18); x.stroke();
      x.beginPath(); x.moveTo(w * .48, h * .5); x.quadraticCurveTo(w * .76, h * .3, w * .92, h * .12); x.stroke();
      // 叶团
      var leaves = [];
      for (var i = 0; i < 26; i++) {
        var a = i / 26 * Math.PI * 2;
        leaves.push([w * .5 + Math.cos(a) * (120 + (i % 5) * 52), h * .34 + Math.sin(a) * (70 + (i % 4) * 34), 52 + (i % 6) * 18, 26 + (i % 5) * 9]);
      }
      leaves.forEach(function (L, i) {
        var g = x.createRadialGradient(L[0], L[1], 4, L[0], L[1], L[2]);
        g.addColorStop(0, i % 3 ? 'rgba(176,198,160,.95)' : 'rgba(208,220,184,.95)');
        g.addColorStop(.65, 'rgba(126,156,120,.88)');
        g.addColorStop(1, 'rgba(86,118,94,.12)');
        x.fillStyle = g;
        x.beginPath(); x.ellipse(L[0], L[1], L[2], L[3], (i % 4) * .3, 0, Math.PI * 2); x.fill();
      });
      for (var k = 0; k < 40; k++) {
        x.fillStyle = 'rgba(220,232,196,.28)';
        x.beginPath(); x.ellipse(Math.random() * w, Math.random() * h * .6, 5 + Math.random() * 12, 3 + Math.random() * 6, Math.random() * 2, 0, Math.PI * 2); x.fill();
      }
    }, false);
  }
  function lotusTex() {
    return makeCanvas(1024, 512, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      var leaves = [
        [190, 250, 150, 104, -.12], [430, 170, 180, 118, .16], [700, 240, 168, 112, -.06],
        [900, 120, 120, 80, .22], [300, 390, 130, 84, .26], [610, 390, 150, 94, -.2],
        [870, 350, 118, 78, .12], [80, 120, 100, 66, -.3], [1000, 300, 90, 62, .1]
      ];
      leaves.forEach(function (L, i) {
        x.save(); x.translate(L[0], L[1]); x.rotate(L[4]);
        var g = x.createRadialGradient(0, 0, 8, 0, 0, L[2]);
        g.addColorStop(0, 'rgba(248,250,236,.92)');
        g.addColorStop(.5, 'rgba(194,218,180,.68)');
        g.addColorStop(1, 'rgba(116,158,118,.3)');
        x.fillStyle = g;
        x.beginPath(); x.ellipse(0, 0, L[2], L[3], 0, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(72,112,82,.45)'; x.lineWidth = 2; x.stroke();
        for (var k = 0; k < 16; k++) {
          var a = k / 16 * Math.PI * 2;
          x.strokeStyle = 'rgba(78,124,88,.3)'; x.lineWidth = 1.3;
          x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * L[2] * .92, Math.sin(a) * L[3] * .92); x.stroke();
        }
        x.fillStyle = 'rgba(244,246,228,.85)'; x.beginPath(); x.arc(0, 0, 9, 0, Math.PI * 2); x.fill();
        x.strokeStyle = 'rgba(92,128,82,.55)'; x.lineWidth = 5;
        x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(12, L[3] + 30, 4, L[3] + 105); x.stroke();
        x.restore();
      });
    }, false);
  }
  function dappleTex() {
    return makeCanvas(512, 512, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      for (var i = 0; i < 14; i++) {
        var px = 40 + (i * 97) % 432, py = 40 + (i * 137) % 432;
        var r = 46 + (i % 5) * 16;
        var g = x.createRadialGradient(px, py, 4, px, py, r);
        g.addColorStop(0, 'rgba(255,255,255,.6)');
        g.addColorStop(.55, 'rgba(255,255,255,.28)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.beginPath(); x.ellipse(px, py, r, r * .66, (i % 3) * .5, 0, Math.PI * 2); x.fill();
      }
      for (var k = 0; k < 5; k++) {
        x.strokeStyle = 'rgba(255,255,255,.14)'; x.lineWidth = 2;
        x.beginPath(); x.arc(70 + k * 92, 120 + (k % 3) * 110, 52, 0, Math.PI * 2); x.stroke();
      }
    }, false);
  }

  function forwardSignTex() {
    return makeCanvas(512, 1024, function (x, w, h) {
      // 平铺在地上的木牌：深木底 + 米色大箭头
      x.fillStyle = '#4a3424'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#6b4a32'; x.fillRect(10, 10, w - 20, h - 20);
      x.strokeStyle = '#d8b47a'; x.lineWidth = 7; x.strokeRect(24, 24, w - 48, h - 48);
      x.strokeStyle = 'rgba(40,26,16,.35)'; x.lineWidth = 2;
      for (var i = 0; i < 4; i++) { x.beginPath(); x.moveTo(40, 180 + i * 210); x.lineTo(w - 40, 180 + i * 210); x.stroke(); }
      // 米色大箭头（箭头指向远方）
      x.fillStyle = '#f2e6d2';
      x.beginPath();
      x.moveTo(256, 78);
      x.lineTo(438, 306);
      x.lineTo(326, 306);
      x.lineTo(326, 902);
      x.lineTo(186, 902);
      x.lineTo(186, 306);
      x.lineTo(74, 306);
      x.closePath(); x.fill();
      x.strokeStyle = '#9d4a36'; x.lineWidth = 9; x.stroke();
      // 箭杆上的字
      x.fillStyle = '#9d4a36';
      x.font = 'bold 78px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
      ['往', '前', '走'].forEach(function (ch, i) { x.fillText(ch, 256, 440 + i * 128); });
      // 底部提示
      x.fillStyle = '#f2e6d2';
      x.font = '32px ' + FONT;
      x.fillText('点这里 · 去午朝门', 256, 964);
      // 磨损颗粒
      for (var k = 0; k < 120; k++) {
        x.fillStyle = 'rgba(240,226,204,' + (0.03 + Math.random() * 0.06) + ')';
        x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
    }, false);
  }
  function openShopTex(name, feature) {
    return makeCanvas(512, 220, function (x, w, h) {
      x.fillStyle = '#9d4a36'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#f6ead6'; x.fillRect(10, 10, w - 20, h - 20);
      x.strokeStyle = '#d8b47a'; x.lineWidth = 8; x.strokeRect(22, 22, w - 44, h - 44);
      x.fillStyle = '#9d4a36';
      x.font = 'bold 62px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(name, w / 2, 74);
      x.fillStyle = '#b07a3e';
      x.font = 'bold 26px ' + FONT;
      x.fillText(feature || '可进店 · 点门头', w / 2, 132);
      x.fillStyle = '#5e3a2a';
      x.font = '28px ' + FONT;
      x.fillText('可进店 · 点门头', w / 2, 178);
      // 小手指/箭头
      x.fillStyle = '#c49a5e';
      x.beginPath(); x.moveTo(52, 74); x.lineTo(84, 84); x.lineTo(52, 94); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(w - 52, 74); x.lineTo(w - 84, 84); x.lineTo(w - 52, 94); x.closePath(); x.fill();
    }, false);
  }
  function carpetTex(accent) {
    return makeCanvas(256, 512, function (x, w, h) {
      x.fillStyle = '#8e2a25'; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#d8b47a'; x.lineWidth = 10; x.strokeRect(12, 12, w - 24, h - 24);
      x.strokeStyle = 'rgba(246,234,214,.4)'; x.lineWidth = 2; x.strokeRect(28, 28, w - 56, h - 56);
      x.fillStyle = accent;
      x.beginPath(); x.moveTo(w / 2, 70); x.lineTo(w - 52, h / 2); x.lineTo(w / 2, h - 70); x.lineTo(52, h / 2); x.closePath(); x.fill();
      x.strokeStyle = '#d8b47a'; x.lineWidth = 5; x.stroke();
      x.fillStyle = 'rgba(246,234,214,.25)';
      for (var i = 0; i < 6; i++) { x.beginPath(); x.arc(w / 2, h / 2, 24 + i * 18, 0, Math.PI * 2); x.strokeStyle = 'rgba(246,234,214,.22)'; x.stroke(); }
    }, false);
  }
  function glowTex() {
    return makeCanvas(256, 256, function (x, w, h) {
      var g = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,220,150,.55)');
      g.addColorStop(.45, 'rgba(255,200,120,.22)');
      g.addColorStop(1, 'rgba(255,190,110,0)');
      x.clearRect(0, 0, w, h);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
    }, false);
  }

  function miniTigerTex(body, ear, eyeStyle) {
    return makeCanvas(220, 220, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.strokeStyle = '#5a2a22'; x.lineWidth = 4; x.lineJoin = 'round';
      // 身体/尾巴
      x.fillStyle = body;
      x.beginPath(); x.ellipse(112, 150, 58, 38, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.strokeStyle = '#5a2a22'; x.lineWidth = 6;
      x.beginPath(); x.moveTo(160, 140); x.quadraticCurveTo(200, 120, 190, 66); x.stroke();
      x.strokeStyle = '#e9b84c'; x.lineWidth = 3;
      x.beginPath(); x.moveTo(184, 108); x.lineTo(198, 112); x.moveTo(190, 88); x.lineTo(204, 94); x.stroke();
      // 耳朵
      x.fillStyle = ear; x.strokeStyle = '#5a2a22'; x.lineWidth = 4;
      x.beginPath(); x.arc(72, 64, 20, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.arc(142, 62, 20, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#f0c89a'; x.beginPath(); x.arc(72, 66, 10, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.arc(142, 64, 10, 0, Math.PI * 2); x.fill();
      // 脸
      x.fillStyle = '#e8b75a'; x.strokeStyle = '#5a2a22'; x.lineWidth = 4;
      x.beginPath(); x.arc(107, 108, 52, 0, Math.PI * 2); x.fill(); x.stroke();
      x.strokeStyle = '#f6ead6'; x.lineWidth = 4;
      x.beginPath(); x.arc(107, 108, 42, 0, Math.PI * 2); x.stroke();
      x.fillStyle = '#3a2a20'; x.font = 'bold 22px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('王', 107, 82);
      // 眼睛（三种神态）
      if (eyeStyle === 0) {
        x.fillStyle = '#fff'; x.strokeStyle = '#2c5f9e'; x.lineWidth = 4;
        x.beginPath(); x.arc(86, 108, 12, 0, Math.PI * 2); x.fill(); x.stroke();
        x.beginPath(); x.arc(128, 108, 12, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#2a201a'; x.beginPath(); x.arc(86, 108, 6, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(128, 108, 6, 0, Math.PI * 2); x.fill();
      } else if (eyeStyle === 1) {
        x.fillStyle = '#fff'; x.beginPath(); x.arc(86, 108, 11, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(128, 108, 11, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#2a201a'; x.beginPath(); x.arc(88, 108, 5, 0, Math.PI * 2); x.fill(); x.beginPath(); x.arc(126, 108, 5, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#2c5f9e'; x.lineWidth = 5; x.beginPath(); x.moveTo(72, 96); x.quadraticCurveTo(86, 88, 98, 98); x.stroke();
        x.beginPath(); x.moveTo(142, 96); x.quadraticCurveTo(128, 88, 116, 98); x.stroke();
      } else {
        x.strokeStyle = '#2a201a'; x.lineWidth = 4;
        x.beginPath(); x.arc(86, 108, 11, Math.PI * .15, Math.PI * .85); x.stroke();
        x.beginPath(); x.arc(128, 108, 11, Math.PI * .15, Math.PI * .85); x.stroke();
      }
      // 鼻子/嘴/牙
      x.fillStyle = '#f6ead6'; x.strokeStyle = '#d4a24a'; x.lineWidth = 2;
      x.beginPath(); x.ellipse(107, 128, 20, 12, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#8e2a25'; x.beginPath(); x.ellipse(107, 124, 7, 4, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff'; x.strokeStyle = '#5a2a22'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(98, 134); x.lineTo(104, 143); x.lineTo(110, 134); x.lineTo(116, 143); x.lineTo(122, 134); x.closePath(); x.fill(); x.stroke();
      // 花纹
      x.fillStyle = 'rgba(157,74,54,.4)';
      for (var i = 0; i < 8; i++) { x.beginPath(); x.arc(70 + (i * 37) % 90, 68 + (i * 29) % 70, 3, 0, Math.PI * 2); x.fill(); }
    }, false);
  }
  function bunGoodsTex() {
    return makeCanvas(220, 180, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#c98a3e'; x.strokeStyle = '#8a5a2a'; x.lineWidth = 4;
      x.beginPath(); x.ellipse(110, 130, 74, 30, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#e0b45a';
      x.beginPath(); x.ellipse(110, 112, 56, 26, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#f0c86a';
      x.beginPath(); x.ellipse(110, 102, 38, 18, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.strokeStyle = 'rgba(255,245,220,.8)'; x.lineWidth = 3;
      x.beginPath(); x.arc(96, 98, 10, Math.PI * 1.1, Math.PI * 1.6); x.stroke();
      x.beginPath(); x.arc(124, 98, 10, Math.PI * 1.1, Math.PI * 1.6); x.stroke();
      // 芝麻
      x.fillStyle = '#fff6e2';
      for (var i = 0; i < 18; i++) { x.beginPath(); x.ellipse(80 + (i * 43) % 62, 90 + (i * 17) % 22, 2, 1.2, i, 0, Math.PI * 2); x.fill(); }
    }, false);
  }
  function steamTex() {
    return makeCanvas(128, 256, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      for (var i = 0; i < 4; i++) {
        var g = x.createLinearGradient(w / 2, h - i * 40, w / 2, 20);
        g.addColorStop(0, 'rgba(255,252,244,0)');
        g.addColorStop(.5, 'rgba(255,252,244,.22)');
        g.addColorStop(1, 'rgba(255,252,244,0)');
        x.strokeStyle = g; x.lineWidth = 9 - i * 1.5; x.lineCap = 'round';
        x.beginPath(); x.moveTo(w / 2 + Math.sin(i) * 12, h - 20); x.quadraticCurveTo(w / 2 - 20 + i * 8, h * .55, w / 2 + 8 - i * 10, h * .2); x.stroke();
      }
    }, false);
  }

  function fabricRackTex() {
    return makeCanvas(420, 320, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.strokeStyle = '#5a3e2a'; x.lineWidth = 10; x.lineCap = 'round';
      x.beginPath(); x.moveTo(40, 290); x.lineTo(40, 40); x.lineTo(380, 40); x.lineTo(380, 290); x.stroke();
      x.lineWidth = 6;
      x.beginPath(); x.moveTo(20, 290); x.lineTo(400, 290); x.stroke();
      var cols = ['#a8332b', '#e0b45a', '#6f8fb5'];
      for (var i = 0; i < 3; i++) {
        var bx = 70 + i * 105;
        x.fillStyle = cols[i]; x.strokeStyle = '#4e3222'; x.lineWidth = 3;
        x.beginPath(); x.moveTo(bx, 58); x.lineTo(bx + 78, 58); x.lineTo(bx + 82, 230); x.quadraticCurveTo(bx + 40, 250, bx - 2, 230); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = i === 1 ? '#b83a32' : '#f0d28a';
        for (var k = 0; k < 7; k++) { x.beginPath(); x.arc(bx + 16 + (k * 37) % 52, 88 + (k * 41) % 110, 4, 0, Math.PI * 2); x.fill(); }
        x.strokeStyle = 'rgba(60,40,26,.3)'; x.lineWidth = 2;
        x.beginPath(); x.moveTo(bx + 16, 90); x.quadraticCurveTo(bx + 8, 160, bx + 12, 224); x.stroke();
        x.beginPath(); x.moveTo(bx + 58, 92); x.quadraticCurveTo(bx + 66, 160, bx + 62, 224); x.stroke();
        x.fillStyle = '#4e3222'; x.fillRect(bx - 6, 52, 92, 8);
      }
    }, false);
  }
  function basketGoodsTex() {
    return makeCanvas(300, 230, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#a97a46'; x.strokeStyle = '#5e3e24'; x.lineWidth = 4;
      x.beginPath(); x.ellipse(150, 160, 105, 56, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#c79a5e'; x.beginPath(); x.ellipse(150, 148, 95, 46, 0, 0, Math.PI * 2); x.fill();
      x.strokeStyle = 'rgba(94,62,36,.55)'; x.lineWidth = 2;
      for (var i = 0; i < 7; i++) { x.beginPath(); x.moveTo(58 + i * 28, 136); x.lineTo(58 + i * 28, 196); x.stroke(); }
      var cols = ['#b83a32', '#e0b45a', '#7fa7c8', '#6f9a5e'];
      for (var k = 0; k < 5; k++) {
        x.fillStyle = cols[k % cols.length]; x.strokeStyle = '#4e3222'; x.lineWidth = 3;
        x.beginPath(); x.ellipse(88 + (k * 51) % 130, 118 + (k % 3) * 18, 26, 20, k, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#fff6e8'; x.beginPath(); x.arc(84 + (k * 51) % 130, 114 + (k % 3) * 18, 3, 0, Math.PI * 2); x.fill();
      }
      x.strokeStyle = '#5e3e24'; x.lineWidth = 8; x.beginPath(); x.arc(150, 150, 88, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    }, false);
  }
  function steamerStackTex() {
    return makeCanvas(360, 430, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      // 三层蒸笼
      for (var i = 0; i < 3; i++) {
        var y = 250 - i * 62;
        x.fillStyle = i % 2 ? '#c79a5e' : '#d8b47a'; x.strokeStyle = '#7a5230'; x.lineWidth = 5;
        x.beginPath(); x.ellipse(180, y, 130, 34, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#b98a4e'; x.fillRect(50, y, 260, 26);
        x.strokeStyle = 'rgba(90,58,30,.4)'; x.lineWidth = 3;
        x.beginPath(); x.ellipse(180, y, 110, 26, 0, 0, Math.PI * 2); x.stroke();
      }
      // 顶层蒸馍
      for (var k = 0; k < 5; k++) {
        var bx = 90 + (k * 47) % 190, by = 240 + (k % 2) * 10;
        x.fillStyle = '#f0c86a'; x.strokeStyle = '#9a6a32'; x.lineWidth = 3;
        x.beginPath(); x.ellipse(bx, by, 30, 19, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#fff6e2';
        for (var s = 0; s < 5; s++) { x.beginPath(); x.ellipse(bx - 14 + s * 7, by - 6 + (s % 2) * 6, 1.8, 1.1, .4, 0, Math.PI * 2); x.fill(); }
      }
      // 蒸汽
      x.strokeStyle = 'rgba(255,252,244,.35)'; x.lineWidth = 10; x.lineCap = 'round';
      for (var m = 0; m < 3; m++) { x.beginPath(); x.moveTo(110 + m * 70, 230); x.quadraticCurveTo(80 + m * 70, 160, 120 + m * 60, 80); x.stroke(); }
    }, false);
  }
  function bunBasketTex() {
    return makeCanvas(300, 220, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#a97a46'; x.strokeStyle = '#5e3e24'; x.lineWidth = 4;
      x.beginPath(); x.ellipse(150, 150, 105, 50, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = '#c79a5e'; x.beginPath(); x.ellipse(150, 140, 95, 44, 0, 0, Math.PI * 2); x.fill();
      for (var k = 0; k < 6; k++) {
        var bx = 78 + (k * 43) % 150, by = 116 + (k % 2) * 14;
        x.fillStyle = '#f0c86a'; x.strokeStyle = '#9a6a32'; x.lineWidth = 3;
        x.beginPath(); x.ellipse(bx, by, 27, 16, 0, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#fff6e2';
        for (var s = 0; s < 4; s++) { x.beginPath(); x.arc(bx - 12 + s * 8, by - 4 + (s % 2) * 5, 1.4, 0, Math.PI * 2); x.fill(); }
      }
    }, false);
  }
  function woodSignTex(text) {
    return makeCanvas(360, 140, function (x, w, h) {
      x.clearRect(0, 0, w, h);
      x.fillStyle = '#5a3e2a'; x.strokeStyle = '#d8b47a'; x.lineWidth = 6;
      x.beginPath(); x.roundRect ? x.roundRect(6, 18, w - 12, h - 36, 10) : x.rect(6, 18, w - 12, h - 36);
      x.fill(); x.stroke();
      x.fillStyle = '#f6e7c8'; x.font = 'bold 48px ' + FONT; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(text, w / 2, h / 2);
    }, false);
  }

  var TEX = {
    backdrop: backdropTex(),
    ground: groundTex(),
    roof: roofTex(),
    lantern: lanternTex(),
    shadow: shadowTex(),
    tree: treeTex(),
    willow: willowTex(),
    lotus: lotusTex(),
    sail: sailTex(),
    canopy: canopyTex(),
    pinwheel: pinwheelTex(),
    kite: kiteTex(),
    birds: birdsTex(),
    dapple: dappleTex(),
    forwardSign: forwardSignTex(),
    glow: glowTex(),
    shops: {},
    peds: []
  };
  TEX.goods = {
    tigers: [miniTigerTex('#e0b45a', '#a8332b', 0), miniTigerTex('#b83a32', '#e0b45a', 1), miniTigerTex('#7fa7c8', '#b83a32', 2)],
    bun: bunGoodsTex(),
    steam: steamTex(),
    fabricRack: fabricRackTex(),
    basket: basketGoodsTex(),
    steamer: steamerStackTex(),
    bunBasket: bunBasketTex(),
    counterCloth: counterClothTex(),
    tigerSign: woodSignTex('手作布老虎'),
    bunSign: woodSignTex('现蒸压缩馍')
  };
  var SHOP_DEFS = [
    { side: -1, z: -2.0, kind: 'tiger', name: '布老虎', accent: '#9d4a36', interactive: true, feature: '亲手拼 · 塞棉花' },
    { side: 1, z: -2.9, kind: 'bun', name: '压缩馍', accent: '#b07a3e', interactive: true, feature: '现蒸 · 一口一个' },
    { side: -1, z: -7.4, kind: 'umbrella', name: '伞铺', accent: '#6e7b8a' },
    { side: 1, z: -8.3, kind: 'flower', name: '花铺', accent: '#a35a5a' },
    { side: -1, z: -12.8, kind: 'fortune', name: '算命', accent: '#6e5a44' },
    { side: 1, z: -13.7, kind: 'tea', name: '茶汤', accent: '#8a6a44' },
    { side: -1, z: -18.2, kind: 'incense', name: '香烛', accent: '#9d4a36' },
    { side: 1, z: -19.1, kind: 'clay', name: '泥泥狗', accent: '#4e5d6e' }
  ];
  SHOP_DEFS.forEach(function (d) {
    TEX.shops[d.kind] = {
      front: shopFront(d.kind),
      sign: signTex(d.name, d.accent, !!d.interactive),
      awning: awningTex(d.accent),
      flag: flagTex(d.name, d.accent),
      open: d.interactive ? openShopTex(d.name, d.feature) : null,
      carpet: d.interactive ? carpetTex(d.accent) : null
    };
  });
  TEX.paifangSign = signTex('往前 · 午朝门', '#7a5a3e', false);
  PED_STYLES.forEach(function (s) {
    TEX.peds.push({ front: [0, 1, 2].map(function (f) { return pedTex(s, false, f); }), back: [0, 1, 2].map(function (f) { return pedTex(s, true, f); }) });
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
  var dappleQuads = [];
  var lightQuads = [];
  function addGroundDapple(x, z, w, l, kind, ph) {
    var arr = kind === 'light' ? lightQuads : dappleQuads;
    arr.push({
      c: [x, 0.024, z], u: [w, 0, 0], v: [0, 0, -l], tex: TEX.dapple,
      color: kind === 'light' ? [1, .92, .62, 1] : [.22, .3, .24, 1],
      uv: [1, 1], bx: x, bz: z, ph: ph
    });
  }
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
    var center = side * 4.4;
    var depth = 1.7;
    var len = 4.5;
    var h = 3.5;
    var outX = center + side * depth / 2;
    var yaw = side * (23 + Math.min(Math.abs(z) * 0.3, 3.2)) * Math.PI / 180;
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
    // 檐下椽子与斜撑
    for (var rb = 0; rb < 7; rb++) {
      var rz = -len / 2 + (rb + 0.5) * len / 7;
      addQuad({ c: [inner - side * 0.42, h - 0.12, rz], u: [side * 0.52, 0, 0], v: [0, 0.11, 0], tex: null, color: [0.3, 0.2, 0.14, 1] });
    }
    [-len / 2 + 0.55, 0, len / 2 - 0.55].forEach(function (bz) {
      addQuad({ c: [inner - side * 0.34, h - 0.38, bz], u: [side * 0.62, 0.22, 0], v: [0, 0.2, 0], tex: null, color: [0.44, 0.29, 0.2, 1] });
    });
    // 柜台布幔
    addQuad({ c: [cf - side * 0.025, 0.64, 0], u: [0, 0, clen * 0.92], v: [0, 0.52, 0], tex: t.awning, color: [.92, .87, .76, 1] });
    // 柜上货品
    addBox(cx, ch + 0.01, -1.1, 0.34, 0.24, 0.34, [0.82, 0.54, 0.3, 1]);
    addBox(cx, ch + 0.01, -0.5, 0.28, 0.2, 0.28, [0.56, 0.62, 0.5, 1]);
    addBox(cx, ch + 0.01, 0.35, 0.3, 0.26, 0.3, [0.7, 0.42, 0.34, 1]);
    addBox(cx, ch + 0.01, 1.0, 0.26, 0.18, 0.26, [0.8, 0.68, 0.42, 1]);
    // 南端招牌（朝镜头）
    addQuad({ c: [center, 2.82, len / 2 + 0.03], u: [depth * 0.94, 0, 0], v: [0, 0.96, 0], tex: t.sign });
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
    // 两家可进店：红毯 + 「可进店」门幡 + 暖光，明显区分
    if (interactive) {
      addQuad({ c: [inner - side * 0.9, 0.026, 0], u: [1.55, 0, 0], v: [0, 0, -3.4], tex: t.carpet });
      [len / 2 - 0.5, -len / 2 + 0.5].forEach(function (pz) {
        addQuad({ c: [inner - side * 0.28, 2.52, pz], u: [1.32, 0, 0], v: [0, 1.0, 0], tex: t.open });
      });
    }

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
    if (interactive) {
      var gp = rotP([inner - side * 0.55, 2.05, len / 2 + 0.25]); gp[2] += z;
      addSprite({ x: gp[0], y: gp[1], z: gp[2], w: 4.8, h: 2.6, tex: TEX.glow });
      var lp = rotP([inner - side * 0.5, h - 0.55, -len / 2 + 0.15]); lp[2] += z;
      addSprite({ x: lp[0], y: lp[1], z: lp[2], w: 0.34, h: 0.5, tex: TEX.lantern });
    }
    // 前台货品：一眼看出这家卖什么
    if (kind === 'tiger') {
      [-1.1, 0, 1.1].forEach(function (zz, i) {
        var tp = rotP([inner - side * 0.28, 1.12, zz]); tp[2] += z;
        addSprite({ x: tp[0], y: tp[1], z: tp[2], w: 0.62, h: 0.7, tex: TEX.goods.tigers[i % 3] });
      });
    }
    if (kind === 'bun') {
      [-1.0, 0, 1.0].forEach(function (zz, i) {
        var bp = rotP([inner - side * 0.28, 1.05, zz]); bp[2] += z;
        addSprite({ x: bp[0], y: bp[1], z: bp[2], w: 0.56, h: 0.42, tex: TEX.goods.bun });
        addSprite({ x: bp[0], y: bp[1] + 0.36, z: bp[2], w: 0.36, h: 0.62, tex: TEX.goods.steam, wind: true, phase: i * 1.3 });
      });
    }
    // 店前更多元素：布老虎店布架/布筐/手作牌；压缩馍店蒸笼/馍筐/现蒸牌
    if (kind === 'tiger') {
      var rp = rotP([inner - side * 0.55, 1.35, -len / 2 - 0.55]); rp[2] += z;
      addSprite({ x: rp[0], y: rp[1], z: rp[2], w: 1.9, h: 1.45, tex: TEX.goods.fabricRack });
      var bk = rotP([inner - side * 0.32, 1.02, len / 2 + 0.6]); bk[2] += z;
      addSprite({ x: bk[0], y: bk[1], z: bk[2], w: 1.05, h: 0.8, tex: TEX.goods.basket });
      var sg = rotP([inner - side * 0.3, 1.95, len / 2 + 0.15]); sg[2] += z;
      addSprite({ x: sg[0], y: sg[1], z: sg[2], w: 1.15, h: 0.48, tex: TEX.goods.tigerSign });
    }
    if (kind === 'bun') {
      var st = rotP([inner - side * 0.5, 1.25, -len / 2 - 0.4]); st[2] += z;
      addSprite({ x: st[0], y: st[1], z: st[2], w: 1.15, h: 1.4, tex: TEX.goods.steamer });
      addSprite({ x: st[0], y: st[1] + 0.85, z: st[2], w: 0.6, h: 1.0, tex: TEX.goods.steam, wind: true, phase: 1.4 });
      var bb = rotP([inner - side * 0.32, 1.02, len / 2 + 0.6]); bb[2] += z;
      addSprite({ x: bb[0], y: bb[1], z: bb[2], w: 1.05, h: 0.8, tex: TEX.goods.bunBasket });
      var bs = rotP([inner - side * 0.3, 1.95, len / 2 + 0.15]); bs[2] += z;
      addSprite({ x: bs[0], y: bs[1], z: bs[2], w: 1.15, h: 0.48, tex: TEX.goods.bunSign });
    }

    // 落地阴影
    var sc = rotP([center, 0, 0]); sc[2] += z;
    addShadow({ c: [sc[0], 0.014, sc[2]], u: rotV([depth * 1.9, 0, 0]), v: rotV([0, 0, -(len + 1.4)]) });
    return { side: side, inner: inner, center: center, len: len, h: h, corners: corners, z: z, kind: kind, interactive: !!interactive, name: name };
  }

  var shops = SHOP_DEFS.map(function (d) {
    return addShop(d.side, d.z, d.kind, d.name, d.accent, d.interactive);
  });

  // 街尾牌坊
  (function addPaifang(z) {
    var px = 3.0, postH = 4.4, postW = 0.26;
    addBox(-px, 0, z, postW, postH, postW, [0.42, 0.3, 0.22, 1]);
    addBox(px, 0, z, postW, postH, postW, [0.42, 0.3, 0.22, 1]);
    addBox(0, postH - 0.55, z, px * 2 + 0.6, 0.34, 0.3, [0.5, 0.36, 0.26, 1]);
    addQuad({ c: [0, postH + 0.05, z], u: [px * 2 + 1.4, 0, 0], v: [0, -0.36, 0.9], tex: TEX.roof, uv: [3, 1] });
    addBox(0, postH - 1.05, z + 0.1, 2.5, 0.66, 0.12, [0.64, 0.46, 0.32, 1]);
    addQuad({ c: [0, postH - 1.05, z + 0.18], u: [2.3, 0, 0], v: [0, 0.56, 0], tex: TEX.paifangSign });
    addTab(z, -px, postH + 0.1);
    addTab(z, px, postH + 0.1);
  })(-23.0);

  function addTab(z, x, y) {
    addSprite({ x: x, y: y, z: z, w: 0.32, h: 0.48, tex: TEX.lantern });
  }

  // 平铺在地上的「往前走」箭头木牌（踩在脚下的路标）



  // 街边灯笼
  [-3.2, -8.2, -13.2].forEach(function (z) {
    addSprite({ x: -2.55, y: 4.3, z: z, w: 0.36, h: 0.54, tex: TEX.lantern });
    addSprite({ x: 2.55, y: 4.3, z: z, w: 0.36, h: 0.54, tex: TEX.lantern });
  });

  // 跨街灯笼绳
  [-3.2, -8.2, -13.2].forEach(function (z) {
    addQuad({ c: [0, 4.46, z], u: [7.9, 0, 0], v: [0, 0.022, 0], tex: null, color: [0.26, 0.19, 0.14, 1] });
    [-2.2, 0, 2.2].forEach(function (x) {
      addSprite({ x: x, y: 4.34, z: z, w: 0.3, h: 0.44, tex: TEX.lantern });
    });
  });

  // 街边垂柳（会随风轻摆）
  addSprite({ x: -2.95, y: 1.9, z: -9.5, w: 2.4, h: 4.1, tex: TEX.willow, wind: true, phase: 0.4 });
  addSprite({ x: 2.95, y: 1.9, z: -13.5, w: 2.4, h: 4.1, tex: TEX.willow, wind: true, phase: 2.1 });
  addSprite({ x: -5.8, y: 3.3, z: -7.5, w: 4.6, h: 7.6, tex: TEX.willow, wind: true, phase: 1.2 });
  addSprite({ x: 5.8, y: 3.3, z: -15.5, w: 4.6, h: 7.6, tex: TEX.willow, wind: true, phase: 2.8 });
  // 没有莲叶顶棚了：屋檐上小风车、天上纸鸢和飞鸟，天空保持亮的
  [[-2.65, 3.95, -1.8], [2.6, 4.05, -3.4], [-2.55, 4.2, -7.2], [2.6, 4.05, -9.0],
   [-2.6, 4.15, -12.8], [2.55, 4.2, -14.6]].forEach(function (p, i) {
    addSprite({ x: p[0], y: p[1], z: p[2], w: 0.72, h: 1.08, tex: TEX.pinwheel, wind: true, phase: i * 1.3 });
  });
  [[-2.85, 5.2, 1.2], [2.85, 5.15, -.8], [-2.9, 5.35, -4.8], [2.9, 5.3, -6.4]].forEach(function (p, i) {
    addSprite({ x: p[0], y: p[1], z: p[2], w: 1.06, h: 1.58, tex: TEX.pinwheel, wind: true, phase: i * .9 + .4 });
  });
  addSprite({ x: 1.5, y: 8.4, z: -11, w: 1.5, h: 2.1, tex: TEX.kite, wind: true, phase: .8 });
  addSprite({ x: -1.7, y: 8.9, z: -17, w: 1.15, h: 1.6, tex: TEX.kite, wind: true, phase: 2.1 });
  addSprite({ x: -1.3, y: 8.4, z: -15, w: 2.6, h: 1.3, tex: TEX.birds, wind: true, phase: 1.2 });
  [
    [-2.2, -2.5, 2.8, 2.1, 'shadow', 0.3], [1.6, -4.0, 3.2, 2.3, 'light', 1.1],
    [-1.4, -6.5, 2.6, 2.0, 'light', 2.0], [2.1, -8.2, 2.9, 2.2, 'shadow', 2.8],
    [-2.3, -10.2, 3.0, 2.2, 'shadow', 3.5], [1.1, -12.0, 3.2, 2.4, 'light', 4.2],
    [-0.8, -14.0, 2.7, 2.0, 'light', 5.0], [0.3, -8.8, 2.4, 1.8, 'shadow', 5.8],
    [-1.9, -15.4, 2.6, 2.0, 'shadow', 6.3], [2.0, -15.8, 2.8, 2.1, 'light', 7.0]
  ].forEach(function (d, i) { addGroundDapple(d[0], d[1], d[2], d[3], d[4], d[5] + i * .17); });

  // 参考图：顶部树冠、奶油白棚、跨街灯笼串
  [[-6.6, 6.5, 1.2], [6.6, 6.4, .2], [-6.3, 6.8, -5.8], [6.3, 6.7, -7.2], [-6.5, 6.6, -12.8], [6.5, 6.5, -14.2]].forEach(function (t, i) {
    addSprite({ x: t[0], y: t[1], z: t[2], w: 13, h: 7.6, tex: TEX.canopy, wind: true, phase: i * 1.1 });
  });
  [[-3.1, 6.3, -2.2], [3.1, 6.4, -9.2]].forEach(function (t, i) {
    addSprite({ x: t[0], y: t[1], z: t[2], w: 8.2, h: 3.6, tex: TEX.sail, wind: true, phase: i * 1.7 + .4 });
  });
  [-2.4, -6.4, -10.2].forEach(function (z, row) {
    for (var i = 0; i < 6; i++) {
      addSprite({ x: -1.7 + i * .68, y: 4.15 + (row % 2) * .06, z: z, w: .25, h: .38, tex: TEX.lantern, wind: true, phase: row + i * .5 });
    }
  });


  // 街边盆栽柏树
  [-1, 1].forEach(function (side) {
    [-6.5, -11.5].forEach(function (z) {
      addSprite({ x: side * 2.7, y: 0.9, z: z, w: 1.1, h: 1.95, tex: TEX.tree });
    });
  });

  /* --------------------------------- 行人 ---------------------------------- */
  var PED_N = 14;
  var peds = [];
  for (var pi = 0; pi < PED_N; pi++) {
    var variant = pi % PED_STYLES.length;
    peds.push({
      x: -2.2 + Math.random() * 4.4,
      z: -17 + Math.random() * 18,
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: 0.38 + Math.random() * 0.34,
      targetX: -2.2 + Math.random() * 4.4,
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
    yaw: 0, pitch: 0.07, dist: 12.9, baseDist: 12.9, focusDist: 7.8,
    target: [0, 1.55, -4.2], home: [0, 1.55, -4.2],
    introFrom: { dist: 17.5, pitch: 0.28, ty: 2.0 }, introDur: 2.2,
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
        cam.home[0] = clamp(cam.home[0] - dx * 0.005, -2.6, 2.6);
        cam.home[2] = clamp(cam.home[2] + dy * 0.012, -14, 1.5);
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

    for (var i = 0; i < shops.length; i++) {
      var shop = shops[i], b = shop.screenBox;
      if (!b) continue;
      if (nx >= b.minX && nx <= b.maxX && ny >= b.minY && ny <= b.maxY) {
        if (shop.interactive && window.__openDetail) window.__openDetail(shop.kind, shop);
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

  var FOG = [0.91, 0.90, 0.83];
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
        if (p.nextX <= 0) { p.targetX = clamp(p.x + (Math.random() * 1.2 - .6), -2.15, 2.15); p.nextX = 2.5 + Math.random() * 4.5; if (Math.random() < 0.18) p.pause = 0.4 + Math.random() * 0.9; }
        var weave = Math.sin(time * 0.9 + p.phase) * 0.08;
        p.x += ((p.targetX + weave) - p.x) * Math.min(1, dt * .9);
        p.z += p.dir * p.curSpeed * p.move * dt;
        p.stepPhase += dt * p.stepFreq * Math.PI * 2;
      }
      if (p.pause > 0) p.pause -= dt;
      p.nextTurn -= dt;
      if (p.nextTurn <= 0) { startTurn(p, -p.dir); p.nextTurn = 7 + Math.random() * 8; }
      if (p.z > -0.2) { p.z = -0.2; startTurn(p, -1); }
      if (p.z < -17.4) { p.z = -17.4; startTurn(p, 1); }
      if (moving && Math.abs(p.z) < 3 && Math.abs(p.x) > 0.72 && Math.random() < dt * 0.08) {
        p.pause = 0.6 + Math.random() * 1.2; p.targetX = p.x > 0 ? 2.15 : -2.15;
      }
      for (var j = 0; j < peds.length; j++) {
        if (j === i) continue;
        var q = peds[j], dx = q.x - p.x, dz = q.z - p.z;
        if (Math.abs(dz) < 0.5 && Math.abs(dx) < 0.55) {
          p.x += (dx === 0 ? (Math.random() - 0.5) : (dx > 0 ? -1 : 1)) * 0.6 * dt;
        }
      }
      p.x = clamp(p.x, -2.5, 2.5);
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
    gl.uniform1f(U.uFogNear, 30);
    gl.uniform1f(U.uFogFar, 68);
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
    dappleQuads.forEach(function (q) {
    q.c[0] = q.bx + Math.sin(t / 1500 + q.ph) * .5;
    q.c[2] = q.bz + Math.cos(t / 1700 + q.ph) * .38;
  });
  lightQuads.forEach(function (q) {
    q.c[0] = q.bx + Math.sin(t / 1700 + q.ph) * .55;
    q.c[2] = q.bz + Math.cos(t / 1500 + q.ph) * .4;
  });
  shadowQuads.forEach(function (q) { drawQuad(q, view, proj, eye, false); });
  dappleQuads.forEach(function (q) { drawQuad(q, view, proj, eye, false); });
  lightQuads.forEach(function (q) { drawQuad(q, view, proj, eye, false); });
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
        var mv = p.move, idle = 1 - mv, step = p.stepPhase;
        var frameIdx = mv > 0.3 ? Math.floor((step / (Math.PI * 2 / 3)) % 3) : 1;
        if (frameIdx < 0) frameIdx += 3;
        var texArr = p.dir > 0 ? p.texFront : p.texBack;
        var tex = texArr[frameIdx] || texArr[1] || texArr[0];
        var bob = Math.sin(step * 2) * 0.014 * mv + Math.sin(t / 650 + p.phase) * 0.005 * idle;
        var sway = Math.sin(step) * 0.016 * mv + Math.sin(t / 900 + p.phase) * 0.004 * idle;
        var roll = Math.sin(step) * 0.035 * mv;
        var sy = 1 + Math.sin(step * 2) * 0.012 * mv;
        var turnScale = p.turn >= 0 ? Math.abs(Math.cos(p.turn * Math.PI)) : 1;
        drawQuad({ w: 0.7, h: 1.74 * sy, c: [p.x + sway, 0.87 + bob, p.z], tex: tex, color: [1, 1, 1, 1], roll: roll, scaleX: turnScale }, view, proj, eye, true);
      } else {
        var l = item.ref;
        var sway = l.wind ? Math.sin(t / 1050 + (l.phase || 0)) * 0.06 : 0;
        var roll = l.wind ? Math.sin(t / 1200 + (l.phase || 0)) * 0.018 : 0;
        drawQuad({ w: l.w, h: l.h, c: [l.x + sway, l.y, l.z], tex: l.tex, color: [1, 1, 1, 1], roll: roll }, view, proj, eye, true);
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
    cam.home = [0, 1.45, -1.3];
    cam.yaw = 0; cam.pitch = 0.08;
    advancing = false;
  }
  function advance() {
    if (advancing) return;
    advancing = true;
    cam.focus = { x: 0, y: 1.7, z: -8.5, dist: 6.4 };
    setTimeout(function () {
      if (window.__marketForward) window.__marketForward();
    }, 1050);
  }
  window.__PINWHEEL_TEX = TEX.pinwheel;
  window.__KITE_TEX = TEX.kite;
  window.__makPedTex = pedTex;
  window.__PED_STYLES = PED_STYLES;
  window.Scene3D = { focusShop: focusShop, resetView: resetView, advance: advance, resize: resize };
  requestAnimationFrame(frame);
})();
