/* ==========================================================================
   Нейросети: перцептрон / мини-сеть с одним скрытым слоем, обучение на canvas.
   Без библиотек: forward, обратное распространение, граница решения.
   ========================================================================== */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function sig(x) { return 1 / (1 + Math.exp(-x)); }
  function tanh(x) { return Math.tanh(x); }

  var DATASETS = {
    and: { title: 'AND (И)', points: [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 1, 1]] },
    or: { title: 'OR (ИЛИ)', points: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]] },
    xor: { title: 'XOR (исключающее ИЛИ)', points: [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]] },
    exam: {
      title: 'Экзамен (подготовка + посещаемость)',
      points: [
        [0.2, 0.3, 0], [0.1, 0.5, 0], [0.3, 0.2, 0], [0.4, 0.35, 0], [0.45, 0.4, 0],
        [0.5, 0.5, 1], [0.6, 0.4, 1], [0.7, 0.6, 1], [0.9, 0.2, 1], [0.8, 0.9, 1], [0.3, 0.7, 1]
      ]
    }
  };

  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  var state = {
    dataset: 'and',
    hidden: 0,
    lr: 0.6,
    epochs: 0,
    seed: 7,
    manual: false,
    net: null,
    loss: [],
    training: false
  };

  function buildNet() {
    var r = rng(state.seed);
    var net = { hidden: state.hidden, w1: [], b1: [], w2: [], b2: 0 };
    if (state.hidden > 0) {
      for (var j = 0; j < state.hidden; j++) {
        net.w1.push([r() - 0.5, r() - 0.5]);
        net.b1.push(r() - 0.5);
        net.w2.push(r() - 0.5);
      }
      net.b2 = r() - 0.5;
    } else {
      // один нейрон: веса доступны слайдерами
      net.w1 = [[]]; // заглушка, используем wSimple
      net.wSimple = [r() - 0.5, r() - 0.5];
      net.bSimple = r() - 0.5;
    }
    state.net = net;
    state.epochs = 0;
    state.loss = [];
    state.manual = false;
    return net;
  }

  function forward(net, x1, x2) {
    if (net.hidden > 0) {
      var a1 = [];
      for (var j = 0; j < net.hidden; j++) a1.push(tanh(net.w1[j][0] * x1 + net.w1[j][1] * x2 + net.b1[j]));
      var z = net.b2;
      for (var k = 0; k < net.hidden; k++) z += net.w2[k] * a1[k];
      return { out: sig(z), a1: a1 };
    }
    var zs = net.wSimple[0] * x1 + net.wSimple[1] * x2 + net.bSimple;
    return { out: sig(zs), a1: [] };
  }

  function trainEpoch(net, points, lr) {
    var loss = 0;
    if (net.hidden > 0) {
      var gw1 = [], gb1 = [], gw2 = [], gb2 = 0;
      for (var j = 0; j < net.hidden; j++) { gw1.push([0, 0]); gb1.push(0); gw2.push(0); }
      points.forEach(function (p) {
        var f = forward(net, p[0], p[1]);
        var err = f.out - p[2];
        loss += err * err;
        var dOut = err * f.out * (1 - f.out);
        for (var j = 0; j < net.hidden; j++) {
          gw2[j] += dOut * f.a1[j];
          var dH = dOut * net.w2[j] * (1 - f.a1[j] * f.a1[j]);
          gw1[j][0] += dH * p[0];
          gw1[j][1] += dH * p[1];
          gb1[j] += dH;
        }
        gb2 += dOut;
      });
      var n = points.length;
      for (var j2 = 0; j2 < net.hidden; j2++) {
        net.w2[j2] -= lr * gw2[j2] / n;
        net.w1[j2][0] -= lr * gw1[j2][0] / n;
        net.w1[j2][1] -= lr * gw1[j2][1] / n;
        net.b1[j2] -= lr * gb1[j2] / n;
      }
      net.b2 -= lr * gb2 / n;
    } else {
      var g1 = 0, g2 = 0, gb = 0;
      points.forEach(function (p) {
        var f = forward(net, p[0], p[1]);
        var err = f.out - p[2];
        loss += err * err;
        var d = err * f.out * (1 - f.out);
        g1 += d * p[0]; g2 += d * p[1]; gb += d;
      });
      var m = points.length;
      net.wSimple[0] -= lr * g1 / m;
      net.wSimple[1] -= lr * g2 / m;
      net.bSimple -= lr * gb / m;
    }
    return loss / points.length;
  }

  function accuracy() {
    var pts = DATASETS[state.dataset].points, right = 0;
    pts.forEach(function (p) {
      var out = forward(state.net, p[0], p[1]).out;
      if ((out > 0.5 ? 1 : 0) === p[2]) right++;
    });
    return Math.round(right * 1000 / pts.length) / 10;
  }

  /* ------------------------------ рисование ------------------------------ */
  function drawPlane() {
    var cv = $('aiCanvas'), ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height, pad = 34;
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);
    var lo = -0.3, hi = 1.3, span = hi - lo;
    function px(v) { return pad + (v - lo) / span * (W - pad - 8); }
    function py(v) { return H - pad - (v - lo) / span * (H - pad - 8); }

    // сетка предсказаний
    var step = 6;
    for (var x = 0; x < W; x += step) {
      for (var y = 0; y < H; y += step) {
        var v1 = lo + (x - pad) / (W - pad - 8) * span;
        var v2 = lo + (H - pad - y) / (H - pad - 8) * span;
        if (x < pad || y < pad || x > W - 8 || y > H - pad) continue;
        var o = forward(state.net, v1, v2).out;
        var a = Math.abs(o - 0.5) * 2;
        ctx.fillStyle = o > 0.5 ? 'rgba(126,231,135,' + (0.06 + a * 0.22).toFixed(3) + ')' : 'rgba(88,166,255,' + (0.06 + a * 0.22).toFixed(3) + ')';
        ctx.fillRect(x, y, step, step);
      }
    }
    // оси
    ctx.strokeStyle = '#263041'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, H - pad); ctx.lineTo(W - 8, H - pad); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, H - pad); ctx.stroke();
    ctx.fillStyle = '#6b7a94'; ctx.font = '11px system-ui';
    ctx.fillText('вход 1 →', W - 70, H - pad + 16);
    ctx.save(); ctx.translate(12, pad + 60); ctx.rotate(-Math.PI / 2); ctx.fillText('вход 2 →', 0, 0); ctx.restore();
    ctx.fillText('0', pad - 4, H - pad + 14); ctx.fillText('1', px(1) - 3, H - pad + 14);
    ctx.fillText('1', pad - 12, py(1) + 4);

    // точки
    DATASETS[state.dataset].points.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(px(p[0]), py(p[1]), 6, 0, Math.PI * 2);
      ctx.fillStyle = p[2] ? '#7ee787' : '#58a6ff';
      ctx.fill();
      ctx.strokeStyle = '#0d1117'; ctx.lineWidth = 2; ctx.stroke();
    });

    // подписи
    ctx.fillStyle = '#8b97ad'; ctx.font = '12px system-ui';
    ctx.fillText('зелёные — класс 0, синие — класс 1', pad, 16);
  }

  function drawChart() {
    var cv = $('aiChart'), ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
    var L = state.loss;
    ctx.strokeStyle = '#263041'; ctx.beginPath(); ctx.moveTo(0, H - 4); ctx.lineTo(W, H - 4); ctx.stroke();
    if (L.length < 2) {
      ctx.fillStyle = '#6b7a94'; ctx.font = '12px system-ui';
      ctx.fillText('нажми «Обучить» — здесь появится ошибка по эпохам', 8, H / 2);
      return;
    }
    var max = Math.max.apply(null, L) || 1;
    ctx.strokeStyle = '#f0883e'; ctx.lineWidth = 1.5; ctx.beginPath();
    L.forEach(function (v, i) {
      var x = i / (L.length - 1) * (W - 4) + 2;
      var y = H - 6 - (v / max) * (H - 14);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = '#6b7a94'; ctx.font = '11px system-ui';
    ctx.fillText('ошибка: ' + L[L.length - 1].toFixed(4) + '   эпох: ' + state.epochs, 6, 12);
  }

  function syncSliders() {
    var on = state.net.hidden === 0;
    ['w1S', 'w2S', 'bS'].forEach(function (id) { $(id).disabled = !on; });
    if (!on) return;
    $('w1S').value = state.net.wSimple[0].toFixed(2);
    $('w2S').value = state.net.wSimple[1].toFixed(2);
    $('bS').value = state.net.bSimple.toFixed(2);
    $('w1V').textContent = state.net.wSimple[0].toFixed(2);
    $('w2V').textContent = state.net.wSimple[1].toFixed(2);
    $('bV').textContent = state.net.bSimple.toFixed(2);
  }

  function refresh() {
    drawPlane();
    drawChart();
    syncSliders();
    $('accOut').textContent = accuracy().toFixed(1) + '%';
    $('epochOut').textContent = state.epochs;
    $('hintOut').textContent = state.net.hidden > 0
      ? 'скрытых нейронов: ' + state.net.hidden + ' (граница решения может быть кривой)'
      : 'один нейрон: граница решения — прямая линия';
  }

  /* ------------------------------- обучение ------------------------------- */
  function train(totalEpochs, animate) {
    if (state.training) return;
    var pts = DATASETS[state.dataset].points;
    state.manual = false;
    if (!animate) {
      for (var i = 0; i < totalEpochs; i++) {
        var l = trainEpoch(state.net, pts, state.lr);
        if (i % 5 === 0 || i === totalEpochs - 1) state.loss.push(l);
      }
      state.epochs += totalEpochs;
      refresh();
      return;
    }
    state.training = true;
    $('btnTrain').disabled = true;
    var left = totalEpochs;
    function chunk() {
      var n = Math.min(25, left);
      for (var i = 0; i < n; i++) {
        var l = trainEpoch(state.net, pts, state.lr);
        if (state.epochs % 5 === 0) state.loss.push(l);
        state.epochs++;
      }
      left -= n;
      refresh();
      if (left > 0) requestAnimationFrame(chunk);
      else { state.training = false; $('btnTrain').disabled = false; }
    }
    requestAnimationFrame(chunk);
  }

  window.AIAPI = {
    state: state, datasets: DATASETS, forward: function (x1, x2) { return forward(state.net, x1, x2).out; },
    accuracy: accuracy, train: train
  };

  document.addEventListener('DOMContentLoaded', function () {
    buildNet();

    var sel = $('dsSelect');
    Object.keys(DATASETS).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k; o.textContent = DATASETS[k].title;
      sel.appendChild(o);
    });
    sel.value = state.dataset;
    sel.addEventListener('change', function () {
      state.dataset = sel.value;
      state.loss = []; state.epochs = 0;
      buildNet(); refresh();
    });

    $('hiddenSelect').addEventListener('change', function () {
      state.hidden = parseInt($('hiddenSelect').value, 10);
      buildNet(); refresh();
    });
    $('lrInput').addEventListener('input', function () {
      state.lr = parseFloat($('lrInput').value);
      $('lrV').textContent = state.lr.toFixed(2);
    });

    $('btnTrain').addEventListener('click', function () {
      train(parseInt($('epochsInput').value, 10) || 300, true);
    });
    $('btnTrainFast').addEventListener('click', function () {
      train(parseInt($('epochsInput').value, 10) || 300, false);
    });
    $('btnReset').addEventListener('click', function () {
      buildNet(); refresh();
    });

    ['w1S', 'w2S', 'bS'].forEach(function (id) {
      $(id).addEventListener('input', function () {
        if (state.net.hidden !== 0) return;
        state.net.wSimple[0] = parseFloat($('w1S').value);
        state.net.wSimple[1] = parseFloat($('w2S').value);
        state.net.bSimple = parseFloat($('bS').value);
        state.manual = true;
        $('w1V').textContent = state.net.wSimple[0].toFixed(2);
        $('w2V').textContent = state.net.wSimple[1].toFixed(2);
        $('bV').textContent = state.net.bSimple.toFixed(2);
        drawPlane();
        $('accOut').textContent = accuracy().toFixed(1) + '%';
      });
    });

    window.Shell.init({
      storageKey: 'ai.v1',
      productTitle: 'Нейросети',
      productSubtitle: 'обучение с нуля на canvas',
      tasks: window.AI_TASKS,
      open: function (task) {
        state.dataset = task.dataset;
        $('dsSelect').value = task.dataset;
        state.hidden = task.hidden;
        $('hiddenSelect').value = String(task.hidden);
        state.lr = task.lr;
        $('lrInput').value = String(task.lr);
        $('lrV').textContent = task.lr.toFixed(2);
        state.seed = task.seed;
        buildNet();
        refresh();
      },
      check: function (task) {
        var out = [];
        out.push({
          ok: state.dataset === task.dataset,
          label: 'выбран набор данных «' + DATASETS[task.dataset].title + '»',
          note: 'сейчас выбран «' + DATASETS[state.dataset].title + '»'
        });
        out.push({
          ok: state.hidden === task.hidden,
          label: 'сеть собрана так, как требует задача: ' + (task.hidden ? task.hidden + ' скрытых нейрона' : 'без скрытого слоя'),
          note: 'сейчас: ' + (state.hidden ? state.hidden + ' скрытых' : 'без скрытого слоя')
        });
        var acc = accuracy();
        if (task.manual) {
          out.push({
            ok: state.manual === true,
            label: 'веса выставлены вручную (слайдеры), а не обучением',
            note: state.manual ? '' : 'подвигай слайдеры w1, w2 и порог b'
          });
          out.push({
            ok: acc === 100,
            label: 'все 4 примера классифицированы верно',
            note: 'точность ' + acc.toFixed(1) + '%'
          });
        } else {
          out.push({
            ok: state.epochs >= task.minEpochs,
            label: 'обучение выполнено: не меньше ' + task.minEpochs + ' эпох',
            note: 'прошло эпох: ' + state.epochs
          });
          if (task.maxAccuracy != null) {
            out.push({
              ok: acc <= task.maxAccuracy,
              label: 'точность не выше ' + task.maxAccuracy + '% — потолок одного нейрона',
              note: 'сейчас ' + acc.toFixed(1) + '%'
            });
          } else {
            out.push({
              ok: acc >= task.minAccuracy,
              label: 'точность не ниже ' + task.minAccuracy + '%',
              note: 'сейчас ' + acc.toFixed(1) + '%'
            });
          }
        }
        return out;
      }
    });

    window.__solve = function (i) {
      if (window.Shell && window.Shell.openTask) window.Shell.openTask(i);
      var t = window.AI_TASKS[i];
      state.dataset = t.dataset; $('dsSelect').value = t.dataset;
      state.hidden = t.hidden; $('hiddenSelect').value = String(t.hidden);
      state.lr = t.lr; $('lrInput').value = String(t.lr);
      state.seed = t.seed;
      buildNet();
      if (t.manual) {
        state.net.wSimple = [1.5, 1.5];
        state.net.bSimple = -2.2;
        state.manual = true;
      } else {
        train(Math.max(t.minEpochs, 300), false);
      }
      refresh();
    };
  });
})();
